// 화면이 쓰는 상태와 동작. 순수 규칙은 `merge.js`·`markdown.js`에 있고 여기는
// 그것들을 IndexedDB와 화면에 잇는다.

import { addDays, kstDate } from './date.js'
import { DIMS, LOG_KINDS, assemble, assembleDay, parse } from './markdown.js'
import {
  countDirty,
  describe,
  hasContent,
  isDirty,
  isDiverged,
  needsSnapshot,
  nextEnergy,
  nextPullCursor,
  nextText,
  pullDecision,
  recordKey,
  preserveOverwritten,
  resolveRejected,
} from './merge.js'
import { datesInRange } from './series.js'
import * as db from './store.js'
import { pull, push } from './sync.js'

/** @typedef {import('./merge.js').Rec} Rec */

/** 저장 디바운스. 타이핑이 이만큼 멈추면 로컬에 쓴다 (`D6`). */
const SAVE_DELAY_MS = 1000

/**
 * 한 번의 push에 담는 레코드 수.
 *
 * **워커는 레코드마다 D1 쿼리를 둘 낸다** — 읽기(`readOne`) 하나와 쓰기 하나. 그런데
 * D1은 **Worker 호출 하나당 쿼리 1000개(유료)·50개(무료)**가 상한이다. 쪼개지 않으면
 * 더티가 그 절반을 넘는 순간 push가 **결정적으로** 500이 된다.
 *
 * **그 경로가 하필 첫 사용이다**: 기존 저널 마크다운을 통째로 가져오면 전부 더티가
 * 되고(하루 5레코드 × 200일 = 1000개), 「올리기」가 영영 안 된다.
 *
 * 200이면 왕복당 쿼리 ~400으로 유료 상한의 절반 아래다. 무료 플랜은 이 값으로도
 * 넘치지만, 이 앱은 D1 유료 계정에 배포돼 있다.
 *
 * **쪼개면 실패 모드도 좋아진다** — 앞 묶음은 이미 저장됐고, 다시 누르면 남은 더티만
 * 간다. 통짜 요청은 999개가 성공해도 전부 없던 일이 됐다.
 */
const PUSH_CHUNK = 200

/**
 * 자동 pull의 최소 간격. **모바일 `visibilitychange`는 앱을 오갈 때마다 연달아 뜬다** —
 * 간격이 없으면 탭 전환을 반복하는 것만으로 왕복이 쌓인다. 사람이 부른 pull은 이
 * 간격을 무시한다.
 */
const AUTO_PULL_MIN_MS = 30_000

/**
 * @param {string} key
 * @param {string} kind
 * @param {Record<string, any>} data
 * @returns {Rec}
 */
function blank(key, kind, data) {
  // updatedAt 0 = 한 번도 손대지 않음. 더티가 아니므로 push 대상도 아니다.
  return { key, kind, data, updatedAt: 0, syncedAt: 0 }
}

/**
 * 가져오기 판정용 내용 비교. 점수와 이유는 한 레코드를 공유하므로 둘 다 봐야 한다.
 *
 * @param {string} kind
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @returns {boolean}
 */
function sameImportData(kind, a, b) {
  return kind === 'energy' ? a.score === b.score && a.reason === b.reason : a.text === b.text
}

/**
 * 이 가져오기 항목이 **이미 있는 다른 글자를 덮는가.**
 *
 * **미리보기와 저장, 두 시점에서 같은 규칙으로 묻는다.** 가져오기 패널은 모달이
 * 아니라 본문 블록 아래에 그대로 열려 있어서(`App.svelte`), 미리보기를 낸 뒤 위로
 * 올라가 「오늘」에 한 줄 쓰는 게 정상 경로다. 앱을 잠깐 나갔다 오면 자동 pull이 그
 * 키를 채우기도 한다. 미리보기 시점의 판정을 저장 때 그대로 쓰면 그 글자가 파일
 * 내용으로 대체되는데, **여기엔 충돌 사본도 되돌리기도 없다** (불변식 3).
 *
 * @param {Rec | undefined} existing
 * @param {string} kind
 * @param {Record<string, any>} data
 * @returns {boolean}
 */
function importCollides(existing, kind, data) {
  if (!existing || !hasContent(existing)) return false
  return !sameImportData(kind, existing.data, data)
}

export class Journal {
  /** 오늘(KST). 자정을 넘겨도 앱을 다시 열면 갱신된다. */
  today = $state(kstDate())

  /** 보고 있는 날짜. 기본은 오늘 (`D16`). */
  date = $state(kstDate())

  /** @type {Record<string, Rec>} 키 → 레코드 */
  records = $state({})

  /** @type {import('./store.js').Conflict[]} */
  conflicts = $state([])

  /** @type {'idle' | 'syncing' | 'offline' | 'relogin' | 'error'} */
  syncState = $state('idle')

  /**
   * 로컬 저장/로드가 실패했을 때의 메시지. **비어 있지 않으면 화면 맨 위에 계속 뜬다** —
   * 로컬이 작업 정본(불변식 1)이므로 여기가 깨지면 사용자가 즉시 알아야 한다.
   */
  storageError = $state('')

  /** @type {string} */
  syncMessage = $state('')

  /**
   * 자동 pull이 **로컬이 더티라 못 받은** 원격 레코드 수. 충돌이 아니라 **분기**다 —
   * pull은 충돌을 만들지 않으므로(`D3`) 여기서 할 수 있는 건 보이게 하는 것뿐이고,
   * 해소는 사람이 「올리기」를 누르는 기존 경로 그대로다 (불변식 2).
   *
   * 커서를 붙잡아 두므로(`nextPullCursor`) 이 값은 **저장되지 않고 매 pull에서 다시
   * 계산된다.**
   */
  diverged = $state(0)

  /**
   * 마지막으로 서버와 실제로 통한 시각(로컬 시계). **헤더에 늘 떠 있다** — 동기화
   * 결과 토스트는 4초 뒤 사라지므로, 그것만으로는 "언제 마지막으로 맞췄더라"에
   * 답이 없다 (설계 취향 15항). 커서(`lastPulledAt`)와 **다른 값이다**: 그건 서버
   * 시계의 위치고, 이건 사람이 읽는 시각이다.
   */
  lastSyncAt = $state(0)

