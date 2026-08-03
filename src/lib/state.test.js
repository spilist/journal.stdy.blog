// `state.svelte.js`의 동기화 경로. **여기 있는 케이스는 전부 실제로 났던 결함이다** —
// 2026-08-03 하루에 자초한 넷 중 셋이 이 파일에서 났고, 그때 이 테스트가 없었다.
//
// 본문은 **지어낸 문장**이다 (AGENTS.md `사용자 데이터를 다룰 때`).

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { freshJournal } from './state.harness.js'

const KEY = 'log:2026-08-03:오늘'

/**
 * @param {string} text
 * @param {number} updatedAt
 * @param {number} syncedAt
 */
const rec = (text, updatedAt, syncedAt) => ({
  key: KEY,
  kind: 'log',
  data: { text },
  updatedAt,
  syncedAt,
})

test('하네스가 실제 Journal 을 돌린다', async () => {
  const { journal } = await freshJournal()
  assert.equal(journal.today, journal.date)
  assert.equal(journal.dirtyCount(), 0)
})

test('「올리기」를 두 번 눌러도 한 번만 간다 — 겹치면 내 글자가 충돌 사본이 된다', async () => {
  // 겹쳐 돌면 먼저 도착한 쪽이 서버에 써지고, 나중 쪽이 그걸 「이 기기가 못 본 값」으로
  // 읽어 **방금 내가 올린 내 글자**를 사본으로 만든다.
  const { journal, store, sync } = await freshJournal()
  sync.roundTrip(30)
  journal.records[KEY] = rec('지어낸 첫 문장', 100, 50)

  const first = journal.pushNow()
  await new Promise((r) => setTimeout(r, 5))
  journal.records[KEY] = rec('지어낸 첫 문장 이어서', 200, 50)
  const second = journal.pushNow()
  await Promise.all([first, second])

  assert.equal(sync.calls.length, 1, '두 번째 누름은 무시된다')
  assert.deepEqual(store.conflicts, [], '내 글자가 사본이 되면 안 된다')
})

test('저장이 실패해도 덮인 남의 글자는 사본으로 남는다 (SC-6, 불변식 3)', async () => {
  // 사본을 레코드보다 **나중에** 쓰면, 앞이 던졌을 때 사본이 통째로 사라진다.
  // 그 사본은 남은 유일한 판본이라 재시도해도 안 되살아난다.
  const { journal, store, sync } = await freshJournal()
  sync.server.set(KEY, rec('다른 기기가 쓴 지어낸 문단', 150, 150))
  journal.records[KEY] = rec('내가 쓴 지어낸 문단', 200, 100)
  store.failWrites(true)

  await journal.pushNow()

  assert.deepEqual(
    store.conflicts.map((c) => c.text),
    ['다른 기기가 쓴 지어낸 문단'],
  )
  assert.equal(journal.syncState, 'error')
  assert.ok(journal.storageError, '저장 실패는 화면에 남는다')
})

test('올리는 동안 친 문장이 응답에 덮이지 않는다 (불변식 3)', async () => {
  // 왕복과 저장 두 `await` 사이에 디바운스 타이머가 커밋할 수 있다. 그대로 대입하면
  // 방금 친 문장이 화면에서 사라지고 **더티 표시까지 꺼져** 신호가 하나도 없다.
  const { journal, store, sync } = await freshJournal()
  sync.roundTrip(60)
  store.writeDelay(60)
  journal.records[KEY] = rec('지어낸 첫 문장', 100, 50)

  const pushing = journal.pushNow()
  await new Promise((r) => setTimeout(r, 80))
  journal.records[KEY] = rec('지어낸 첫 문장\n올리는 중에 친 문장', 900, 50)
  await pushing

  assert.equal(journal.records[KEY].data.text, '지어낸 첫 문장\n올리는 중에 친 문장')
})

test('더티를 PUSH_CHUNK 씩 쪼개 보낸다 — D1 호출당 쿼리 상한 (첫 사용 경로)', async () => {
  // 쪼개지 않으면 기존 저널을 통째로 가져온 뒤의 첫 「올리기」가 결정적으로 깨진다.
  const { journal, sync } = await freshJournal()
  for (let i = 0; i < 450; i++) {
    const key = `log:2026-01-${String((i % 28) + 1).padStart(2, '0')}:${i}`
    journal.records[key] = { key, kind: 'log', data: { text: `지어낸 줄 ${i}` }, updatedAt: 100, syncedAt: 0 }
  }

  await journal.pushNow()

  assert.equal(sync.calls.length, 3, '450개는 200+200+50 세 묶음이다')
  assert.deepEqual(
    sync.calls.map((c) => c.length),
    [200, 200, 50],
  )
  assert.equal(sync.server.size, 450, '전부 올라간다')
})

test('묶음 도중 세션이 끊겨도 앞 묶음은 남는다 — 다시 누르면 남은 것만 간다', async () => {
  // 통짜 요청은 999개가 성공해도 전부 없던 일이 됐다. 쪼개면 부분 진척이 남는다.
  const { journal, store, sync } = await freshJournal()
  for (let i = 0; i < 300; i++) {
    const key = `log:2026-02-${String((i % 28) + 1).padStart(2, '0')}:${i}`
    journal.records[key] = { key, kind: 'log', data: { text: `지어낸 줄 ${i}` }, updatedAt: 100, syncedAt: 0 }
  }
  sync.expireFromCall(2) // 첫 묶음은 통과, 두 번째에서 끊긴다

  await journal.pushNow()

  assert.equal(journal.syncState, 'relogin')
  assert.equal(sync.server.size, 200, '앞 묶음은 서버에 남는다')
  assert.equal(store.records.size, 200, '앞 묶음은 로컬에도 기록된다')
  assert.equal(journal.dirtyCount(), 100, '남은 것만 더티로 남는다')

  // 세션이 돌아오면 남은 100개만 간다.
  sync.expireFromCall(-1)
  const before = sync.calls.length
  await journal.pushNow()
  assert.equal(sync.calls.length - before, 1, '남은 100개는 한 묶음이다')
  assert.equal(sync.calls.at(-1)?.length, 100)
  assert.equal(journal.dirtyCount(), 0)
})
