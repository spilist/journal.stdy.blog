// `store.js`(IndexedDB)의 메모리 대역. **테스트 전용이고 앱은 이걸 import 하지 않는다.**
//
// 실패를 **주문할 수 있어야** 한다 — 저장이 실패했을 때 글자를 잃던 경로가 실제로
// 있었고(`SC-6` 사본이 통째로 사라졌다), 그건 성공 경로만 돌려서는 영원히 안 보인다.
//
// `structuredClone`을 진짜로 부른다. IndexedDB의 `put`이 그것이라, `$state` 프록시를
// 그대로 넘기면 여기서도 `DataCloneError`가 난다 — 실제로 그 결함이 있었다.

/** @typedef {import('./merge.js').Rec} Rec */
/** @typedef {import('./store.js').Conflict} Conflict */

/** @type {Map<string, Rec>} */
export let records = new Map()
/** @type {Conflict[]} */
export let conflicts = []
/** @type {Record<string, unknown>} */
export let meta = Object.create(null)

let failPut = false
let failRead = false
let delayMs = 0

/** 저장을 실패시킨다 (저장 공간 부족·프라이빗 모드). @param {boolean} on */
export function failWrites(on) {
  failPut = on
}

/**
 * **레코드 읽기만** 실패시킨다. 저장소가 통째로 죽은 경우는 이미 안전하다 — `open()`이
 * 거부를 캐시해서 `getMeta`도 같이 던지고 pull이 'offline'으로 빠진다. 위험한 건
 * **부분 실패**다(`records`는 못 읽는데 `meta`는 멀쩡한 경우). 그 창을 열려면 하나만
 * 실패시킬 수 있어야 한다.
 *
 * @param {boolean} on
 */
export function failReads(on) {
  failRead = on
}

/** 쓰기를 느리게 만든다 — 왕복 중 편집이 끼어드는 창을 열려면 필요하다. @param {number} ms */
export function writeDelay(ms) {
  delayMs = ms
}

export function reset() {
  records = new Map()
  conflicts = []
  meta = Object.create(null)
  failPut = false
  failRead = false
  delayMs = 0
}

/** @param {number} ms */
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export async function allRecords() {
  if (failRead) throw new Error('records 스토어를 열지 못했습니다')
  return [...records.values()]
}

/** @param {Rec[]} recs */
export async function putRecords(recs) {
  if (delayMs) await wait(delayMs)
  if (failPut) throw new Error('quota exceeded')
  for (const rec of recs) records.set(rec.key, structuredClone(rec))
}

/** @param {Rec[]} recs @returns {Promise<Rec[]>} 실제로 저장한 레코드 */
export async function putRecordsIfNewer(recs) {
  if (delayMs) await wait(delayMs)
  if (failPut) throw new Error('quota exceeded')
  const stored = []
  for (const rec of recs) {
    const current = records.get(rec.key)
    if (!current || current.updatedAt <= rec.updatedAt) {
      records.set(rec.key, structuredClone(rec))
      stored.push(rec)
    }
  }
  return stored
}

/** @param {Rec} rec */
export function putRecord(rec) {
  if (failPut) return Promise.reject(new Error('quota exceeded'))
  records.set(rec.key, structuredClone(rec))
  return Promise.resolve()
}

/** @param {string} key */
export async function dropRecord(key) {
  records.delete(key)
}

export async function allConflicts() {
  return conflicts.map((c, i) => ({ ...c, id: i + 1 }))
}

/** @param {Omit<Conflict, 'id'>[]} list */
export async function addConflicts(list) {
  for (const c of list) conflicts.push(/** @type {Conflict} */ (structuredClone(c)))
}

/** @param {number} id */
export async function dropConflict(id) {
  conflicts.splice(id - 1, 1)
}

/** @param {string} key */
export async function getMeta(key) {
  return meta[key] ?? null
}

/** @param {string} key @param {unknown} value */
export async function setMeta(key, value) {
  meta[key] = value
}

export function requestPersistence() {}
