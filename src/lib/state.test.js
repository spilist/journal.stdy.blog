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

// ── 2026-08-03 공격적 품질 라운드에서 나온 것 ────────────────────────────────

test('가져오기는 미리보기 뒤에 생긴 글자를 덮지 않는다 (불변식 3)', async () => {
  // 가져오기 패널은 모달이 아니라 본문 블록 **아래에** 열려 있다. 미리보기를 내고
  // 위로 올라가 「오늘」에 한 줄 쓰는 게 정상 경로다. 미리보기 시점의 판정을 저장
  // 때 그대로 쓰면 방금 친 문장이 파일 내용으로 대체되는데, 여기엔 충돌 사본도
  // 되돌리기도 없다.
  const { journal, store } = await freshJournal()
  const preview = journal.previewImport('# 26-08-03\n\n## 오늘\n파일에 있던 지어낸 문단\n')
  assert.equal(preview.writes.length, 1, '빈 상태에서는 쓸 항목이 하나다')

  // 미리보기와 저장 사이에 사용자가 그 블록을 쓴다 (또는 자동 pull이 채운다).
  journal.records[KEY] = rec('미리보기 뒤에 친 지어낸 문장', 500, 0)

  const result = await journal.applyImport(preview.writes)

  assert.equal(journal.records[KEY].data.text, '미리보기 뒤에 친 지어낸 문장', '친 글자가 남는다')
  assert.equal(store.records.get(KEY), undefined, '디스크에도 파일 값이 안 써진다')
  assert.deepEqual(result, { written: 0, skipped: 1 }, '건너뛴 개수를 사실대로 돌려준다')
})

test('가져오기는 미리보기 때 비어 있던 자리에는 그대로 쓴다', async () => {
  // 위 가드가 정상 경로까지 막으면 안 된다.
  const { journal, store } = await freshJournal()
  const preview = journal.previewImport('# 26-08-03\n\n## 오늘\n파일에 있던 지어낸 문단\n')

  const result = await journal.applyImport(preview.writes)

  assert.deepEqual(result, { written: 1, skipped: 0 })
  assert.equal(store.records.get(KEY)?.data.text, '파일에 있던 지어낸 문단')
})

test('다른 탭이 쓴 판본을 덮지 않는다 — 진 쪽은 사본으로 남는다 (불변식 3)', async () => {
  // 탭 둘을 열어두면 pull(서버만 읽는다)로도 `#load`(마운트에 한 번)로도 서로의
  // 판본이 안 들어온다. 그래서 나중에 커밋한 탭이 앞 탭의 글자를 신호 없이 덮었다.
  const { journal, store } = await freshJournal()
  // 탭 B가 디스크에 써 둔 판본. 이 탭(A)의 메모리에는 없다.
  store.records.set(KEY, rec('다른 탭이 쓴 지어낸 문단', 300, 0))
  journal.records[KEY] = rec('이 탭이 쓴 지어낸 문단', 200, 0)

  await journal.reload()

  assert.equal(journal.records[KEY].data.text, '다른 탭이 쓴 지어낸 문단', '늦게 쓴 쪽이 산다')
  assert.deepEqual(
    store.conflicts.map((c) => c.text),
    ['이 탭이 쓴 지어낸 문단'],
    '진 쪽 글자가 사본으로 남는다',
  )
  assert.equal(journal.conflicts.length, 1, '화면에도 바로 붙는다')
})

test('다시 읽기가 디바운스 중인 입력을 디스크 판본으로 밀지 않는다', async () => {
  // 아직 커밋 안 된 글자를 디스크 판본으로 덮으면 화면에서 글자가 사라진다.
  const { journal, store } = await freshJournal()
  store.records.set(KEY, rec('디스크에 있던 지어낸 문단', 300, 0))
  journal.records[KEY] = rec('이 탭이 쓴 지어낸 문단', 200, 0)
  journal.setLog('오늘', '아직 커밋 안 된 지어낸 문장')

  await journal.reload()

  assert.equal(journal.records[KEY].data.text, '이 탭이 쓴 지어낸 문단', '입력 중인 키는 건드리지 않는다')
  assert.deepEqual(store.conflicts, [], '사본도 만들지 않는다')
})

test('2000~2099 밖 날짜로는 이동하지 않는다 — export 형식이 두 자리 연도다', async () => {
  // 데스크톱 `input[type=date]`의 연 칸에 `0226`을 치면 모양 가드만으로는 통과한다.
  // 그날에 쓴 글은 「전체 내려받기」에서 진짜 2026년 그날과 **같은 `# 26-08-03` 두 개**로
  // 나가고, 그 파일을 다시 가져오면 하나가 「파일에 두 번 나옴」으로 건너뛰어진다.
  // 같은 가드가 그래프의 전체 스팬 루프(earliest→today를 하루씩)도 지킨다.
  const { journal } = await freshJournal()
  const before = journal.date

  journal.goTo('0226-08-03')
  assert.equal(journal.date, before, '연도가 20xx가 아니면 이동하지 않는다')
  journal.goTo('9999-08-03')
  assert.equal(journal.date, before)
  journal.goTo('')
  assert.equal(journal.date, before, '지우기 버튼의 빈 문자열도 그대로 막는다')

  journal.goTo('2026-08-03')
  assert.equal(journal.date, '2026-08-03', '정상 날짜는 지나간다')
})

test('로컬을 못 읽었으면 pull이 아무것도 쓰지 않는다 (불변식 3)', async () => {
  // 부분 실패로 `records`가 비면 모든 원격 키가 `new` 로 수락되는데, 디스크에는
  // 아직 안 올린 로컬 판본이 그대로 있다 — 그대로 쓰면 서버의 **옛** 판본이 덮는다.
  const { journal, store, sync } = await freshJournal()
  store.records.set(KEY, rec('아직 안 올린 지어낸 문장', 500, 100))
  sync.server.set(KEY, rec('서버에 있던 옛 지어낸 문장', 100, 100))
  store.failReads(true)

  await journal.load()
  assert.ok(journal.storageError, '로컬 실패는 화면에 남는다')

  await journal.pullNow()

  assert.equal(
    store.records.get(KEY)?.data.text,
    '아직 안 올린 지어낸 문장',
    '디스크의 미동기화 글자가 그대로 있다',
  )
})
