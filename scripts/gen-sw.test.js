// 생성된 서비스워커를 **실제로 실행해** 확인한다.
//
// 문자열 검사로는 부족하다는 걸 겪었다: 2026-08-03에 「부분 설치면 옛 캐시를 남긴다」와
// 「조회는 이번 캐시로만 한다」를 같이 넣었는데, 둘이 서로를 상쇄해 **남긴 옛 캐시가
// 어디서도 안 쓰였다.** 두 문자열은 다 있었고 주석도 옳았다. 실행해야 보인다.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { serviceWorkerSource } from './gen-sw.mjs'

const ASSETS = ['/index.html', '/assets/app-abc123.js', '/icon.svg']

/** 최소한의 CacheStorage 대역. 생성 순서를 지킨다 — 브라우저가 그 순서로 훑는다. */
function fakeCaches() {
  /** @type {Map<string, Map<string, string>>} */
  const store = new Map()
  /** @param {any} req */
  const url = (req) => (typeof req === 'string' ? req : req.url)
  return {
    _store: store,
    /** @param {string} name */
    async open(name) {
      if (!store.has(name)) store.set(name, new Map())
      const c = /** @type {Map<string, string>} */ (store.get(name))
      return {
        /** @param {string} path */
        async add(path) {
          if (this._fail?.(path)) throw new TypeError('failed to fetch')
          c.set(path, `${name}:${path}`)
        },
        /** @type {((p: string) => boolean) | undefined} */
        _fail: undefined,
      }
    },
    async keys() {
      return [...store.keys()]
    },
    /** @param {string} name */
    async delete(name) {
      return store.delete(name)
    },
    /** @param {any} req @param {{cacheName?: string}} [opts] */
    async match(req, opts = {}) {
      const path = url(req)
      if (opts.cacheName) return store.get(opts.cacheName)?.get(path)
      for (const c of store.values()) if (c.has(path)) return c.get(path)
      return undefined
    },
  }
}

/**
 * 워커 소스를 돌리고 리스너를 잡아 돌려준다.
 *
 * @param {{caches: any, fetch: (req: any) => Promise<any>, failAdd?: (p: string) => boolean}} env
 */
function runWorker(env) {
  /** @type {Record<string, (e: any) => void>} */
  const on = {}
  const self = {
    /** @param {string} type @param {(e: any) => void} fn */
    addEventListener: (type, fn) => {
      on[type] = fn
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  }
  const open = env.caches.open.bind(env.caches)
  env.caches.open = async (/** @type {string} */ name) => {
    const c = await open(name)
    c._fail = env.failAdd
    return c
  }
  const src = serviceWorkerSource('v-test', ASSETS)
  // 워커 전역을 인자로 주입한다. `location`은 오리진 판정에만 쓰인다.
  new Function('self', 'caches', 'fetch', 'location', 'Response', 'URL', src)(
    self,
    env.caches,
    env.fetch,
    { origin: 'https://journal.stdy.blog' },
    { error: () => 'RESPONSE_ERROR' },
    URL,
  )
  return {
    /** @param {(p: Promise<any>) => void} [hold] */
    async install(hold) {
      let waited
      on.install({ waitUntil: (/** @type {Promise<any>} */ p) => (waited = p) })
      await waited
      hold?.(/** @type {any} */ (waited))
    },
    async activate() {
      let waited
      on.activate({ waitUntil: (/** @type {Promise<any>} */ p) => (waited = p) })
      await waited
    },
    /** @param {string} path @param {string} [mode] */
    async fetchEvent(path, mode = 'no-cors') {
      let responded
      const req = { url: `https://journal.stdy.blog${path}`, method: 'GET', mode }
      on.fetch({ request: req, respondWith: (/** @type {any} */ r) => (responded = r) })
      return responded === undefined ? undefined : await responded
    },
  }
}

const netFail = async () => {
  throw new TypeError('offline')
}

test('설치가 온전하면 옛 캐시를 지운다', async () => {
  const caches = fakeCaches()
  caches._store.set('v-old', new Map([['/index.html', 'v-old:/index.html']]))
  const sw = runWorker({ caches, fetch: netFail })
  await sw.install()
  await sw.activate()
  assert.deepEqual(await caches.keys(), ['v-test'])
})

test('설치가 부분이면 옛 캐시를 남긴다 — 지우면 오프라인에서 백지다 (불변식 1)', async () => {
  const caches = fakeCaches()
  caches._store.set('v-old', new Map([['/index.html', 'v-old:/index.html']]))
  const sw = runWorker({ caches, fetch: netFail, failAdd: (p) => p === '/index.html' })
  await sw.install()
  await sw.activate()
  assert.ok((await caches.keys()).includes('v-old'), '옛 캐시가 남아야 한다')
})

test('남긴 옛 캐시가 실제로 쓰인다 — 남기기만 하고 안 보면 상쇄된다', async () => {
  // 이게 2026-08-03에 실제로 났던 실패다. 두 조치가 다 있었는데 서로를 지웠다.
  const caches = fakeCaches()
  caches._store.set('v-old', new Map([['/index.html', 'v-old:/index.html']]))
  const sw = runWorker({ caches, fetch: netFail, failAdd: (p) => p === '/index.html' })
  await sw.install()
  await sw.activate()
  const shell = await sw.fetchEvent('/', 'navigate')
  assert.equal(shell, 'v-old:/index.html', '오프라인에서 옛 셸이라도 열려야 한다')
})

test('이번 캐시가 옛 캐시를 이긴다 — 예전 화면에 갇히지 않는다', async () => {
  const caches = fakeCaches()
  caches._store.set('v-old', new Map([['/index.html', 'v-old:/index.html']]))
  const sw = runWorker({ caches, fetch: netFail })
  await sw.install()
  // activate 전에도(= claim 직후 첫 요청) 이번 캐시가 이겨야 한다.
  const shell = await sw.fetchEvent('/', 'navigate')
  assert.equal(shell, 'v-test:/index.html')
})

test('캐시가 비어도 undefined 를 돌려주지 않는다 — respondWith(undefined)는 TypeError다', async () => {
  const caches = fakeCaches()
  const sw = runWorker({ caches, fetch: netFail })
  assert.equal(await sw.fetchEvent('/', 'navigate'), 'RESPONSE_ERROR')
  assert.equal(await sw.fetchEvent('/assets/app-abc123.js'), 'RESPONSE_ERROR')
})

test('`/api/*`는 절대 캐시하지 않는다 — 낡은 동기화 응답이 정본 행세를 한다', async () => {
  const caches = fakeCaches()
  const sw = runWorker({ caches, fetch: netFail })
  await sw.install()
  assert.equal(await sw.fetchEvent('/api/pull'), undefined, '워커가 아예 손대지 않는다')
})

test("ASSETS 에 '/' 를 넣지 않는다 — 로그인 리다이렉트 하나로 install 이 깨진다", () => {
  const src = serviceWorkerSource('v-test', ASSETS)
  const listed = JSON.parse(/const ASSETS = (\[.*?\])\n/.exec(src)?.[1] ?? '[]')
  assert.ok(!listed.includes('/'), "'/' 는 목록에 없다")
})

test('생성된 소스는 유효한 자바스크립트다', () => {
  // 템플릿을 손보다 `const CACHE` 를 두 번 낸 적이 있다. 빌드는 통과했다.
  assert.doesNotThrow(() => new Function(serviceWorkerSource('v-test', ASSETS)))
})
