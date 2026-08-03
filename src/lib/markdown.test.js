// 픽스처는 **지어낸 문장**이다. `references/sample.md`의 본문을 복사하지 않는다
// (AGENTS.md `사용자 데이터를 다룰 때`). 형식만 같으면 계약은 똑같이 검증된다.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  assemble,
  assembleDay,
  assembleEnergyLine,
  parse,
  parseEnergyLine,
} from './markdown.js'

const FIXTURE = `# 올해 잊지 않을 것

## 에너지
- 인지: 매일 조금씩 읽고 쓰는 상태를 유지한다.
- 정서: 저녁에 통화 한 번은 한다.
- 육체: 계단으로 다닌다.

## 행동
- 메타: 저널에 점수와 이유를 적는다.

# 26-03-02

## 에너지
- 인지:
- 정서:
- 육체:

## 어제
-

## 오늘
-

# 26-03-01

## 에너지
- 인지: 8. 오래 미룬 문서를 드디어 끝냈다.
- 정서: 6. 저녁 약속이 취소돼 조금 허전했다.
- 육체: 10. 비 오는데도 우산 쓰고 한 시간 걸었다.

## 어제
- 아침에 도서관에 갔다. 사람이 없어서 좋았다.
- 저녁에는 국을 끓였다.

## 오늘
- 자전거 체인에 기름을 쳤다.
- 늦게 자지 말아야지.
`

test('왕복이 바이트 단위로 일치한다 (AC-1)', () => {
  const journal = parse(FIXTURE)
  assert.equal(assemble(journal), FIXTURE)
})

test('고정 블록은 제목 줄까지 통째로 보존된다 (D10)', () => {
  const { pinned } = parse(FIXTURE)
  assert.ok(pinned.startsWith('# 올해 잊지 않을 것'))
  assert.ok(pinned.includes('## 행동'))
})

test('날짜는 내림차순으로 조립된다', () => {
  const { days } = parse(FIXTURE)
  assert.deepEqual(
    days.map((d) => d.date),
    ['2026-03-02', '2026-03-01'],
  )
})

test('점수도 이유도 없으면 `- 인지:` 로 왕복한다 (AC-2)', () => {
  const entry = parseEnergyLine('- 인지:')
  assert.deepEqual(entry, { dim: '인지', score: null, reason: '' })
  assert.equal(assembleEnergyLine(/** @type {any} */ (entry)), '- 인지:')
})

test('이유 없이 점수만, 그리고 두 자리 점수 (AC-3)', () => {
  for (const line of ['- 정서: 7.', '- 육체: 10. 아주 좋았다', '- 인지: 3. 흐림']) {
    const entry = parseEnergyLine(line)
    assert.ok(entry, line)
    assert.equal(assembleEnergyLine(entry), line)
  }
})

test('11 이상은 점수가 아니라 이유의 일부다', () => {
  assert.deepEqual(parseEnergyLine('- 인지: 12. 층에서 만났다'), {
    dim: '인지',
    score: null,
    reason: '12. 층에서 만났다',
  })
})

test('이유 끝의 공백도 사용자 글자라 보존된다', () => {
  const line = '- 육체: 5. 목이 좀 칼칼하다. '
  assert.equal(assembleEnergyLine(/** @type {any} */ (parseEnergyLine(line))), line)
})

test('형식을 벗어난 에너지 줄은 던지지 않고 unparsed에 원문으로 모인다 (AC-4)', () => {
  const { unparsed, days } = parse('# 26-03-01\n\n## 에너지\n인지 8점 정도\n- 정서: 5.\n')
  assert.equal(days[0].energy.length, 1)
  assert.equal(unparsed.length, 1)
  assert.equal(unparsed[0].line, '인지 8점 정도')
})

test('로그 앞의 모르는 H2 섹션은 버리지 않고 unparsed로 모은다 (불변식 3)', () => {
  const { unparsed } = parse('# 26-03-01\n\n## 에너지\n- 인지: 5.\n\n## 낙서\n- 뭔가 적어둠\n')
  assert.equal(unparsed.length, 1)
  assert.ok(unparsed[0].line.startsWith('## 낙서'))
})

