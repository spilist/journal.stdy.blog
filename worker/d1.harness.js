// D1의 메모리 대역. **테스트 전용이고 워커는 이걸 import 하지 않는다.**
//
// SQL 엔진을 만들지 않는다 — `worker/index.js`가 실제로 내는 **열 몇 개의 문장만**
// 알아듣는다. 그게 테스트 더블로서 정직한 범위다: 여기서 통과했다는 말은
// "그 문장들에 대해 D1처럼 굴었다"는 뜻이고, 새 문장을 쓰면 여기가 먼저 깨진다.
//
// **쿼리 수를 센다.** D1은 Worker 호출 하나당 쿼리 1000개(유료)·50개(무료)가 상한이고,
// 그걸 넘겨 첫 사용이 깨진 적이 있다. 그 성질을 테스트가 직접 재려면 세는 수밖에 없다.

/** @typedef {{sql: string, args: unknown[]}} Stmt */

const TABLES = /** @type {const} */ (['energy', 'log', 'pinned', 'revision'])

/** 테이블의 기본키 컬럼. UPSERT 대상을 찾는 데 쓴다. */
const PK = {
  energy: ['date', 'dim'],
  log: ['date', 'kind'],
  pinned: ['id'],
  revision: ['day'],
}

/**
 * @returns {D1Database & {
 *   _rows: Record<string, Record<string, any>[]>,
 *   _queries: () => number,
 *   _resetQueries: () => void,
 * }}
 */
export function createD1() {
  /** @type {Record<string, Record<string, any>[]>} */
  const rows = { energy: [], log: [], pinned: [], revision: [] }
  let queries = 0

  /** @param {string} sql */
  const table = (sql) => TABLES.find((t) => new RegExp(`\\b(FROM|INTO)\\s+${t}\\b`).test(sql))

  /** @param {Stmt} stmt */
  function run(stmt) {
    queries += 1
    const name = table(stmt.sql)
    if (!name) throw new Error(`대역이 모르는 문장: ${stmt.sql.slice(0, 40)}`)
    const list = rows[name]

    if (/^SELECT/i.test(stmt.sql)) {
      if (/synced_at > \?/.test(stmt.sql)) {
        const since = Number(stmt.args[0])
        return { results: list.filter((r) => (r.synced_at ?? 0) > since) }
      }
      const keys = PK[name]
      const found = list.filter((r) =>
        keys.every((k, i) => (name === 'pinned' ? true : String(r[k]) === String(stmt.args[i]))),
      )
      return { results: found }
    }

    if (/^INSERT/i.test(stmt.sql)) {
      const cols = /INSERT INTO \w+ \(([^)]*)\)/.exec(stmt.sql)?.[1].split(',').map((c) => c.trim()) ?? []
      /** @type {Record<string, any>} */
      const row = {}
      cols.forEach((c, i) => (row[c] = stmt.args[i]))
      const keys = PK[name]
      const at = list.findIndex((r) => keys.every((k) => String(r[k]) === String(row[k])))
      if (at < 0) {
        list.push(row)
        return { results: [], meta: { changes: 1 } }
      }
      // `DO NOTHING` 은 먼저 쓴 쪽이 남는다 (`D11`).
      if (/DO NOTHING/i.test(stmt.sql)) return { results: [], meta: { changes: 0 } }
      list[at] = row
      return { results: [], meta: { changes: 1 } }
    }
    throw new Error(`대역이 모르는 문장: ${stmt.sql.slice(0, 40)}`)
  }

  /** @param {Stmt} stmt */
  const statement = (stmt) => ({
    _stmt: stmt,
    /** @param {...unknown} args */
    bind(...args) {
      return statement({ sql: stmt.sql, args })
    },
    async first() {
      return run(stmt).results[0]
    },
    async all() {
      return run(stmt)
    },
    async run() {
      return run(stmt)
    },
  })

  // 대역은 이 워커가 실제로 쓰는 문장만 안다. `D1Database` 전체를 구현하지 않으므로
  // 여기서 한 번만 캐스팅한다 — 테스트마다 캐스팅을 흩뿌리는 것보다 낫다.
  return /** @type {any} */ ({
    /** @param {string} sql */
    prepare(sql) {
      return statement({ sql, args: [] })
    },
    /** @param {{_stmt: Stmt}[]} stmts */
    async batch(stmts) {
      return stmts.map((s) => run(s._stmt))
    },
    // ── 테스트가 들여다보는 것 ────────────────────────────────────────────
    _rows: rows,
    /** 이번 호출에서 낸 쿼리 수. D1의 호출당 상한을 재는 자리다. */
    _queries: () => queries,
    _resetQueries: () => {
      queries = 0
    },
  })
}
