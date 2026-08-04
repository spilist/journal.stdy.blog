// 로컬 IndexedDB. **여기가 작업 정본이고 D1은 동기화 대상이다** (불변식 1).
// 네트워크 없이 앱이 완전히 동작해야 하므로 모든 읽기·쓰기가 여기서 끝난다.
//
// 레코드는 `merge.js`의 봉투 하나로 통일했다 — `{key, kind, data, updatedAt, syncedAt}`.
// 스토어를 종류별로 쪼개면 동기화가 종류마다 갈라지는데, 병합 규칙은 하나뿐이다.

/** @typedef {import('./merge.js').Rec} Rec */

const DB_NAME = 'journal'
const DB_VERSION = 1

/** @type {Promise<IDBDatabase> | null} */
let opening = null

function open() {
  if (opening) return opening
  opening = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('conflicts'))
        db.createObjectStore('conflicts', { keyPath: 'id', autoIncrement: true })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'k' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return opening
}

/**
 * @template T
 * @param {IDBRequest<T>} req
 * @returns {Promise<T>}
 */
function done(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * @param {string} name
 * @param {IDBTransactionMode} mode
 */
async function store(name, mode) {
  const db = await open()
  return db.transaction(name, mode).objectStore(name)
}

/** @returns {Promise<Rec[]>} */
export async function allRecords() {
  return done(/** @type {IDBRequest<Rec[]>} */ ((await store('records', 'readonly')).getAll()))
}

/**
 * @param {Rec[]} records
 */
export async function putRecords(records) {
  if (!records.length) return
  const db = await open()
  const tx = db.transaction('records', 'readwrite')
  for (const rec of records) tx.objectStore('records').put(rec)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 응답이 늦게 도착한 동기화 판본이 그 사이의 로컬 입력을 덮지 않게 쓴다.
 * 같은 readwrite 트랜잭션 안에서 현재 updatedAt을 읽고 비교하므로, 두 탭의 쓰기
 * 순서가 어떻게 겹쳐도 더 새로 저장된 글자가 이긴다.
 *
 * @param {Rec[]} records
 * @returns {Promise<Rec[]>} 실제로 저장한 레코드
 */
export async function putRecordsIfNewer(records) {
  if (!records.length) return []
  const db = await open()
  const tx = db.transaction('records', 'readwrite')
  const os = tx.objectStore('records')
  /** @type {Rec[]} */
  const stored = []
  for (const rec of records) {
    const req = os.get(rec.key)
    req.onsuccess = () => {
      if (!req.result || req.result.updatedAt <= rec.updatedAt) {
        os.put(rec)
        stored.push(rec)
      }
    }
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
  return stored
}

/** @param {Rec} record */
export function putRecord(record) {
  return putRecords([record])
}

/** @param {string} key */
export async function dropRecord(key) {
  return done((await store('records', 'readwrite')).delete(key))
}

/** @typedef {{id?: number, target: string, text: string, at: number}} Conflict */

/** @returns {Promise<Conflict[]>} */
export async function allConflicts() {
  return done(/** @type {IDBRequest<Conflict[]>} */ ((await store('conflicts', 'readonly')).getAll()))
}

/** @param {Conflict[]} conflicts */
export async function addConflicts(conflicts) {
  if (!conflicts.length) return
  const db = await open()
  const tx = db.transaction('conflicts', 'readwrite')
  for (const c of conflicts) tx.objectStore('conflicts').add(c)
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
  })
}

/** @param {number} id */
export async function dropConflict(id) {
  return done((await store('conflicts', 'readwrite')).delete(id))
}

/**
 * @param {string} k
 * @returns {Promise<any>}
 */
export async function getMeta(k) {
  const row = await done(/** @type {IDBRequest<{k: string, v: any} | undefined>} */ ((await store('meta', 'readonly')).get(k)))
  return row?.v
}

/**
 * @param {string} k
 * @param {any} v
 */
export async function setMeta(k, v) {
  return done((await store('meta', 'readwrite')).put({ k, v }))
}

/**
 * 브라우저가 저장소를 evict하지 않게 요청한다 (`D17`). 홈 화면에 추가한 PWA면 대개
 * 승인된다. **거절돼도 앱은 그대로 동작한다** — push를 안 누르면 잃을 수 있다는
 * 사실이 바뀌지 않을 뿐이다.
 *
 * @returns {Promise<boolean>}
 */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted?.()) return true
  return navigator.storage.persist()
}
