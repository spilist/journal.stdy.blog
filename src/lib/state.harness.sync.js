// `sync.js`(네트워크)의 메모리 대역. **테스트 전용이고 앱은 이걸 import 하지 않는다.**
//
// **서버 판정은 흉내내지 않고 진짜 `pushVerdict`를 쓴다.** 워커도 같은 함수를 쓰므로,
// 여기서 다른 규칙을 쓰면 테스트가 지키는 게 실제 프로토콜이 아니게 된다.
//
// 왕복 지연을 주문할 수 있다 — 「올리기」가 도는 동안 사용자가 계속 타이핑하는 창이
// 실제 결함 둘의 조건이었다.

import { pushVerdict } from './merge.js'

/** @typedef {import('./merge.js').Rec} Rec */

/** 서버(D1) 대역. @type {Map<string, Rec>} */
export let server = new Map()
/** 요청마다 보낸 키 목록. 청킹이 실제로 쪼개는지 여기서 본다. @type {string[][]} */
export let calls = []

let rttMs = 0
let relogin = false
let expireAfter = -1

/** @param {number} ms */
export function roundTrip(ms) {
  rttMs = ms
}

/** Access 세션 만료를 흉내낸다. @param {boolean} on */
export function expireSession(on) {
  relogin = on
}

/**
 * N번째 요청부터 세션이 끊긴 것으로 만든다 (1부터 셈). 청킹의 부분 성공을 보려면
 * **묶음 하나만** 실패시킬 수 있어야 한다.
 *
 * @param {number} n
 */
export function expireFromCall(n) {
  expireAfter = n
}

export function reset() {
  server = new Map()
  calls = []
  rttMs = 0
  relogin = false
  expireAfter = -1
}

/** @param {number} ms */
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * 워커의 `applyPush`와 같은 순서로 판정한다 — 이긴 경우에도 덮은 값을 실어 보낸다.
 *
 * @param {Rec[]} recs
 */
export async function push(recs) {
  calls.push(recs.map((r) => r.key))
  await wait(rttMs)
  if (relogin || (expireAfter > 0 && calls.length >= expireAfter)) return { relogin: true }
  /** @type {{key: string, applied: boolean, server?: Rec}[]} */
  const verdicts = []
  for (const rec of recs) {
    const prev = server.get(rec.key)
    if (pushVerdict(prev, rec).applied) {
      server.set(rec.key, structuredClone(rec))
      verdicts.push(prev ? { key: rec.key, applied: true, server: prev } : { key: rec.key, applied: true })
    } else {
      verdicts.push({ key: rec.key, applied: false, server: prev })
    }
  }
  return { verdicts, now: Date.now() }
}

export async function pull() {
  await wait(rttMs)
  if (relogin) return { relogin: true }
  return { records: [...server.values()], now: Date.now() }
}
