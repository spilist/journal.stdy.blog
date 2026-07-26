// 그래프의 순수 규칙. **좌표까지 여기서 내고 컴포넌트는 그리기만 한다** — 이 파일
// 길이가 차트 라이브러리를 넣지 않는 근거다 (설계 취향 9항).
//
// x축은 **캘린더 연속**이다. 기록이 있는 날만 늘어놓으면 안 쓴 날이 사라져서 `D19`
// (결측일에 선을 끊는다)가 의미를 잃는다 — 안 쓴 날 자체가 신호다.

import { addDays } from './date.js'

/** @typedef {import('./merge.js').Rec} Rec */
/** @typedef {{date: string, score: number, reason: string}} Point */
/** @typedef {{dim: string, points: Point[], segments: Point[][]}} Line */
/** @typedef {{top: number, right: number, bottom: number, left: number}} Pad */

/** 세로 눈금의 위아래 끝. 스키마가 아니라 화면의 눈금이다 (`A1`이 5점으로 내려도 여기만 바뀐다). */
export const MIN_SCORE = 1
export const MAX_SCORE = 10

const ENERGY_KEY = /^energy:(\d{4}-\d{2}-\d{2}):(.+)$/

/**
 * 점수가 들어 있는 가장 이른 날짜. 「전체」 창의 왼쪽 끝이다.
 *
 * @param {Rec[]} records
 * @returns {string | null}
 */
export function earliestScored(records) {
  /** @type {string | null} */
  let earliest = null
  for (const rec of records) {
    if (rec.kind !== 'energy' || rec.data.score == null) continue
    const m = ENERGY_KEY.exec(rec.key)
    if (!m) continue
    if (earliest === null || m[1] < earliest) earliest = m[1]
  }
  return earliest
}

/**
 * 창에 들어갈 날짜를 오름차순으로 준다 (`D14`).
 *
 * 창은 **오늘에 붙어 있다** — 과거 날짜를 보고 있어도 그래프는 최근 N일이다.
 * 기록이 창보다 늦게 시작해도 왼쪽을 잘라내지 않는다: 「최근 30일」이 30일이 아니면
 * 가로 간격이 창마다 달라져 읽는 값이 흔들린다.
 *
 * @param {string | null} earliest
 * @param {string} today 'YYYY-MM-DD'
 * @param {number | null} days null 이면 전체
 * @returns {string} 'YYYY-MM-DD'
 */
export function windowStart(earliest, today, days) {
  return days === null ? (earliest ?? today) : addDays(today, -(days - 1))
}

/**
 * 창에 들어갈 날짜 전부. `windowStart`부터 오늘까지 하루도 빠뜨리지 않는다.
 *
 * @param {string | null} earliest
 * @param {string} today
 * @param {number | null} days
 * @returns {string[]}
 */
export function windowDates(earliest, today, days) {
  const from = windowStart(earliest, today, days)
  /** @type {string[]} */
  const dates = []
  for (let d = from; d <= today; d = addDays(d, 1)) dates.push(d)
  // 기록이 미래에만 있는 경우(가져오기 실수 등)에도 축이 비지 않게 한다.
  return dates.length ? dates : [today]
}

/**
 * 창의 길이(일). 「1개월 더」가 전체를 넘어서면 그냥 전체로 접는 데 쓴다.
 *
 * @param {string | null} earliest
 * @param {string} today
 * @returns {number}
 */
export function spanDays(earliest, today) {
  return windowDates(earliest, today, null).length
}

/**
 * 차원별 선. `segments`는 **연속으로 점수가 있는 구간**이고, 결측일에서 끊긴다 (`D19`).
 *
 * @param {Rec[]} records
 * @param {readonly string[]} dims
 * @param {string[]} dates 오름차순
 * @returns {Line[]}
 */
