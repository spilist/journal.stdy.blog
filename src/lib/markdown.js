// `references/sample.md` 형식의 파싱과 조립. **형식의 단일 출처는 그 파일이다.**
//
// 두 방향이 서로의 역함수여야 한다 — `assemble(parse(x)) === x`. 그래서 사용자가 친
// 글자를 정규화하지 않는다: 불릿 `- `도, 줄 끝 공백도 사용자 글자다. trim 하면 왕복이
// 깨지고 불변식 3(글자를 잃지 않는다)도 깨진다.
//
// 파싱 실패는 던지지 않고 `unparsed`에 원문 그대로 모은다. 저널은 다시 못 쓰므로
// 해석 못 한 줄을 조용히 버리는 것이 가장 나쁜 실패다.

import { fromH1, toH1 } from './date.js'

/** 화면과 조립의 기본 순서. `dim` 자체는 스키마에서 열려 있다 (`D20`). */
export const DIMS = /** @type {const} */ (['인지', '정서', '육체'])

/** 하루의 자유 텍스트 블록. */
export const LOG_KINDS = /** @type {const} */ (['어제', '오늘'])

const ENERGY = '에너지'

/** @typedef {{dim: string, score: number | null, reason: string}} EnergyEntry */
/** @typedef {{kind: string, text: string}} LogEntry */
/** @typedef {{date: string, energy: EnergyEntry[], logs: LogEntry[]}} DayEntry */
/** @typedef {{line: string, where: string}} Unparsed */
/** @typedef {{pinned: string, days: DayEntry[], unparsed: Unparsed[]}} Journal */

/** 점수는 1~10만 점수로 본다. `- 인지: 12. 어쩌고`의 12는 이유의 일부다. */
const ENERGY_LINE = /^-[ \t]*([^:]+):[ \t]?([\s\S]*)$/
const SCORE_PREFIX = /^(10|[1-9])\.[ \t]?([\s\S]*)$/

/**
 * @param {string} body
 * @returns {string} 제목 줄 다음의 선행 개행과 블록 사이 후행 개행을 걷어낸 본문
 */
function trimSectionBody(body) {
  return body.replace(/^\n/, '').replace(/\n+$/, '')
}

/**
 * `# ` 또는 `## ` 로 시작하는 섹션으로 자른다. 제목 앞의 내용은 버리지 않고
 * 첫 원소의 `heading: null`로 돌려준다.
 *
 * @param {string} text
 * @param {string} marker '# ' | '## '
 * @returns {{heading: string | null, body: string}[]}
 */
function splitSections(text, marker) {
  /** @type {{heading: string | null, body: string}[]} */
  const out = []
  /** @type {string[]} */
  let buffer = []
  /** @type {string | null} */
  let heading = null
  let started = false

  for (const line of text.split('\n')) {
    if (line.startsWith(marker) && !line.slice(marker.length).startsWith('#')) {
      if (started || buffer.length) out.push({ heading, body: buffer.join('\n') })
      heading = line.slice(marker.length)
      buffer = []
      started = true
    } else {
      buffer.push(line)
    }
  }
  if (started || buffer.length) out.push({ heading, body: buffer.join('\n') })
  return out
}

/**
 * @param {string} raw 마크다운 전체
 * @returns {Journal}
 */
