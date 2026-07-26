import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_SCORE,
  MIN_SCORE,
  earliestScored,
  lines,
  plot,
  spanDays,
  windowDates,
  windowStart,
} from './series.js'

const DIMS = ['인지', '정서', '육체']

/**
 * 본문은 **지어낸 문장**이다 (AGENTS.md `사용자 데이터를 다룰 때`).
 *
 * @param {string} date
 * @param {string} dim
 * @param {number | null} score
 * @param {string} [reason]
 */
function energy(date, dim, score, reason = '') {
  return {
    key: `energy:${date}:${dim}`,
    kind: 'energy',
    data: { score, reason, scoredAt: null },
    updatedAt: 1,
    syncedAt: 1,
  }
}

test('창은 오늘에 붙어 있고 캘린더가 연속이다 (D14)', () => {
  const dates = windowDates(null, '2026-03-02', 5)
  assert.deepEqual(dates, ['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  assert.equal(windowDates(null, '2026-07-26', 30).length, 30)
})

test('전체 창은 가장 이른 점수부터 오늘까지다', () => {
  assert.deepEqual(windowDates('2026-07-24', '2026-07-26', null), [
    '2026-07-24',
    '2026-07-25',
    '2026-07-26',
  ])
  // 점수가 하나도 없으면 오늘 하루짜리 축이다 — 비어 있어도 그릴 자리는 있어야 한다.
  assert.deepEqual(windowDates(null, '2026-07-26', null), ['2026-07-26'])
  assert.equal(spanDays('2026-07-24', '2026-07-26'), 3)
})

test('내려받기 범위와 그래프 창은 같은 시작 날짜를 쓴다', () => {
  // 두 곳에서 따로 계산하면 그래프가 보여준 구간과 파일 내용이 조용히 어긋난다.
  for (const days of [1, 30, 60, null]) {
    assert.equal(
      windowStart('2026-01-01', '2026-07-26', days),
      windowDates('2026-01-01', '2026-07-26', days)[0],
    )
  }
})

test('미래에만 기록이 있어도 축이 비지 않는다', () => {
  assert.deepEqual(windowDates('2027-01-01', '2026-07-26', null), ['2026-07-26'])
})

test('earliestScored는 점수가 있는 날만 본다 — 이유만 쓴 날은 선에 오르지 않는다', () => {
  const records = [
    energy('2026-07-20', '인지', null, '점수 없이 이유만 적은 날'),
    energy('2026-07-22', '정서', 6),
    energy('2026-07-24', '인지', 8),
  ]
  assert.equal(earliestScored(records), '2026-07-22')
  assert.equal(earliestScored([]), null)
})

test('결측일에서 선이 끊긴다 (D19)', () => {
  const dates = windowDates(null, '2026-07-26', 5) // 07-22 .. 07-26
  const records = [
    energy('2026-07-22', '인지', 7),
    energy('2026-07-23', '인지', 6),
    // 07-24는 안 쓴 날이다 — 여기서 끊긴다
    energy('2026-07-25', '인지', 9),
    energy('2026-07-26', '인지', 8),
  ]
  const [cognitive] = lines(records, DIMS, dates)
  assert.equal(cognitive.dim, '인지')
  assert.equal(cognitive.points.length, 4)
  assert.deepEqual(
    cognitive.segments.map((seg) => seg.map((p) => p.date)),
    [
      ['2026-07-22', '2026-07-23'],
      ['2026-07-25', '2026-07-26'],
    ],
  )
})

test('창 밖의 점수는 선에 들어오지 않는다', () => {
  const dates = windowDates(null, '2026-07-26', 3) // 07-24 .. 07-26
  const records = [energy('2026-07-01', '인지', 3), energy('2026-07-25', '인지', 7)]
  const [cognitive] = lines(records, DIMS, dates)
  assert.deepEqual(
    cognitive.points.map((p) => p.date),
    ['2026-07-25'],
  )
})

test('모르는 차원은 그리지 않는다 (D20: 스키마만 열려 있다)', () => {
  const dates = windowDates(null, '2026-07-26', 2)
  const records = [energy('2026-07-26', '사회', 9), energy('2026-07-26', '육체', 4)]
  const drawn = lines(records, DIMS, dates)
  assert.deepEqual(
    drawn.map((l) => l.dim),
    DIMS,
  )
  assert.equal(drawn.find((l) => l.dim === '육체')?.points.length, 1)
})

test('이유는 점에 실려 온다 — 탭했을 때 보여줄 값이 여기 있다', () => {
  const dates = windowDates(null, '2026-07-26', 1)
  const records = [energy('2026-07-26', '정서', 5, '지어낸 이유 문장')]
  const [, emotional] = lines(records, DIMS, dates)
  assert.deepEqual(emotional.points[0], {
    date: '2026-07-26',
    score: 5,
    reason: '지어낸 이유 문장',
  })
})

const BOX = { width: 300, height: 200, pad: { top: 10, right: 10, bottom: 20, left: 20 } }

test('좌표: 위가 높은 점수고 양 끝이 패딩에 붙는다', () => {
  const dates = windowDates(null, '2026-07-26', 3)
  const view = plot(dates, lines([], DIMS, dates), BOX)
  assert.equal(view.x(0), 20)
  assert.equal(view.x(2), 290)
  assert.equal(view.y(MAX_SCORE), 10)
  assert.equal(view.y(MIN_SCORE), 180)
  assert.ok(view.y(5) > view.y(9), '점수가 높을수록 y가 작다')
})

test('점이 하나면 가운데 세운다 — 0으로 나누지 않는다', () => {
  const view = plot(['2026-07-26'], lines([], DIMS, ['2026-07-26']), BOX)
  assert.equal(view.x(0), 155)
})

test('폭이 0인 첫 프레임에도 좌표가 음수로 새지 않는다', () => {
  const view = plot(['2026-07-26'], lines([], DIMS, ['2026-07-26']), { ...BOX, width: 0 })
  assert.ok(view.x(0) >= 0)
})

test('점 하나짜리 구간은 선이 아니라 dot으로만 남는다', () => {
  const dates = windowDates(null, '2026-07-26', 5) // 07-22 .. 07-26
  const records = [
    energy('2026-07-22', '인지', 7),
    // 07-23 결측 → 07-22는 혼자 남는다
    energy('2026-07-25', '인지', 9),
    energy('2026-07-26', '인지', 8),
  ]
  const view = plot(dates, lines(records, DIMS, dates), BOX)
  const cognitive = view.series[0]
  assert.equal(cognitive.polylines.length, 1, '두 점 이상인 구간만 선이 된다')
  assert.equal(cognitive.dots.length, 3, '혼자 남은 점도 화면에 있어야 한다')
})

test('눈금: 월이 두 번 이상 바뀌면 월 경계, 아니면 양 끝 날짜', () => {
  const short = plot(windowDates(null, '2026-07-26', 5), [], BOX)
  assert.deepEqual(
    short.ticks.map((t) => t.label),
    ['7/22', '7/26'],
  )
  const long = plot(windowDates('2026-05-15', '2026-07-26', null), [], BOX)
  assert.deepEqual(
    long.ticks.map((t) => t.label),
    ['6월', '7월'],
  )
})
