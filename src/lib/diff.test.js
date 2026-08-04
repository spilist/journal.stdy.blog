import { test } from 'node:test'
import assert from 'node:assert/strict'

import { diffLines } from './diff.js'

test('줄 단위 diff가 추가·삭제·공통 줄을 구분한다', () => {
  assert.deepEqual(diffLines('첫 줄\n지어낸 옛 줄', '첫 줄\n지어낸 새 줄'), [
    { kind: 'same', text: '첫 줄' },
    { kind: 'removed', text: '지어낸 옛 줄' },
    { kind: 'added', text: '지어낸 새 줄' },
  ])
})

test('diff는 빈 줄도 보존한다', () => {
  assert.deepEqual(diffLines('앞\n\n뒤', '앞\n새 줄\n\n뒤'), [
    { kind: 'same', text: '앞' },
    { kind: 'added', text: '새 줄' },
    { kind: 'same', text: '' },
    { kind: 'same', text: '뒤' },
  ])
})

test('반복 줄이 뒤의 공통 줄을 잘못 삭제로 만들지 않는다', () => {
  assert.deepEqual(diffLines('a', 'b\nb\na'), [
    { kind: 'added', text: 'b' },
    { kind: 'added', text: 'b' },
    { kind: 'same', text: 'a' },
  ])
})
