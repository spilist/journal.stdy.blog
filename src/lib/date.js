// 날짜는 전부 KST 캘린더 날짜다 (`D16`). Worker는 UTC로 돌기 때문에 이걸 안 박으면
// KST 09시 이전에 쓴 기록이 전날로 붙는다 — 새벽에 쓰는 사용자에게 치명적이다.
//
// 'YYYY-MM-DD'(캘린더 날짜)와 epoch ms(순간)를 섞지 않는다. 앞은 어느 날의 기록인지,
// 뒤는 언제 손댔는지다.

const KST = 'Asia/Seoul'

// 'sv-SE' 로케일이 'YYYY-MM-DD'를 준다. 직접 포매팅하면 자릿수 패딩을 손으로 짜야 한다.
const dayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: KST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: KST,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const timestampFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: KST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/**
 * @param {number} [ms] epoch ms. 생략하면 지금.
 * @returns {string} 'YYYY-MM-DD' (KST)
 */
export function kstDate(ms) {
  return dayFormatter.format(ms === undefined ? new Date() : new Date(ms))
}

/**
 * @param {number} ms
 * @returns {string} 'HH:MM' (KST)
 */
export function kstTime(ms) {
  return timeFormatter.format(new Date(ms))
}

/** @param {number} ms @returns {string} 'YYYY-MM-DD HH:MM:SS KST' */
export function kstTimestamp(ms) {
  return `${timestampFormatter.format(new Date(ms))} KST`
}

/**
 * 날짜 입력·URL에 쓸 수 있는 실제 캘린더 날짜인지 확인한다.
 *
 * @param {string} date
 * @returns {boolean}
 */
export function isCalendarDate(date) {
  const m = /^(20\d{2})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return false
  const at = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  const shifted = new Date(at)
  return (
    shifted.getUTCFullYear() === Number(m[1]) &&
    shifted.getUTCMonth() + 1 === Number(m[2]) &&
    shifted.getUTCDate() === Number(m[3])
  )
}

/**
 * 캘린더 날짜에 일수를 더한다. 정오 UTC를 기준점으로 잡아 DST/타임존 경계에서
 * 하루가 튀지 않게 한다 (한국은 DST가 없지만 기준점을 자정에 두면 취약하다).
 *
 * @param {string} date 'YYYY-MM-DD'
 * @param {number} days
 * @returns {string} 'YYYY-MM-DD'
 */
export function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number)
  const at = Date.UTC(y, m - 1, d, 12) + days * 86_400_000
  const shifted = new Date(at)
  return [
    String(shifted.getUTCFullYear()).padStart(4, '0'),
    String(shifted.getUTCMonth() + 1).padStart(2, '0'),
    String(shifted.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * 정본 마크다운의 H1은 두 자리 연도다 (`references/sample.md`).
 *
 * @param {string} date 'YYYY-MM-DD'
 * @returns {string} 'YY-MM-DD'
 */
export function toH1(date) {
  return date.slice(2)
}

/**
 * @param {string} heading H1 본문 (`# ` 제거된 것)
 * @returns {string | null} 'YYYY-MM-DD', 날짜가 아니면 null
 */
export function fromH1(heading) {
  const m = /^(\d{2})-(\d{2})-(\d{2})$/.exec(heading.trim())
  if (!m) return null
  const date = `20${m[1]}-${m[2]}-${m[3]}`
  return isCalendarDate(date) ? date : null
}

/**
 * 화면에 쓰는 라벨. 오늘/어제는 날짜보다 이게 빠르게 읽힌다.
 *
 * @param {string} date 'YYYY-MM-DD'
 * @param {string} today 'YYYY-MM-DD'
 * @returns {string}
 */
export function dayLabel(date, today) {
  if (date === today) return '오늘'
  if (date === addDays(today, -1)) return '어제'
  if (date === addDays(today, 1)) return '내일'
  const [, m, d] = date.split('-')
  return `${Number(m)}월 ${Number(d)}일`
}