  pinnedOpen = $state(false)

  loaded = $state(false)

  /** @type {Record<string, ReturnType<typeof setTimeout>>} 반응형 상태가 아니다 */
  #timers = Object.create(null)

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #messageTimer

  /**
   * pull이 도는 중인가. **겹쳐 돌면 두 응답이 `lastPulledAt`을 서로 밀어** 그 사이
   * 서버에 생긴 변경을 건너뛴다. 반응형 상태가 아니다.
   */
  #pulling = false

  /** 마지막 pull 시작 시각. 자동 pull의 간격 판정에만 쓴다. */
  #lastPullAt = 0

  /**
   * 동기화 결과는 잠시 보이고 사라진다 — 계속 남으면 다음 상태와 헷갈린다.
   * **오류(`relogin`·`storageError`)는 여기로 오지 않는다.** 그건 사람이 조치할
   * 때까지 남아야 한다.
   *
   * @param {string} message
   */
  #say(message) {
    this.syncMessage = message
    clearTimeout(this.#messageTimer)
    if (!message) return
    this.#messageTimer = setTimeout(() => {
      if (this.syncMessage === message) this.syncMessage = ''
    }, 4000)
    // Node에서는 이 타이머가 프로세스를 4초 붙잡아 테스트가 그만큼 느려진다.
    // 브라우저의 타이머 핸들에는 `unref`가 없으므로 `?.()`가 그냥 지나간다.
    // **`(`로 시작하는 줄을 쓰지 않는다** — 세미콜론이 없는 코드라 앞 줄의 호출이 된다.
    const handle = /** @type {{unref?: () => void}} */ (this.#messageTimer)
    handle.unref?.()
  }

  /**
   * 로컬을 못 읽었는가. **`records`가 비어 있는 것과 "레코드가 없는 것"은 다르다** —
   * 구별하지 않으면 pull이 전부 `new`로 수락해 디스크의 미동기화 판본을 덮는다.
   * 반응형 상태가 아니다.
   */
  #loadFailed = false

  async load() {
    try {
      await this.#load()
    } catch (err) {
      // 여기서 조용히 실패하면 `loaded`가 false로 남아 에너지·어제·오늘 블록이
      // 통째로 안 뜬다. 사용자는 "앱이 반쯤 비어 있다"만 본다.
      this.#loadFailed = true
      this.storageError = `로컬 저장소를 열지 못했습니다 (${err}). 프라이빗 모드이거나 저장 공간이 부족할 수 있습니다.`
      this.loaded = true
    }
  }

  async #load() {
    const [records, conflicts, lastSyncAt] = await Promise.all([
      db.allRecords(),
      db.allConflicts(),
      db.getMeta('lastSyncAt'),
    ])
    this.lastSyncAt = lastSyncAt ?? 0
    /** @type {Record<string, Rec>} */
    const map = {}
    for (const rec of records) map[rec.key] = rec
    // 로드가 끝나기 전에 이미 편집된 게 있으면 그쪽이 최신이다. 통째로 갈아끼우면
    // 콜드 스타트에서 친 글자가 사라진다.
    this.records = { ...map, ...this.records }
    this.conflicts = conflicts
    this.loaded = true
    db.requestPersistence()
  }

  /**
   * 디스크를 다시 읽어 메모리와 합친다.
   *
   * **같은 브라우저의 다른 탭이 쓴 판본은 이 경로가 아니면 절대 안 들어온다.** pull은
   * 서버만 읽고 `#load`는 마운트에 한 번뿐이다. 그래서 탭 둘을 열어두면 나중에 커밋한
   * 탭이 앞 탭의 글자를 **사본도 신호도 없이** 덮었다 — 로컬-로컬 덮어쓰기라 push 쪽
   * 사본 경로(`resolveRejected`·`preserveOverwritten`)가 닿지 않는 자리다 (불변식 3).
   *
   * 규칙은 병합과 같다: `updatedAt`이 큰 쪽이 살고 **진 쪽에 다른 글자가 있으면 사본을
   * 남긴다.** 새 인출 통로를 만들지 않는다 — 사본은 이미 블록 아래에 붙어 있다
   * (`Conflicts.svelte`, 설계 취향 1항).
   *
   * 디바운스 중인 입력이 있는 키는 건드리지 않는다. 아직 커밋 안 된 글자를 디스크
   * 판본으로 밀면 화면에서 글자가 사라진다 — `pullNow`의 `#hasPendingEdit`과 같은 이유다.
   */
  async reload() {
    if (!this.loaded || this.#loadFailed) return
    /** @type {Rec[]} */
    let disk
    try {
      disk = await db.allRecords()
    } catch (err) {
      this.storageError = `로컬 저장소를 읽지 못했습니다 (${err})`
      return
    }

    /** @type {import('./store.js').Conflict[]} */
    const kept = []
    /** @type {Rec[]} */
    const writeBack = []
    for (const other of disk) {
      const mine = this.records[other.key]
      if (!mine) {
        this.records[other.key] = other
        continue
      }
      if (this.#hasPendingEdit(other.key)) continue
      if (other.updatedAt === mine.updatedAt) continue
      const otherWins = other.updatedAt > mine.updatedAt
      const loser = otherWins ? mine : other
      const winner = otherWins ? other : mine
      // 개정 스냅샷은 자동 밀봉본이라 사본을 만들지 않는다 (`D11`) — `merge.js`의
      // 두 사본 경로와 같은 예외다.
      if (loser.kind !== 'revision' && hasContent(loser) && describe(loser) !== describe(winner)) {
        kept.push({ target: loser.key, text: describe(loser), at: loser.updatedAt })
      }
      if (otherWins) this.records[other.key] = other
      else writeBack.push($state.snapshot(mine))
    }

    if (!kept.length && !writeBack.length) return
    try {
      // 사본이 먼저다 — `#push`와 같은 순서, 같은 이유다.
      await db.addConflicts(kept)
      await db.putRecords(writeBack)
    } catch (err) {
      this.storageError = `저장 실패 — 이 화면의 글자를 다른 곳에 복사해 두세요 (${err})`
      return
    }
    if (kept.length) this.conflicts = await db.allConflicts()
  }

  // ── 읽기 ────────────────────────────────────────────────────────────────

  /**
   * @param {string} key
   * @param {string} kind
   * @param {Record<string, any>} data
   * @returns {Rec}
   */
  #at(key, kind, data) {
    return this.records[key] ?? blank(key, kind, data)
  }

  /** @param {string} dim */
  energy(dim) {
    return this.#at(recordKey('energy', this.date, dim), 'energy', {
      score: null,
      reason: '',
      scoredAt: null,
    })
  }

  /** @param {string} kind */
  log(kind) {
    return this.#at(recordKey('log', this.date, kind), 'log', { text: '' })
  }

  pinned() {
    return this.#at('pinned', 'pinned', { text: '' })
  }

  /** 「어제」를 쓸 때 위에 띄우는 전날의「오늘」 (`D8`). */
  previousToday() {
    return this.records[recordKey('log', addDays(this.date, -1), '오늘')]?.data.text ?? ''
  }

  /**
   * 점수를 매길 때 위에 띄우는 전날의 같은 차원 (`D21`). 「어제」블록의 `D8`과
   * 같은 형태 — 기능이 아니라 이미 있는 데이터의 자리 하나다.
   *
   * @param {string} dim
   * @returns {{score: number | null, reason: string}}
   */
  previousEnergy(dim) {
    const data = this.records[recordKey('energy', addDays(this.date, -1), dim)]?.data
    return { score: data?.score ?? null, reason: data?.reason ?? '' }
  }

  dirtyCount() {
    return countDirty(Object.values(this.records))
  }

  /** @param {string} key */
  conflictsFor(key) {
    return this.conflicts.filter((c) => c.target === key)
  }

  /**
   * 지금 보고 있는 날짜 밖의 충돌 사본. **화면에 붙을 자리가 없으면 인출 통로가
   * 없는 저장이 된다** (설계 취향 15항). 날짜 이동의 조합으로 닿게 한다.
   *
   * @returns {{date: string, count: number}[]}
   */
  offscreenConflicts() {
    /** @type {Record<string, number>} */
    const byDate = Object.create(null)
    for (const c of this.conflicts) {
      const m = /^(?:energy|log):(\d{4}-\d{2}-\d{2}):/.exec(c.target)
      const date = m ? m[1] : null
      if (date === null || date === this.date) continue
      byDate[date] = (byDate[date] ?? 0) + 1
    }
    return Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
  }

  /** 접힌 고정 블록에도 보여야 한다. */
  pinnedConflictCount() {
    return this.conflictsFor('pinned').length
  }

  /** 개정 이력. 최근 것이 위로 (`D11`, `P-3`). */
  revisions() {
    return Object.values(this.records)
      .filter((r) => r.kind === 'revision')
      .sort((a, b) => (a.key < b.key ? 1 : -1))
  }

  // ── 쓰기 ────────────────────────────────────────────────────────────────

  /**
   * 내용이 실제로 달라졌을 때만 쓴다. `nextText`/`nextEnergy`가 같은 객체를 돌려주면
   * 가짜 더티이므로 저장하지 않는다.
   *
   * @param {Rec} prev
   * @param {Rec} next
   */
  #commit(prev, next) {
    // 내용이 그대로면 아무 일도 없었던 것이다 — 되돌린 편집이 더티도, 개정 이력도
    // 남기지 않는다.
    if (next === prev) return
    // 개정 스냅샷은 **지우기 분기보다 먼저다.** 뒤에 두면 고정 블록을 통째로 지운
    // 순간에만 밀봉이 건너뛰어져, `D11`이 지키려던 되돌리기가 그 경우에만 사라진다.
    if (next.key === 'pinned') this.#snapshotPinned(prev)
    // **빈 값으로 되돌아왔고 한 번도 올린 적이 없으면 레코드를 지운다** (`F-8`).
    // 남겨두면 지울 것도 없는데 영원히 더티인 빈 레코드가 되어, 「올리기」가 그걸
    // 서버에 심는다. 그 빈 행은 **나중 타임스탬프로 다른 기기가 먼저 매긴 점수를
    // 덮고**, 로컬에서는 더티라 그 키의 pull까지 막는다.
    // 서버에 올린 적이 있으면(`syncedAt > 0`) 빈 값은 **지우기**이므로 올려야 한다.
    // `loaded` 전에는 `records`가 반쪽이라 `syncedAt`을 근거로 쓸 수 없다 —
    // 콜드 스타트에 지웠다가 **디스크에 있던 동기화 완료 레코드**를 날린다.
    if (this.loaded && !hasContent(next) && !(next.syncedAt ?? 0)) {
      delete this.records[next.key]
      this.#persist(db.dropRecord(next.key))
      return
    }
    this.records[next.key] = next
    this.#persist(db.putRecord($state.snapshot(next)))
  }

  /**
   * 취소된 점수 조작을 되돌린다. **점수 축만 되돌린다** (`D1` 직교성) — 이유는 다른
   * 수단으로 편집되고, 손가락이 스트립에 있는 동안 디바운스로 커밋됐을 수 있다.
   * 레코드를 통째로 되돌리면 **그 이유 문장이 사라진다** (불변식 3).
   *
   * @param {Rec} snapshot 조작 전 레코드 (`updatedAt === 0`이면 손댄 적 없음)
   */
  restoreScore(snapshot) {
    const current = this.records[snapshot.key]
    if (!current || current === snapshot) return
    // 조작 중에 pull이 이 키를 받아왔으면 되돌릴 대상이 아니다 — 남의 판본이다.
    if ((current.syncedAt ?? 0) > (snapshot.syncedAt ?? 0)) return

    if (current.data.reason !== snapshot.data.reason) {
      // 이유가 그 사이 바뀌었다. 그건 진짜 편집이므로 더티로 남기고 점수만 되돌린다.
      this.#commit(current, {
        ...current,
        data: { ...current.data, score: snapshot.data.score, scoredAt: snapshot.data.scoredAt },
      })
      return
    }
    // 이유도 그대로면 이 조작은 없던 일이다 — `updatedAt`까지 되돌린다.
    if (current.updatedAt === snapshot.updatedAt) return
    if (!snapshot.updatedAt && !hasContent(snapshot)) {
      delete this.records[snapshot.key]
      this.#persist(db.dropRecord(snapshot.key))
      return
    }
    this.records[snapshot.key] = snapshot
    this.#persist(db.putRecord($state.snapshot(snapshot)))
  }

  /**
   * 로컬 쓰기는 화면보다 먼저 실패할 수 있다(쿼터 초과·트랜잭션 중단). 프로미스를
   * 떠 있게 두면 **화면엔 글자가 남고 앱을 다시 열면 사라진다.**
   *
   * @param {Promise<unknown>} promise
   */
  #persist(promise) {
    promise.catch((err) => {
      this.storageError = `저장 실패 — 이 화면의 글자를 다른 곳에 복사해 두세요 (${err})`
    })
  }

  /**
   * 텍스트는 디바운스해서 쓴다. 화면에는 즉시 반영되고 저장만 미뤄진다.
   *
   * @param {string} key
   * @param {string} kind
   * @param {string} text
   */
  #saveTextSoon(key, kind, text) {
    clearTimeout(this.#timers[key])
    this.#timers[key] = setTimeout(() => {
      delete this.#timers[key]
      // 커밋했으면 **대기값도 지운다.** 남겨두면 `#hasPendingEdit`이 영원히 참이라
      // pull이 그 키의 원격 갱신을 계속 미루고, `toggleScore`가 옛 이유를 되살린다.
      delete this.#pending[key]
      const prev = this.#at(key, kind, { text: '' })
      this.#commit(prev, nextText(prev, text, Date.now()))
    }, SAVE_DELAY_MS)
  }

  /** 화면을 떠나거나 앱이 가려질 때 즉시 쓴다. 폰에서 앱 전환으로 잃지 않게. */
  flush() {
    for (const key of Object.keys(this.#timers)) {
      clearTimeout(this.#timers[key])
      delete this.#timers[key]
      const pending = this.#pending[key]
      if (pending === undefined) continue
      if (key.startsWith('energy:')) {
        const prev = this.records[key] ?? blank(key, 'energy', { score: null, reason: '', scoredAt: null })
        this.#commit(prev, nextEnergy(prev, { reason: pending }, Date.now()))
      } else {
        const prev = this.records[key] ?? blank(key, key === 'pinned' ? 'pinned' : 'log', { text: '' })
        this.#commit(prev, nextText(prev, pending, Date.now()))
      }
    }
    this.#pending = Object.create(null)
  }

  /**
   * @type {Record<string, string>} 아직 저장되지 않은 마지막 입력값. 커밋되거나
   * `flush()`가 지나가면 사라진다 — `#hasPendingEdit`이 이 사실에 기대고 있다.
   */
  #pending = Object.create(null)

  /**
   * @param {string} kind '어제' | '오늘'
   * @param {string} text
   */
  setLog(kind, text) {
    const key = recordKey('log', this.date, kind)
    this.#pending[key] = text
    this.#saveTextSoon(key, 'log', text)
  }

  /**
   * 고정 블록. 편집 직전에 그날의 개정 스냅샷을 밀봉한다 (`D11`).
   *
   * @param {string} text
   */
  setPinned(text) {
    this.#pending['pinned'] = text
    this.#saveTextSoon('pinned', 'pinned', text)
  }

  /**
   * 그날 처음 실제로 바뀌는 시점에 **직전 내용을** 밀봉한다 (`D11`). 키가 날짜라
   * 하루 1개가 스키마로 강제된다.
   *
   * @param {Rec} previous 바뀌기 전의 pinned 레코드
   */
  #snapshotPinned(previous) {
    const today = kstDate()
    const last = this.revisions()[0]
    const lastDay = last ? last.key.slice('revision:'.length) : null
    if (!needsSnapshot(lastDay, today)) return
    if (!previous.data.text) return // 밀봉할 직전 내용이 없다
    const key = recordKey('revision', today)
    const rec = {
      key,
      kind: 'revision',
      data: { text: previous.data.text },
      updatedAt: Date.now(),
      syncedAt: 0,
    }
    this.records[key] = rec
    this.#persist(db.putRecord(rec))
  }

  /**
   * 점수는 라디오로만 편집된다 (`D1` 직교성). 같은 점수를 다시 누르면 해제된다.
   *
   * @param {string} dim
   * @param {number} score
   */
  toggleScore(dim, score) {
    const key = recordKey('energy', this.date, dim)
    // 점수와 이유는 **한 레코드를 공유한다.** 이유가 디바운스 대기 중일 때 커밋된
    // 레코드를 prev 로 잡으면, 방금 친 문장이 화면에서 사라졌다가 1초 뒤 돌아온다.
    const pending = this.#pending[key]
    const prev = this.#at(key, 'energy', { score: null, reason: '', scoredAt: null })
    const next = prev.data.score === score ? null : score
    /** @type {{score: number | null, reason?: string}} */
    const patch = { score: next }
    if (pending !== undefined) patch.reason = pending
    this.#commit(prev, nextEnergy(prev, patch, Date.now()))
  }

  /**
   * 이유는 텍스트로만 편집된다 (`D1` 직교성).
   *
   * @param {string} dim
   * @param {string} reason
   */
  setReason(dim, reason) {
    const key = recordKey('energy', this.date, dim)
    this.#pending[key] = reason
    clearTimeout(this.#timers[key])
    this.#timers[key] = setTimeout(() => {
      delete this.#timers[key]
      delete this.#pending[key]
      // `this.energy(dim)`이 아니라 **입력 시점에 잡은 키**로 읽는다. 지금은 날짜
      // 이동이 항상 flush를 먼저 하지만, 그러지 않는 호출자가 하나만 생겨도
      // 디바운스 중이던 이유가 엉뚱한 날짜에 저장된다.
      const prev = this.#at(key, 'energy', { score: null, reason: '', scoredAt: null })
      this.#commit(prev, nextEnergy(prev, { reason }, Date.now()))
    }, SAVE_DELAY_MS)
  }

  // ── 이동 ────────────────────────────────────────────────────────────────

  /**
   * 앱으로 돌아올 때 **날짜를 다시 읽는다.**
   *
   * PWA를 열어둔 채 자정을 넘기면 `today`가 어제에 얼어붙는다. 그러면 헤더는 어제를
   * 「오늘」이라 부르고, 그 화면에서 쓴 「오늘」이 **전날 레코드에 저장된다.**
   * 「오늘로」 버튼도 `date !== today`가 거짓이라 안 떠서 탈출구가 안 보인다.
   *
   * **보고 있는 날짜가 옛 오늘이었으면 같이 옮긴다** — 사용자는 "오늘을 보고 있다"고
   * 믿고 있었으므로, 날짜만 갱신하고 화면을 어제에 두면 그게 더 놀랍다. 과거를
   * 일부러 열어둔 상태라면 건드리지 않는다.
   *
   * @returns {boolean} 날짜가 바뀌었으면 true
   */
  refreshToday() {
    const now = kstDate()
    if (now === this.today) return false
    const wasOnToday = this.date === this.today
    this.today = now
    if (wasOnToday) this.goTo(now)
    return true
  }

  /** @param {number} days */
  shiftDate(days) {
    this.goTo(addDays(this.date, days))
  }

  /**
   * **빈 문자열을 막는다.** `input[type=date]`의 지우기 버튼이 `''`를 준다. 그대로
   * 받으면 `energy::인지` 같은 키가 만들어져 IndexedDB와 서버에 커밋되는데, 그 키는
   * 날짜 정규식에 안 걸려 **그래프에도 내려받기에도 안 나온다** — 인출 통로가 아예
   * 없는 저장이다 (설계 취향 15항). `shiftDate`도 이 문을 지난다.
   *
   * **연도는 `20xx`만 받는다.** 정본 마크다운의 H1이 두 자리 연도라 `fromH1`이 `20`을
   * 무조건 앞에 붙인다 (`references/sample.md`) — 즉 **2000~2099 밖 날짜는 export
   * 형식으로 표현할 수 없다.** 데스크톱 `input[type=date]`의 연 칸에 `0226`을 치면
   * 모양 가드만으로는 통과해서, 그날에 쓴 글이 「전체 내려받기」에서 진짜 `2026`년
   * 그날과 **같은 `# 26-08-03` 두 개**로 나가고, 다시 가져올 때 하나가 「파일에 두 번
   * 나옴」으로 건너뛰어진다. 그 파일만 들고 복원하면 하루치가 사라진다 (불변식 3).
   *
   * 같은 가드가 그래프도 지킨다 — `series.js`의 전체 스팬은 earliest→today를 하루씩
   * 걷는 루프라, 연도 하나가 어긋나면 그 루프가 65만 회가 된다.
   *
   * @param {string} date
   */
  goTo(date) {
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(date)) return
    this.flush()
    this.date = date
  }

  goToday() {
    this.today = kstDate()
    this.goTo(this.today)
  }

  // ── Export / Import ─────────────────────────────────────────────────────

  /** @param {string} date */
  dayFor(date) {
    /** @type {import('./markdown.js').DayEntry} */
    const day = { date, energy: [], logs: [] }
    for (const dim of DIMS) {
      const rec = this.records[recordKey('energy', date, dim)]
      day.energy.push({
        dim,
        score: rec?.data.score ?? null,
        reason: rec?.data.reason ?? '',
      })
    }
    for (const kind of LOG_KINDS) {
      day.logs.push({ kind, text: this.records[recordKey('log', date, kind)]?.data.text ?? '' })
    }
    return day
  }

  /** 하루치. 고정 블록은 들어가지 않는다 (`D13`). */
  exportDay() {
    this.flush()
    return assembleDay(this.dayFor(this.date)) + '\n'
  }

  /**
   * 전체. 같은 조립 함수에 날짜 범위만 다르게 준 것이다 (`D13`).
   *
   * **범위는 없다 — 전체는 전체다.** S2에서 그래프 창을 범위로 쓰는 결합을 넣었다가
   * 되돌렸다 (`S-2` 철회). 날짜 범위 선택 UI는 다시 미룬 결정이다.
   */
  exportAll() {
    this.flush()
    const days = datesInRange(Object.values(this.records), null, null)
    return assemble({
      pinned: this.pinned().data.text,
      days: days.map((d) => this.dayFor(d)),
    })
  }

  /**
   * import는 **미리보기를 먼저 낸다.** 해석 못 한 줄과 덮어쓸 뻔한 것을 보여주고,
   * 사용자가 확인해야 쓴다 (불변식 3).
   *
   * @param {string} text
   */
  previewImport(text) {
    const journal = parse(text)
    const now = Date.now()
    /** @type {Rec[]} */
    const writes = []
    /** @type {string[]} */
    const skipped = []

    /** @param {string} kind @param {Record<string, any>} data */
    const isEmpty = (kind, data) => !hasContent({ kind, data })

    // **선형 탐색이 아니다.** 예전엔 `writes.some(...)`로 매번 배열을 훑어서, 5년치
    // (하루 5레코드 × 1825일) 가져오기에 비교가 4천만 번 났다 — 폰에서 미리보기
    // 버튼이 몇 초간 먹통이 되고, 반응이 없어 두 번 누르게 된다.
    //
    // `Set`이 아니라 널 프로토타입 객체다. 이 파일의 `#timers`·`#pending`과 같은
    // 관용이고, 룬 파일에서 `Set`을 쓰면 린터가 `SvelteSet`을 요구한다 — 반응형이
    // 아니어야 할 지역 변수에 반응형 자료구조를 들이는 건 반대 방향이다.
    /** @type {Record<string, true>} */
    const staged = Object.create(null)

    /**
     * @param {string} key
     * @param {string} kind
     * @param {Record<string, any>} data
     * @param {string} label
     */
    const stage = (key, kind, data, label) => {
      // **이미 이번 가져오기에서 쓴 키면 앞엣것이 정본이다.** 한 파일에 같은 날의
      // `## 오늘`이 두 번 있으면(손으로 이어붙인 파일에서 흔하다) 뒤엣것이 앞엣것을
      // 조용히 덮어썼다 — 미리보기는 개수만 보여주므로 화면에 드러나지도 않는다.
      // 여기서 막고 「건너뜀」으로 보이게 한다.
      if (staged[key]) {
        skipped.push(`${label} (파일에 두 번 나옴)`)
        return
      }
      const existing = this.records[key]
      if (importCollides(existing, kind, data)) {
        skipped.push(label)
        return
      }
      if (existing && sameImportData(kind, existing.data, data)) return
      // **빈 값을 새 레코드로 쓰지 않는다.** `- 인지:` 같은 빈 줄이 지금 시각으로
      // 더티가 되면, 다른 기기가 이미 올려둔 점수를 올리기 한 번에 NULL로 덮는다.
      if (isEmpty(kind, data)) return
      staged[key] = true
      writes.push({ key, kind, data, updatedAt: now, syncedAt: 0 })
    }

    if (journal.pinned) {
      stage('pinned', 'pinned', { text: journal.pinned }, '고정 블록')
    }
    for (const day of journal.days) {
      for (const e of day.energy) {
        stage(
          recordKey('energy', day.date, e.dim),
          'energy',
          // 마크다운에 기록 시각이 없다. 지금 시각을 넣으면 과거 점수 전부가
          // 오늘 매긴 것처럼 보여 `D15`가 지키려던 값이 사라진다. null 이 정직하다.
          { score: e.score, reason: e.reason, scoredAt: null },
          `${day.date} 에너지/${e.dim}`,
        )
      }
      for (const l of day.logs) {
        stage(recordKey('log', day.date, l.kind), 'log', { text: l.text }, `${day.date} ${l.kind}`)
      }
    }

    return { days: journal.days.length, unparsed: journal.unparsed, writes, skipped }
  }

  /**
   * @param {Rec[]} writes
   * @returns {Promise<{written: number, skipped: number}>}
   */
  async applyImport(writes) {
    // 이 배열은 화면의 `$state`를 거쳐 오므로 **깊은 프록시**다. 프록시는
    // structured clone이 안 돼서 IndexedDB `put`이 `DataCloneError`로 터진다.
    // 저장소 경계를 넘기 전에 항상 벗긴다.
    const plain = writes.map((rec) => $state.snapshot(rec))
    // **미리보기 시점의 판정을 그대로 믿지 않는다.** 사이에 그 블록을 썼거나 자동
    // pull이 채웠으면 지금은 덮으면 안 되는 자리다 — 이유는 `importCollides`에 있다.
    const fresh = plain.filter((rec) => !importCollides(this.records[rec.key], rec.kind, rec.data))
    await db.putRecords(fresh)
    for (const rec of fresh) this.records[rec.key] = rec
    return { written: fresh.length, skipped: plain.length - fresh.length }
  }

  // ── 동기화 ──────────────────────────────────────────────────────────────

  /**
   * 디바운스 중이라 아직 레코드에 안 들어간 입력이 있는가. **더티 판정에 이게 빠지면
   * pull이 그 위를 덮고, 뒤늦게 뜬 타이머가 원격 글자를 지운다** — 사용자는 원격
   * 문단을 본 적도 없이 잃는다.
   *
   * @param {string} key
   */
  #hasPendingEdit(key) {
    return this.#pending[key] !== undefined || this.#timers[key] !== undefined
  }

  /**
   * 앱을 열 때, 앱으로 돌아올 때, 온라인이 될 때 자동. **로컬을 파괴하지 않는다** (`D3`).
   *
   * 타이머로 돌리지 않는다 — 사람의 행동(앱으로 돌아옴)에 묶여 있어야 화면이 바뀐
   * 이유가 보인다. 쓰는 쪽(push)은 여전히 사람이 누른다 (불변식 2).
   *
   * @param {{auto?: boolean}} [opts] `auto`면 최소 간격을 지킨다
   */
  async pullNow({ auto = false } = {}) {
    if (this.#pulling) return
    // **로컬을 못 읽었으면 받은 것을 쓰지 않는다.** `records`가 비어 있어서 모든 원격
    // 키가 `new`로 수락되는데, 디스크에는 아직 안 올린 로컬 판본이 그대로 남아 있다 —
    // 그대로 쓰면 그 글자가 서버의 **옛** 판본으로 덮인다. 배너는 뜨지만 글자는 이미
    // 사라진 뒤다 (불변식 3). `storageError`가 화면에 남아 있으므로 조용하지 않다.
    if (this.#loadFailed) return
    // **재로그인 안내를 자동 pull이 지우면 안 된다.** 지우고 나면 실패는 '오프라인'으로
    // 표시되고, 사용자는 새로고침해야 한다는 걸 모른 채 계속 쓴다.
    if (auto && this.syncState === 'relogin') return
    const at = Date.now()
    if (auto && at - this.#lastPullAt < AUTO_PULL_MIN_MS) return
    this.#pulling = true
    this.#lastPullAt = at
    // 타이핑 중에 pull이 끼어들면 안 된다. 먼저 커밋해서 더티로 만든다.
    this.flush()
    this.syncState = 'syncing'

    /** @type {Awaited<ReturnType<typeof pull>>} */
    let res
    /** @type {number} */
    let since
    try {
      since = (await db.getMeta('lastPulledAt')) ?? 0
      res = await pull(since)
    } catch {
      this.syncState = 'offline'
      this.syncMessage = ''
      // **실패는 간격을 소비하지 않는다.** 안 그러면 오프라인에서 한 번 실패한 뒤
      // 30초 안에 온 `online` 이벤트가 조용히 무시돼, 그 트리거의 존재 이유가 사라진다.
      this.#lastPullAt = 0
      this.#pulling = false
      return
    }

    try {
      if (res.relogin) {
        this.syncState = 'relogin'
        this.syncMessage = '로그인이 만료됐습니다. 새로고침하면 다시 로그인합니다.'
        return
      }
      // 서버가 500을 내면 `records`가 없다. 그대로 훑으면 예외가 `syncState`를
      // 'syncing'에 얼려놓고, 사용자는 영원히 도는 표시만 본다.
      if (!Array.isArray(res.records)) {
        this.syncState = 'error'
        this.syncMessage = '서버가 응답을 제대로 주지 않았습니다. 로컬은 그대로입니다.'
        return
      }
      /** @type {Rec[]} */
      const accepted = []
      /**
       * 커서를 붙잡을 것과 배너에 셀 것은 **다르다.** 붙잡기는 "다시 받아야 한다"는
       * 사실이고, 배너는 "다른 기기와 갈렸다"는 판단이다. 예전엔 후자만으로 커서를
       * 붙잡아서, **로컬에 아직 그 키가 없는 채로 타이핑을 시작하면**(새 날짜 첫
       * 진입 + 자동 pull) 그 원격 판본이 버려지고 다시 오지 않았다.
       *
       * @type {Rec[]}
       */
      const held = []
      let diverged = 0
      for (const remote of res.records) {
        const local = this.records[remote.key]
        // 응답을 기다리는 동안 새로 시작된 입력도 로컬 편집이다.
        const pending = this.#hasPendingEdit(remote.key)
        const decision = pullDecision(local, remote)
        if (!pending && decision.accept) {
          accepted.push({ ...remote, syncedAt: remote.updatedAt })
        } else if (pending || decision.reason === 'local-dirty') {
          // `stale`은 붙잡지 않는다 — 이미 가진 판본이라 다시 받을 이유가 없고,
          // 붙잡으면 커서가 영영 안 나아간다.
          held.push(remote)
          if (isDiverged(local, remote)) diverged += 1
        }
      }
      try {
        await db.putRecords(accepted)
        // 커서는 레코드가 실제로 저장된 뒤에 옮긴다. 순서가 뒤집히면 받아온 걸
        // 잃고도 다시 받을 기회가 없다.
        await db.setMeta('lastPulledAt', nextPullCursor(since, res.now, held))
      } catch (err) {
        // **로컬 쓰기 실패는 '오프라인'이 아니다** (`F-6`, 불변식 1). 네트워크는 멀쩡한데
        // 오프라인이라고 말하면 사용자는 로컬이 깨진 걸 모른다.
        //
        // 그리고 **표시를 반드시 풀어야 한다.** 여기서 그냥 나가면 `syncState`가
        // 'syncing'에 얼어붙어, 도는 요청이 하나도 없는데 헤더가 「동기화 중…」을
        // 계속 띄운다 — 위 500 경로가 이미 막아둔 것과 같은 실패다.
        this.syncState = 'error'
        this.storageError = `저장 실패 — 이 화면의 글자를 다른 곳에 복사해 두세요 (${err})`
        return
      }
      // push 쪽과 같은 가드다 — `putRecords`를 기다리는 동안 커밋된 더 새로운 값을
      // 원격 판본으로 덮지 않는다.
      for (const rec of accepted) {
        if ((this.records[rec.key]?.updatedAt ?? 0) > rec.updatedAt) continue
        this.records[rec.key] = rec
      }
      this.diverged = diverged
      this.syncState = 'idle'
      this.#stampSync()
      this.#say(accepted.length ? `${accepted.length}개 받음` : '')
    } finally {
      this.#pulling = false
    }
  }

  /**
   * 사람이 버튼을 눌렀을 때만 (`D3`, 불변식 2).
   *
   * **겹쳐 돌면 안 된다.** 두 실행이 같은 키를 각자 보내면, 먼저 도착한 쪽이 서버에
   * 써지고 나중 쪽은 그걸 「이 기기가 못 본 값」으로 읽어 **200ms 전에 내가 올린 내
   * 글자를 충돌 사본으로 만든다.** 청킹으로 왕복이 길어지면서 손가락이 두 번 닿기
   * 쉬워졌다. `pullNow`의 `#pulling`과 같은 형태다.
   */
  async pushNow() {
    if (this.#pushing) return
    this.#pushing = true
    try {
      await this.#push()
    } finally {
      this.#pushing = false
    }
  }

  /** 겹침 방지용. 반응형 상태가 아니다. */
  #pushing = false

  async #push() {
    this.flush()
    const all = Object.values(this.records).filter(isDirty).map((r) => $state.snapshot(r))
    if (!all.length) {
      // 더티가 없으면 분기도 없다. 배너를 남겨두면 "「올리기」를 누르면 정해집니다"가
      // 통하지 않는 막다른 골목이 된다.
      this.diverged = 0
      // 상태도 함께 되돌린다. 안 그러면 직전 'offline' 표시에 묻혀 안 보인다.
      this.syncState = 'idle'
      this.#say('올릴 게 없습니다')
      return
    }
    this.syncState = 'syncing'

    let applied = 0
    let rejected = 0
    let stuck = 0
    let raced = 0
    let conflicted = 0

    try {
      // **묶음마다 따로 보내고 따로 저장한다.** 이유는 `PUSH_CHUNK` 주석에 있다.
      for (let at = 0; at < all.length; at += PUSH_CHUNK) {
      const sent = all.slice(at, at + PUSH_CHUNK)
      /** @type {Record<string, Rec>} */
      const sentByKey = Object.create(null)
      for (const rec of sent) sentByKey[rec.key] = rec

      const res = await push(sent)
      if (res.relogin) {
        this.syncState = 'relogin'
        this.syncMessage = '로그인이 만료됐습니다. 새로고침하면 다시 로그인합니다.'
        return
      }
      // **500을 '네트워크가 없습니다'로 말하지 않는다.** 아래 루프가 예외로 터지면
      // 바깥 catch가 오프라인이라고 알리고, 사용자는 안 올라간 이유를 못 본다.
      if (!Array.isArray(res.verdicts)) {
        this.syncState = 'error'
        this.syncMessage = '서버가 올리기를 거절했습니다. 글자는 로컬에 그대로 있습니다.'
        return
      }
      /** @type {Rec[]} */
      const updates = []
      /** @type {import('./store.js').Conflict[]} */
      const newConflicts = []
      // **거절은 올린 게 아니다.** 예전엔 둘을 합쳐 세서 "N개 올림"이 서버 값을
      // 받아온 건까지 포함했다. 진 쪽이 비어 사본도 안 남는 경우(`F-8`)에는
      // 그 토스트가 유일한 신호인데, 그게 거짓말이면 사용자는 올라간 줄 안다.

      for (const verdict of res.verdicts) {
        const outbound = sentByKey[verdict.key]
        const local = this.records[verdict.key]
        if (!outbound || !local) continue

        // **이겼어도 못 본 값을 덮었으면 덮인 쪽을 사본으로 남긴다** (`SC-6`).
        // 거절 경로의 거울이다 — 저쪽은 진 내 글자를, 이쪽은 진 서버 글자를 남긴다.
        //
        // **raced보다 먼저 낸다.** 판정도 사본도 **보낸 판본에 대한 것**이라 그 사이
        // 로컬이 또 바뀐 것과 무관하다. 아래 `continue` 뒤로 두면 그 왕복에서 덮인
        // 남의 글자가 통째로 사라진다.
        // 사본은 한 곳에서 센다 — 토스트의 「충돌 N개」가 어느 방향이든 같은 뜻이다.
        if (verdict.applied && verdict.server) {
          const kept = preserveOverwritten(outbound, verdict.server)
          if (kept) newConflicts.push(kept)
        }

        // 왕복 중에 사용자가 그 블록을 또 고쳤다면 판정은 **보낸 판본에 대한 것**이라
        // 지금 값에 적용하면 안 된다. 더티로 남겨 다음 올리기에서 다시 보낸다.
        if (local.updatedAt !== outbound.updatedAt) {
          raced += 1
          // **그래도 `syncedAt`은 보낸 판본까지 올린다.** 서버는 그걸 받았다는 게
          // 사실인데, 로컬에 안 남기면 다음 push가 **내가 방금 올린 내 글자**를
          // 「못 본 값」으로 오해해 사본을 만든다 — `merge.js`가 피하려던 「편집 한 번에
          // 배지 하나」가 정확히 여기서 난다. 같은 이유로 `isDiverged`도 내 메아리를
          // 분기로 세어 거짓 배너를 띄운다.
          // **더티는 그대로다** — 지금 값이 더 새로우므로 다음 올리기에서 다시 간다.
          if (verdict.applied) {
            // **`$state.snapshot`이 필수다.** `{...local}`은 얕은 전개라 `data`가
            // 프록시로 남고, IndexedDB의 `put`은 `structuredClone`이라 `DataCloneError`로
            // 던진다 — 이 묶음 전체가 안 써지고 「저장 실패」가 뜬다.
            // 저장소로 넘어가는 다른 네 곳은 전부 이미 이걸 쓴다.
            const snap = $state.snapshot(local)
            updates.push({ ...snap, syncedAt: Math.max(snap.syncedAt ?? 0, outbound.updatedAt) })
          }
          continue
        }

        if (verdict.applied) {
          applied += 1
          updates.push({ ...outbound, syncedAt: outbound.updatedAt })
        } else if (!verdict.server) {
          // 서버가 거절하면서 자기 값도 안 준 경우 — 아무것도 안 쓴 것이다. 로컬은
          // 더티로 남는데, 여기서 안 세면 **`0개 올림`만 뜨고 신호가 사라진다.**
          stuck += 1
        } else {
          rejected += 1
          const { live, conflict } = resolveRejected(outbound, verdict.server)
          updates.push(live)
          // 개정 스냅샷은 사용자가 그 순간 쓴 문장이 아니라 자동 밀봉본이다 (`F-3`).
          // 사본을 만들면 어느 블록에도 안 붙어 지울 수도 없는 배지가 된다.
          if (conflict && outbound.kind !== 'revision') newConflicts.push(conflict)
        }
      }

      try {
        // **사본을 먼저 쓴다.** 뒤에 두면 `putRecords`가 던졌을 때 사본이 통째로
        // 사라지는데, 그 사본은 **남은 유일한 판본**이라 되살릴 길이 없다 — 서버엔
        // 이미 내 값이 써졌고, 재시도하면 `resolveRejected`가 내용이 같다고 판단해
        // 사본을 안 만든다. 순서를 뒤집으면 최악이 「지울 수 있는 잉여 배지 하나」다.
        await db.addConflicts(newConflicts)
        await db.putRecords(updates)
      } catch (err) {
        // **로컬 쓰기 실패는 '오프라인'이 아니다** (`F-6`). 서버엔 이미 써졌는데
        // 네트워크 탓이라고 말하면, 사용자는 영구 더티가 된 이유를 못 본다.
        // 표시도 같이 푼다 — 안 그러면 「동기화 중…」이 영원히 돈다.
        this.syncState = 'error'
        this.storageError = `저장 실패 — 이 화면의 글자를 다른 곳에 복사해 두세요 (${err})`
        return
      }
      // **왕복과 저장 사이에 사용자가 또 쳤으면 그쪽이 최신이다.** 두 `await`가 지나는
      // 동안 디바운스 타이머가 커밋할 수 있는데, 그대로 대입하면 방금 친 문장이
      // 화면에서 사라지고 더티 표시까지 꺼진다 — 사용자는 신호 없이 잃는다.
      for (const rec of updates) {
        if ((this.records[rec.key]?.updatedAt ?? 0) > rec.updatedAt) continue
        this.records[rec.key] = rec
      }
      if (newConflicts.length) this.conflicts = await db.allConflicts()
      conflicted += newConflicts.length
      // **`lastPulledAt`을 여기서 옮기지 않는다.** push 응답은 내가 보낸 키의 판정만
      // 담고 있어서, 커서를 밀면 그 사이 서버에 생긴 다른 기기의 변경을 영영 건너뛴다.
      }

      // 보낸 것은 판정을 받았으므로(적용됐거나 사본이 됐다) 분기는 여기서 닫힌다.
      // **단 `raced`는 아직 더티다** — 그 분기는 해소되지 않았는데 배너를 내리면
      // 사용자는 4초짜리 토스트를 놓치는 것만으로 사실을 못 본다.
      if (!raced && !stuck) this.diverged = 0
      this.syncState = 'idle'
      this.#stampSync()
      this.#say(
        `${applied}개 올림` +
          (rejected ? `, ${rejected}개는 서버가 더 새로워 받아옴` : '') +
          (conflicted ? `, 충돌 ${conflicted}개` : '') +
          (raced ? `, ${raced}개는 편집 중이라 다음에` : '') +
          (stuck ? `, ${stuck}개는 서버가 받지 않았습니다` : ''),
      )
    } catch {
      this.syncState = 'offline'
      this.#say('네트워크가 없습니다')
    }
  }

  /**
   * 서버와 통한 사실을 남긴다. **실패한 왕복은 찍지 않는다** — 그러면 "마지막 동기화"가
   * 아니라 "마지막 시도"가 되고, 안 맞은 채로 맞았다고 읽힌다.
   */
  #stampSync() {
    this.lastSyncAt = Date.now()
    this.#persist(db.setMeta('lastSyncAt', this.lastSyncAt))
  }

  /** @param {number} id */
  async dismissConflict(id) {
    await db.dropConflict(id)
    this.conflicts = this.conflicts.filter((c) => c.id !== id)
  }
}