export function lines(records, dims, dates) {
  /** @type {Map<string, Map<string, Point>>} */
  const byDim = new Map(dims.map((dim) => [dim, new Map()]))
  for (const rec of records) {
    if (rec.kind !== 'energy' || rec.data.score == null) continue
    const m = ENERGY_KEY.exec(rec.key)
    if (!m) continue
    // `D20`: dim 컬럼은 열려 있지만 UI는 3개를 가정한다. 모르는 차원은 그리지 않는다.
    const slot = byDim.get(m[2])
    if (!slot) continue
    slot.set(m[1], { date: m[1], score: rec.data.score, reason: rec.data.reason ?? '' })
  }

  return dims.map((dim) => {
    const slot = /** @type {Map<string, Point>} */ (byDim.get(dim))
    /** @type {Point[]} */
    const points = []
    /** @type {Point[][]} */
    const segments = []
    /** @type {Point[] | null} */
    let run = null
    for (const date of dates) {
      const p = slot.get(date)
      if (!p) {
        run = null // 여기서 선이 끊긴다 (`D19`)
        continue
      }
      points.push(p)
      if (!run) {
        run = []
        segments.push(run)
      }
      run.push(p)
    }
    return { dim, points, segments }
  })
}

/** @param {number} n */
function round(n) {
  return Math.round(n * 100) / 100
}

/**
 * 선과 날짜를 SVG 좌표로 옮긴다.
 *
 * @param {string[]} dates
 * @param {Line[]} lineList
 * @param {{width: number, height: number, pad: Pad}} box
 */
export function plot(dates, lineList, box) {
  const { pad } = box
  // 폭이 0인 첫 프레임(레이아웃 전)에도 좌표가 음수로 새지 않게 한다.
  const innerW = Math.max(0, box.width - pad.left - pad.right)
  const innerH = Math.max(0, box.height - pad.top - pad.bottom)
  const n = dates.length

  /** 날짜 인덱스 → x. 점이 하나면 가운데 세운다 (0으로 나누지 않는다). @param {number} i */
  const x = (i) => round(n <= 1 ? pad.left + innerW / 2 : pad.left + (i / (n - 1)) * innerW)
  /** 점수 → y. 위가 높은 점수다. @param {number} score */
  const y = (score) =>
    round(pad.top + (1 - (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * innerH)

  /** @type {Map<string, number>} */
  const index = new Map(dates.map((d, i) => [d, i]))
  /** @param {Point} p */
  const at = (p) => ({ ...p, x: x(index.get(p.date) ?? 0), y: y(p.score) })

  const series = lineList.map(({ dim, segments, points }) => ({
    dim,
    // 점이 하나뿐인 구간은 polyline 이 되지 않는다 — 아래 `dots`가 그 자리를 그린다.
    polylines: segments
      .filter((seg) => seg.length > 1)
      .map((seg) => seg.map((p) => `${x(index.get(p.date) ?? 0)},${y(p.score)}`).join(' ')),
    dots: points.map(at),
  }))

  return { series, x, y, ticks: ticks(dates, x), gridlines: gridlines(y) }
}

/**
 * 가로 눈금. 월이 두 번 이상 바뀌면 월 경계를, 아니면 양 끝 날짜를 쓴다.
 *
 * @param {string[]} dates
 * @param {(i: number) => number} x
 */
function ticks(dates, x) {
  /** @type {{x: number, label: string}[]} */
  const months = []
  dates.forEach((d, i) => {
    if (d.endsWith('-01')) months.push({ x: x(i), label: `${Number(d.slice(5, 7))}월` })
  })
  if (months.length >= 2) return months

  /** @param {number} i */
  const short = (i) => `${Number(dates[i].slice(5, 7))}/${Number(dates[i].slice(8, 10))}`
  const last = dates.length - 1
  return last === 0
    ? [{ x: x(0), label: short(0) }]
    : [
        { x: x(0), label: short(0) },
        { x: x(last), label: short(last) },
      ]
}

/**
 * 세로 눈금. 위·가운데·아래 셋이면 값을 읽는 데 충분하다.
 *
 * @param {(score: number) => number} y
 */
function gridlines(y) {
  const mid = Math.round((MIN_SCORE + MAX_SCORE) / 2)
  return [MAX_SCORE, mid, MIN_SCORE].map((score) => ({ score, y: y(score) }))
}
