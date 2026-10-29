import test from 'node:test'
import assert from 'node:assert/strict'

class FailingStorage implements Storage {
  public store = new Map<string, string>()
  public failRemove = false

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
    if (this.failRemove) {
      throw new Error('AccessDenied / Storage corrupted on removeItem')
    }
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

const failingStorage = new FailingStorage()
// @ts-expect-error Mocking window.sessionStorage
globalThis.window = { sessionStorage: failingStorage }

let mockCookieJar = ''
// @ts-expect-error Mocking document.cookie
globalThis.document = {
  get cookie() {
    return mockCookieJar
  },
  set cookie(val: string) {
    if (val.includes('Max-Age=0')) {
      mockCookieJar = ''
    } else {
      mockCookieJar = val
    }
  },
}

import { tokenStorage } from '../src/shared/lib/tokenStorage.ts'

test('Logout storage failure: When removeItem throws and server revoke fails, session tombstone prevents reload recovery', () => {
  mockCookieJar = ''
  failingStorage.clear()
  failingStorage.failRemove = false

  // 1. Initial valid session stored in sessionStorage
  tokenStorage.setRefreshToken('stale-refresh-token')
  assert.strictEqual(tokenStorage.hasRefreshToken(), true)

  // 2. Storage fails during logout: removeItem throws an error
  failingStorage.failRemove = true

  // clearRefreshToken runs during logout
  const clearResult = tokenStorage.clearRefreshToken()
  // Confirms storage removal could not succeed, but tombstone was verified
  assert.strictEqual(clearResult.storageCleared, false)
  assert.strictEqual(clearResult.tombstoneVerified, true)
  assert.strictEqual(clearResult.status, 'TOMBSTONED')
  // And session tombstone cookie was deposited
  assert.ok(mockCookieJar.includes('aqs_logout_flag=1'))

  // 3. User reloads page (F5): storage still has the stale token physically
  assert.strictEqual(failingStorage.store.get('aqs_refresh_token'), 'stale-refresh-token')

  // BUT tokenStorage refuses to return it or bootstrap because logout tombstone is active!
  assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  assert.strictEqual(tokenStorage.getRefreshToken(), null)
  assert.strictEqual(tokenStorage.popRefreshToken(), null)

  // 4. When a new login occurs, setRefreshToken clears the tombstone
  failingStorage.failRemove = false
  tokenStorage.setRefreshToken('new-account-refresh-token')
  assert.strictEqual(tokenStorage.hasRefreshToken(), true)
  assert.strictEqual(tokenStorage.getRefreshToken(), 'new-account-refresh-token')
  assert.strictEqual(mockCookieJar.includes('aqs_logout_flag=1'), false)
})

test('Logout storage failure: When BOTH storage and cookie writes fail, returns FAILED status without false claims', () => {
  // Simulate complete failure: cookie blocked/disabled and storage removeItem throwing
  const originalDoc = globalThis.document
  try {
    // Cookie throws error or does not accept writes
    // @ts-expect-error Mocking document with failing cookie
    globalThis.document = {
      get cookie() {
        return ''
      },
      set cookie(_val: string) {
        throw new Error('Cookies disabled or blocked by privacy settings')
      },
    }

    failingStorage.clear()
    failingStorage.store.set('aqs_refresh_token', 'stuck-token')
    failingStorage.failRemove = true

    const clearResult = tokenStorage.clearRefreshToken()
    assert.strictEqual(clearResult.storageCleared, false)
    assert.strictEqual(clearResult.tombstoneVerified, false)
    assert.strictEqual(clearResult.status, 'FAILED')
  } finally {
    globalThis.document = originalDoc
  }
})
