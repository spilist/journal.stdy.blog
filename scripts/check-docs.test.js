// 강제하는 코드가 자기 검증이 없으면 **조용히 0건을 내고 아무도 모른다.**
// 여기 있는 음성 케이스(잡아야 하는데 안 잡히는 것)가 이 파일의 존재 이유다.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { scanLinks } from './check-docs.mjs'

/** 전부 있는 것으로 친다 — 규약 위반만 보는 케이스에 쓴다. */
const anything = () => true
/** 전부 없는 것으로 친다. */
const nothing = () => false

/** @param {string} text @param {(t: string) => boolean | null} [lookup] */
const scan = (text, lookup = anything) => scanLinks(text, lookup).map((p) => p.message)

test('맨 상대 링크를 잡는다', () => {
  assert.equal(scan('[로드맵](roadmap.md)').length, 1)
  assert.equal(scan('[로드맵](./roadmap.md)').length, 0)
  assert.equal(scan('[상위](../cmanki/AGENTS.md)').length, 0)
})

test('스킴·앵커·절대경로는 상대 링크가 아니다', () => {
  assert.deepEqual(scan('[a](https://example.com/x.md) [b](#절) [c](/x.md) [d](mailto:a@b.c)'), [])
  assert.deepEqual(scan('[e](file:///home/x/wrangler.jsonc)'), [])
})

test('없는 파일을 잡는다', () => {
  assert.match(scan('[a](./ghost.md)', nothing)[0], /파일이 없다/)
  assert.equal(scan('[a](./ghost.md#절)', nothing).length, 1, '앵커를 떼고 본다')
})

test('리포 밖은 묻지 않는다 — 형제 체크아웃이 없다고 게이트가 빨개지면 안 된다', () => {
  assert.deepEqual(scan('[a](../cmanki/AGENTS.md)', () => null), [])
})

test('링크 텍스트의 대괄호가 검사를 스킵시키지 않는다', () => {
  // 매치 실패 = 조용한 통과. 검사기에서 제일 나쁜 실패 모드다.
  assert.equal(scan('[결정 [D3] 참고](nope.md)').length, 1)
  assert.equal(scan('![그림](shot.png)').length, 1, '이미지도 링크다')
})

test('참조 문법으로 규약을 우회할 수 없다', () => {
  assert.equal(scan('[로드맵][rm]\n\n[rm]: roadmap.md').length, 1)
  assert.equal(scan('[rm]: ./roadmap.md').length, 0)
})

test('타이틀·꺾쇠가 붙어도 대상을 옳게 읽는다', () => {
  assert.deepEqual(scan('[a](./x.md "제목")'), [])
  assert.deepEqual(scan("[a](./x.md '제목')"), [])
  assert.equal(scan('[a](<nope.md>)').length, 1)
})

test('코드 블록 안은 링크가 아니다 — 중첩 펜스에서도', () => {
  assert.deepEqual(scan('```\n[a](nope.md)\n```'), [])
  assert.deepEqual(scan('~~~\n[a](nope.md)\n~~~'), [])
  // 바깥이 ````면 안쪽 ```가 닫지 못한다. 여기서 토글이 어긋나면 그 뒤가 통째로 샌다.
  assert.deepEqual(scan('````md\n```\n[a](nope.md)\n```\n````\n'), [])
  assert.equal(scan('```\n[a](nope.md)\n```\n[b](nope.md)').length, 1, '닫힌 뒤는 다시 본다')
})

test('인라인 코드와 HTML 주석 안은 링크가 아니다', () => {
  // 규약을 **설명하는** 문서가 자기 검사기에 걸리면 안 된다.
  assert.deepEqual(scan('맨 `[로드맵](roadmap.md)` 는 lint 실패다'), [])
  assert.deepEqual(scan('``` 아닌 ``[a](nope.md)`` 이중 백틱``'.replace('```', '')), [])
  assert.deepEqual(scan('<!-- [a](nope.md) -->'), [])
  assert.deepEqual(scan('<!--\n[a](nope.md)\n-->'), [], '주석은 줄을 넘는다')
})

test('실제 문서 모양에서 오탐이 없다', () => {
  const doc = [
    '# 제목',
    '',
    '계약은 [spec](./spec-first-slice.md) `## S2` 절이다.',
    '- [cmanki AGENTS.md](../cmanki/AGENTS.md)의 15항',
    '- [아이데이션](./charness-artifacts/ideation/)',
    '',
    '```js',
    "const x = arr[0](1)",
    '```',
  ].join('\n')
  assert.deepEqual(scan(doc, (t) => (t.startsWith('../') ? null : true)), [])
})
