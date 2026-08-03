// 워커의 D1 경계. **여기 있는 것 중 둘은 실제로 났던 결함이다** — 이길 때도 덮인 값을
// 실어 보내야 하는 것(`SC-6`)과, 레코드당 쿼리가 둘이라 호출당 상한에 걸리는 것.
//
// 본문은 **지어낸 문장**이다 (AGENTS.md `사용자 데이터를 다룰 때`).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { createD1 } from './d1.harness.js'
import { applyPush, pullSince, readOne, writeStatement } from './index.js'

/**
 * @param {string} key
 * @param {string} kind
 * @param {Record<string, any>} data
 * @param {number} updatedAt
 */
const rec = (key, kind, data, updatedAt) => ({ key, kind, data, updatedAt })

const log = (/** @type {string} */ date, /** @type {string} */ k, /** @type {string} */ text, /** @type {number} */ at) =>
  rec(`log:${date}:${k}`, 'log', { text }, at)

test('키를 테이블·컬럼으로 되돌린다 — 클라이언트와 같은 규칙이어야 한다', async () => {
  const db = createD1()
  await applyPush(db, [
    rec('energy:2026-08-03:인지', 'energy', { score: 7, reason: '지어낸 이유', scoredAt: 5 }, 100),
    log('2026-08-03', '오늘', '지어낸 로그', 100),
    rec('pinned', 'pinned', { text: '지어낸 고정 블록' }, 100),
    rec('revision:2026-08-03', 'revision', { text: '지어낸 밀봉본' }, 100),
  ])
  assert.deepEqual(db._rows.energy[0].date, '2026-08-03')
  assert.deepEqual(db._rows.energy[0].dim, '인지')
  assert.deepEqual(db._rows.log[0].kind, '오늘')
  assert.equal(db._rows.pinned.length, 1)
  assert.equal(db._rows.revision[0].day, '2026-08-03')

  // 되읽으면 같은 키로 돌아온다 — 왕복이 어긋나면 두 기기가 다른 행을 가리킨다.
  const back = await readOne(db, 'energy:2026-08-03:인지')
  assert.equal(back?.key, 'energy:2026-08-03:인지')
  assert.equal(back?.data.score, 7)
})

test('이겨서 덮었으면 덮인 값을 판정에 실어 보낸다 (SC-6)', async () => {
  // 안 실어 보내면 클라이언트가 사본을 못 만들고 진 쪽 글자가 어디에도 안 남는다.
  const db = createD1()
  await applyPush(db, [log('2026-08-03', '오늘', '먼저 올린 지어낸 문단', 100)])
  const verdicts = await applyPush(db, [log('2026-08-03', '오늘', '나중에 올린 지어낸 문단', 200)])
  assert.equal(verdicts[0].applied, true)
  assert.equal(verdicts[0].server?.data.text, '먼저 올린 지어낸 문단')
})

test('서버가 더 새로우면 거절하고 자기 값을 준다', async () => {
  const db = createD1()
  await applyPush(db, [log('2026-08-03', '오늘', '서버의 지어낸 문단', 300)])
  const verdicts = await applyPush(db, [log('2026-08-03', '오늘', '내 오래된 지어낸 문단', 200)])
  assert.equal(verdicts[0].applied, false)
  assert.equal(verdicts[0].server?.data.text, '서버의 지어낸 문단')
  assert.equal(db._rows.log[0].text, '서버의 지어낸 문단', '거절했으면 안 쓴다')
})

test('개정 스냅샷은 먼저 쓴 쪽이 남는다 (D11)', async () => {
  const db = createD1()
  await applyPush(db, [rec('revision:2026-08-03', 'revision', { text: '먼저 쓴 밀봉본' }, 100)])
  const verdicts = await applyPush(db, [rec('revision:2026-08-03', 'revision', { text: '나중 밀봉본' }, 200)])
  assert.equal(verdicts[0].applied, false, '안 썼으면 applied 를 주면 안 된다')
  assert.equal(db._rows.revision[0].text, '먼저 쓴 밀봉본')
})

