// Cloudflare Access JWT 검증. **이 앱의 유일한 인증 경계다** — 여기가 틀리면 사적인
// 저널이 열린다. Node에 진짜 WebCrypto가 있으므로 **실제 RSA 키로 서명한 토큰**으로
// 검증한다. 서명을 흉내내면 지키는 게 서명이 아니게 된다.

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { verifyAccess } from './access.js'

const TEAM = 'stdy-test.cloudflareaccess.com'
const AUD = 'aud-for-tests'
const EMAIL = 'someone@example.test'
const ENV = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ALLOWED_EMAIL: EMAIL }

/** @param {object | string} v */
const b64url = (v) =>
  Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url')

const keys = /** @type {CryptoKeyPair} */ (
  await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
)
const jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'kid-1' }
const other = /** @type {CryptoKeyPair} */ (
  await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  )
)

/** JWKS 응답을 가로챈다. 매 테스트가 새 캐시를 쓰도록 팀 도메인을 바꿔 준다. */
let jwksCalls = 0
globalThis.fetch = /** @type {any} */ (
  async () => {
    jwksCalls += 1
    return { ok: true, json: async () => ({ keys: [jwk] }) }
  }
)

const soon = () => Math.floor(Date.now() / 1000) + 600

/**
 * @param {{header?: object, payload?: object, key?: CryptoKey, signature?: string}} [over]
 */
async function token(over = {}) {
  const header = { alg: 'RS256', kid: 'kid-1', ...over.header }
  const payload = { aud: AUD, iss: `https://${TEAM}`, exp: soon(), email: EMAIL, ...over.payload }
  const signing = `${b64url(header)}.${b64url(payload)}`
  if (over.signature !== undefined) return `${signing}.${over.signature}`
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    over.key ?? keys.privateKey,
    new TextEncoder().encode(signing),
  )
  return `${signing}.${Buffer.from(sig).toString('base64url')}`
}

/** @param {string | null} jwt @param {Partial<typeof ENV>} [env] */
const check = (jwt, env = {}) =>
  verifyAccess(
    /** @type {any} */ ({ headers: new Headers(jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {}) }),
    { ...ENV, ...env },
  )

test('제대로 서명된 토큰은 통과한다', async () => {
  const out = await check(await token())
  assert.deepEqual(out, { ok: true, email: EMAIL })
})

test('토큰이 없으면 막는다', async () => {
  assert.deepEqual(await check(null), { ok: false, reason: 'no-token' })
})

test('다른 키로 서명한 토큰은 막는다 — 이게 이 파일의 존재 이유다', async () => {
  const out = await check(await token({ key: other.privateKey }))
  assert.deepEqual(out, { ok: false, reason: 'signature' })
})

test('알고리즘을 바꿔치기할 수 없다 (alg=none · HS256)', async () => {
  // `alg`를 먼저 고정하지 않으면 서명 없는 토큰이 통과하는 고전적 우회가 열린다.
  for (const alg of ['none', 'HS256', 'RS512']) {
    const out = await check(await token({ header: { alg }, signature: '' }))
    assert.deepEqual(out, { ok: false, reason: 'alg' }, alg)
  }
})

test('모르는 kid 는 막는다 — JWKS에 없는 키로 서명한 것이다', async () => {
  const out = await check(await token({ header: { kid: 'kid-없음' } }))
  assert.deepEqual(out, { ok: false, reason: 'unknown-kid' })
})

test('aud · iss · exp 를 각각 본다', async () => {
  assert.deepEqual(await check(await token({ payload: { aud: '남의-앱' } })), { ok: false, reason: 'aud' })
  assert.deepEqual(await check(await token({ payload: { iss: 'https://evil.example' } })), {
    ok: false,
    reason: 'iss',
  })
  assert.deepEqual(await check(await token({ payload: { exp: 1 } })), { ok: false, reason: 'expired' })
})

test('exp가 현재 초와 같으면 만료로 처리한다', async () => {
  const out = await check(await token({ payload: { exp: Math.floor(Date.now() / 1000) } }))
  assert.deepEqual(out, { ok: false, reason: 'expired' })
})

test('aud 가 배열이어도 본다', async () => {
  assert.deepEqual(await check(await token({ payload: { aud: ['남의-앱', AUD] } })), {
    ok: true,
    email: EMAIL,
  })
  assert.deepEqual(await check(await token({ payload: { aud: ['남의-앱'] } })), {
    ok: false,
    reason: 'aud',
  })
})

test('허용 이메일이 아니면 막는다 — Access 정책 실수 하나로 저널이 열리면 안 된다', async () => {
  const out = await check(await token({ payload: { email: 'other@example.test' } }))
  assert.deepEqual(out, { ok: false, reason: 'email' })
})

test('이메일 대소문자는 무시한다', async () => {
  const out = await check(await token({ payload: { email: EMAIL.toUpperCase() } }))
  assert.deepEqual(out, { ok: true, email: EMAIL })
})

test('허용 목록 시크릿이 없으면 **닫는다** — 못 정하면 여는 게 아니다', async () => {
  // `wrangler secret put ALLOWED_EMAIL`을 잊고 배포하면 여기로 온다. 가드가 없으면
  // TypeError가 500으로 새어 클라이언트가 「로그인 만료」로 오인한다 (`F-4`).
  const out = await check(await token(), { ALLOWED_EMAIL: '' })
  assert.deepEqual(out, { ok: false, reason: 'no-allowlist' })
})

test('망가진 토큰에 예외를 던지지 않는다 — 500이 되면 F-4 계약이 깨진다', async () => {
  for (const bad of [
    '',
    'a.b',
    'a.b.c.d',
    '!!!.@@@.###',
    `${b64url({ alg: 'RS256', kid: 'kid-1' })}.@@@.x`,
    await token({ signature: '%%%' }),
  ]) {
    const out = await check(bad)
    assert.equal(out.ok, false, bad)
  }
})

test('JWKS 를 매번 다시 받지 않는다 — 캐시가 없으면 요청마다 왕복이 붙는다', async () => {
  const before = jwksCalls
  await check(await token())
  await check(await token())
  assert.equal(jwksCalls, before, '이미 받아둔 키를 쓴다')
})
