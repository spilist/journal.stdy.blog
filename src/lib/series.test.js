import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_SCORE,
  MIN_SCORE,
  datesInRange,
  dayEnergy,
  lines,
  plot,
  recordBounds,
  spanDays,
  windowDates,
  windowEnd,
  windowLabel,
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

/**
 * @param {string} date
 * @param {string} [kind]
 */
function log(date, kind = '오늘') {
  return {
    key: `log:${date}:${kind}`,
    kind: 'log',
    data: { text: '지어낸 로그 한 줄' },
    updatedAt: 1,
    syncedAt: 1,
  }
}

/** @param {{earliest: string | null, latest: string | null}} b */
const bounds = (b) => b
const NONE = bounds({ earliest: null, latest: null })

test('창은 오늘에 붙어 있고 캘린더가 연속이다 (D14)', () => {
  const dates = windowDates(NONE, '2026-03-02', 5)
  assert.deepEqual(dates, ['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02'])
  assert.equal(windowDates(NONE, '2026-07-26', 30).length, 30)
})

test('전체 창은 기록의 양 끝을 덮는다 — 점수가 아니라 기록이 기준이다', () => {
  // 점수 없이 로그만 쓴 날이 「전체」에서 빠지면, 그래프의 「전체」와 내려받기의
  // 「전체」가 다른 뜻이 된다.
  const records = [log('2026-07-01'), energy('2026-07-24', '인지', 8)]
  assert.deepEqual(recordBounds(records), { earliest: '2026-07-01', latest: '2026-07-24' })
  assert.equal(windowDates(recordBounds(records), '2026-07-26', null)[0], '2026-07-01')
})

test('전체 창은 오늘 뒤의 기록까지 덮는다 — 내려받기가 조용히 빠뜨리면 안 된다', () => {
  const b = bounds({ earliest: '2026-07-20', latest: '2026-07-30' })
  assert.equal(windowEnd(b, '2026-07-26', null), '2026-07-30')
  // 「최근 N일」 창은 오늘에서 끊는다 — 미래는 최근 30일이 아니다.
  assert.equal(windowEnd(b, '2026-07-26', 30), '2026-07-26')
  assert.equal(windowDates(b, '2026-07-26', null).at(-1), '2026-07-30')
})

test('windowStart와 windowDates[0]은 모든 창 길이에서 같다 (AC-18)', () => {
  // 내려받기 범위와 그래프 창이 같은 배열에서 나오므로, 이 등식이 깨지면 둘이 어긋난다.
  const cases = [NONE, bounds({ earliest: '2026-01-01', latest: '2026-07-26' }), bounds({ earliest: '2027-01-01', latest: '2027-01-05' })]
  for (const b of cases) {
    for (const days of [1, 30, 60, null]) {
      const dates = windowDates(b, '2026-07-26', days)
      assert.ok(dates.length >= 1, '창은 늘 하루 이상이다')
      assert.equal(windowStart(b, '2026-07-26', days), dates[0])
      assert.equal(windowEnd(b, '2026-07-26', days), dates[dates.length - 1])
    }
  }
})

test('기록이 없으면 오늘 하루짜리 축이다', () => {
  assert.deepEqual(windowDates(NONE, '2026-07-26', null), ['2026-07-26'])
  assert.equal(spanDays(NONE, '2026-07-26'), 1)
  assert.deepEqual(recordBounds([]), { earliest: null, latest: null })
})

test('전체가 30일보다 좁을 수 있다 — 그때도 파일과 창이 같은 범위다', () => {
  // 기록이 20일치뿐이면 「전체」는 창을 넓히는 게 아니라 좁힌다. 의도된 결과다.
  const b = bounds({ earliest: '2026-07-07', latest: '2026-07-26' })
  assert.equal(spanDays(b, '2026-07-26'), 20)
  assert.equal(windowDates(b, '2026-07-26', 30).length, 30)
  assert.equal(windowDates(b, '2026-07-26', null).length, 20)
})

