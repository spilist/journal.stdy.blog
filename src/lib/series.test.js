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
  // 「최근 N주」 창은 오늘에서 끊는다 — 미래는 최근 4주가 아니다.
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

test('전체가 기본 창보다 좁을 수 있다 — 그때도 파일과 창이 같은 범위다', () => {
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

test('창의 이름은 한 곳에서 나오고, 주 단위 창은 주로 읽는다', () => {
  assert.equal(windowLabel(28, 28), '최근 4주')
  assert.equal(windowLabel(56, 56), '최근 8주')
  assert.equal(windowLabel(null, 12), '전체 12일')
  // 7의 배수가 아니면 일로 남는다 — 「4.3주」는 아무도 못 읽는다.
  assert.equal(windowLabel(30, 30), '최근 30일')
})

test('세로 눈금은 등간격 넷이다 — 1·4·7·10', () => {
  const view = plot(windowDates(NONE, '2026-07-26', 28), [], BOX)
  assert.deepEqual(
    view.gridlines.map((g) => g.score),
    [10, 7, 4, 1],
  )
  // 간격이 고르면 가로선 사이를 눈으로 나눌 수 있다.
  const gaps = view.gridlines.slice(1).map((g, i) => view.gridlines[i].score - g.score)
  assert.deepEqual(new Set(gaps), new Set([3]))
  // 눈금은 축의 양 끝에 정확히 앉는다.
  assert.equal(view.gridlines[0].score, MAX_SCORE)
  assert.equal(view.gridlines.at(-1)?.score, MIN_SCORE)
  // 위에서 아래로 내려간다 — y는 커진다.
  const ys = view.gridlines.map((g) => g.y)
  assert.deepEqual(ys, [...ys].sort((a, b) => a - b))
})

test('세로 눈금의 점수는 유일하다 — 중복은 each 키를 깨서 앱을 죽인다 (AC-21과 같은 종류)', () => {
  const view = plot(windowDates(NONE, '2026-07-26', 28), [], BOX)
  const scores = view.gridlines.map((g) => g.score)
  assert.equal(new Set(scores).size, scores.length, scores.join(','))
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

test('눈금: 창이 넓어지면 주 → 월 → 년으로 성긴다', () => {
  // 주가 하나도 안 차는 창은 양 끝만 부른다.
  const tiny = plot(windowDates(NONE, '2026-07-26', 5), [], BOX)
  assert.deepEqual(
    tiny.ticks.map((t) => t.label),
    ['7/22', '7/26'],
  )
  // 열 주를 넘으면 라벨이 겹쳐 월 경계로 넘어간다.
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

test('기본 창의 가로 눈금은 7일 간격이고 오늘이 오른쪽 끝이다', () => {
  const view = plot(windowDates(NONE, '2026-07-26', 28), [], BOX)
  assert.deepEqual(
    view.ticks.map((t) => t.label),
    ['7/5', '7/12', '7/19', '7/26'],
  )
})

test('주 눈금은 창 길이가 7의 배수가 아니어도 오늘에서 거꾸로 짚는다', () => {
  // 앞에서부터 세면 오른쪽 끝에 이름 없는 여백이 남아 마지막 점이 언제인지 못 읽는다.
  const view = plot(windowDates(NONE, '2026-07-26', 25), [], BOX)
  assert.deepEqual(
    view.ticks.map((t) => t.label),
    ['7/5', '7/12', '7/19', '7/26'],
  )
})

test('창을 걸음만큼 넓혀도 이미 있던 주 눈금이 제자리에 남는다', () => {
  const four = plot(windowDates(NONE, '2026-07-26', 28), [], BOX)
  const eight = plot(windowDates(NONE, '2026-07-26', 56), [], BOX)
  const wide = new Set(eight.ticks.map((t) => t.label))
  for (const t of four.ticks) assert.ok(wide.has(t.label), `${t.label}이 사라졌다`)
})

test('주 눈금은 열 주 앞에서 월 눈금에 자리를 내준다', () => {
  // 경계 양쪽. 63일이면 눈금 9개, 64일이면 10개라 월로 넘어간다.
  const nine = plot(windowDates(NONE, '2026-07-26', 63), [], BOX)
  assert.equal(nine.ticks.length, 9)
  assert.ok(nine.ticks.every((t) => t.label.includes('/')))
  const over = plot(windowDates(NONE, '2026-07-26', 64), [], BOX)
  assert.ok(
    over.ticks.every((t) => t.label.endsWith('월')),
    over.ticks.map((t) => t.label).join(','),
  )
})

test('열여덟 달짜리 창도 눈금이 양 끝 둘로 붕괴하지 않는다', () => {
  // 한때 "월 경계가 12개를 넘으면 1월만 낸다"였는데, 1월이 창 안에 하나뿐이면 눈금이
  // 통째로 사라져 폴백으로 떨어졌다. 541일 창에 라벨이 둘이면 가운데를 못 읽는다.
  const dates = windowDates(bounds({ earliest: '2025-02-01', latest: '2026-07-26' }), '2026-07-26', null)
  assert.equal(dates.length, 541)
  const labels = plot(dates, [], BOX).ticks.map((t) => t.label)
  assert.ok(labels.length >= 5, labels.join(','))
  // 해를 넘는 창은 연도를 붙여야 `2월`이 두 번 나오지 않는다.
  assert.ok(labels.every((l) => l.includes('/')), labels.join(','))
})

test('모든 창 길이에서 라벨이 유일하고 개수가 예산 안이다 (AC-21을 전 구간으로)', () => {
  // 주·월·건너뛴 월·양 끝 폴백 넷이 상호작용하는데, 개별 케이스만 찍으면 규칙 사이의
  // 틈을 못 잡는다. 4년치를 하루 단위로 훑는다.
  //
  // **창을 한 번만 만들고 잘라 쓴다.** 창은 오늘에 붙어 있으므로 `N일 창`은 전체
  // 배열의 마지막 N개와 같다 — 매번 다시 만들면 날짜 산술이 이 테스트 하나로 전체
  // 스위트의 7할을 먹는다 (1.2s → 0.3s).
  const SPAN = 1500
  const full = windowDates(NONE, '2026-08-03', SPAN)
  // 자른 것과 다시 만든 것이 같다는 전제를 몇 자리에서 실제로 확인한다.
  for (const n of [1, 2, 7, 28, 365, SPAN]) {
    assert.deepEqual(full.slice(-n), windowDates(NONE, '2026-08-03', n), `${n}일`)
  }

  for (let n = 1; n <= SPAN; n++) {
    const labels = plot(full.slice(-n), [], BOX).ticks.map((t) => t.label)
    assert.equal(new Set(labels).size, labels.length, `${n}일: ${labels.join(',')}`)
    assert.ok(labels.length >= 1 && labels.length <= 9, `${n}일: 라벨 ${labels.length}개`)
    if (n >= 30) assert.ok(labels.length >= 2, `${n}일: 눈금이 ${labels.length}개뿐이다`)
  }
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
