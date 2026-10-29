import test from 'node:test'
import assert from 'node:assert/strict'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import {
  authReducer,
  clearAuthLocal,
  setCredentials,
  startSession,
} from '../src/features/iam/model/authSlice.ts'
import { _resetActiveRefreshForTesting, reauthBaseQuery } from '../src/shared/api/reauthBaseQuery.ts'
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

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (typeof input === 'object' && input !== null && 'url' in input) {
    return String((input as Request).url)
  }
  return String(input)
}

function getAuthHeader(input: RequestInfo | URL, init?: RequestInit): string | null {
  if (init?.headers) {
    if (typeof (init.headers as Headers).get === 'function') {
      return (init.headers as Headers).get('authorization')
    }
    if (typeof init.headers === 'object') {
      return (init.headers as Record<string, string>)['authorization'] ?? null
    }
  }
  if (typeof input === 'object' && input !== null && 'headers' in input) {
    return (input as Request).headers.get('authorization')
  }
  return null
}

function createTestStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  })
}

test('Integration Race 1: Request of Account A returning 401 after logout/switch does not refresh or retry with Account B credentials', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // 1. Account A logs in -> gen = 1
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'accA', email: 'a@test.com', roles: [] },
      accessToken: 'token-A',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('refresh-token-A')

  let refreshCallCount = 0
  let originalRetriedWithTokenB = false

  // Mock global fetch to simulate Account A request being delayed while account switch occurs
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)

    if (url.includes('/api/v1/orders/123')) {
      const authHeader = getAuthHeader(input, init)

      // Check if retry happened with Token B
      if (authHeader === 'Bearer token-B') {
        originalRetriedWithTokenB = true
      }

      // First call for Request A: while this call is in-flight, simulate user logging out and logging in as B
      store.dispatch(clearAuthLocal()) // gen becomes 2
      store.dispatch(
        setCredentials({
          user: { id: '2', username: 'accB', email: 'b@test.com', roles: [] },
          accessToken: 'token-B',
          generation: 2,
        }),
      )
      tokenStorage.setRefreshToken('refresh-token-B')

      // Now Account A request returns 401
      return new Response(
        JSON.stringify({ success: false, code: 'AUTH_001', message: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (url.includes('/api/v1/auth/refresh')) {
      refreshCallCount++
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: { access_token: 'new-token', refresh_token: 'new-refresh' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response('{}', { status: 200 })
  }

  try {
    const fakeApi = {
      getState: store.getState,
      dispatch: store.dispatch,
      signal: new AbortController().signal,
      abort: () => {},
      extra: undefined,
      endpoint: 'testEndpoint',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/orders/123', fakeApi as any, {})

    // Verification:
    // 1. Result should be discarded with STALE_SESSION_DISCARDED error
    assert.strictEqual(result.error?.status, 'CUSTOM_ERROR')
    assert.strictEqual((result.error as any)?.error, 'STALE_SESSION_DISCARDED')
    // 2. Account B's refresh token must NOT have been consumed
    assert.strictEqual(refreshCallCount, 0)
    // 3. Request A must NOT have retried with Account B's Bearer token
    assert.strictEqual(originalRetriedWithTokenB, false)
    // 4. Account B's session must remain active
    assert.strictEqual(store.getState().auth.isAuthenticated, true)
    assert.strictEqual(store.getState().auth.accessToken, 'token-B')
    assert.strictEqual(tokenStorage.getRefreshToken(), 'refresh-token-B')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Integration Race 2: Request of Account A returning 403 AUTH_008 after switch does not clear Account B session', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // Account A is active
  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'accA', email: 'a@test.com', roles: [] },
      accessToken: 'token-A',
      generation: 1,
    }),
  )

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/admin/resource')) {
      // While A is in-flight, B logs in
      store.dispatch(startSession()) // gen = 2
      store.dispatch(
        setCredentials({
          user: { id: '2', username: 'accB', email: 'b@test.com', roles: [] },
          accessToken: 'token-B',
          generation: 2,
        }),
      )
      tokenStorage.setRefreshToken('refresh-token-B')

      // A's old request returns 403 AUTH_008 (inactive account)
      return new Response(
        JSON.stringify({
          success: false,
          code: 'AUTH_008',
          message: 'Tài khoản không ở trạng thái hoạt động',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('{}', { status: 200 })
  }

  try {
    const fakeApi = {
      getState: store.getState,
      dispatch: store.dispatch,
      signal: new AbortController().signal,
      abort: () => {},
      extra: undefined,
      endpoint: 'testEndpoint',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/admin/resource', fakeApi as any, {})
    assert.strictEqual(result.error?.status, 'CUSTOM_ERROR')
    assert.strictEqual((result.error as any)?.error, 'STALE_SESSION_DISCARDED')

    // Verification: B's session must NOT have been wiped by A's old 403!
    assert.strictEqual(store.getState().auth.isAuthenticated, true)
    assert.strictEqual(store.getState().auth.accessToken, 'token-B')
    assert.strictEqual(tokenStorage.getRefreshToken(), 'refresh-token-B')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Integration Race 3: Late success of Account A request is discarded and does not pollute Account B cache', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // Account A active
  store.dispatch(startSession()) // gen = 1

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/auth/me')) {
      // While Account A's /me is in flight, Account B logs in
      store.dispatch(startSession()) // gen = 2
      store.dispatch(
        setCredentials({
          user: { id: '2', username: 'accB', email: 'b@test.com', roles: ['CUSTOMER'] },
          accessToken: 'token-B',
          generation: 2,
        }),
      )

      // Account A's /me returns 200 OK with Account A data
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: { id: '1', username: 'accA', email: 'a@test.com', roles: ['SHOP_OWNER'] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('{}', { status: 200 })
  }

  try {
    const fakeApi = {
      getState: store.getState,
      dispatch: store.dispatch,
      signal: new AbortController().signal,
      abort: () => {},
      extra: undefined,
      endpoint: 'getMe',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/auth/me', fakeApi as any, {})

    // Verification:
    // Stale result must be discarded with an error, preventing Account A data from fulfilling into cache!
    assert.strictEqual(result.error?.status, 'CUSTOM_ERROR')
    assert.strictEqual((result.error as any)?.error, 'STALE_SESSION_DISCARDED')
    assert.strictEqual(result.data, undefined)
    // Account B profile in store remains untainted
    assert.strictEqual(store.getState().auth.user?.username, 'accB')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Integration Single-Flight: Multiple concurrent 401s send only 1 refresh request and all retry successfully', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'initial-access-token',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('initial-refresh-token')

  let refreshCallCount = 0
  let orderCallCount = 0

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)

    if (url.includes('/api/v1/orders/')) {
      orderCallCount++
      const authHeader = getAuthHeader(input, init)

      if (authHeader === 'Bearer initial-access-token') {
        // First attempt fails with 401
        return new Response(
          JSON.stringify({ success: false, code: 'AUTH_001', message: 'Token expired' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      } else if (authHeader === 'Bearer refreshed-access-token') {
        // Retry attempt with new access token succeeds
        return new Response(
          JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: { ok: true } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    if (url.includes('/api/v1/auth/refresh')) {
      refreshCallCount++
      await new Promise((resolve) => setTimeout(resolve, 30))
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: 'refreshed-access-token',
            refresh_token: 'refreshed-refresh-token',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response('{}', { status: 200 })
  }

  try {
    const fakeApi = {
      getState: store.getState,
      dispatch: store.dispatch,
      signal: new AbortController().signal,
      abort: () => {},
      extra: undefined,
      endpoint: 'testEndpoint',
      type: 'query' as const,
    }

    const [res1, res2, res3] = await Promise.all([
      reauthBaseQuery('/orders/1', fakeApi as any, {}),
      reauthBaseQuery('/orders/2', fakeApi as any, {}),
      reauthBaseQuery('/orders/3', fakeApi as any, {}),
    ])

    // Verification:
    assert.strictEqual(refreshCallCount, 1)
    assert.ok(orderCallCount >= 3)
    assert.strictEqual((res1.data as any)?.data?.ok, true)
    assert.strictEqual((res2.data as any)?.data?.ok, true)
    assert.strictEqual((res3.data as any)?.data?.ok, true)
    assert.strictEqual(store.getState().auth.accessToken, 'refreshed-access-token')
    assert.strictEqual(tokenStorage.getRefreshToken(), 'refreshed-refresh-token')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Integration Single-Flight: Missing refresh token clears mutex and allows subsequent session to refresh and retry successfully', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  let refreshCallCount = 0

  // Session 1 has no refresh token in storage
  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'bad-token',
      generation: 1,
    }),
  )

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/orders/1')) {
      const authHeader = getAuthHeader(input, init)
      if (authHeader === 'Bearer good-token') {
        return new Response(
          JSON.stringify({ success: true, data: { orderId: 100 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response(JSON.stringify({ code: 'AUTH_001' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    if (url.includes('/api/v1/auth/refresh')) {
      refreshCallCount++
      return new Response(
        JSON.stringify({
          success: true,
          data: { access_token: 'good-token', refresh_token: 'good-refresh' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('{}', { status: 200 })
  }

  try {
    const fakeApi = {
      getState: store.getState,
      dispatch: store.dispatch,
      signal: new AbortController().signal,
      abort: () => {},
      extra: undefined,
      endpoint: 'testEndpoint',
      type: 'query' as const,
    }

    // Call 1: fails because storage has no token
    const res1 = await reauthBaseQuery('/orders/1', fakeApi as any, {})
    assert.strictEqual(res1.error?.status, 401)
    assert.strictEqual(refreshCallCount, 0)

    // User logs in again (Session 2)
    store.dispatch(startSession()) // gen = 2
    store.dispatch(
      setCredentials({
        user: { id: '2', username: 'user2', email: 'u2@test.com', roles: [] },
        accessToken: 'initial-token',
        generation: 2,
      }),
    )
    tokenStorage.setRefreshToken('valid-refresh-token')

    // Call 2: MUST trigger a refresh for Session 2 and retry successfully!
    const res2 = await reauthBaseQuery('/orders/1', fakeApi as any, {})
    // Assert refresh was called
    assert.strictEqual(refreshCallCount, 1)
    // Assert retry completed with 200 and data
    assert.strictEqual((res2.data as any)?.data?.orderId, 100)
    assert.strictEqual(store.getState().auth.accessToken, 'good-token')
    assert.strictEqual(tokenStorage.getRefreshToken(), 'good-refresh')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Integration Race 4: Account switch or logout occurring WHILE retry request is in-flight discards retry response with STALE_SESSION_DISCARDED', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // 1. Account A is active (generation = 1)
  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'accA', email: 'a@test.com', roles: [] },
      accessToken: 'initial-token-A',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('refresh-token-A')

  let retryTriggered = false

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)

    if (url.includes('/api/v1/orders/secret')) {
      const authHeader = getAuthHeader(input, init)

      if (authHeader === 'Bearer initial-token-A') {
        // Initial request fails with 401
        return new Response(
          JSON.stringify({ success: false, code: 'AUTH_001', message: 'Token expired' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }

      if (authHeader === 'Bearer refreshed-token-A') {
        retryTriggered = true
        // WHILE retry request is in-flight, simulate Account A logging out and Account B logging in!
        store.dispatch(clearAuthLocal()) // gen increments to 2
        store.dispatch(
          setCredentials({
            user: { id: '2', username: 'accB', email: 'b@test.com', roles: [] },
            accessToken: 'token-B',
            generation: 2,
          }),
        )

        // Retry response returns late with Account A's secret data
        return new Response(
          JSON.stringify({
            success: true,
            code: 'SUCCESS',
            message: 'OK',
            data: { secretData: 'account-a-confidential-order' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    if (url.includes('/api/v1/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: 'refreshed-token-A',
            refresh_token: 'new-refresh-A',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response('{}', { status: 200 })
  }

  try {
    const fakeApi = {
      getState: store.getState,
      dispatch: store.dispatch,
      signal: new AbortController().signal,
      abort: () => {},
      extra: undefined,
      endpoint: 'testEndpoint',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/orders/secret', fakeApi as any, {})

    // Verification:
    // 1. Retry was actually triggered
    assert.strictEqual(retryTriggered, true)
    // 2. Finding 1: Retry result must be discarded with STALE_SESSION_DISCARDED error
    assert.strictEqual(result.error?.status, 'CUSTOM_ERROR')
    assert.strictEqual((result.error as any)?.error, 'STALE_SESSION_DISCARDED')
    // 3. Stale data must NOT be returned
    assert.strictEqual(result.data, undefined)
    // 4. Account B's state must remain untainted
    assert.strictEqual(store.getState().auth.accessToken, 'token-B')
    assert.strictEqual(store.getState().auth.user?.username, 'accB')
  } finally {
    globalThis.fetch = originalFetch
  }
})