test('내려받기 범위는 양 끝이 포함이고 상한이 있다 (SC-12)', () => {
  const records = [
    log('2026-06-30'),
    energy('2026-07-01', '인지', 5),
    log('2026-07-26'),
    log('2026-07-30'), // 미래에 쓴 기록
  ]
  assert.deepEqual(datesInRange(records, '2026-07-01', '2026-07-26'), ['2026-07-01', '2026-07-26'])
  assert.deepEqual(datesInRange(records, null, null), [
    '2026-06-30',
    '2026-07-01',
    '2026-07-26',
    '2026-07-30',
  ])
  // 「전체」 창(기록의 양 끝)으로 자르면 하나도 안 빠진다.
  const b = recordBounds(records)
  const all = windowDates(b, '2026-07-26', null)
  assert.equal(datesInRange(records, all[0], all[all.length - 1]).length, 4)
})

test('개정 스냅샷은 날짜 기록이 아니라 범위에 들어오지 않는다', () => {
  const records = [
    { key: 'revision:2026-07-10', kind: 'revision', data: { text: 'x' }, updatedAt: 1, syncedAt: 1 },
    { key: 'pinned', kind: 'pinned', data: { text: 'x' }, updatedAt: 1, syncedAt: 1 },
  ]
  assert.deepEqual(recordBounds(records), { earliest: null, latest: null })
  assert.deepEqual(datesInRange(records, null, null), [])
})

test('창의 이름은 한 곳에서 나온다', () => {
  assert.equal(windowLabel(30, 30), '최근 30일')
  assert.equal(windowLabel(null, 12), '전체 12일')
})

