// 마크다운 링크 검사. AGENTS.md `마크다운 링크 규약`이 "lint 실패다"라고 선언한 걸
// 실제로 실패하게 만든다 — 선언만 있고 강제가 없으면 규약이 아니라 희망이다.
//
// **markdownlint을 넣지 않는 이유** (설계 취향 9항): 여기서 필요한 규칙은 둘이다.
// 라이브러리는 나머지 수십 개 규칙과 설정 파일과 예외 목록을 함께 들고 온다 —
// 린터가 취향을 다투기 시작하면 신호가 잡음에 묻힌다. **대신 이 파일이 200줄로
// 자라면 그 근거가 사라진다**: 새 규칙을 넣기 전에 그걸 먼저 볼 것.
//
// **하지 않는 것**: 백틱 토큰 규약(AGENTS.md 두 번째 줄). 실측 44건 중 대부분이
// `.js`·`.gitignore`처럼 정당한 개념 토큰이라 기계화하면 잡음만 남는다.
//
// 순수 부분(`scanLinks`)은 [check-docs.test.js](./check-docs.test.js)가 지킨다.
// **강제하는 코드가 자기 검증이 없으면 조용히 0건을 내고 아무도 모른다.**

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** `http:`·`mailto:`·`file:` 같은 스킴은 파일 경로가 아니다. */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * 인라인 링크와 이미지. **여는 대괄호를 매치하지 않는다** — `[결정 [D3]](./x.md)`
 * 처럼 텍스트에 대괄호가 있으면 `\[[^\]]*\]`가 매치에 실패하고, 그러면 위반이
 * 걸리는 게 아니라 **조용히 스킵된다.** 검사기에서 그게 제일 나쁜 실패 모드다.
 */
const INLINE = /\]\(\s*([^)\s]+?)\s*(?:["'(][^)]*)?\)/g

/** 참조 정의 `[label]: ./target.md`. 이걸 안 보면 참조 문법으로 규약을 우회할 수 있다. */
const REFERENCE = /^\s{0,3}\[[^\]]+\]:\s*(\S+)/

/** 펜스는 길이가 같거나 더 긴 같은 문자로만 닫힌다 — 중첩 펜스에서 토글이 어긋나지 않게. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/

/**
 * 링크가 아닌 구간을 공백으로 덮는다. 열이 유지되므로 뒤의 정규식이 그대로 돈다.
 *
 * @param {string} line
 * @param {{inComment: boolean}} state HTML 주석은 줄을 넘는다
 */
function mask(line, state) {
  let out = ''
  let i = 0
  while (i < line.length) {
    if (state.inComment) {
      const end = line.indexOf('-->', i)
      if (end === -1) return out + ' '.repeat(line.length - i)
      out += ' '.repeat(end + 3 - i)
      i = end + 3
      state.inComment = false
      continue
    }
    if (line.startsWith('<!--', i)) {
      state.inComment = true
      continue
    }
    if (line[i] === '`') {
      // 인라인 코드. 규약을 **설명하는** 문서가 자기 검사기에 걸리면 안 된다.
      let ticks = 0
      while (line[i + ticks] === '`') ticks += 1
      const close = line.indexOf('`'.repeat(ticks), i + ticks)
      const end = close === -1 ? line.length : close + ticks
      out += ' '.repeat(end - i)
      i = end
      continue
    }
    out += line[i]
    i += 1
  }
  return out
}

/**
 * 한 파일의 링크 위반. **IO를 하지 않는다** — 그래서 테스트가 가능하다.
 *
 * @param {string} text
 * @param {(target: string) => boolean | null} lookup 대상이 있는가. `null`이면 리포 밖이라 묻지 않는다
 * @returns {{line: number, message: string}[]}
 */
export function scanLinks(text, lookup) {
  /** @type {{line: number, message: string}[]} */
  const problems = []
  /** @type {string | null} */
  let fence = null
  const state = { inComment: false }

  text.split('\n').forEach((raw, i) => {
    const opener = FENCE.exec(raw)
    if (opener) {
      if (fence === null) fence = opener[1]
      else if (opener[1][0] === fence[0] && opener[1].length >= fence.length) fence = null
      return
    }
    if (fence !== null) return

    const line = mask(raw, state)
    /** @type {string[]} */
    const targets = []
    for (const m of line.matchAll(INLINE)) targets.push(m[1])
    const ref = REFERENCE.exec(line)
    if (ref) targets.push(ref[1])

    for (const raw of targets) {
      // `<./내 문서.md>` 꺾쇠 형태.
      const target = raw.startsWith('<') && raw.endsWith('>') ? raw.slice(1, -1) : raw
      if (!target || SCHEME.test(target) || target.startsWith('#') || target.startsWith('/')) continue

      if (!target.startsWith('./') && !target.startsWith('../')) {
        problems.push({ line: i + 1, message: `상대 링크는 './' 또는 '../'로 시작한다 — (${target})` })
        continue
      }
      const path = target.split('#')[0]
      if (!path) continue
      const found = lookup(path)
      // `null` = 리포 밖. 형제 체크아웃(`../sibling-repo`)이 없다고 게이트가 빨개지면,
      // 링크 규약과 무관한 이유로 커밋이 막힌다.
      if (found === false) {
        problems.push({ line: i + 1, message: `링크가 가리키는 파일이 없다 — (${target})` })
      }
    }
  })

  return problems
}

/** @param {string} p */
function decode(p) {
  // `%`가 인코딩이 아닌 경우(`50%-off.md`)에 URIError로 죽지 않게 한다.
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}

async function main() {
  const root = process.cwd()
  const tracked = new Set(
    execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean),
  )
  // 디렉터리 링크도 유효하다. 추적 파일의 상위 경로를 모아 둔다.
  const dirs = new Set()
  for (const f of tracked) {
    let d = dirname(f)
    while (d && d !== '.') {
      dirs.add(d)
      d = dirname(d)
    }
  }

  const files = [...tracked].filter((f) => f.endsWith('.md'))
  /** @type {string[]} */
  const problems = []

  for (const file of files) {
    /** @param {string} target */
    const lookup = (target) => {
      const abs = resolve(dirname(file), decode(target))
      const rel = relative(root, abs)
      if (rel.startsWith('..')) return null // 리포 밖 — 묻지 않는다
      // **git 기준으로 본다.** `existsSync`만 보면 `.gitignore`된 경로를 가리키는
      // 링크가 로컬에서만 통과하고 커밋된 리포에서는 깨진다.
      return tracked.has(rel) || dirs.has(rel) || (rel === '' && existsSync(abs))
    }
    for (const p of scanLinks(await readFile(file, 'utf8'), lookup)) {
      problems.push(`${file}:${p.line}  ${p.message}`)
    }
  }

  if (problems.length) {
    console.error(`마크다운 링크 ${problems.length}건:`)
    for (const p of problems) console.error(`  ${p}`)
    process.exit(1)
  }
  console.log(`마크다운 링크 확인 — ${files.length}개 파일, 문제 없음`)
}

// 테스트가 import 할 때는 돌지 않는다.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
