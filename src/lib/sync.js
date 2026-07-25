// 서버와 말하는 유일한 자리. 병합 규칙은 여기 없다 — `merge.js`에 있다.
//
// **Access 세션이 만료되면 401이 아니라 로그인 HTML로 302가 온다** (`F-4`). 그래서
// 응답이 JSON인지 확인하지 않으면 파싱이 이상하게 터지고 "네트워크 오류"로 오인된다.
// 재로그인 상태를 별도로 돌려주는 이유다.

/** @typedef {import('./merge.js').Rec} Rec */

/**
 * @param {Response} res
 * @returns {boolean}
 */
function isLoginRedirect(res) {
  if (res.redirected) return true
  if (res.status === 401 || res.status === 403) return true
  return !(res.headers.get('content-type') ?? '').includes('application/json')
}

/**
 * @param {number} since epoch ms
 * @returns {Promise<{records: Rec[], now: number, relogin?: true}>}
 */
export async function pull(since) {
  const res = await fetch(`/api/pull?since=${since}`, { credentials: 'include' })
  if (isLoginRedirect(res)) return { records: [], now: since, relogin: true }
  return res.json()
}

/**
 * @param {Rec[]} records
 * @returns {Promise<{verdicts: {key: string, applied: boolean, server?: Rec}[], now: number, relogin?: true}>}
 */
export async function push(records) {
  const res = await fetch('/api/push', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    // syncedAt은 로컬 전용이다. 서버로 보내지 않는다.
    body: JSON.stringify({
      records: records.map((r) => ({ key: r.key, kind: r.kind, data: r.data, updatedAt: r.updatedAt })),
    }),
  })
  if (isLoginRedirect(res)) return { verdicts: [], now: Date.now(), relogin: true }
  return res.json()
}