test('로그 본문은 정규화되지 않는다', () => {
  const { days } = parse('# 26-03-01\n\n## 에너지\n\n## 오늘\n-   들여쓴  줄\n\n  빈 줄 뒤\n')
  assert.equal(days[0].logs[0].text, '-   들여쓴  줄\n\n  빈 줄 뒤')
})

test('CRLF 입력도 LF로 왕복한다', () => {
  const journal = parse(FIXTURE.replace(/\n/g, '\r\n'))
  assert.equal(assemble(journal), FIXTURE)
})

test('하루치 조립에는 고정 블록이 빠진다 (D13)', () => {
  const { days } = parse(FIXTURE)
  const out = assembleDay(days[1])
  assert.ok(out.startsWith('# 26-03-01'))
  assert.ok(!out.includes('잊지 않을 것'))
  assert.ok(out.includes('## 어제'))
})


test('빈 입력이 터지지 않는다', () => {
  assert.deepEqual(parse(''), { pinned: '', days: [], unparsed: [] })
  assert.equal(assemble({ days: [] }), '\n')
})

// ── 리뷰가 잡은 왕복 파손 (2026-07-26) ────────────────────────────────────

test('로그 본문의 `## ` 소제목이 잘리지 않고 왕복한다', () => {
  const src = '# 26-03-01\n\n## 오늘\n- 회의 정리\n## 회고\n- 이건 내일 다시 본다\n'
  const journal = parse(src)
  assert.equal(journal.unparsed.length, 0)
  assert.equal(journal.days[0].logs[0].text, '- 회의 정리\n## 회고\n- 이건 내일 다시 본다')
  assert.equal(assemble(journal), src)
})

test('에너지 섹션이 없는 날짜에 빈 섹션을 만들어내지 않는다', () => {
  const src = '# 26-03-01\n\n## 오늘\n뭔가 적음\n'
  assert.equal(assemble(parse(src)), src)
})

test('로그가 시작되기 전의 모르는 섹션은 여전히 unparsed로 보존된다', () => {
  const { unparsed } = parse('# 26-03-01\n\n## 낙서\n- 붙일 자리가 없다\n')
  assert.equal(unparsed.length, 1)
  assert.ok(unparsed[0].line.startsWith('## 낙서'))
})

test('날짜 뒤의 `# 제목`은 고정 블록이 아니라 그 로그의 일부다 (불변식 3)', () => {
  // 로그 본문에 쓴 제목 한 줄이 고정 블록으로 이동하면, 로컬 고정 블록이 차 있을 때
  // 「건너뜀」 한 줄로 그 문단이 통째로 사라진다.
  const p = parse('# 26-07-26\n\n## 오늘\n지어낸 첫 줄.\n\n# 제목처럼 쓴 줄\n그 아래 문장.\n')
  assert.equal(p.pinned, '')
  assert.equal(p.unparsed.length, 0)
  assert.equal(
    p.days[0].logs.find((l) => l.kind === '오늘')?.text,
    '지어낸 첫 줄.\n# 제목처럼 쓴 줄\n그 아래 문장.',
  )
})

test('첫 날짜 앞의 비-날짜 H1은 여전히 고정 블록이다 — 왕복이 깨지면 안 된다', () => {
  // `assemble`은 고정 블록을 늘 맨 위에 둔다. 위 규칙의 경계가 "날짜 이후"인 이유다.
  const raw = '# 잊지 않을 것\n지어낸 다짐.\n\n# 26-07-26\n\n## 오늘\n지어낸 줄.\n'
  const p = parse(raw)
  assert.equal(p.pinned, '# 잊지 않을 것\n지어낸 다짐.')
  assert.equal(p.days[0].logs.find((l) => l.kind === '오늘')?.text, '지어낸 줄.')
  assert.equal(assemble(p).replace(/\n+$/, ''), raw.replace(/\n+$/, ''))
})

test('날짜는 있는데 로그가 없으면 뒤따르는 H1을 버리지 않고 unparsed로 남긴다', () => {
  const p = parse('# 26-07-26\n\n## 에너지\n- 인지: 7. 지어낸 이유.\n\n# 붙일 자리 없는 제목\n본문.\n')
  assert.equal(p.pinned, '')
  assert.equal(p.unparsed.length, 1)
  assert.match(p.unparsed[0].line, /붙일 자리 없는 제목/)
})
