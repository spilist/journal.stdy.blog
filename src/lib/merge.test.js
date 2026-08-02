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
  hasContent,
  overwritesUnseen,
  preserveOverwritten,
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
  assert.equal(nextPullCursor(1000, 9000, []), 9000)
})

test('붙잡을 게 있으면 커서를 안 옮긴다 — 다음 pull이 그 행을 다시 실어온다', () => {
  assert.equal(nextPullCursor(1000, 9000, [log({ updatedAt: 7000 })]), 1000)
})

test('커서는 원격 updatedAt(클라이언트 시계)을 근거로 삼지 않는다 (F-9)', () => {
  // 기기 시계가 서버보다 앞선 행. 예전 규칙(`updatedAt - 1`)이면 커서가 그 행의
  // `synced_at`을 넘어가 **영영 못 받았다.**
  assert.equal(nextPullCursor(1000, 3000, [log({ updatedAt: 9_999_999 })]), 1000)
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

test('진 쪽이 비어 있으면 사본을 만들지 않는다 — 옮길 문장이 없는 배지다 (F-8)', () => {
  const mine = log({ updatedAt: 5000, data: { text: '' } })
  const theirs = log({ updatedAt: 9000, data: { text: '서버가 가진 줄' } })
  const { live, conflict } = resolveRejected(mine, theirs)
  assert.equal(conflict, null)
  assert.equal(live.data.text, '서버가 가진 줄')
})

test('hasContent — 빈 레코드는 글자가 아니다 (F-8)', () => {
  assert.equal(hasContent({ kind: 'log', data: { text: '' } }), false)
  assert.equal(hasContent({ kind: 'log', data: { text: 'ㅇ' } }), true)
  assert.equal(hasContent({ kind: 'energy', data: { score: null, reason: '' } }), false)
  // 0점은 없다(1..10)지만, 있더라도 값이 있는 것으로 센다.
  assert.equal(hasContent({ kind: 'energy', data: { score: 0, reason: '' } }), true)
  assert.equal(hasContent({ kind: 'energy', data: { score: null, reason: '피곤' } }), true)
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

test('push가 이겨도 못 본 값을 덮었으면 사본이 남는다 (SC-6)', () => {
  // 노트북이 A를 올려둔 걸 폰이 못 본 채 B를 쓰고 이긴 경우. 사본이 없으면 A가
  // 서버에도 두 기기에도 안 남는다 — 둘 다 push했는데 진 쪽이 사라진다.
  const server = log({ data: { text: '노트북에서 쓴 지어낸 문단' }, updatedAt: 100, syncedAt: 100 })
  const outbound = log({ data: { text: '폰에서 쓴 지어낸 문단' }, updatedAt: 200, syncedAt: 50 })
  assert.equal(overwritesUnseen(outbound, server), true)
  assert.deepEqual(preserveOverwritten(outbound, server), {
    target: 'log:2026-03-01:오늘',
    text: '노트북에서 쓴 지어낸 문단',
    at: 100,
  })
})

test('pull로 받아 그 위에 고친 정상 편집은 사본을 만들지 않는다', () => {
  // 이걸 못 가르면 편집 한 번에 배지 하나가 쌓인다. 갈라주는 건 syncedAt이다 —
  // 서버의 지금 판본을 이미 봤으면 내 편집은 그 위에 얹은 것이다.
  const server = log({ data: { text: '받아온 지어낸 문단' }, updatedAt: 100, syncedAt: 100 })
  const outbound = log({ data: { text: '그 위에 고친 문단' }, updatedAt: 200, syncedAt: 100 })
  assert.equal(overwritesUnseen(outbound, server), false)
  assert.equal(preserveOverwritten(outbound, server), null)
})

test('서버에 행이 없거나 revision이면 사본을 만들지 않는다', () => {
  assert.equal(overwritesUnseen(log({ syncedAt: 0 }), undefined), false)
  const snap = log({ key: 'revision:2026-03-01', kind: 'revision', updatedAt: 200, syncedAt: 0 })
  const server = log({ key: 'revision:2026-03-01', kind: 'revision', updatedAt: 100, syncedAt: 100 })
  assert.equal(overwritesUnseen(snap, server), false)
})

test('덮인 쪽이 비었거나 내용이 같으면 사본을 만들지 않는다 — 배지는 잡음이다', () => {
  const outbound = log({ data: { text: '지어낸 문단' }, updatedAt: 200, syncedAt: 50 })
  const empty = log({ data: { text: '' }, updatedAt: 100, syncedAt: 100 })
  assert.equal(preserveOverwritten(outbound, empty), null)
  const same = log({ data: { text: '지어낸 문단' }, updatedAt: 100, syncedAt: 100 })
  assert.equal(preserveOverwritten(outbound, same), null)
})

test('거절 경로와 이긴 경로가 서로의 거울이다 — 어느 쪽이 져도 글자가 남는다 (SC-6)', () => {
  const mine = log({ data: { text: '내가 쓴 지어낸 문단' }, updatedAt: 200, syncedAt: 50 })
  const theirs = log({ data: { text: '저쪽이 쓴 지어낸 문단' }, updatedAt: 300, syncedAt: 300 })
  // 내가 지면 내 글자가 사본으로
  assert.equal(resolveRejected(mine, theirs).conflict?.text, '내가 쓴 지어낸 문단')
  // 내가 이기면 저쪽 글자가 사본으로
  const older = log({ data: { text: '저쪽이 쓴 지어낸 문단' }, updatedAt: 100, syncedAt: 100 })
  assert.equal(preserveOverwritten(mine, older)?.text, '저쪽이 쓴 지어낸 문단')
})

test('올린 판본까지 syncedAt이 올라가면 내 글자가 사본이 되지 않는다 (raced 회귀)', () => {
  // 올리기 왕복 중에 계속 타이핑하면 raced가 된다. 그때 syncedAt을 그대로 두면
  // 다음 push가 **내가 방금 올린 내 글자**를 「못 본 값」으로 오해한다 —
  // merge.js가 피하려던 「편집 한 번에 배지 하나」가 정확히 여기서 난다.
  const serverGotMine = log({ data: { text: '내가 방금 올린 B' }, updatedAt: 2000, syncedAt: 2000 })
  const stale = log({ data: { text: '그 뒤 계속 친 C' }, updatedAt: 3000, syncedAt: 1000 })
  assert.equal(overwritesUnseen(stale, serverGotMine), true, '고치기 전이면 사본이 생긴다')

  const bumped = { ...stale, syncedAt: Math.max(stale.syncedAt ?? 0, 2000) }
  assert.equal(overwritesUnseen(bumped, serverGotMine), false)
  assert.equal(preserveOverwritten(bumped, serverGotMine), null)
  // 더티는 유지된다 — 지금 값이 더 새로우므로 다음 올리기에서 다시 간다.
  assert.equal(isDirty(bumped), true)
  // 같은 수정이 거짓 분기 배너도 닫는다 — 내 메아리를 분기로 세지 않는다.
  assert.equal(isDiverged(bumped, serverGotMine), false)
})

test('syncedAt을 올려도 남이 쓴 못 본 값은 여전히 사본이 된다 (SC-6 유지)', () => {
  const theirs = log({ data: { text: '다른 기기가 쓴 A' }, updatedAt: 2500, syncedAt: 2500 })
  const mine = log({ data: { text: '내가 쓴 C' }, updatedAt: 3000, syncedAt: 2000 })
  assert.equal(overwritesUnseen(mine, theirs), true)
  assert.equal(preserveOverwritten(mine, theirs)?.text, '다른 기기가 쓴 A')
})

test('전선 형태(syncedAt 없음)로는 판정할 수 없다 — 그래서 워커가 아니라 클라이언트가 한다', () => {
  // sync.js가 syncedAt을 벗겨 보내므로 서버 쪽 판정은 항상 참이 된다. 이 성질을
  // 못 박아두지 않으면 "워커에서 걸러 페이로드를 아낀다"는 잘못된 최적화가 다시 들어온다.
  const wire = { key: 'log:2026-03-01:오늘', kind: 'log', data: { text: 'C' }, updatedAt: 3000 }
  const server = log({ data: { text: 'B' }, updatedAt: 2000, syncedAt: 2000 })
  assert.equal(overwritesUnseen(/** @type {any} */ (wire), server), true, '전선에서는 항상 참')
  // 같은 상황이라도 syncedAt을 아는 클라이언트는 정확히 판정한다.
  assert.equal(overwritesUnseen({ ...wire, syncedAt: 2000 }, server), false)
})
