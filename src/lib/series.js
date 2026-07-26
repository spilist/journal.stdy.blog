// 그래프의 순수 규칙. **좌표까지 여기서 내고 컴포넌트는 그리기만 한다** — 이 파일
// 길이가 차트 라이브러리를 넣지 않는 근거다 (설계 취향 9항).
//
// x축은 **캘린더 연속**이다. 기록이 있는 날만 늘어놓으면 안 쓴 날이 사라져서 `D19`
// (결측일에 선을 끊는다)가 의미를 잃는다 — 안 쓴 날 자체가 신호다.
//
// **창은 그래프의 것이면서 내려받기 범위이기도 하다** (`S-2`). 그래서 여기서 나온
// 날짜 배열이 두 곳의 단일 출처다 — 각자 계산하면 보여준 구간과 파일이 조용히 어긋난다.

import { addDays } from './date.js'

/** @typedef {import('./merge.js').Rec} Rec */
/** @typedef {{date: string, score: number, reason: string}} Point */
/** @typedef {{dim: string, points: Point[], segments: Point[][]}} Line */
/** @typedef {{earliest: string | null, latest: string | null}} Bounds */
/** @typedef {{top: number, right: number, bottom: number, left: number}} Pad */

/** 세로 눈금의 위아래 끝. 스키마가 아니라 화면의 눈금이다 (`A1`이 5점으로 내려도 여기만 바뀐다). */
export const MIN_SCORE = 1
export const MAX_SCORE = 10

/** 하루에 속한 레코드. `revision`은 날짜 기록이 아니라 개정 스냅샷이라 빠진다. */
const DAY_KEY = /^(?:energy|log):(\d{4}-\d{2}-\d{2}):(.+)$/

/**
 * 기록이 있는 날의 양 끝.
 *
 * **점수가 아니라 기록을 센다.** 「전체」가 그래프와 내려받기에서 다른 뜻이 되면 안
 * 되는데, 내려받기는 점수 없이 로그만 쓴 날도 담기 때문이다.
 *
 * @param {Rec[]} records
 * @returns {Bounds}
 */
export function recordBounds(records) {
  /** @type {string | null} */
  let earliest = null
  /** @type {string | null} */
  let latest = null
  for (const rec of records) {
    const m = DAY_KEY.exec(rec.key)
    if (!m) continue
    if (earliest === null || m[1] < earliest) earliest = m[1]
    if (latest === null || m[1] > latest) latest = m[1]
  }
  return { earliest, latest }
}

/**
 * 창의 시작 날짜 (`D14`).
 *
 * 창은 **오늘에 붙어 있다** — 과거 날짜를 보고 있어도 그래프는 최근 N일이다.
 * 기록이 창보다 늦게 시작해도 왼쪽을 잘라내지 않는다: 「최근 30일」이 30일이 아니면
 * 가로 간격이 창마다 달라져 읽는 값이 흔들린다.
 *
 * @param {Bounds} bounds
 * @param {string} today 'YYYY-MM-DD'
 * @param {number | null} days null 이면 전체
 * @returns {string} 'YYYY-MM-DD'
 */
export function windowStart(bounds, today, days) {
  return days === null ? (bounds.earliest ?? today) : addDays(today, -(days - 1))
}

/**
 * 창의 끝 날짜.
 *
 * **「전체」는 오늘보다 뒤에 있는 기록까지 덮는다.** 오늘에서 끊으면 「전체
 * 내려받기」가 미래 날짜에 쓴 기록(날짜 이동이나 가져오기로 생긴다)을 조용히
 * 빠뜨린다 — 창이 곧 파일 범위라 그게 곧 유실로 읽힌다.
 *
 * @param {Bounds} bounds
 * @param {string} today
 * @param {number | null} days
 * @returns {string}
 */
export function windowEnd(bounds, today, days) {
  if (days === null && bounds.latest !== null && bounds.latest > today) return bounds.latest
  return today
}

/**
 * 창에 들어갈 날짜 전부. 하루도 빠뜨리지 않는다.
 *
 * @param {Bounds} bounds
 * @param {string} today
 * @param {number | null} days
 * @returns {string[]} 오름차순. 항상 하루 이상이다
 */
export function windowDates(bounds, today, days) {
  const to = windowEnd(bounds, today, days)
  /** @type {string[]} */
  const dates = []
  for (let d = windowStart(bounds, today, days); d <= to; d = addDays(d, 1)) dates.push(d)
  return dates
}

/**
 * 전체 창의 길이(일). 「1개월 더」가 전체를 넘어서면 그냥 전체로 접는 데 쓴다.
 *
 * @param {Bounds} bounds
 * @param {string} today
 * @returns {number}
 */
export function spanDays(bounds, today) {
  return windowDates(bounds, today, null).length
}

