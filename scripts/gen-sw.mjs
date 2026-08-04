// 서비스워커를 빌드 산출물에서 생성한다. 오프라인이 기본이므로(불변식 1) 앱 셸이
// 캐시에 없으면 비행기 모드에서 아무것도 안 뜬다.
//
// 두 가지가 사용자를 **예전 화면에 조용히 가둘 수 있어서** 그걸 피하는 게 요점이다:
//
// 1. **캐시 버전을 파일 "이름"으로만 만들면**, 해시가 안 붙는 파일(`index.html`,
//    `manifest.webmanifest`, `icon.svg`)만 바뀐 배포에서 `sw.js` 바이트가 동일해져
//    브라우저가 업데이트를 감지하지 않는다 → 아무리 새로고침해도 예전 화면이고,
//    홈 화면 PWA면 캐시를 지울 UI도 없다. 그래서 **내용 해시**를 쓴다.
// 2. **`cache.addAll`은 원자적이라** 목록 중 하나만 실패해도 install 전체가 깨진다.
//    `'/'`를 넣으면 Access 세션이 만료된 상태에서 로그인 리다이렉트가 와서 install이
//    죽는다 — 세션이 1개월이라 "한 달 만에 열어서 새 배포를 받는" 상황과 정확히 겹친다.
//
// 그리고 `/api/*`는 절대 캐시하지 않는다 — 동기화 응답을 캐시하면 낡은 데이터가
// 정본 행세를 한다.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { argv } from 'node:process'
import { fileURLToPath } from 'node:url'

const DIST = 'dist'

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/**
 * 서비스워커 소스. **파일 시스템을 안 만지는 순수 함수라 테스트가 돌릴 수 있다** —
 * 여기 있는 규칙 둘(옛 셸에 갇히지 않기·오프라인 백지 안 되기)이 서로를 상쇄한 적이
 * 있어서, 문자열을 검사하는 게 아니라 **실제로 실행해** 확인한다
 * ([gen-sw.test.js](./gen-sw.test.js)).
 *
 * @param {string} version 캐시 이름
 * @param {string[]} assets 캐시할 경로
 * @returns {string}
 */
