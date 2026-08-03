// `state.svelte.js`를 Node에서 돌리기 위한 하네스. **테스트 전용이다.**
//
// **왜 필요한가.** 이 앱에서 가장 큰 파일(`state.svelte.js`)에 오랫동안 테스트가
// 0개였고, 2026-08-03 하루에 자초한 결함 넷 중 셋이 정확히 거기서 났다. 이유는
// "테스트가 불가능해서"가 아니라 **아무도 시도하지 않아서**였다 — 필요한 건 아래
// 스무 줄이 전부다.
//
// 막는 것은 둘뿐이고 각각 한 줄로 풀린다:
//
// 1. **룬**(`$state`)은 컴파일이 필요하다 → `compileModule`로 컴파일한다. 이 파일은
//    `$state`와 `$state.snapshot`만 쓰고 `$effect`·`$derived`는 안 쓰므로 이펙트
//    루트가 필요 없다.
// 2. **`store.js`·`sync.js`가 하드 import**다 → 컴파일 결과의 import 지정자를
//    같은 디렉터리의 하네스 대역으로 바꾼다.
//
// **`generate: 'client'`인 게 중요하다.** 서버 런타임으로 컴파일하면 `$state`가
// 프록시가 아니라 평범한 객체가 되어, 프록시를 IndexedDB에 넘겨 `DataCloneError`를
// 내던 실제 결함이 **측정되지 않는다.**

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const CACHE_DIR = join(tmpdir(), 'journal-state-harness')

/** @type {Promise<{ Journal: new () => any }> | null} */
let loaded = null

/**
 * 컴파일된 `Journal`을 돌려준다. 여러 번 불러도 한 번만 컴파일한다.
 *
 * @returns {Promise<{ Journal: new () => any }>}
 */
export function loadJournal() {
  if (loaded) return loaded
  loaded = (async () => {
    const source = readFileSync(join(HERE, 'state.svelte.js'), 'utf8')

    // **소스 해시로 디스크에 캐시한다.** 컴파일러를 부르는 데 4초 넘게 드는데 이 파일은
    // 대부분의 실행에서 안 바뀐다. 캐시가 없으면 게이트가 8초에서 13초가 된다.
    // 소스가 바뀌면 해시가 바뀌어 자동으로 다시 컴파일된다 — 낡은 캐시를 쓸 수 없다.
    mkdirSync(CACHE_DIR, { recursive: true })
    const out = join(CACHE_DIR, `${createHash('sha256').update(source).digest('hex').slice(0, 16)}.mjs`)

    if (!existsSync(out)) {
      const { compileModule } = await import('svelte/compiler')
      const { js } = compileModule(source, { filename: 'state.svelte.js', generate: 'client' })

      // 상대 지정자를 절대 경로로 바꾼다. `store`·`sync`만 하네스 대역으로 간다.
      /** @type {Record<string, string>} */
      const swap = { './store.js': 'state.harness.store.js', './sync.js': 'state.harness.sync.js' }
      let code = js.code.replace(/'\.\/([\w.]+)\.js'/g, (_m, name) => {
        const file = swap[`./${name}.js`] ?? `${name}.js`
        return JSON.stringify(pathToFileURL(join(HERE, file)).href)
      })
      // 런타임은 조건부 export라 여기서 풀어 박는다.
      code = code.replace(
        /'svelte\/internal\/client'/g,
        JSON.stringify(import.meta.resolve('svelte/internal/client')),
      )
      writeFileSync(out, code)
    }
    return import(pathToFileURL(out).href)
  })()
  return loaded
}

/**
 * 빈 저널 하나와 두 대역을 초기화해 돌려준다.
 *
 * @returns {Promise<{journal: any, store: typeof import('./state.harness.store.js'), sync: typeof import('./state.harness.sync.js')}>}
 */
export async function freshJournal() {
  const [{ Journal }, store, sync] = await Promise.all([
    loadJournal(),
    import('./state.harness.store.js'),
    import('./state.harness.sync.js'),
  ])
  store.reset()
  sync.reset()
  const journal = new Journal()
  // `load()`를 거치지 않고 바로 쓰는 테스트를 위해 로드 완료로 둔다 — `#commit`의
  // 빈 레코드 삭제(`F-8`)가 `loaded`를 본다.
  journal.loaded = true
  return { journal, store, sync }
}
