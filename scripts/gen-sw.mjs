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

const DIST = 'dist'

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const files = walk(DIST).filter((p) => !p.endsWith('sw.js'))
const assets = files.map((p) => '/' + relative(DIST, p).split(/[\\/]/).join('/'))

// 이름이 아니라 **내용**으로 버전을 만든다. 해시 안 붙는 파일만 바뀌어도 버전이 움직인다.
const digest = createHash('sha256')
for (const [i, file] of files.entries()) {
  digest.update(assets[i]).update(readFileSync(file))
}
const version = 'v' + digest.digest('base64url').slice(0, 16)

writeFileSync(
  join(DIST, 'sw.js'),
  `const CACHE = ${JSON.stringify(version)}
// '/' 는 넣지 않는다 — Access 로그인 리다이렉트 하나로 install 전체가 깨진다.
const ASSETS = ${JSON.stringify(assets)}

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
        return self.skipWaiting()
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
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.origin !== location.origin) return

  // 화면 이동은 네트워크 먼저, 끊겼으면 앱 셸로. 쿼리가 붙은 진입(?x=1)도 같은 셸이다.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')))
    return
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit ?? fetch(e.request)),
  )
})
`,
)

console.log(`sw.js ${version} — ${assets.length} assets`)
