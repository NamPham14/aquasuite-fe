import test from 'node:test'
import assert from 'node:assert/strict'

class MockStorage implements Storage {
  private store = new Map<string, string>()

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
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

const mockStorage = new MockStorage()
// @ts-expect-error Mocking window.sessionStorage for Node environment
globalThis.window = { sessionStorage: mockStorage }

import { tokenStorage } from '../src/shared/lib/tokenStorage.ts'

test('tokenStorage: initially empty', () => {
  mockStorage.clear()
  assert.strictEqual(tokenStorage.getRefreshToken(), null)
  assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  assert.strictEqual(tokenStorage.popRefreshToken(), null)
})

test('tokenStorage: setRefreshToken and hasRefreshToken', () => {
  mockStorage.clear()
  const success = tokenStorage.setRefreshToken('test-token-123')
  assert.strictEqual(success, true)
  assert.strictEqual(tokenStorage.getRefreshToken(), 'test-token-123')
  assert.strictEqual(tokenStorage.hasRefreshToken(), true)
})

test('tokenStorage: popRefreshToken returns token and removes it immediately (fail-closed)', () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('token-to-pop')

  // pop should return the token
  const popped = tokenStorage.popRefreshToken()
  assert.strictEqual(popped, 'token-to-pop')

  // After pop, storage must be empty
  assert.strictEqual(tokenStorage.getRefreshToken(), null)
  assert.strictEqual(tokenStorage.hasRefreshToken(), false)

  // Subsequent pop returns null
  assert.strictEqual(tokenStorage.popRefreshToken(), null)
})

test('tokenStorage: clearRefreshToken removes token', () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('token-to-clear')
  assert.strictEqual(tokenStorage.hasRefreshToken(), true)

  tokenStorage.clearRefreshToken()
  assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  assert.strictEqual(tokenStorage.getRefreshToken(), null)
})
