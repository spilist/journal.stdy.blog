// `/api/*`만 처리한다. 나머지는 정적 자산이 Worker보다 먼저 응답한다
// (`wrangler.jsonc`의 `run_worker_first`).
//
// **병합 규칙은 여기 없다** — `src/lib/merge.js`의 `pushVerdict` 하나를 클라이언트와
// 공유한다. 규칙이 두 곳에 있으면 언젠가 갈라진다.

import { pushVerdict } from '../src/lib/merge.js'
import { verifyAccess } from './access.js'

/** @typedef {import('../src/lib/merge.js').Rec} Rec */

/**
 * pull 커서가 서버 시각에서 물러서는 폭. push의 판정~커밋 창을 덮는다 (`F-9`).
 * 이만큼은 매 pull에서 겹쳐 받지만, 연 1000행대라 비용이 없다.
 */
const PULL_CURSOR_SLACK_MS = 10_000

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
export async function readOne(db, key) {
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
 * **UPSERT는 `updated_at`이 앞설 때만 덮는다.**
 *
 * `applyPush`의 읽기-판정-쓰기는 원자적이지 않다 — `readOne` 루프는 `db.batch` 밖에서
 * 돌고, 그 창은 레코드 수만큼 길다(아래 `now` 주석이 "레코드가 많으면 초 단위"라고
 * 스스로 적는다). 폰과 PC가 그 창 안에서 각각 올리면 둘 다 같은 옛 값을 읽고 둘 다
 * `applied`를 받아, **나중에 커밋한 쪽이 더 오래된 판본이어도 최신을 덮었다.** 그러면
 * (1) 이긴 기기는 `syncedAt`을 찍어 비-더티가 되고 이후 pull은 `stale`로 떨궈 그
 * 문장이 영영 전파되지 않으며, (2) 응답의 `server`는 덮이기 전 값이라
 * `preserveOverwritten`이 사본을 만들지 못해 `SC-6`가 깨진다. 신호가 하나도 없다.
 *
 * 판정을 원자화하는 대신 **쓰기를 조건부로 만든다.** 진 쪽은 `syncedAt`을 붙여 비-더티가
 * 되지만, 다음 pull에서 서버의 더 새 판본을 `newer`로 받아 수렴한다 — 어느 쪽도 글자를
 * 잃지 않는다 (불변식 3). `revision`은 원래 `DO NOTHING`이라 이미 안전하다.
 */
const LWW = 'WHERE excluded.updated_at > '

/**
 * @param {D1Database} db
 * @param {Rec} rec
 * @param {number} now 서버 시각. `synced_at`에 박힌다 (`F-9`)
 */
export function writeStatement(db, rec, now) {
  const [kind, ...rest] = rec.key.split(':')
  if (kind === 'energy') {
    return db
      .prepare(
        `INSERT INTO energy (date, dim, score, reason, scored_at, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(date, dim) DO UPDATE SET
           score = excluded.score, reason = excluded.reason,
           scored_at = excluded.scored_at, updated_at = excluded.updated_at,
           synced_at = excluded.synced_at
         ${LWW}energy.updated_at`,
      )
      .bind(
        rest[0],
        rest[1],
        rec.data.score ?? null,
        rec.data.reason ?? '',
        rec.data.scoredAt ?? null,
        rec.updatedAt,
        now,
      )
  }
  if (kind === 'log') {
    return db
      .prepare(
        `INSERT INTO log (date, kind, text, updated_at, synced_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(date, kind) DO UPDATE SET
           text = excluded.text, updated_at = excluded.updated_at, synced_at = excluded.synced_at
         ${LWW}log.updated_at`,
      )
      .bind(rest[0], rest[1], rec.data.text ?? '', rec.updatedAt, now)
  }
  if (kind === 'pinned') {
    return db
      .prepare(
        `INSERT INTO pinned (id, text, updated_at, synced_at) VALUES (1, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           text = excluded.text, updated_at = excluded.updated_at, synced_at = excluded.synced_at
         ${LWW}pinned.updated_at`,
      )
      .bind(rec.data.text ?? '', rec.updatedAt, now)
  }
  if (kind === 'revision') {
    // 추가 전용. 먼저 쓴 쪽이 남는다 (`D11`).
    return db
      .prepare(
        'INSERT INTO revision (day, text, created_at, synced_at) VALUES (?, ?, ?, ?) ON CONFLICT(day) DO NOTHING',
      )
      .bind(rest[0], rec.data.text ?? '', rec.updatedAt, now)
  }
  return null
}

// ── 엔드포인트 ─────────────────────────────────────────────────────────────

/**
 * @param {D1Database} db
 * @param {number} since
 */
export async function pullSince(db, since) {
  // **커서는 `synced_at`(서버가 쓴 시각)으로만 긁는다** (`F-9`). `updated_at`은
  // 클라이언트가 글자를 고친 시각이라, 오프라인에서 어제 쓰고 오늘 올린 행은
  // 이미 커서보다 뒤에 있어 **다른 기기에 영영 안 간다.**
  const [energy, log, pinned, revision] = await db.batch([
    db.prepare('SELECT * FROM energy WHERE synced_at > ?').bind(since),
    db.prepare('SELECT * FROM log WHERE synced_at > ?').bind(since),
    db.prepare('SELECT * FROM pinned WHERE synced_at > ?').bind(since),
    db.prepare('SELECT * FROM revision WHERE synced_at > ?').bind(since),
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
export async function applyPush(db, incoming) {
  /** @type {{key: string, applied: boolean, server?: Rec}[]} */
  const verdicts = []
  /** @type {{rec: Rec, server: Rec | undefined}[]} */
  const winners = []

  for (const rec of incoming) {
    const server = await readOne(db, rec.key)
    if (pushVerdict(server, rec).applied) winners.push({ rec, server })
    else verdicts.push({ key: rec.key, applied: false, server })
  }

  // **`synced_at`은 커밋 직전에 잡는다** (`F-9`). 요청 시작 시각을 박으면, 위
  // `readOne` 루프가 도는 동안(레코드가 많으면 초 단위다) 다른 기기가 pull을 돌려
  // 커서를 그 시각 너머로 옮길 수 있다 — 그러면 여기서 쓴 행은 영영 안 잡힌다.
  const now = Date.now()
  /** @type {D1PreparedStatement[]} */
  const writes = []
  for (const { rec, server } of winners) {
    // **안 쓰고 `applied`를 주지 않는다.** 클라이언트는 그걸 보고 `syncedAt`을 붙여
    // 영원히 비-더티로 만든다 — 서버엔 행이 없는데 로컬은 올렸다고 믿게 된다.
    // (`revision`은 예외다: 문장은 만들어지되 `DO NOTHING`으로 안 써질 수 있다.
    // 자동 밀봉본이고 먼저 쓴 쪽이 남는 게 `D11`이라 그대로 둔다.)
    const stmt = writeStatement(db, rec, now)
    if (stmt) {
      writes.push(stmt)
      // **덮은 값을 그대로 돌려준다** (`SC-6`). 클라이언트가 그걸로 사본을 만든다 —
      // 안 보내면 진 쪽 글자가 서버에도 어느 기기에도 안 남는다.
      //
      // **판정은 여기서 못 한다.** 사본이 필요한지는 "이 기기가 그 판본을 본 적
      // 있나"인데, 그 근거인 `syncedAt`은 **로컬 전용이라 전선에 실리지 않는다**
      // (`sync.js`). 워커가 판정하려 들면 항상 참이 되어 가드가 죽는다 — 실제로
      // 한 번 그렇게 짰다가 되돌렸다. 판정하는 곳은 `syncedAt`을 아는 클라이언트다.
      // 대가는 덮은 경우의 페이로드뿐이고, 보내는 건 더티 레코드뿐이라 작다.
      verdicts.push({ key: rec.key, applied: true, server })
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

    try {
      // **검증을 try 안에 둔다.** JWKS fetch 실패(콜드 아이솔레이트에서 certs가 5xx)나
      // 망가진 base64가 여기서 던지는데, 밖이면 Workers의 HTML 1101 페이지가 나가고
      // 클라이언트는 비-JSON을 재로그인으로 읽는다 (`F-4`) — 새로고침해도 안 풀린다.
      // 실패는 언제나 JSON이어야 한다는 게 `access.js`가 선언한 계약이다.
      const auth = await verifyAccess(request, env)
      if (!auth.ok) return json({ error: 'unauthenticated', reason: auth.reason }, 401)

      // **쓰기는 출처를 본다.** Access 쿠키는 site(eTLD+1) 단위라 형제 `*.stdy.blog`
      // 자산에서 오는 POST에도 붙는다. 그쪽 하나가 뚫리면 남의 스크립트가 큰
      // `updatedAt`으로 저널을 덮을 수 있고, 그건 pull에서 충돌 사본도 없이 수락된다.
      // 읽기(GET)는 막지 않는다 — 부작용이 없고 브라우저 탐색을 깨뜨린다.
      if (request.method !== 'GET') {
        const origin = request.headers.get('Origin')
        if (origin !== null && origin !== url.origin) {
          return json({ error: 'bad-origin' }, 403)
        }
      }

      if (url.pathname === '/api/pull' && request.method === 'GET') {
        const since = Number(url.searchParams.get('since') ?? 0) || 0
        // 커서는 **질의 전** 시각에서 여유를 두고 물러선다. push는 판정을 다 낸 뒤
        // 커밋하므로 "스탬프는 찍혔는데 아직 안 보이는" 창이 ms가 아니라 그 요청
        // 길이만큼이다. 그 창을 안 덮으면 그 행은 영영 안 잡힌다. 겹쳐 받는 건
        // 안전하다 — `pullDecision`이 `stale`로 떨군다 (`F-9`).
        const now = Date.now() - PULL_CURSOR_SLACK_MS
        return json({ records: await pullSince(env.DB, since), now })
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
