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

/** 세로 눈금의 개수. 1·10 사이에 넷이면 1·4·7·10이라 간격이 3으로 고르다. */
const GRID_COUNT = 4

/** 일주일. 창의 걸음이자 가로 눈금의 간격이다 — 저널은 주 단위로 읽힌다. */
export const WEEK = 7

/**
 * 가로 눈금 하나가 쓸 수 있는 라벨의 최대 개수. **주·월 모두 이 예산 안에서 논다** —
 * 폰 폭(≈360px)에서 9px 라벨이 겹치지 않는 한계가 아홉 개다. 주 눈금이 이걸 넘으면
 * 월 눈금에 자리를 내주고, 월 눈금이 넘으면 몇 달씩 건너뛴다.
 */
const MAX_TICKS = 9

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
 * 기록이 창보다 늦게 시작해도 왼쪽을 잘라내지 않는다: 「최근 4주」가 4주가 아니면
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
 * 전체 창의 길이(일). 「4주 더」가 전체를 넘어서면 그냥 전체로 접는 데 쓴다.
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
 * 7의 배수는 **주로 읽는다.** 창을 주 단위로 넓히고 눈금도 7일 간격이라, 「최근 28일」로
 * 부르면 사람이 다시 7로 나눠야 한다. 배수가 아닌 창은 그대로 일로 남는다 — 「4.3주」는
 * 아무도 못 읽는다.
 *
 * @param {number | null} days
 * @param {number} count 창의 날짜 수
 * @returns {string}
 */
export function windowLabel(days, count) {
  if (days === null) return `전체 ${count}일`
  return days % WEEK === 0 ? `최근 ${days / WEEK}주` : `최근 ${days}일`
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
 * 주 눈금의 자리. **오른쪽 끝에서 거꾸로 7일씩 짚는다.**
 *
 * 창은 오늘에 붙어 있으므로(`D14`) 거꾸로 세면 오늘이 항상 눈금이 되고, 창을 넓혀도
 * 이미 있던 눈금이 제자리에 남는다. 앞에서부터 세면 창 길이가 7의 배수가 아닐 때
 * 오른쪽 끝에 이름 없는 여백이 남아 마지막 점이 언제인지 못 읽는다.
 *
 * @param {number} n
 * @returns {number[]} 오름차순
 */
function weekIndices(n) {
  /** @type {number[]} */
  const out = []
  for (let i = n - 1; i >= 0; i -= WEEK) out.push(i)
  return out.reverse()
}

/**
 * 가로 눈금. 창이 길어지면 **주 → 월 → 몇 달씩 건너뛴 월**로 성긴다 — 어느 창
 * 길이에서도 라벨이 `MAX_TICKS`개를 넘지 않는다.
 *
 * **라벨은 창 안에서 유일해야 한다** — 여러 해에 걸친 창에서 `2월`이 두 번 나오면 읽는
 * 사람이 어느 해인지 모른다. 그래서 해를 넘는 창은 월 라벨에 연도를 붙인다. 주 눈금의
 * `7/26`은 창이 `MAX_TICKS`주를 못 넘으므로 해를 넘을 수 없어 그냥 안전하다.
 *
 * **한때 "월 경계가 12개를 넘으면 1월만 낸다"였다.** 그 규칙은 1월이 창 안에 하나뿐일 때
 * (예: 2025-02-01~2026-07-26) 눈금이 통째로 사라져 양 끝 두 개로 붕괴했다. 예산 안에서
 * 균등하게 솎는 지금 방식은 그런 구멍이 없다.
 *
 * @param {string[]} dates
 * @param {(i: number) => number} x
 * @returns {{x: number, label: string, anchor: string}[]}
 */
function ticks(dates, x) {
  const n = dates.length
  /** @param {number} i */
  const short = (i) => `${Number(dates[i].slice(5, 7))}/${Number(dates[i].slice(8, 10))}`

  // 눈금이 하나뿐이면 주 단위로 부를 이유가 없다 — 아래 양 끝 눈금이 더 많이 말해준다.
  const weeks = weekIndices(n)
  if (weeks.length >= 2 && weeks.length <= MAX_TICKS) {
    return weeks.map((i) => ({ x: x(i), label: short(i), anchor: anchorFor(i, n) }))
  }

  const monthStarts = dates.map((d, i) => ({ d, i })).filter(({ d }) => d.endsWith('-01'))
  if (monthStarts.length >= 2) {
    // 예산을 넘으면 몇 달씩 건너뛴다. 첫 경계부터 세므로 왼쪽 끝이 늘 눈금을 갖는다.
    const stride = Math.ceil(monthStarts.length / MAX_TICKS)
    const multiYear = dates[0].slice(0, 4) !== dates[n - 1].slice(0, 4)
    return monthStarts
      .filter((_, k) => k % stride === 0)
      .map(({ d, i }) => ({
        x: x(i),
        // 해를 넘으면 `25/3`. 같은 해 안이면 `3월` — 한 해짜리 창에 연도는 잡음이다.
        label: multiYear
          ? `${d.slice(2, 4)}/${Number(d.slice(5, 7))}`
          : `${Number(d.slice(5, 7))}월`,
        anchor: anchorFor(i, n),
      }))
  }

  const last = n - 1
  return last === 0
    ? [{ x: x(0), label: short(0), anchor: 'middle' }]
    : [
        { x: x(0), label: short(0), anchor: anchorFor(0, n) },
        { x: x(last), label: short(last), anchor: anchorFor(last, n) },
      ]
}

/**
 * 세로 눈금. 위에서 아래로 등간격 `GRID_COUNT`개 — 기본 눈금에서 1·4·7·10이 된다.
 *
 * 셋(1·6·10)이었는데 간격이 5와 4로 달라 7점과 8점이 어느 칸인지 눈으로 못 셌다.
 * 넷은 간격이 3으로 고르다.
 *
 * @param {(score: number) => number} y
 */
function gridlines(y) {
  const step = (MAX_SCORE - MIN_SCORE) / (GRID_COUNT - 1)
  // **점수가 유일해야 한다.** `Graph.svelte`가 눈금을 `score`로 키잉하는데, 축이 좁으면
  // (1~3 처럼) 반올림이 같은 값을 두 번 내고 `each_key_duplicate`로 앱이 통째로 죽는다.
  // 지금 축(1~10)에서는 안 겹치지만, 겹치는 순간의 대가가 화면 하나가 아니라 전부다.
  const seen = new Set()
  for (let i = 0; i < GRID_COUNT; i++) seen.add(Math.round(MAX_SCORE - i * step))
  return [...seen].map((score) => ({ score, y: y(score) }))
}
