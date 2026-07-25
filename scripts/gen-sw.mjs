// 서비스워커를 빌드 산출물에서 생성한다. 오프라인이 기본이므로(불변식 1) 앱 셸이
// 캐시에 없으면 비행기 모드에서 아무것도 안 뜬다.
//
// `/api/*`는 절대 캐시하지 않는다 — 동기화 응답을 캐시하면 낡은 데이터를 정본으로
// 착각하게 된다.

import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const DIST = 'dist'

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const assets = walk(DIST)
  .map((p) => '/' + relative(DIST, p).split(/[\\/]/).join('/'))
  .filter((p) => p !== '/sw.js')

// 자산 목록이 곧 캐시 버전이다. 빌드가 바뀌면 이름이 바뀌므로 자동으로 무효화된다.
const version = 'v' + Buffer.from(assets.join('|')).toString('base64url').slice(0, 16)

writeFileSync(
  join(DIST, 'sw.js'),
  `const CACHE = ${JSON.stringify(version)}
const ASSETS = ${JSON.stringify(['/', ...assets])}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  // 동기화 응답을 캐시하면 낡은 데이터가 정본 행세를 한다.
  if (url.pathname.startsWith('/api/')) return
  if (url.origin !== location.origin) return

  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit
      return fetch(e.request).catch(() => caches.match('/'))
    }),
  )
})
`,
)

console.log(`sw.js ${version} — ${assets.length} assets`)
