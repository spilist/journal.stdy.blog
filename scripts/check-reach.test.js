// 도달 래칫의 판정 규칙. **래칫이 자기 자신은 면제하지 않는다** — 실제로 이 검사기를
// 처음 붙였을 때 가장 먼저 문 것이 자기 자신이었고, 기준선에 넣는 대신 여기를 만들었다.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { compare, isProduction } from './check-reach.mjs'

test('프로덕션으로 세는 것과 안 세는 것', () => {
  for (const f of ['src/lib/merge.js', 'src/App.svelte', 'worker/index.js', 'scripts/gen-sw.mjs']) {
    assert.equal(isProduction(f), true, f)
  }
  // 테스트·하네스는 제 자신을 세지 않는다. 세면 래칫이 공짜로 초록이 된다.
  for (const f of ['src/lib/merge.test.js', 'src/lib/state.harness.js', 'src/lib/state.harness.store.js']) {
    assert.equal(isProduction(f), false, f)
  }
  // 설정 파일과 리포 밖 경로도 아니다.
  for (const f of ['vite.config.js', 'eslint.config.js', 'docs/handoff.md', 'index.html']) {
    assert.equal(isProduction(f), false, f)
  }
})

test('도달 못 한 파일이 늘면 잡는다', () => {
  const { grew, shrank } = compare(['a.js', 'b.js'], ['a.js'])
  assert.deepEqual(grew, ['b.js'])
  assert.deepEqual(shrank, [])
})

test('도달했는데 기준선을 안 조이면 잡는다 — 한 방향으로만 움직인다', () => {
  const { grew, shrank } = compare(['a.js'], ['a.js', 'b.js'])
  assert.deepEqual(grew, [])
  assert.deepEqual(shrank, ['b.js'])
})

test('그대로면 통과한다', () => {
  const { grew, shrank } = compare(['a.js', 'b.js'], ['b.js', 'a.js'])
  assert.deepEqual(grew, [])
  assert.deepEqual(shrank, [])
})

test('기준선이 비어 있으면 도달 못 한 파일 전부가 신규다', () => {
  assert.deepEqual(compare(['a.js'], []).grew, ['a.js'])
  assert.deepEqual(compare([], ['a.js']).shrank, ['a.js'])
})