export function serviceWorkerSource(version, assets) {
  return `const CACHE = ${JSON.stringify(version)}
// '/' 는 넣지 않는다 — Access 로그인 리다이렉트 하나로 install 전체가 깨진다.
const ASSETS = ${JSON.stringify(assets)}
const ASSET_PATHS = new Set(ASSETS)

// 이번 캐시가 **전부** 채워졌는가. 부분만 채워졌으면 옛 캐시를 지우지 않는다 —
// 지우면 오프라인에서 백지가 된다 (불변식 1).
let complete = false

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // 하나가 실패해도 나머지는 남긴다. addAll 의 원자성이 여기서는 손해다.
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then((rs) => {
        complete = rs.every((r) => r.status === 'fulfilled')
        // 부분 설치본은 활성화하지 않는다. 활성화하면 새 셸이 옛 자산과 섞여
        // 오프라인에서 실행 불가능한 판을 만들 수 있다. 다음 업데이트 주기에
        // 브라우저가 온전한 스냅샷을 다시 설치한다.
        return complete ? self.skipWaiting() : undefined
      }),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (complete
      ? caches.keys().then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
        )
      : // **부분 캐시로 옛 캐시를 지우면 오프라인에서 백지가 된다.** 약전계나 Access
        // 세션 만료(자산 요청이 로그인으로 리다이렉트되고 캐시 저장이 거절된다)에서
        // 실제로 일어난다. 옛 캐시를 남겨두면 최소한 옛 판으로는 열린다 — 다음 배포에
        // 다시 시도한다.
        Promise.resolve()
    ).then(() => (complete ? self.clients.claim() : undefined)),
  )
})

// **이번 캐시가 이기고, 옛 캐시는 그물이다.** 순서가 이 파일의 요점 둘을 동시에 지킨다:
// 이름 없는 \`caches.match\`는 CacheStorage를 **생성 순**으로 훑어 옛 셸이 이기므로
// (= 예전 화면에 갇힌다) 이번 캐시를 먼저 보고, 그래도 못 찾았을 때만 옛 캐시를 본다
// (= 부분 설치로 오프라인 백지가 되지 않는다).
//
// **둘 중 하나만 하면 서로를 상쇄한다** — 실제로 한 번 그렇게 짰다: 옛 캐시를 남겨두는
// 조치와 이번 캐시로만 조회하는 조치를 같이 넣어서, 남긴 옛 캐시가 어디서도 안 쓰였다.
function cached(req) {
  return caches
    .match(req, { ignoreSearch: true, cacheName: CACHE })
    .then((hit) => hit ?? caches.match(req, { ignoreSearch: true }))
}

// 부분 설치 뒤 온라인에서 되찾은 자산은 이번 캐시에 남겨야 한다. 그렇지 않으면
// 첫 온라인 요청은 성공해도, 곧바로 오프라인이 되면 같은 자산이 다시 사라진다.
function cacheResponse(req, res, cacheable = true) {
  // An expired Access session can redirect static asset requests to login HTML. Caching
  // that response as the shell would open the login page instead of the app offline.
  if (!cacheable || !res?.ok || res.redirected || typeof res.clone !== 'function') {
    return { response: res, cache: Promise.resolve() }
  }
  const copy = res.clone()
  const cache = caches
    .open(CACHE)
    .then((cache) => cache.put(req, copy))
    .catch(() => undefined)
  return { response: res, cache }
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.origin !== location.origin) return

  // 화면 이동은 네트워크 먼저, 끊겼으면 앱 셸로. 쿼리가 붙은 진입(?x=1)도 같은 셸이다.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        // 루트로 받은 셸도 오프라인 fallback이 찾는 /index.html 이름으로 보관한다.
        .then((res) => {
          const cached = cacheResponse('/index.html', res)
          e.waitUntil(cached.cache)
          return cached.response
        })
        .catch(() =>
          // **절대 undefined 를 돌려주지 않는다** — respondWith(undefined) 는 TypeError 라
          // 오프라인에서 브라우저 오류 페이지가 뜬다. 캐시가 비었으면 그냥 네트워크 오류다.
          cached('/index.html').then((hit) => hit ?? Response.error()),
        ),
    )
    return
  }

  e.respondWith(
    caches
      .match(e.request, { ignoreSearch: true, cacheName: CACHE })
      // 이번 캐시에 없으면 네트워크. 네트워크도 없으면 옛 캐시라도 준다.
      // **네트워크 응답만** 현재 캐시에 넣는다. cached의 옛 캐시 fallback까지
      // 저장하면 옛 JS/CSS가 이번 캐시를 오염시켜 다음 배포를 막는다.
      .then(
        (hit) =>
          hit ??
          fetch(e.request)
            .then((res) => {
              // Cloudflare's SPA fallback returns index.html with 200 for an unknown
              // asset path. It must be served online but never stored as that asset.
              const cached = cacheResponse(e.request, res, ASSET_PATHS.has(url.pathname))
              e.waitUntil(cached.cache)
              return cached.response
            })
            .catch(() => cached(e.request)),
      )
      .then((res) => res ?? Response.error()),
  )
})
`
}

// 직접 실행할 때만 dist 를 읽고 쓴다. import 는 위 함수만 가져간다.
if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  const files = walk(DIST).filter((p) => !p.endsWith('sw.js'))
  const assets = files.map((p) => '/' + relative(DIST, p).split(/[\\/]/).join('/'))
  // 이름이 아니라 **내용**으로 버전을 만든다. 해시 안 붙는 파일만 바뀌어도 버전이 움직인다.
  const digest = createHash('sha256')
  for (const [i, file] of files.entries()) {
    digest.update(assets[i]).update(readFileSync(file))
  }
  const version = 'v' + digest.digest('base64url').slice(0, 16)
  writeFileSync(join(DIST, 'sw.js'), serviceWorkerSource(version, assets))
  console.log(`sw.js ${version} — ${assets.length} assets`)
}