/**
 * 창의 이름. **그래프와 내려받기 버튼이 같은 문장을 쓴다** — 따로 만들면 같은 창을
 * 두 이름으로 부르게 된다.
 *
 * @param {number | null} days
 * @param {number} count 창의 날짜 수
 * @returns {string}
 */
export function windowLabel(days, count) {
  return days === null ? `전체 ${count}일` : `최근 ${days}일`
}

/**
 * 범위 안에 기록이 있는 날짜. 내려받기가 이걸로 조립한다 (`D13`).
 *
 * @param {Rec[]} records
 * @param {string | null} from 포함. null 이면 하한 없음
 * @param {string | null} to 포함. null 이면 상한 없음
 * @returns {string[]} 오름차순
 */
export function datesInRange(records, from, to) {
  /** @type {Record<string, true>} */
  const seen = Object.create(null)
  for (const rec of records) {
    const m = DAY_KEY.exec(rec.key)
    if (!m) continue
    if (from !== null && m[1] < from) continue
    if (to !== null && m[1] > to) continue
    seen[m[1]] = true
  }
  return Object.keys(seen).sort()
}

/**
 * 하루의 세 차원. **선이 아니라 레코드에서 직접 읽는다** — 점수 없이 이유만 쓴 날도
 * 이유가 보여야 하고(`SC-11`), 창이 좁아져도 짚은 날의 값이 「없음」으로 뒤집히면 안 된다.
 *
 * @param {Rec[]} records
 * @param {readonly string[]} dims
 * @param {string} date
 * @returns {{dim: string, score: number | null, reason: string}[]}
 */
export function dayEnergy(records, dims, date) {
  /** @type {Map<string, Rec>} */
  const found = new Map()
  for (const rec of records) {
    if (rec.kind !== 'energy') continue
    const m = DAY_KEY.exec(rec.key)
    if (m && m[1] === date) found.set(m[2], rec)
  }
  return dims.map((dim) => ({
    dim,
    score: found.get(dim)?.data.score ?? null,
    reason: found.get(dim)?.data.reason ?? '',
  }))
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
    const m = DAY_KEY.exec(rec.key)
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
  const at = (p) => {
    const i = /** @type {number} */ (index.get(p.date))
    return { ...p, x: x(i), y: y(p.score) }
  }

  const series = lineList.map(({ dim, segments, points }) => ({
    dim,
    // 점이 하나뿐인 구간은 polyline 이 되지 않는다 — 아래 `dots`가 그 자리를 그린다.
    polylines: segments
      .filter((seg) => seg.length > 1)
      .map((seg) => seg.map(at).map((p) => `${p.x},${p.y}`).join(' ')),
    dots: points.map(at),
  }))

  return { series, x, y, ticks: ticks(dates, x), gridlines: gridlines(y) }
}

/**
 * 양 끝 라벨은 안쪽으로 붙인다. 가운데 정렬하면 SVG 밖으로 나가 잘린다 —
 * 루트가 아닌 `<svg>`는 `overflow: hidden`이다.
 *
 * @param {number} i
 * @param {number} n
 */
function anchorFor(i, n) {
  if (i === 0) return 'start'
  if (i === n - 1) return 'end'
  return 'middle'
}

/**
 * 가로 눈금. **라벨은 창 안에서 유일해야 한다** — 여러 해에 걸친 창에서 `2월`이 두 번
 * 나오면 읽는 사람이 어느 해인지 모른다.
 *
 * @param {string[]} dates
 * @param {(i: number) => number} x
 * @returns {{x: number, label: string, anchor: string}[]}
 */
function ticks(dates, x) {
  const n = dates.length
  const monthStarts = dates.map((d, i) => ({ d, i })).filter(({ d }) => d.endsWith('-01'))
  // 월 경계가 12개를 넘으면 `2월`이 두 해에 나와 라벨이 겹친다. 그때는 1월만 낸다.
  const yearly = monthStarts.length > 12
  const chosen = yearly ? monthStarts.filter(({ d }) => d.slice(5, 7) === '01') : monthStarts

  if (chosen.length >= 2) {
    return chosen.map(({ d, i }) => ({
      x: x(i),
      label: yearly ? `${d.slice(2, 4)}년` : `${Number(d.slice(5, 7))}월`,
      anchor: anchorFor(i, n),
    }))
  }

  /** @param {number} i */
  const short = (i) => `${Number(dates[i].slice(5, 7))}/${Number(dates[i].slice(8, 10))}`
  const last = n - 1
  return last === 0
    ? [{ x: x(0), label: short(0), anchor: 'middle' }]
    : [
        { x: x(0), label: short(0), anchor: anchorFor(0, n) },
        { x: x(last), label: short(last), anchor: anchorFor(last, n) },
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
