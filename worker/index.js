// `/api/*`만 처리한다. 나머지는 정적 자산이 Worker보다 먼저 응답한다
// (`wrangler.jsonc`의 `run_worker_first`).
//
// **병합 규칙은 여기 없다** — `src/lib/merge.js`의 `pushVerdict` 하나를 클라이언트와
// 공유한다. 규칙이 두 곳에 있으면 언젠가 갈라진다.

import { pushVerdict } from '../src/lib/merge.js'
import { verifyAccess } from './access.js'

/** @typedef {import('../src/lib/merge.js').Rec} Rec */

/** @param {unknown} body @param {number} [status] */
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

// ── 레코드 ↔ 테이블 ────────────────────────────────────────────────────────

/** @param {any} row @returns {Rec} */
const energyRec = (row) => ({
  key: `energy:${row.date}:${row.dim}`,
  kind: 'energy',
  data: { score: row.score, reason: row.reason, scoredAt: row.scored_at },
  updatedAt: row.updated_at,
})

/** @param {any} row @returns {Rec} */
const logRec = (row) => ({
  key: `log:${row.date}:${row.kind}`,
  kind: 'log',
  data: { text: row.text },
  updatedAt: row.updated_at,
})

/** @param {any} row @returns {Rec} */
const pinnedRec = (row) => ({
  key: 'pinned',
  kind: 'pinned',
  data: { text: row.text },
  updatedAt: row.updated_at,
})

/** @param {any} row @returns {Rec} */
const revisionRec = (row) => ({
  key: `revision:${row.day}`,
  kind: 'revision',
  data: { text: row.text },
  updatedAt: row.created_at,
})

/**
 * @param {D1Database} db
 * @param {string} key
 * @returns {Promise<Rec | undefined>}
 */
async function readOne(db, key) {
  const [kind, ...rest] = key.split(':')
  if (kind === 'energy') {
    const row = await db
      .prepare('SELECT * FROM energy WHERE date = ? AND dim = ?')
      .bind(rest[0], rest[1])
      .first()
    return row ? energyRec(row) : undefined
  }
  if (kind === 'log') {
    const row = await db.prepare('SELECT * FROM log WHERE date = ? AND kind = ?').bind(rest[0], rest[1]).first()
    return row ? logRec(row) : undefined
  }
  if (kind === 'pinned') {
    const row = await db.prepare('SELECT * FROM pinned WHERE id = 1').first()
    return row ? pinnedRec(row) : undefined
  }
  if (kind === 'revision') {
    const row = await db.prepare('SELECT * FROM revision WHERE day = ?').bind(rest[0]).first()
    return row ? revisionRec(row) : undefined
  }
  return undefined
}

/**
 * @param {D1Database} db
 * @param {Rec} rec
 */
function writeStatement(db, rec) {
  const [kind, ...rest] = rec.key.split(':')
  if (kind === 'energy') {
    return db
      .prepare(
        `INSERT INTO energy (date, dim, score, reason, scored_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(date, dim) DO UPDATE SET
           score = excluded.score, reason = excluded.reason,
           scored_at = excluded.scored_at, updated_at = excluded.updated_at`,
      )
      .bind(rest[0], rest[1], rec.data.score ?? null, rec.data.reason ?? '', rec.data.scoredAt ?? null, rec.updatedAt)
  }
  if (kind === 'log') {
    return db
      .prepare(
        `INSERT INTO log (date, kind, text, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(date, kind) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
      )
      .bind(rest[0], rest[1], rec.data.text ?? '', rec.updatedAt)
  }
  if (kind === 'pinned') {
    return db
      .prepare(
        `INSERT INTO pinned (id, text, updated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
      )
      .bind(rec.data.text ?? '', rec.updatedAt)
  }
  if (kind === 'revision') {
    // 추가 전용. 먼저 쓴 쪽이 남는다 (`D11`).
    return db
      .prepare('INSERT INTO revision (day, text, created_at) VALUES (?, ?, ?) ON CONFLICT(day) DO NOTHING')
      .bind(rest[0], rec.data.text ?? '', rec.updatedAt)
  }
  return null
}

// ── 엔드포인트 ─────────────────────────────────────────────────────────────

/**
 * @param {D1Database} db
 * @param {number} since
 */
async function pullSince(db, since) {
  const [energy, log, pinned, revision] = await db.batch([
    db.prepare('SELECT * FROM energy WHERE updated_at > ?').bind(since),
    db.prepare('SELECT * FROM log WHERE updated_at > ?').bind(since),
    db.prepare('SELECT * FROM pinned WHERE updated_at > ?').bind(since),
    db.prepare('SELECT * FROM revision WHERE created_at > ?').bind(since),
  ])
  return [
    ...energy.results.map(energyRec),
    ...log.results.map(logRec),
    ...pinned.results.map(pinnedRec),
    ...revision.results.map(revisionRec),
  ]
}

/**
 * @param {D1Database} db
 * @param {Rec[]} incoming
 */
async function applyPush(db, incoming) {
  /** @type {{key: string, applied: boolean, server?: Rec}[]} */
  const verdicts = []
  /** @type {D1PreparedStatement[]} */
  const writes = []

  for (const rec of incoming) {
    const server = await readOne(db, rec.key)
    const { applied } = pushVerdict(server, rec)
    if (applied) {
      const stmt = writeStatement(db, rec)
      if (stmt) writes.push(stmt)
      verdicts.push({ key: rec.key, applied: true })
    } else {
      verdicts.push({ key: rec.key, applied: false, server })
    }
  }

  if (writes.length) await db.batch(writes)
  return verdicts
}

export default {
  /**
   * @param {Request} request
   * @param {{DB: D1Database} & import('./access.js').AccessEnv} env
   */
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return new Response('not found', { status: 404 })

    const auth = await verifyAccess(request, env)
    if (!auth.ok) return json({ error: 'unauthenticated', reason: auth.reason }, 401)

    try {
      if (url.pathname === '/api/pull' && request.method === 'GET') {
        const since = Number(url.searchParams.get('since') ?? 0) || 0
        return json({ records: await pullSince(env.DB, since), now: Date.now() })
      }

      if (url.pathname === '/api/push' && request.method === 'POST') {
        const body = /** @type {{records?: Rec[]}} */ (await request.json())
        const records = Array.isArray(body.records) ? body.records : []
        return json({ verdicts: await applyPush(env.DB, records), now: Date.now() })
      }
    } catch (err) {
      return json({ error: 'server', message: String(err) }, 500)
    }

    return json({ error: 'not-found' }, 404)
  },
}
