// 화면이 쓰는 상태와 동작. 순수 규칙은 `merge.js`·`markdown.js`에 있고 여기는
// 그것들을 IndexedDB와 화면에 잇는다.

import { addDays, kstDate } from './date.js'
import { DIMS, LOG_KINDS, assemble, assembleDay, parse } from './markdown.js'
import {
  countDirty,
  isDirty,
  needsSnapshot,
  nextEnergy,
  nextText,
  pullDecision,
  recordKey,
  resolveRejected,
} from './merge.js'
import { earliestScored, windowStart } from './series.js'
import * as db from './store.js'
import { pull, push } from './sync.js'

/** @typedef {import('./merge.js').Rec} Rec */

/** 저장 디바운스. 타이핑이 이만큼 멈추면 로컬에 쓴다 (`D6`). */
const SAVE_DELAY_MS = 1000

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

  pinnedOpen = $state(false)

  /**
   * 그래프 창의 길이(일). `null`이면 전체 (`D14`).
   *
   * **내려받기 범위이기도 하다.** 그래프의 창이 이미 날짜 범위 선택기라, 같은 일을
   * 하는 UI를 하나 더 만들지 않는다 (설계 취향 1항). 경계는 이렇다 — **범위는 그래프
   * 창으로만 정하고, 내려받기는 버튼으로만 한다** (2항).
   *
   * @type {number | null}
   */
  graphDays = $state(/** @type {number | null} */ (30))

  loaded = $state(false)

  /** @type {Record<string, ReturnType<typeof setTimeout>>} 반응형 상태가 아니다 */
  #timers = Object.create(null)

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  #messageTimer

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
  }

  async load() {
    try {
      await this.#load()
    } catch (err) {
      // 여기서 조용히 실패하면 `loaded`가 false로 남아 에너지·어제·오늘 블록이
      // 통째로 안 뜬다. 사용자는 "앱이 반쯤 비어 있다"만 본다.
      this.storageError = `로컬 저장소를 열지 못했습니다 (${err}). 프라이빗 모드이거나 저장 공간이 부족할 수 있습니다.`
      this.loaded = true
    }
  }

  async #load() {
    const [records, conflicts] = await Promise.all([db.allRecords(), db.allConflicts()])
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
    if (next.key === 'pinned') this.#snapshotPinned(prev)
    this.records[next.key] = next
    this.#persist(db.putRecord($state.snapshot(next)))
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

  /** @type {Record<string, string>} 디바운스 중인 마지막 입력값 */
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
      // `this.energy(dim)`이 아니라 **입력 시점에 잡은 키**로 읽는다. 지금은 날짜
      // 이동이 항상 flush를 먼저 하지만, 그러지 않는 호출자가 하나만 생겨도
      // 디바운스 중이던 이유가 엉뚱한 날짜에 저장된다.
      const prev = this.#at(key, 'energy', { score: null, reason: '', scoredAt: null })
      this.#commit(prev, nextEnergy(prev, { reason }, Date.now()))
    }, SAVE_DELAY_MS)
  }

  // ── 이동 ────────────────────────────────────────────────────────────────

  /** @param {number} days */
  shiftDate(days) {
    this.flush()
    this.date = addDays(this.date, days)
  }

  /** @param {string} date */
  goTo(date) {
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
   * 내려받기 범위의 시작 날짜. `null`이면 전부다. **그래프 창과 같은 함수에서 나온다** —
   * 두 곳에서 따로 계산하면 그래프가 보여준 구간과 파일 내용이 조용히 어긋난다.
   *
   * @returns {string | null}
   */
  exportFrom() {
    if (this.graphDays === null) return null
    return windowStart(earliestScored(Object.values(this.records)), this.today, this.graphDays)
  }

  /**
   * 같은 조립 함수에 범위만 다르게 준 것이다 (`D13`). 고정 블록은 범위와 무관하게
   * 맨 위에 남는다 — 지금 서 있는 문장이지 그 기간의 기록이 아니다.
   *
   * @param {string | null} [from] 이 날짜보다 이른 날은 뺀다. `null`이면 전부.
   */
  exportAll(from = null) {
    this.flush()
    /** @type {Record<string, true>} */
    const dates = Object.create(null)
    for (const rec of Object.values(this.records)) {
      const m = /^(?:energy|log):(\d{4}-\d{2}-\d{2}):/.exec(rec.key)
      if (m && (from === null || m[1] >= from)) dates[m[1]] = true
    }
    return assemble({
      pinned: this.pinned().data.text,
      days: Object.keys(dates).map((d) => this.dayFor(d)),
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

    /**
     * @param {string} key
     * @param {string} kind
     * @param {Record<string, any>} data
     * @param {string} label
     */
    /** @param {string} kind @param {Record<string, any>} data */
    const isEmpty = (kind, data) =>
      kind === 'energy' ? data.score === null && !data.reason : !data.text

    /**
     * @param {string} key
     * @param {string} kind
     * @param {Record<string, any>} data
     * @param {string} label
     */
    const stage = (key, kind, data, label) => {
      const existing = this.records[key]
      const filled = existing && !isEmpty(kind, existing.data)
      const same =
        kind === 'energy'
          ? existing?.data.score === data.score && existing?.data.reason === data.reason
          : existing?.data.text === data.text
      if (filled && !same) {
        skipped.push(label)
        return
      }
      if (same) return
      // **빈 값을 새 레코드로 쓰지 않는다.** `- 인지:` 같은 빈 줄이 지금 시각으로
      // 더티가 되면, 다른 기기가 이미 올려둔 점수를 올리기 한 번에 NULL로 덮는다.
      if (isEmpty(kind, data)) return
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
   */
  async applyImport(writes) {
    // 이 배열은 화면의 `$state`를 거쳐 오므로 **깊은 프록시**다. 프록시는
    // structured clone이 안 돼서 IndexedDB `put`이 `DataCloneError`로 터진다.
    // 저장소 경계를 넘기 전에 항상 벗긴다.
    const plain = writes.map((rec) => $state.snapshot(rec))
    await db.putRecords(plain)
    for (const rec of plain) this.records[rec.key] = rec
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

  /** 앱을 열 때 자동. **로컬을 파괴하지 않는다** (`D3`). */
  async pullNow() {
    // 타이핑 중에 pull이 끼어들면 안 된다. 먼저 커밋해서 더티로 만든다.
    this.flush()
    this.syncState = 'syncing'
    try {
      const since = (await db.getMeta('lastPulledAt')) ?? 0
      const res = await pull(since)
      if (res.relogin) {
        this.syncState = 'relogin'
        this.syncMessage = '로그인이 만료됐습니다. 새로고침하면 다시 로그인합니다.'
        return
      }
      /** @type {Rec[]} */
      const accepted = []
      for (const remote of res.records) {
        // 응답을 기다리는 동안 새로 시작된 입력도 로컬 편집이다.
        if (this.#hasPendingEdit(remote.key)) continue
        if (pullDecision(this.records[remote.key], remote).accept) {
          accepted.push({ ...remote, syncedAt: remote.updatedAt })
        }
      }
      await db.putRecords(accepted)
      for (const rec of accepted) this.records[rec.key] = rec
      await db.setMeta('lastPulledAt', res.now)
      this.syncState = 'idle'
      this.#say(accepted.length ? `${accepted.length}개 받음` : '')
    } catch {
      this.syncState = 'offline'
      this.syncMessage = ''
    }
  }

  /** 사람이 버튼을 눌렀을 때만 (`D3`, 불변식 2). */
  async pushNow() {
    this.flush()
    const sent = Object.values(this.records).filter(isDirty).map((r) => $state.snapshot(r))
    if (!sent.length) {
      // 상태도 함께 되돌린다. 안 그러면 직전 'offline' 표시에 묻혀 안 보인다.
      this.syncState = 'idle'
      this.#say('올릴 게 없습니다')
      return
    }
    this.syncState = 'syncing'
    /** @type {Record<string, Rec>} */
    const sentByKey = Object.create(null)
    for (const rec of sent) sentByKey[rec.key] = rec

    try {
      const res = await push(sent)
      if (res.relogin) {
        this.syncState = 'relogin'
        this.syncMessage = '로그인이 만료됐습니다. 새로고침하면 다시 로그인합니다.'
        return
      }
      /** @type {Rec[]} */
      const updates = []
      /** @type {import('./store.js').Conflict[]} */
      const newConflicts = []
      let raced = 0

      for (const verdict of res.verdicts) {
        const outbound = sentByKey[verdict.key]
        const local = this.records[verdict.key]
        if (!outbound || !local) continue

        // 왕복 중에 사용자가 그 블록을 또 고쳤다면 판정은 **보낸 판본에 대한 것**이라
        // 지금 값에 적용하면 안 된다. 더티로 남겨 다음 올리기에서 다시 보낸다.
        if (local.updatedAt !== outbound.updatedAt) {
          raced += 1
          continue
        }

        if (verdict.applied) {
          updates.push({ ...outbound, syncedAt: outbound.updatedAt })
        } else if (verdict.server) {
          const { live, conflict } = resolveRejected(outbound, verdict.server)
          updates.push(live)
          // 개정 스냅샷은 사용자가 그 순간 쓴 문장이 아니라 자동 밀봉본이다 (`F-3`).
          // 사본을 만들면 어느 블록에도 안 붙어 지울 수도 없는 배지가 된다.
          if (conflict && outbound.kind !== 'revision') newConflicts.push(conflict)
        }
      }

      await db.putRecords(updates)
      await db.addConflicts(newConflicts)
      for (const rec of updates) this.records[rec.key] = rec
      if (newConflicts.length) this.conflicts = await db.allConflicts()
      // **`lastPulledAt`을 여기서 옮기지 않는다.** push 응답은 내가 보낸 키의 판정만
      // 담고 있어서, 커서를 밀면 그 사이 서버에 생긴 다른 기기의 변경을 영영 건너뛴다.

      this.syncState = 'idle'
      this.#say(
        `${updates.length}개 올림` +
          (newConflicts.length ? `, 충돌 ${newConflicts.length}개` : '') +
          (raced ? `, ${raced}개는 편집 중이라 다음에` : ''),
      )
    } catch {
      this.syncState = 'offline'
      this.#say('네트워크가 없습니다')
    }
  }

  /** @param {number} id */
  async dismissConflict(id) {
    await db.dropConflict(id)
    this.conflicts = this.conflicts.filter((c) => c.id !== id)
  }
}
