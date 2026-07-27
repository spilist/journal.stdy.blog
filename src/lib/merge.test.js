import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  countDirty,
  describe,
  isDirty,
  isDiverged,
  needsSnapshot,
  nextEnergy,
  nextPullCursor,
  nextText,
  pullDecision,
  pushVerdict,
  recordKey,
  resolveRejected,
} from './merge.js'

/**
 * @param {Partial<import('./merge.js').Rec>} [over]
 * @returns {import('./merge.js').Rec}
 */
const log = (over = {}) => ({
  key: 'log:2026-03-01:오늘',
  kind: 'log',
  data: { text: '기본' },
  updatedAt: 1000,
  syncedAt: 1000,
  ...over,
})

test('recordKey', () => {
  assert.equal(recordKey('energy', '2026-03-01', '인지'), 'energy:2026-03-01:인지')
  assert.equal(recordKey('pinned'), 'pinned')
})

test('더티는 updatedAt > syncedAt 이다', () => {
  assert.equal(isDirty(log()), false)
  assert.equal(isDirty(log({ updatedAt: 2000 })), true)
  assert.equal(isDirty(log({ syncedAt: undefined })), true)
  assert.equal(countDirty([log(), log({ updatedAt: 2000 }), log({ updatedAt: 3000 })]), 2)
})

test('pull은 더티 로컬을 건너뛴다 — 자동 동작은 충돌을 만들지 않는다 (AC-6)', () => {
  const local = log({ updatedAt: 5000, syncedAt: 1000 })
  const remote = log({ updatedAt: 9000, data: { text: '서버' } })
  assert.deepEqual(pullDecision(local, remote), { accept: false, reason: 'local-dirty' })
})

test('pull은 깨끗한 로컬만 더 새 값으로 덮는다', () => {
  assert.equal(pullDecision(undefined, log()).accept, true)
  assert.equal(pullDecision(log(), log({ updatedAt: 2000 })).accept, true)
  assert.equal(pullDecision(log({ updatedAt: 3000, syncedAt: 3000 }), log()).accept, false)
})

test('내가 방금 올린 판본이 도로 오는 건 분기가 아니다 — 메아리다', () => {
  // push는 커서를 안 옮기므로(F-3) 올린 뒤 계속 편집하면 이 상황이 매번 온다.
  const local = log({ updatedAt: 9000, syncedAt: 5000 })
  assert.equal(isDiverged(local, log({ updatedAt: 5000 })), false)
})

test('본 적 없는 원격 판본만 분기다', () => {
  const local = log({ updatedAt: 9000, syncedAt: 5000 })
  assert.equal(isDiverged(local, log({ updatedAt: 7000 })), true)
  // 로컬에 없으면 그냥 받으면 된다 — 갈릴 게 없다.
  assert.equal(isDiverged(undefined, log({ updatedAt: 7000 })), false)
})

test('revision은 분기로 세지 않는다 — 해소해도 확인할 결과가 없다', () => {
  const local = log({ kind: 'revision', updatedAt: 9000, syncedAt: 0 })
  assert.equal(isDiverged(local, log({ kind: 'revision', updatedAt: 7000 })), false)
})

test('건너뛴 게 없으면 커서는 서버 시각까지 간다', () => {
  assert.equal(nextPullCursor(9000, []), 9000)
})

test('건너뛴 게 있으면 커서를 그 앞에 세운다 — 안 그러면 분기가 영영 안 보인다', () => {
  // 다음 pull이 5000짜리를 다시 실어와야 한다 (`updated_at > since`).
  assert.equal(nextPullCursor(9000, [log({ updatedAt: 7000 }), log({ updatedAt: 5000 })]), 4999)
})

test('커서는 서버 시각을 넘지 않는다', () => {
  assert.equal(nextPullCursor(3000, [log({ updatedAt: 9000 })]), 3000)
})

