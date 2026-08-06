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
const ENERGY_CONTINUATION = /^( {2}|\t)(.*)$/

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
      const block = `# ${section.heading}\n${section.body}`.replace(/\n+$/, '')
      // **단, 날짜가 한 번이라도 나온 뒤라면 고정 블록이 아니다.** 사용자가 로그 본문에
      // 쓴 `# 제목` 한 줄이다 — `## `가 이미 받는 것과 같은 처리를 여기서도 한다.
      // 그러지 않으면 그 문단이 고정 블록으로 이동하고, 로컬 고정 블록이 차 있으면
      // 「건너뜀」 한 줄로 통째로 사라진다 (불변식 3).
      //
      // **경계가 "날짜 이후"인 이유**: 앱이 만드는 파일은 고정 블록이 늘 맨 위다
      // (`assemble`). 그래서 이 규칙은 자기 export를 다시 읽는 왕복을 깨지 않는다.
      const lastDay = days[days.length - 1]
      const lastLog = lastDay?.logs[lastDay.logs.length - 1]
      if (lastLog) lastLog.text += `\n${block}`
      else if (days.length) unparsed.push({ line: block, where: '날짜 뒤의 제목' })
      else pinnedParts.push(block)
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
      // 섹션 이름도 키다 — `dim`과 같은 이유로 NFC로 맞춘다 (`parseEnergyLine` 주석).
      // 본문(`block.body`)과 모르는 섹션의 원문은 그대로 둔다.
      const name = block.heading.trim().normalize('NFC')
      if (name === ENERGY) {
        let previous = null
        for (const line of trimSectionBody(block.body).split('\n')) {
          if (!line.trim()) continue
          const continuation = ENERGY_CONTINUATION.exec(line)
          if (continuation && previous) {
            previous.reason += previous.reason ? `\n${continuation[2]}` : continuation[2]
            continue
          }
          const entry = parseEnergyLine(line)
          if (entry) {
            energy.push(entry)
            previous = entry
          } else {
            unparsed.push({ line, where: `${section.heading} / ${ENERGY}` })
            previous = null
          }
        }
      } else if (LOG_KINDS.includes(/** @type {any} */ (name))) {
        logs.push({ kind: name, text: trimSectionBody(block.body) })
      } else if (logs.length) {
        // 사용자가 로그 본문에 소제목을 달았다. 새 블록이 아니라 **그 로그의 일부**다 —
        // 잘라내면 앱에서 쓴 글을 자기 export로 다시 읽을 때 그 아래가 통째로 사라진다.
        const last = logs[logs.length - 1]
        const body = trimSectionBody(block.body)
        last.text += `\n## ${block.heading}` + (body ? `\n${body}` : '')
      } else {
        // 로그가 시작되기도 전에 나온 모르는 섹션은 붙일 자리가 없다. 버리지 않고
        // 원문 그대로 모아 import 미리보기에서 보여준다 (불변식 3).
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
  // **차원 이름은 NFC로 정규화한다.** macOS에서 온 파일은 한글이 NFD(자모 분해)로
  // 들어오는데, 그러면 `energy:2026-08-03:인지(NFD)` 라는 **화면에도 그래프에도
  // 내려받기에도 안 나오는** 키가 만들어진다 — 저장은 되고 더티로 세어져 서버까지
  // 올라가지만 인출 통로가 없다 (설계 취향 15항). 사용자는 가져왔다고 믿고 원본을 지운다.
  //
  // **이건 사용자 글자를 정규화하는 게 아니다** — 이유·본문은 그대로 둔다. `dim`은
  // 내용이 아니라 **키**라서, 같은 이름이 두 판본으로 갈라지면 안 되는 자리다.
  const dim = m[1].trim().normalize('NFC')
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
  if (!reason) return line

  const lines = reason.split('\n')
  if (/^-[ \t]+/.test(lines[0])) return `${line}\n${lines.map((part) => `  ${part}`).join('\n')}`
  line += ` ${lines.shift()}`
  if (lines.length) line += `\n${lines.map((part) => `  ${part}`).join('\n')}`
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
  // 원본에 에너지 섹션이 없었으면 만들어내지 않는다 — 없던 줄을 더하면 왕복이 깨진다.
  if (day.energy.length) {
    blocks.push([`## ${ENERGY}`, ...day.energy.map(assembleEnergyLine)].join('\n'))
  }
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