test('결측일에서 선이 끊긴다 (D19, AC-15)', () => {
  const dates = windowDates(NONE, '2026-07-26', 5) // 07-22 .. 07-26
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

test('창 밖의 점수는 선에 들어오지 않는다 (AC-16)', () => {
  const dates = windowDates(NONE, '2026-07-26', 3) // 07-24 .. 07-26
  const records = [energy('2026-07-01', '인지', 3), energy('2026-07-25', '인지', 7)]
  const [cognitive] = lines(records, DIMS, dates)
  assert.deepEqual(
    cognitive.points.map((p) => p.date),
    ['2026-07-25'],
  )
})

test('모르는 차원은 그리지 않는다 (D20: 스키마만 열려 있다)', () => {
  const dates = windowDates(NONE, '2026-07-26', 2)
  const records = [energy('2026-07-26', '사회', 9), energy('2026-07-26', '육체', 4)]
  const drawn = lines(records, DIMS, dates)
  assert.deepEqual(
    drawn.map((l) => l.dim),
    DIMS,
  )
  assert.equal(drawn.find((l) => l.dim === '육체')?.points.length, 1)
})

test('점수 없이 이유만 쓴 날도 이유가 읽힌다 (SC-11)', () => {
  // 선에는 안 오르지만 툴팁에는 떠야 한다. `lines`에서 읽으면 이 값이 사라진다.
  const records = [
    energy('2026-07-26', '인지', null, '점수는 못 매겼지만 남긴 문장'),
    energy('2026-07-26', '정서', 5, '지어낸 이유 문장'),
  ]
  assert.equal(lines(records, DIMS, ['2026-07-26'])[0].points.length, 0)
  assert.deepEqual(dayEnergy(records, DIMS, '2026-07-26'), [
    { dim: '인지', score: null, reason: '점수는 못 매겼지만 남긴 문장' },
    { dim: '정서', score: 5, reason: '지어낸 이유 문장' },
    { dim: '육체', score: null, reason: '' },
  ])
})

test('dayEnergy는 다른 날짜를 섞지 않는다', () => {
  const records = [energy('2026-07-25', '인지', 9, '어제'), energy('2026-07-26', '인지', 2, '오늘')]
  assert.equal(dayEnergy(records, DIMS, '2026-07-26')[0].score, 2)
  assert.equal(dayEnergy(records, DIMS, '2026-07-24')[0].score, null)
})

const BOX = { width: 300, height: 200, pad: { top: 10, right: 10, bottom: 20, left: 20 } }

test('좌표: 위가 높은 점수고 양 끝이 패딩에 붙는다', () => {
  const dates = windowDates(NONE, '2026-07-26', 3)
  const view = plot(dates, lines([], DIMS, dates), BOX)
  assert.equal(view.x(0), 20)
  assert.equal(view.x(2), 290)
  assert.equal(view.y(MAX_SCORE), 10)
  assert.equal(view.y(MIN_SCORE), 180)
  assert.ok(view.y(5) > view.y(9), '점수가 높을수록 y가 작다')
})

test('점이 하나면 가운데 세운다 — 0으로 나누지 않는다 (AC-17)', () => {
  const view = plot(['2026-07-26'], lines([], DIMS, ['2026-07-26']), BOX)
  assert.equal(view.x(0), 155)
})

test('폭이 0인 첫 프레임에도 좌표가 음수로 새지 않는다 (AC-17)', () => {
  const view = plot(['2026-07-26'], lines([], DIMS, ['2026-07-26']), { ...BOX, width: 0 })
  assert.ok(view.x(0) >= 0)
})

test('점의 좌표가 그 날짜의 축 위치와 같다', () => {
  const dates = windowDates(NONE, '2026-07-26', 5) // 07-22 .. 07-26
  const records = [energy('2026-07-23', '인지', 4), energy('2026-07-26', '인지', 9)]
  const view = plot(dates, lines(records, DIMS, dates), BOX)
  for (const d of view.series[0].dots) {
    assert.equal(d.x, view.x(dates.indexOf(d.date)))
    assert.equal(d.y, view.y(d.score))
  }
})

test('점 하나짜리 구간은 선이 아니라 dot으로만 남는다', () => {
  const dates = windowDates(NONE, '2026-07-26', 5) // 07-22 .. 07-26
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
  assert.equal(cognitive.polylines[0], `${view.x(3)},${view.y(9)} ${view.x(4)},${view.y(8)}`)
})

test('눈금: 월이 두 번 이상 바뀌면 월 경계, 아니면 양 끝 날짜', () => {
  const short = plot(windowDates(NONE, '2026-07-26', 5), [], BOX)
  assert.deepEqual(
    short.ticks.map((t) => t.label),
    ['7/22', '7/26'],
  )
  const long = plot(
    windowDates(bounds({ earliest: '2026-05-15', latest: '2026-07-26' }), '2026-07-26', null),
    [],
    BOX,
  )
  assert.deepEqual(
    long.ticks.map((t) => t.label),
    ['6월', '7월'],
  )
})

test('여러 해에 걸친 창에서도 눈금 라벨이 유일하다', () => {
  // 라벨이 겹치면 어느 해인지 못 읽는다. 그리고 라벨을 each 키로 쓰면 앱이 죽는다.
  for (const earliest of ['2025-02-01', '2023-01-05', '2020-06-15']) {
    const dates = windowDates(bounds({ earliest, latest: '2026-07-26' }), '2026-07-26', null)
    const labels = plot(dates, [], BOX).ticks.map((t) => t.label)
    assert.equal(new Set(labels).size, labels.length, `${earliest}: ${labels.join(',')}`)
    assert.ok(labels.length >= 1)
  }
})

test('양 끝 눈금은 안쪽으로 붙인다 — 가운데 정렬하면 잘린다', () => {
  const view = plot(windowDates(NONE, '2026-07-26', 5), [], BOX)
  assert.equal(view.ticks[0].anchor, 'start')
  assert.equal(view.ticks.at(-1)?.anchor, 'end')
})
