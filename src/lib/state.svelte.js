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

  /** @type {string} */
  syncMessage = $state('')

  pinnedOpen = $state(false)

  loaded = $state(false)

  /** @type {Record<string, ReturnType<typeof setTimeout>>} 반응형 상태가 아니다 */
  #timers = Object.create(null)

  async load() {
    const [records, conflicts] = await Promise.all([db.allRecords(), db.allConflicts()])
    /** @type {Record<string, Rec>} */
    const map = {}
    for (const rec of records) map[rec.key] = rec
    this.records = map
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
    if (next === prev) return
    this.records[next.key] = next
    db.putRecord($state.snapshot(next))
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
    this.#snapshotPinnedIfNeeded()
    this.#pending['pinned'] = text
    this.#saveTextSoon('pinned', 'pinned', text)
  }

  #snapshotPinnedIfNeeded() {
    const today = kstDate()
    const last = this.revisions()[0]
    const lastDay = last ? last.key.slice('revision:'.length) : null
    if (!needsSnapshot(lastDay, today)) return
    const current = this.pinned()
    if (!current.data.text) return // 밀봉할 직전 내용이 없다
    const key = recordKey('revision', today)
    const rec = { key, kind: 'revision', data: { text: current.data.text }, updatedAt: Date.now(), syncedAt: 0 }
    this.records[key] = rec
    db.putRecord(rec)
  }

  /**
   * 점수는 라디오로만 편집된다 (`D1` 직교성). 같은 점수를 다시 누르면 해제된다.
   *
   * @param {string} dim
   * @param {number} score
   */
  toggleScore(dim, score) {
    const prev = this.energy(dim)
    const next = prev.data.score === score ? null : score
    this.#commit(prev, nextEnergy(prev, { score: next }, Date.now()))
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
      const prev = this.energy(dim)
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

  /** 전체. 같은 조립 함수에 범위만 다르게 준 것이다 (`D13`). */
  exportAll() {
    this.flush()
    /** @type {Record<string, true>} */
    const dates = Object.create(null)
    for (const rec of Object.values(this.records)) {
      const m = /^(?:energy|log):(\d{4}-\d{2}-\d{2}):/.exec(rec.key)
      if (m) dates[m[1]] = true
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
    const stage = (key, kind, data, label) => {
      const existing = this.records[key]
      const filled =
        kind === 'energy'
          ? existing && (existing.data.score !== null || existing.data.reason)
          : existing && existing.data.text
      const same =
        kind === 'energy'
          ? existing?.data.score === data.score && existing?.data.reason === data.reason
          : existing?.data.text === data.text
      if (filled && !same) {
        skipped.push(label)
        return
      }
      if (same) return
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
          { score: e.score, reason: e.reason, scoredAt: e.score === null ? null : now },
          `${day.date} 에너지/${e.dim}`,
        )
      }
      for (const l of day.logs) {
        stage(recordKey('log', day.date, l.kind), 'log', { text: l.text }, `${day.date} ${l.kind}`)
      }
    }

    return { days: journal.days.length, unparsed: journal.unparsed, writes, skipped }
  }

  /** @param {Rec[]} writes */
  async applyImport(writes) {
    await db.putRecords(writes)
    for (const rec of writes) this.records[rec.key] = rec
  }

  // ── 동기화 ──────────────────────────────────────────────────────────────

  /** 앱을 열 때 자동. **로컬을 파괴하지 않는다** (`D3`). */
  async pullNow() {
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
        if (pullDecision(this.records[remote.key], remote).accept) {
          accepted.push({ ...remote, syncedAt: remote.updatedAt })
        }
      }
      await db.putRecords(accepted)
      for (const rec of accepted) this.records[rec.key] = rec
      await db.setMeta('lastPulledAt', res.now)
      this.syncState = 'idle'
      this.syncMessage = accepted.length ? `${accepted.length}개 받음` : ''
    } catch {
      this.syncState = 'offline'
      this.syncMessage = ''
    }
  }

  /** 사람이 버튼을 눌렀을 때만 (`D3`, 불변식 2). */
  async pushNow() {
    this.flush()
    const dirty = Object.values(this.records).filter(isDirty)
    if (!dirty.length) {
      this.syncMessage = '올릴 게 없습니다'
      return
    }
    this.syncState = 'syncing'
    try {
      const res = await push(dirty.map((r) => $state.snapshot(r)))
      if (res.relogin) {
        this.syncState = 'relogin'
        this.syncMessage = '로그인이 만료됐습니다. 새로고침하면 다시 로그인합니다.'
        return
      }
      const now = Date.now()
      /** @type {Rec[]} */
      const updates = []
      /** @type {import('./store.js').Conflict[]} */
      const newConflicts = []

      for (const verdict of res.verdicts) {
        const local = this.records[verdict.key]
        if (!local) continue
        if (verdict.applied) {
          updates.push({ ...$state.snapshot(local), syncedAt: local.updatedAt })
        } else if (verdict.server) {
          const { live, conflict } = resolveRejected($state.snapshot(local), verdict.server)
          updates.push(live)
          if (conflict) newConflicts.push(conflict)
        }
      }

      await db.putRecords(updates)
      await db.addConflicts(newConflicts)
      for (const rec of updates) this.records[rec.key] = rec
      if (newConflicts.length) this.conflicts = await db.allConflicts()
      await db.setMeta('lastPulledAt', res.now ?? now)

      this.syncState = 'idle'
      this.syncMessage = newConflicts.length
        ? `${updates.length}개 올림, 충돌 ${newConflicts.length}개`
        : `${updates.length}개 올림`
    } catch {
      this.syncState = 'offline'
      this.syncMessage = '네트워크가 없습니다'
    }
  }

  /** @param {number} id */
  async dismissConflict(id) {
    await db.dropConflict(id)
    this.conflicts = this.conflicts.filter((c) => c.id !== id)
  }
}
