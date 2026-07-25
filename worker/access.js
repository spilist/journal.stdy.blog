// Cloudflare Access JWT 검증 (`D18`).
//
// **Access는 커스텀 도메인 앞만 막는다.** Worker origin으로 직접 오는 요청은 그대로
// 들어오므로 이 검증이 없으면 우회된다. `workers_dev: false`와 함께 두 겹이다.
//
// 실패는 **JSON 401**이다. HTML을 돌려주면 클라이언트가 "로그인 만료"와 구분하지
// 못한다 (`F-4`).

/** @typedef {{ACCESS_TEAM_DOMAIN: string, ACCESS_AUD: string, ALLOWED_EMAIL: string}} AccessEnv */

/** @type {{at: number, keys: Map<string, CryptoKey>} | null} */
let jwks = null

const JWKS_TTL_MS = 60 * 60 * 1000

/** @param {string} s */
function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** @param {string} s */
function b64urlToJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)))
}

/**
 * @param {string} teamDomain
 * @returns {Promise<Map<string, CryptoKey>>}
 */
async function loadKeys(teamDomain) {
  if (jwks && Date.now() - jwks.at < JWKS_TTL_MS) return jwks.keys
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
  if (!res.ok) throw new Error(`jwks ${res.status}`)
  const body = /** @type {{keys: (JsonWebKey & {kid?: string})[]}} */ (await res.json())
  const keys = new Map()
  for (const jwk of body.keys) {
    if (!jwk.kid) continue
    keys.set(
      jwk.kid,
      await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    )
  }
  jwks = { at: Date.now(), keys }
  return keys
}

/**
 * @param {Request} request
 * @param {AccessEnv} env
 * @returns {Promise<{ok: true, email: string} | {ok: false, reason: string}>}
 */
export async function verifyAccess(request, env) {
  const token =
    request.headers.get('Cf-Access-Jwt-Assertion') ??
    /CF_Authorization=([^;]+)/.exec(request.headers.get('Cookie') ?? '')?.[1]
  if (!token) return { ok: false, reason: 'no-token' }

  const parts = token.split('.')
  if (parts.length !== 3) return { ok: false, reason: 'malformed' }

  /** @type {{kid?: string, alg?: string}} */
  let header
  /** @type {{aud?: string | string[], iss?: string, exp?: number, email?: string}} */
  let payload
  try {
    header = b64urlToJson(parts[0])
    payload = b64urlToJson(parts[1])
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (header.alg !== 'RS256' || !header.kid) return { ok: false, reason: 'alg' }

  const keys = await loadKeys(env.ACCESS_TEAM_DOMAIN)
  const key = keys.get(header.kid)
  if (!key) return { ok: false, reason: 'unknown-kid' }

  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    signed,
  )
  if (!valid) return { ok: false, reason: 'signature' }

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!aud.includes(env.ACCESS_AUD)) return { ok: false, reason: 'aud' }
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return { ok: false, reason: 'iss' }
  if (!payload.exp || payload.exp * 1000 < Date.now()) return { ok: false, reason: 'expired' }

  // 허용 이메일 하나. 정책이 Access 쪽에도 있지만 여기서 한 번 더 본다 —
  // 정책 실수 하나로 저널이 열리면 안 된다.
  const email = (payload.email ?? '').toLowerCase()
  if (email !== env.ALLOWED_EMAIL.toLowerCase()) return { ok: false, reason: 'email' }

  return { ok: true, email }
}