test('레코드당 쿼리는 둘이다 — 호출당 상한이 첫 사용을 깨뜨린 근거다', async () => {
  // D1은 Worker 호출 하나당 쿼리 1000개(유료)가 상한이다. 이 비율이 바뀌면
  // 클라이언트의 PUSH_CHUNK(200)도 같이 다시 정해야 한다.
  const db = createD1()
  const batch = Array.from({ length: 50 }, (_, i) => log('2026-08-03', `블록${i}`, `지어낸 줄 ${i}`, 100))
  db._resetQueries()
  await applyPush(db, batch)
  assert.equal(db._queries(), 100, '읽기 50 + 쓰기 50')
})

test('pull 은 레코드 수와 무관하게 쿼리 넷이다', async () => {
  const db = createD1()
  await applyPush(db, Array.from({ length: 30 }, (_, i) => log('2026-08-03', `블록${i}`, `지어낸 줄 ${i}`, 100)))
  db._resetQueries()
  const out = await pullSince(db, 0)
  assert.equal(db._queries(), 4, '종류당 하나씩')
  assert.equal(out.length, 30)
})

test('커서는 synced_at 으로만 긁는다 (F-9)', async () => {
  // `updated_at`으로 긁으면 오프라인에서 어제 쓰고 오늘 올린 행이 이미 커서보다
  // 뒤에 있어 **다른 기기에 영영 안 간다.**
  const db = createD1()
  await applyPush(db, [log('2026-08-01', '오늘', '어제 쓰고 오늘 올린 지어낸 문단', 1)])
  const written = db._rows.log[0]
  assert.ok(written.synced_at > written.updated_at, '서버가 찍은 시각이 더 크다')
  assert.equal((await pullSince(db, written.updated_at)).length, 1, 'updated_at 기준으로도 잡힌다')
  assert.equal((await pullSince(db, written.synced_at)).length, 0, 'synced_at 이 커서다')
})

test('판정~커밋 창에 끼어든 오래된 판본이 최신을 덮지 않는다 (불변식 3)', async () => {
  // `readOne` 루프는 `db.batch` 밖에서 돈다. 폰과 PC가 그 창 안에서 각각 올리면 둘 다
  // 같은 옛 값을 읽고 둘 다 `applied`를 받는다 — 예전엔 나중에 커밋한 쪽이 **더 오래된
  // 판본이어도** 최신을 덮었다. 그러면 이긴 기기는 비-더티가 되고 이후 pull이 `stale`로
  // 떨궈 그 문장이 영영 전파되지 않으며, 응답의 `server`는 덮이기 전 값이라 `SC-6` 사본도
  // 안 생긴다. 신호가 하나도 없다.
  const db = createD1()
  await applyPush(db, [log('2026-08-03', '오늘', '서버에 있던 지어낸 문단', 500)])

  // 두 요청이 겹친다: 둘 다 500을 읽고, 폰(1000)이 먼저 커밋한 뒤 PC(900)가 커밋한다.
  const phone = applyPush(db, [log('2026-08-03', '오늘', '폰에서 쓴 지어낸 문단', 1000)])
  const pc = applyPush(db, [log('2026-08-03', '오늘', 'PC에서 쓴 지어낸 문단', 900)])
  const [phoneVerdicts, pcVerdicts] = await Promise.all([phone, pc])

  assert.equal(phoneVerdicts[0].applied, true)
  assert.equal(pcVerdicts[0].applied, true, '둘 다 같은 옛 값을 읽었으므로 판정은 둘 다 통과다')
  assert.equal(db._rows.log[0].text, '폰에서 쓴 지어낸 문단', '더 새로운 판본이 서버에 남는다')
  assert.equal(db._rows.log[0].updated_at, 1000)
})

test('안 쓴 레코드에 applied 를 주지 않는다', () => {
  // 주면 클라이언트가 syncedAt 을 붙여 영원히 비-더티로 만든다 — 서버엔 행이 없는데
  // 로컬은 올렸다고 믿는다.
  const db = createD1()
  assert.equal(writeStatement(db, rec('알수없음:x', 'log', { text: 'x' }, 1), 1), null)
})