export function parse(raw) {
  const text = raw.replace(/\r\n/g, '\n')
  /** @type {DayEntry[]} */
  const days = []
  /** @type {Unparsed[]} */
  const unparsed = []
  /** @type {string[]} */
  const pinnedParts = []

  for (const section of splitSections(text, '# ')) {
    if (section.heading === null) {
      // 첫 H1 앞에 있던 내용. 형식 밖이지만 버리지 않는다.
      const stray = trimSectionBody(section.body)
      if (stray) unparsed.push({ line: stray, where: '머리말' })
      continue
    }

    const date = fromH1(section.heading)
    if (date === null) {
      // 날짜가 아닌 H1 = 「잊지 않을 것」. 제목을 앱이 해석하지 않으므로 통째로 둔다 (`D10`).
      // 제목 다음 빈 줄도 사용자 글자이므로 선행 개행을 걷어내지 않는다.
      pinnedParts.push(`# ${section.heading}\n${section.body}`.replace(/\n+$/, ''))
      continue
    }

    /** @type {EnergyEntry[]} */
    const energy = []
    /** @type {LogEntry[]} */
    const logs = []

    for (const block of splitSections(section.body, '## ')) {
      if (block.heading === null) {
        const stray = trimSectionBody(block.body)
        if (stray) unparsed.push({ line: stray, where: `${section.heading} 머리말` })
        continue
      }
      const name = block.heading.trim()
      if (name === ENERGY) {
        for (const line of trimSectionBody(block.body).split('\n')) {
          if (!line.trim()) continue
          const entry = parseEnergyLine(line)
          if (entry) energy.push(entry)
          else unparsed.push({ line, where: `${section.heading} / ${ENERGY}` })
        }
      } else if (LOG_KINDS.includes(/** @type {any} */ (name))) {
        logs.push({ kind: name, text: trimSectionBody(block.body) })
      } else {
        unparsed.push({
          line: `## ${block.heading}\n${trimSectionBody(block.body)}`,
          where: section.heading,
        })
      }
    }

    days.push({ date, energy, logs })
  }

  return { pinned: pinnedParts.join('\n\n'), days, unparsed }
}

/**
 * @param {string} line
 * @returns {EnergyEntry | null}
 */
export function parseEnergyLine(line) {
  const m = ENERGY_LINE.exec(line)
  if (!m) return null
  const dim = m[1].trim()
  if (!dim) return null
  const rest = m[2]
  const scored = SCORE_PREFIX.exec(rest)
  if (scored) return { dim, score: Number(scored[1]), reason: scored[2] }
  return { dim, score: null, reason: rest }
}

/**
 * @param {EnergyEntry} entry
 * @returns {string}
 */
export function assembleEnergyLine({ dim, score, reason }) {
  let line = `- ${dim}:`
  if (score !== null && score !== undefined) line += ` ${score}.`
  if (reason) line += ` ${reason}`
  return line
}

/**
 * 하루치. **고정 블록은 들어가지 않는다** (`D13`, 사용자 명시).
 *
 * @param {DayEntry} day
 * @returns {string}
 */
export function assembleDay(day) {
  const blocks = [`# ${toH1(day.date)}`]
  blocks.push([`## ${ENERGY}`, ...day.energy.map(assembleEnergyLine)].join('\n'))
  for (const log of day.logs) blocks.push(`## ${log.kind}\n${log.text}`)
  return blocks.join('\n\n')
}

/**
 * 전체. 하루치와 **같은 조립 함수에 범위만 다르게 준 것**이므로 기능이 하나다 (`D13`).
 * 날짜는 내림차순 — `references/sample.md`와 같은 순서다.
 *
 * @param {{pinned?: string, days: DayEntry[]}} journal
 * @returns {string}
 */
export function assemble({ pinned = '', days }) {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const parts = []
  if (pinned) parts.push(pinned)
  for (const day of sorted) parts.push(assembleDay(day))
  return parts.join('\n\n') + '\n'
}

/**
 * 화면이 쓰기 편하도록 하루를 정규화한다 — 세 차원과 두 블록이 늘 있는 모양.
 * **파싱 결과에는 적용하지 않는다** (없던 줄을 만들어내면 왕복이 깨진다).
 *
 * @param {string} date
 * @param {Partial<DayEntry>} [seed]
 * @returns {DayEntry}
 */
export function blankDay(date, seed) {
  const energy = DIMS.map((dim) => {
    const found = seed?.energy?.find((e) => e.dim === dim)
    return found ?? { dim, score: null, reason: '' }
  })
  const logs = LOG_KINDS.map((kind) => {
    const found = seed?.logs?.find((l) => l.kind === kind)
    return found ?? { kind, text: '' }
  })
  return { date, energy, logs }
}
