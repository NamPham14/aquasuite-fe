import test from 'node:test'
import assert from 'node:assert/strict'

class FaultyStorage implements Storage {
  public store = new Map<string, string>()
  public shouldFailRemove = false
  public shouldFailSet = false

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    if (this.shouldFailRemove) {
      throw new Error('Storage removeItem failed')
    }
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    if (this.shouldFailSet) {
      throw new Error('QuotaExceededError')
    }
    this.store.set(key, String(value))
  }
}

const faultyStorage = new FaultyStorage()
// @ts-expect-error Mocking window.sessionStorage
globalThis.window = { sessionStorage: faultyStorage }

import { tokenStorage } from '../src/shared/lib/tokenStorage.ts'

test('tokenStorage faults: popRefreshToken fails closed when removal fails', () => {
  faultyStorage.clear()
  faultyStorage.shouldFailRemove = false
  faultyStorage.shouldFailSet = false
  faultyStorage.store.set('aqs_refresh_token', 'valid-token')

  // Simulate removal failure (e.g. storage error)
  faultyStorage.shouldFailRemove = true

  const popped = tokenStorage.popRefreshToken()
  // Must return null fail-closed so we do NOT send a token that could not be popped
  assert.strictEqual(popped, null)
  // Token must not be leaked if removal failed
  assert.strictEqual(faultyStorage.store.get('aqs_refresh_token'), 'valid-token')
})

test('tokenStorage faults: setRefreshToken fails closed when storage quota exceeded', () => {
  faultyStorage.clear()
  faultyStorage.shouldFailRemove = false
  faultyStorage.shouldFailSet = true

  const success = tokenStorage.setRefreshToken('new-refresh-token')
  assert.strictEqual(success, false)
  assert.strictEqual(tokenStorage.getRefreshToken(), null)
})

test('tokenStorage faults: clearRefreshToken returns false and handles removal failure', () => {
  faultyStorage.clear()
  faultyStorage.store.set('aqs_refresh_token', 'stuck-token')
  faultyStorage.shouldFailRemove = true
  faultyStorage.shouldFailSet = false

  const clearResult = tokenStorage.clearRefreshToken()
  assert.strictEqual(clearResult.storageCleared, false)
  assert.strictEqual(clearResult.status, 'FAILED')
})
