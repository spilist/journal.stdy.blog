import { test } from 'node:test'
import assert from 'node:assert/strict'

/** @typedef {typeof import('./store.js')} Store */

/** @param {unknown} result @param {unknown} [error] */
function request(result, error) {
  /** @type {any} */
  const req = { result, error: error ?? null, onerror: null, onupgradeneeded: null, onsuccess: null }
  queueMicrotask(() => {
    if (error) req.onerror?.()
    else {
      req.onupgradeneeded?.()
      req.onsuccess?.()
    }
  })
  return req
}

function database() {
  /** @type {Map<string, any>} */
  const records = new Map()
  /** @type {any[]} */
  const conflicts = []
  /** @type {Record<string, any>} */
  const stores = {
    records: {
      getAll: () => request([...records.values()]),
      /** @param {string} key */
      get: (key) => request(records.get(key)),
    },
    conflicts: {
      getAll: () => request([...conflicts]),
    },
    meta: {},
  }

  /** @type {'complete' | 'error' | 'abort'} */
  let outcome = 'complete'
  const db = {
    objectStoreNames: { contains: () => false },
    /** @param {string} name */
    createObjectStore: (name) => stores[name],
    /** @param {string} name */
    transaction(name) {
      /** @type {(() => void)[]} */
      const pending = []
      /** @type {any} */
      const tx = {
        error: null,
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore: () => ({
          getAll: stores[name].getAll,
          get: stores[name].get,
          /** @param {any} value */
          put(value) {
            pending.push(() => stores[name].putValue(value))
            return request(undefined)
          },
          /** @param {any} value */
          add(value) {
            pending.push(() => stores[name].addValue(value))
            return request(undefined)
          },
        }),
      }
      setTimeout(() => {
        if (outcome === 'error') {
          tx.error = new Error('transaction failed')
          tx.onerror?.()
        } else if (outcome === 'abort') {
          tx.error = new Error('transaction aborted')
          tx.onabort?.()
        } else {
          pending.forEach((commit) => commit())
          tx.oncomplete?.()
        }
      }, 0)
      return tx
    },
  }

  /** @param {any} value */
  stores.records.putValue = (value) => records.set(value.key, value)
  /** @param {any} value */
  stores.conflicts.addValue = (value) => conflicts.push(value)

  return {
    db,
    /** @param {'complete' | 'error' | 'abort'} next */
    setOutcome(next) {
      outcome = next
    },
  }
}

let testCase = 0

/**
 * Give every test a fresh store module and fake database. The query suffix
 * avoids sharing the module-level successful-open cache between test cases.
 * @param {(fake: ReturnType<typeof database>, store: Store) => any} callback
 */
async function withStore(callback) {
  const previous = globalThis.indexedDB
  const fake = database()
  globalThis.indexedDB = /** @type {any} */ ({ open: () => request(fake.db) })
  try {
    const store = await import(`./store.js?store-test=${++testCase}`)
    return await callback(fake, store)
  } finally {
    globalThis.indexedDB = previous
  }
}

test('IndexedDB open failure can recover on the next access', async () => {
  const previous = globalThis.indexedDB
  const fake = database()
  let attempts = 0
  const temporaryFailure = new Error('temporary IndexedDB failure')
  globalThis.indexedDB = /** @type {any} */ ({
    open() {
      attempts += 1
      return attempts === 1 ? request(null, temporaryFailure) : request(fake.db)
    },
  })
  const store = await import(`./store.js?store-test=${++testCase}`)

  try {
    await assert.rejects(store.allRecords(), temporaryFailure)
    assert.deepEqual(await store.allRecords(), [])
    assert.equal(attempts, 2)
  } finally {
    globalThis.indexedDB = previous
  }
})

test('IndexedDB transaction completion resolves after records are written', async () => {
  await withStore(async (_fake, store) => {
    const record = {
      key: 'log:2026-08-05:오늘',
      kind: 'log',
      data: { text: '지어낸 transaction 성공' },
      updatedAt: 1,
      syncedAt: 0,
    }
    await store.putRecords([record])
    assert.deepEqual(await store.allRecords(), [record])
  })
})

test('putRecordsIfNewer returns only records accepted by the transaction', async () => {
  await withStore(async (_fake, store) => {
    const current = {
      key: 'log:2026-08-05:오늘',
      kind: 'log',
      data: { text: '지어낸 현재 글' },
      updatedAt: 10,
      syncedAt: 10,
    }
    const older = { ...current, data: { text: '지어낸 오래된 글' }, updatedAt: 9 }
    const newer = { ...current, data: { text: '지어낸 새 글' }, updatedAt: 11 }
    await store.putRecords([current])
    assert.deepEqual(await store.putRecordsIfNewer([older, newer]), [newer])
  })
})

test('addConflicts keeps one copy for duplicate conflict input', async () => {
  await withStore(async (_fake, store) => {
    const conflict = { target: 'log:2026-08-05:오늘', text: '지어낸 충돌 사본', at: 12 }
    await store.addConflicts([conflict, conflict])
    assert.deepEqual(await store.allConflicts(), [conflict])
  })
})

test('IndexedDB transaction errors reject and roll back the write', async () => {
  await withStore(async (fake, store) => {
    fake.setOutcome('error')
    await assert.rejects(
      store.putRecords([
        {
          key: 'log:2026-08-05:실패',
          kind: 'log',
          data: { text: '지어낸 transaction error' },
          updatedAt: 2,
          syncedAt: 0,
        },
      ]),
      /transaction failed/,
    )
    fake.setOutcome('complete')
    assert.deepEqual(await store.allRecords(), [])
  })
})

test('IndexedDB transaction aborts reject instead of leaving the write pending', async () => {
  await withStore(async (fake, store) => {
    fake.setOutcome('abort')
    await assert.rejects(
      Promise.race([
        store.putRecords([
          {
            key: 'log:2026-08-05:어제',
            kind: 'log',
            data: { text: '지어낸 transaction abort' },
            updatedAt: 3,
            syncedAt: 0,
          },
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 50)),
      ]),
      /transaction aborted/,
    )
    fake.setOutcome('complete')
    assert.deepEqual(await store.allRecords(), [])
  })
})
