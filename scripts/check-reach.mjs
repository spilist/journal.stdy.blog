// **테스트가 로드조차 하지 않는 프로덕션 파일이 늘어나면 실패한다.**
//
// 왜 줄 커버리지 래칫이 아닌가. 2026-08-03에 재보니 `--experimental-test-coverage`가
// **97.54%**를 냈는데, 그건 **테스트가 로드한 파일만** 센 값이었다. 프로덕션 4279줄 중
// 실제로 닿는 건 1113줄(26%)이었고 나머지는 리포트에 나오지도 않았다. 그 상태에서
// 줄 커버리지 래칫을 걸었으면 97.5%를 97.5%로 고정하고 **74%가 안 보인다는 사실을
// 영영 못 봤을 것이다** — 이 리포가 하루 종일 싸운 「거짓 초록불」이다.
//
// 그래서 재는 것은 퍼센트가 아니라 **도달 가능성**이다. 기준선은 아래 파일이고,
// 늘면 실패, 줄면 "기준선을 줄이라"고 실패한다. 줄어드는 방향으로만 움직인다.
//
// 실행: `node scripts/check-reach.mjs` (게이트가 `npm test` 뒤에 부른다)

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { argv, exit } from 'node:process'
import { fileURLToPath } from 'node:url'

const BASELINE = 'scripts/reach-baseline.txt'

/**
 * 프로덕션으로 셀 것인가. 설정 파일과 테스트·하네스는 뺀다.
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isProduction(file) {
  if (!/^(src|worker|scripts)\/.*\.(js|mjs|svelte)$/.test(file)) return false
  if (file.includes('.test.') || file.includes('.harness.')) return false
  return !/\.config\.js$/.test(file)
}

/**
 * 기준선과 대조한다. **늘면 실패, 줄었는데 안 조여도 실패** — 한 방향으로만 움직인다.
 *
 * @param {string[]} unreached 지금 도달 못 한 파일
 * @param {string[]} baseline 기준선
 * @returns {{grew: string[], shrank: string[]}}
 */
export function compare(unreached, baseline) {
  return {
    grew: unreached.filter((f) => !baseline.includes(f)),
    shrank: baseline.filter((f) => !unreached.includes(f)),
  }
}

function productionFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .filter(isProduction)
    .sort()
}

/**
 * 커버리지 리포트에 등장한 파일 이름들. 경로가 아니라 **파일명**으로 맞춘다 —
 * 리포트가 상대 경로를 제각각 줄이고, 하네스가 컴파일한 모듈은 임시 경로로 나온다.
 *
 * @returns {Set<string>}
 */
function reachedNames() {
  const out = execFileSync(
    'node',
    ['--test', '--experimental-test-coverage', '--test-reporter=tap'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  )
  const names = new Set()
  for (const line of out.split('\n')) {
    const m = /^#\s+([\w.-]+\.(?:js|mjs|svelte))\s*\|/.exec(line)
    if (m) names.add(m[1])
  }
  return names
}

// 직접 실행할 때만 검사한다. import 는 위 순수 함수만 가져간다.
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  const production = productionFiles()
  const reached = reachedNames()

  // `state.svelte.js`는 하네스가 컴파일해 임시 파일로 돌리므로 이름이 안 맞는다.
  // 하네스가 그 파일을 읽는다는 사실 자체를 근거로 삼는다 — 하네스가 사라지면 같이 깨진다.
  const harness = readFileSync('src/lib/state.harness.js', 'utf8')
  for (const file of production) {
    const name = file.split('/').pop() ?? ''
    if (harness.includes(`'${name}'`)) reached.add(name)
  }

  const unreached = production.filter((f) => !reached.has(f.split('/').pop() ?? ''))

  if (argv.includes('--write')) {
    writeFileSync(BASELINE, unreached.join('\n') + '\n')
    console.log(`기준선 갱신 — 도달 못 한 파일 ${unreached.length}개`)
    exit(0)
  }

  const baseline = readFileSync(BASELINE, 'utf8').split('\n').filter(Boolean)
  const { grew, shrank } = compare(unreached, baseline)

  if (grew.length) {
    console.error(`테스트가 로드하지 않는 파일이 늘었다 — ${grew.length}개:`)
    for (const f of grew) console.error(`  ${f}`)
    console.error('\n테스트를 붙이거나, 정말 뺄 이유가 있으면')
    console.error(`  node scripts/check-reach.mjs --write`)
    console.error('로 기준선을 다시 쓰고 **왜 늘렸는지 커밋 메시지에 적을 것.**')
    exit(1)
  }

  if (shrank.length) {
    console.error(`도달했는데 기준선에 남아 있다 — ${shrank.length}개:`)
    for (const f of shrank) console.error(`  ${f}`)
    console.error('\n래칫은 줄어드는 방향으로만 움직인다. 아래로 기준선을 조여라:')
    console.error(`  node scripts/check-reach.mjs --write`)
    exit(1)
  }

  const covered = production.length - unreached.length
  console.log(`도달 확인 — 프로덕션 ${production.length}개 중 ${covered}개에 테스트가 닿는다`)
}