test('push는 더 새로운 쪽만 쓴다', () => {
  assert.equal(pushVerdict(undefined, log()).applied, true)
  assert.equal(pushVerdict(log(), log({ updatedAt: 2000 })).applied, true)
  assert.equal(pushVerdict(log({ updatedAt: 2000 }), log()).applied, false)
})

test('revision은 추가 전용이라 먼저 쓴 쪽이 남는다 (D11)', () => {
  const rev = { key: 'revision:2026-03-01', kind: 'revision', data: { text: 'a' }, updatedAt: 5000 }
  assert.equal(pushVerdict(undefined, rev).applied, true)
  assert.equal(pushVerdict({ ...rev, data: { text: 'b' }, updatedAt: 1 }, rev).applied, false)
})

test('거절되면 서버 값을 채택하고 진 쪽은 사본으로 남는다 (AC-6, D12)', () => {
  const mine = log({ updatedAt: 5000, data: { text: '폰에서 쓴 줄' } })
  const theirs = log({ updatedAt: 9000, data: { text: '데스크톱에서 쓴 줄' } })
  const { live, conflict } = resolveRejected(mine, theirs)

  assert.equal(live.data.text, '데스크톱에서 쓴 줄')
  assert.equal(isDirty(live), false)
  assert.ok(conflict)
  assert.equal(conflict.text, '폰에서 쓴 줄')
  assert.equal(conflict.target, 'log:2026-03-01:오늘')
})

test('내용이 같으면 사본을 만들지 않는다 — 해소할 게 없는 배지는 잡음이다', () => {
  const mine = log({ updatedAt: 5000, data: { text: '같은 줄' } })
  const theirs = log({ updatedAt: 9000, data: { text: '같은 줄' } })
  assert.equal(resolveRejected(mine, theirs).conflict, null)
})

test('내용이 같으면 updatedAt이 안 움직인다 — 가짜 더티가 LWW를 오염시킨다 (AC-7)', () => {
  const prev = log({ data: { text: '그대로' } })
  assert.equal(nextText(prev, '그대로', 9999), prev)
  assert.equal(nextText(prev, '달라짐', 9999).updatedAt, 9999)
})

/**
 * @param {Partial<import('./merge.js').Rec>} [over]
 * @returns {import('./merge.js').Rec}
 */
const energy = (over = {}) => ({
  key: 'energy:2026-03-01:인지',
  kind: 'energy',
  data: { score: 7, reason: '괜찮았다', scoredAt: 1000 },
  updatedAt: 1000,
  syncedAt: 1000,
  ...over,
})

test('이유만 고치면 scoredAt이 안 움직인다 (AC-7, D15)', () => {
  const next = nextEnergy(energy(), { reason: '괜찮았다고 본다' }, 9999)
  assert.equal(next.data.scoredAt, 1000)
  assert.equal(next.updatedAt, 9999)
})

test('점수가 바뀌면 scoredAt이 움직인다', () => {
  const next = nextEnergy(energy(), { score: 5 }, 9999)
  assert.equal(next.data.scoredAt, 9999)
  assert.equal(next.data.reason, '괜찮았다')
})

test('점수 해제(null)도 값 변경이다', () => {
  const next = nextEnergy(energy(), { score: null }, 9999)
  assert.equal(next.data.score, null)
  assert.equal(next.data.scoredAt, 9999)
})

test('아무것도 안 바뀌면 같은 객체다', () => {
  const prev = energy()
  assert.equal(nextEnergy(prev, { score: 7, reason: '괜찮았다' }, 9999), prev)
})

test('충돌 사본 표시 문자열', () => {
  assert.equal(describe(energy()), '7. 괜찮았다')
  assert.equal(describe(energy({ data: { score: null, reason: '' } })), '—. ')
  assert.equal(describe(log()), '기본')
})

test('개정 스냅샷은 하루에 하나다 (AC-8, D11)', () => {
  assert.equal(needsSnapshot(null, '2026-03-01'), true)
  assert.equal(needsSnapshot('2026-02-28', '2026-03-01'), true)
  assert.equal(needsSnapshot('2026-03-01', '2026-03-01'), false)
})
