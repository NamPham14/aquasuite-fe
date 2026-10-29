import test from 'node:test'
import assert from 'node:assert/strict'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer } from '../src/features/iam/model/authSlice.ts'
import { refreshApi } from '../src/features/iam/api/authApi.ts'
import { triggerAuthBootstrap } from '../src/features/iam/hooks/useAuthBootstrap.ts'
import { tokenStorage } from '../src/shared/lib/tokenStorage.ts'

class MockStorage implements Storage {
  public store = new Map<string, string>()
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
// @ts-expect-error Mocking window.sessionStorage
globalThis.window = { sessionStorage: mockStorage }

test('bootstrapOutage: refreshApi parses 503 HTML body into normalized error', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    return new Response('<html><body>503 Service Unavailable</body></html>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    await assert.rejects(
      async () => {
        await refreshApi('token')
      },
      (err: any) => {
        assert.strictEqual(err.status, 503)
        assert.strictEqual(err.data?.code, 'AUTH_009')
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bootstrapOutage: refreshApi handles network failure (fetch TypeError)', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    throw new TypeError('Failed to fetch (Network disconnected)')
  }

  try {
    await assert.rejects(
      async () => {
        await refreshApi('token')
      },
      (err: any) => {
        assert.strictEqual(err.status, 'FETCH_ERROR')
        return true
      },
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bootstrapOutage: triggerAuthBootstrap sets SESSION_EXPIRED when refreshApi fails with 503 outage because consumed token cannot be retried', async () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('token-before-outage')

  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    return new Response('<html>503 Service Unavailable</html>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  try {
    await triggerAuthBootstrap(store.dispatch)
    const state = store.getState().auth

    // Verification:
    // Finding 3: Since token was popped, it cannot be retried.
    // Transition to SESSION_EXPIRED requiring login instead of locking in a dead Retry loop.
    assert.strictEqual(state.bootstrapError?.type, 'SESSION_EXPIRED')
    assert.ok(state.bootstrapError.message.includes('503'))
    assert.strictEqual(state.isBootstrapping, false)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bootstrapOutage: triggerAuthBootstrap sets SESSION_EXPIRED when refreshApi fails with network failure', async () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('token-before-disconnect')

  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    throw new TypeError('Failed to fetch (Network connection lost)')
  }

  try {
    await triggerAuthBootstrap(store.dispatch)
    const state = store.getState().auth

    assert.strictEqual(state.bootstrapError?.type, 'SESSION_EXPIRED')
    assert.ok(state.bootstrapError.message.includes('Mất kết nối'))
    assert.strictEqual(state.isBootstrapping, false)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bootstrapOutage: triggerAuthBootstrap sets SERVICE_UNAVAILABLE when refreshApi succeeds but /me fails with 503 (retry remains possible)', async () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('token-to-refresh')

  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: 'valid-access-token',
            refresh_token: 'new-valid-refresh-token',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/auth/me')) {
      return new Response('<html>503 Service Unavailable</html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      })
    }
    return new Response('{}', { status: 200 })
  }

  try {
    await triggerAuthBootstrap(store.dispatch)
    const state = store.getState().auth

    // Verification:
    // Refresh succeeded -> new refresh token is safely saved in storage
    assert.strictEqual(tokenStorage.hasRefreshToken(), true)
    assert.strictEqual(tokenStorage.getRefreshToken(), 'new-valid-refresh-token')
    // /me failed with 503 -> classified as SERVICE_UNAVAILABLE, allowing user to retry!
    assert.strictEqual(state.bootstrapError?.type, 'SERVICE_UNAVAILABLE')
    assert.ok(state.bootstrapError.message.includes('503'))
    assert.strictEqual(state.isBootstrapping, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('bootstrapOutage: triggerAuthBootstrap sets SESSION_EXPIRED on 401 response', async () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('expired-token')

  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    return new Response(
      JSON.stringify({
        success: false,
        code: 'AUTH_005',
        message: 'Refresh token hoặc phiên đã hết hạn',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    await triggerAuthBootstrap(store.dispatch)
    const state = store.getState().auth

    assert.strictEqual(state.bootstrapError?.type, 'SESSION_EXPIRED')
    assert.ok(state.bootstrapError.message.includes('hết hạn'))
  } finally {
    globalThis.fetch = originalFetch
  }
})
