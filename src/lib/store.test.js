import { test } from 'node:test'
import assert from 'node:assert/strict'

import * as store from './store.js'

/**
 * @param {unknown} result
 * @param {unknown} [error]
 */
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
  const objectStore = { getAll: () => request([]) }
  return {
    objectStoreNames: { contains: () => false },
    createObjectStore: () => objectStore,
    transaction: () => ({ objectStore: () => objectStore }),
  }
}

test('IndexedDB open failure can recover on the next access', async () => {
  const previous = globalThis.indexedDB
  let attempts = 0
  const temporaryFailure = new Error('temporary IndexedDB failure')
  globalThis.indexedDB = /** @type {any} */ ({
    open() {
      attempts += 1
      return attempts === 1 ? request(null, temporaryFailure) : request(database())
    },
  })

  try {
    await assert.rejects(store.allRecords(), temporaryFailure)
    assert.deepEqual(await store.allRecords(), [])
    assert.equal(attempts, 2)
  } finally {
    globalThis.indexedDB = previous
  }
})
