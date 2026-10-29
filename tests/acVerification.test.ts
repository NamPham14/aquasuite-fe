import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import {
  authReducer,
  setCredentials,
  startSession,
  clearAuthLocal,
  setBootstrapping,
} from '../src/features/iam/model/authSlice.ts'
import {
  reauthBaseQuery,
  _resetActiveRefreshForTesting,
} from '../src/shared/api/reauthBaseQuery.ts'
import { triggerAuthBootstrap } from '../src/features/iam/hooks/useAuthBootstrap.ts'
import { tokenStorage } from '../src/shared/lib/tokenStorage.ts'
import { authApi } from '../src/features/iam/api/authApi.ts'

// Register ESM loader for TSX support (e.g. ProtectedRoute)
register('./loader.mjs', import.meta.url)

const React = (await import('react')).default
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { MemoryRouter, Navigate } = await import('react-router-dom')
const { useAuth } = await import('../src/features/iam/hooks/useAuth.ts')
const { ProtectedRoute } = await import('../src/features/iam/components/ProtectedRoute.tsx')

// In-memory mock storage
class MockStorage implements Storage {
  public store = new Map<string, string>()
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
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    if (this.shouldFailSet) {
      throw new Error('QuotaExceededError: storage full')
    }
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

function LogoutExtractor({
  onExtract,
}: {
  onExtract: (logoutFn: () => Promise<void>) => void
}) {
  const { logout } = useAuth()
  onExtract(logout)
  return null
}

function getLogoutFunction(store: ReturnType<typeof createTestStore>): () => Promise<void> {
  let capturedLogout: (() => Promise<void>) | null = null
  renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(LogoutExtractor, {
        onExtract: (fn) => {
          capturedLogout = fn
        },
      }),
    ),
  )
  if (!capturedLogout) {
    throw new Error('Failed to extract logout function')
  }
  return capturedLogout
}

// ============================================================================
// AC-03: Refresh Token Rotation, Lưu token mới, Không retry token cũ khi response thất lạc
// ============================================================================

test('AC-03.1: Token Rotation — 401 trên query thực hiện rotation, lưu token mới, cập nhật Redux và retry thành công', async () => {
  mockStorage.clear()
  mockStorage.shouldFailSet = false
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // 1. Session ban đầu: accessToken hết hạn, refreshToken-1 lưu trong storage
  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'user1', email: 'u1@test.com', roles: ['SALES_STAFF'] },
      accessToken: 'expired-access-token-1',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('refresh-token-1')

  let refreshCallCount = 0
  let sentRefreshToken: string | null = null
  let retryAuthHeader: string | null = null

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)

    // Request query nghiệp vụ
    if (url.includes('/api/v1/catalog/products')) {
      const auth = getAuthHeader(input, init)
      if (auth === 'Bearer expired-access-token-1') {
        // Lần đầu trả về 401 Unauthorized
        return new Response(
          JSON.stringify({ success: false, code: 'AUTH_001', message: 'Access token expired' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (auth === 'Bearer new-access-token-2') {
        // Lần retry với token mới thành công
        retryAuthHeader = auth
        return new Response(
          JSON.stringify({
            success: true,
            code: 'SUCCESS',
            message: 'OK',
            data: { items: [{ id: 'p1', name: 'Aqua Filter X' }] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    // Refresh token endpoint
    if (url.includes('/api/v1/auth/refresh')) {
      refreshCallCount++
      if (init?.body) {
        const parsed = JSON.parse(String(init.body))
        sentRefreshToken = parsed.refresh_token
      } else if (typeof input === 'object' && input !== null && 'json' in input) {
        try {
          const parsed = await (input as Request).clone().json()
          sentRefreshToken = parsed.refresh_token
        } catch {
          // ignore
        }
      }
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: 'new-access-token-2',
            refresh_token: 'new-refresh-token-2',
            token_type: 'Bearer',
            expires_in: 900,
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
      endpoint: 'getProducts',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/catalog/products', fakeApi as any, {})

    // PASS Verification:
    // 1. Refresh endpoint được gọi đúng 1 lần với refresh token cũ
    assert.strictEqual(refreshCallCount, 1)
    assert.strictEqual(sentRefreshToken, 'refresh-token-1')
    // 2. Token mới được lưu vào sessionStorage (Rotation thành công)
    assert.strictEqual(tokenStorage.getRefreshToken(), 'new-refresh-token-2')
    // 3. Access token mới được cập nhật vào Redux state
    assert.strictEqual(store.getState().auth.accessToken, 'new-access-token-2')
    // 4. Request nghiệp vụ được retry thành công với Bearer token mới
    assert.strictEqual(retryAuthHeader, 'Bearer new-access-token-2')
    assert.strictEqual((result.data as any)?.data?.items[0]?.name, 'Aqua Filter X')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-03.2: Lost Response / Network Failure — Khi refresh thất lạc, token cũ đã bị pop và KHÔNG retry token cũ (fail-closed)', async () => {
  mockStorage.clear()
  mockStorage.shouldFailSet = false
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'stale-access-token',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('token-lost-in-flight')

  let refreshAttempts = 0

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/orders')) {
      return new Response(JSON.stringify({ code: 'AUTH_001' }), { status: 401 })
    }
    if (url.includes('/api/v1/auth/refresh')) {
      refreshAttempts++
      // Network disconnect / packet loss giữa chừng
      throw new TypeError('Failed to fetch (Network connection lost)')
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
      endpoint: 'getOrders',
      type: 'query' as const,
    }

    // Thực hiện request gặp 401 -> kích hoạt refresh -> refresh bị rớt mạng
    await reauthBaseQuery('/orders', fakeApi as any, {})

    // PASS Verification:
    // 1. Refresh token đã bị pop TRƯỚC khi gửi (fail-closed); không còn tồn tại trong storage
    assert.strictEqual(tokenStorage.getRefreshToken(), null)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
    // 2. Không retry mù: chỉ gửi 1 lần duy nhất
    assert.strictEqual(refreshAttempts, 1)
    // 3. Local session bị kết thúc (fail-closed), yêu cầu login lại
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.accessToken, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-03.3: Reload (F5) sau khi refresh thất lạc — Không còn token cũ để replay, chuyển sang yêu cầu đăng nhập lại', async () => {
  mockStorage.clear()
  // Sau khi mất response refresh, storage không còn refresh token (đã bị pop)
  assert.strictEqual(tokenStorage.hasRefreshToken(), false)

  const store = createTestStore()
  let refreshCalled = false

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/auth/refresh')) {
      refreshCalled = true
      return new Response('{}', { status: 200 })
    }
    return new Response('{}', { status: 200 })
  }

  try {
    // F5 trigger bootstrap khôi phục phiên
    await triggerAuthBootstrap(store.dispatch)

    // PASS Verification:
    // 1. Không gửi bất kỳ request refresh nào vì token cũ đã không còn
    assert.strictEqual(refreshCalled, false)
    // 2. Trạng thái dừng bootstrap và giữ nguyên unauthenticated
    assert.strictEqual(store.getState().auth.isBootstrapping, false)
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-03.4: Lỗi lưu storage khi nhận token mới — Fail-closed, xóa local session và yêu cầu đăng nhập lại', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'exp-token',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('token-before-quota-error')

  // Mô phỏng storage ném QuotaExceededError khi lưu token mới
  mockStorage.shouldFailSet = true

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/profile')) {
      return new Response(JSON.stringify({ code: 'AUTH_001' }), { status: 401 })
    }
    if (url.includes('/api/v1/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { access_token: 'new-acc', refresh_token: 'new-ref' },
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
      endpoint: 'getProfile',
      type: 'query' as const,
    }

    await reauthBaseQuery('/profile', fakeApi as any, {})

    // PASS Verification:
    // Do lưu storage thất bại, hệ thống fail-closed: xóa session, không commit access_token
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.accessToken, null)
  } finally {
    mockStorage.shouldFailSet = false
    globalThis.fetch = originalFetch
  }
})

// ============================================================================
// AC-04: Logout hoặc Switch Account khi /me, refresh, retry đang chờ; Response cũ không khôi phục state
// ============================================================================

test('AC-04.1: Deferred fetch — GET /me đang in-flight trên network boundary, Logout xảy ra, /me trả response muộn bị discard', async () => {
  mockStorage.clear()
  const store = createTestStore()

  // 1. Khởi tạo phiên hợp lệ (gen = 1)
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'initialUser', email: 'u1@test.com', roles: ['SALES_STAFF'] },
      accessToken: 'valid-token-gen-1',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('refresh-token-1')
  assert.strictEqual(store.getState().auth.sessionGeneration, 1)
  assert.strictEqual(store.getState().auth.isAuthenticated, true)

  // 2. Tạo signal xác nhận fetch GET /me đã thực sự bắt đầu và deferred promise giữ response pending
  let notifyFetchStarted: () => void = () => {}
  const fetchStartedSignal = new Promise<void>((resolve) => {
    notifyFetchStarted = resolve
  })

  let resolveMeResponse: (res: Response) => void = () => {}
  const meDeferred = new Promise<Response>((resolve) => {
    resolveMeResponse = resolve
  })

  let meFetchEntered = false

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/auth/me')) {
      // Xác nhận fetch GET /me đã thực sự đi vào mock boundary
      meFetchEntered = true
      notifyFetchStarted()
      return meDeferred
    }
    if (url.includes('/api/v1/auth/logout')) {
      return new Response(JSON.stringify({ success: true, message: 'Revoked' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('{}', { status: 200 })
  }

  let timeoutTimer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutTimer = setTimeout(() => reject(new Error('Timeout: fetch /me did not start within 3000ms')), 3000)
  })

  try {
    // 3. Dispatch request GET /me thực sự qua RTK Query endpoint boundary
    const meQueryPromise = store.dispatch(
      authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
    )

    // 4. Await signal xác nhận GET /api/v1/auth/me thực sự đã đi vào fetch mock TRƯỚC KHI gọi logout
    await Promise.race([fetchStartedSignal, timeoutPromise])
    clearTimeout(timeoutTimer)
    assert.strictEqual(meFetchEntered, true, 'Bằng chứng xác nhận GET /me đã thực sự in-flight trên mạng trước khi gọi Logout')

    // 5. Trong lúc GET /me thực sự đang in-flight pending trên mạng, người dùng bấm Logout qua useAuth().logout()
    const logout = getLogoutFunction(store)
    await logout()

    // Kiểm tra trạng thái ngay sau logout:
    // sessionGeneration tăng lên 2, local session bị xóa sạch, RTK Query cache bị reset
    assert.strictEqual(store.getState().auth.sessionGeneration, 2)
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.user, null)
    assert.strictEqual(store.getState().auth.accessToken, null)
    assert.strictEqual(tokenStorage.getRefreshToken(), null)

    // 6. Sau Logout, cho request GET /me trả về 200 OK muộn với dữ liệu profile cũ
    resolveMeResponse(
      new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            id: 'u-stale',
            username: 'staleUser',
            email: 'stale@test.com',
            roles: ['SALES_STAFF'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    // 7. Chờ request /me hoàn tất trên RTK Query pipeline
    const queryResult = await meQueryPromise

    // PASS Verification:
    // 1. Dữ liệu /me cũ bị loại bỏ hoàn toàn: isSuccess là false và data là undefined
    assert.strictEqual(queryResult.isSuccess, false)
    assert.strictEqual(queryResult.data, undefined)
    // 2. Auth state vẫn unauthenticated: user và accessToken vẫn null
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.user, null)
    assert.strictEqual(store.getState().auth.accessToken, null)
    // 3. Storage không lưu và không khôi phục refresh token
    assert.strictEqual(tokenStorage.getRefreshToken(), null)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
    // 4. RTK Query cache KHÔNG bị dữ liệu phiên cũ khôi phục
    const cachedData = authApi.endpoints.getMe.select()(store.getState()).data
    assert.strictEqual(cachedData, undefined)
  } finally {
    clearTimeout(timeoutTimer)
    resolveMeResponse(new Response('{}', { status: 200 }))
    globalThis.fetch = originalFetch
  }
})

test('AC-04.2: Deferred fetch — POST /refresh đang in-flight trên network boundary, Logout xảy ra, refresh trả token mới muộn không được lưu', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // 1. Khởi tạo phiên hợp lệ ban đầu (gen = 1)
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'expired-access-token',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('old-refresh-token-1')
  assert.strictEqual(store.getState().auth.sessionGeneration, 1)

  // 2. Tạo deferred promise để giữ request POST /refresh lơ lửng trên mạng
  let resolveRefreshResponse!: (res: Response) => void
  const refreshDeferred = new Promise<Response>((resolve) => {
    resolveRefreshResponse = resolve
  })

  let refreshCalled = false

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)

    // Request nghiệp vụ nhận 401 để kích hoạt single-flight refresh
    if (url.includes('/api/v1/orders/pending')) {
      return new Response(
        JSON.stringify({ success: false, code: 'AUTH_001', message: 'Token expired' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Request refresh token bị giữ lơ lửng trên mạng
    if (url.includes('/api/v1/auth/refresh')) {
      refreshCalled = true
      return refreshDeferred
    }

    if (url.includes('/api/v1/auth/logout')) {
      return new Response(JSON.stringify({ success: true, message: 'Revoked' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
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
      endpoint: 'getOrdersPending',
      type: 'query' as const,
    }

    // 3. Kích hoạt request nghiệp vụ -> gặp 401 -> bắt đầu POST /auth/refresh trên network boundary
    const businessQueryPromise = reauthBaseQuery('/orders/pending', fakeApi as any, {})

    // Đợi 2 tick để reauthBaseQuery thực hiện pop token và gửi refresh
    await new Promise((r) => setTimeout(r, 10))
    assert.strictEqual(refreshCalled, true)

    // 4. Trong lúc POST /refresh thực sự đang in-flight trên mạng, người dùng bấm Logout
    const logout = getLogoutFunction(store)
    await logout()

    // Ngay sau logout: generation lên 2, credentials và storage bị dọn sạch
    assert.strictEqual(store.getState().auth.sessionGeneration, 2)
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.accessToken, null)
    assert.strictEqual(tokenStorage.getRefreshToken(), null)

    // 5. Bây giờ cho request POST /refresh trả về 200 OK muộn với cặp token mới
    resolveRefreshResponse(
      new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: 'new-refreshed-token-stale',
            refresh_token: 'new-refreshed-refresh-stale',
            token_type: 'Bearer',
            expires_in: 900,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    // 6. Chờ business query promise kết thúc
    await businessQueryPromise

    // PASS Verification:
    // 1. currentGen (2) !== requestGen (1): reauthBaseQuery loại bỏ token mới
    // 2. Refresh token mới TUYỆT ĐỐI KHÔNG được lưu lại vào storage
    assert.strictEqual(tokenStorage.getRefreshToken(), null)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
    // 3. Access token mới KHÔNG được cập nhật vào Redux: accessToken vẫn null
    assert.strictEqual(store.getState().auth.accessToken, null)
    // 4. Trạng thái người dùng vẫn là unauthenticated: isAuthenticated vẫn false, user vẫn null
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.user, null)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-04.3: Logout khi retry request đang in-flight — Response retry về muộn bị discard với STALE_SESSION_DISCARDED', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  store.dispatch(startSession()) // gen = 1
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'token-1',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('ref-1')

  let retryTriggered = false

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/financial-reports')) {
      const auth = getAuthHeader(input, init)
      if (auth === 'Bearer token-1') {
        return new Response(JSON.stringify({ code: 'AUTH_001' }), { status: 401 })
      }
      if (auth === 'Bearer token-refreshed') {
        retryTriggered = true
        // Trong lúc request retry đang bay trên mạng, người dùng bấm Logout!
        store.dispatch(clearAuthLocal()) // gen = 2

        // Sau đó response retry trả về dữ liệu bảo mật
        return new Response(
          JSON.stringify({ success: true, data: { revenue: 500000000 } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }
    if (url.includes('/api/v1/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { access_token: 'token-refreshed', refresh_token: 'ref-2' },
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
      endpoint: 'getReports',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/financial-reports', fakeApi as any, {})

    // PASS Verification:
    // 1. Retry đã thực sự diễn ra
    assert.strictEqual(retryTriggered, true)
    // 2. Do session đã đổi (logout), kết quả retry bị discard với STALE_SESSION_DISCARDED
    assert.strictEqual(result.error?.status, 'CUSTOM_ERROR')
    assert.strictEqual((result.error as any)?.error, 'STALE_SESSION_DISCARDED')
    assert.strictEqual(result.data, undefined)
    // 3. State hoàn toàn unauthenticated
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-04.4: Switch Account khi retry của Account A đang in-flight — Response A không ghi vào state/cache của Account B', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  // Account A active (gen = 1)
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'uA', username: 'accountA', email: 'a@test.com', roles: [] },
      accessToken: 'token-A-old',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('ref-A')

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/orders/100')) {
      const auth = getAuthHeader(input, init)
      if (auth === 'Bearer token-A-old') {
        return new Response(JSON.stringify({ code: 'AUTH_001' }), { status: 401 })
      }
      if (auth === 'Bearer token-A-refreshed') {
        // Trong lúc Account A retry, người dùng đăng nhập tài khoản B (gen = 2)
        store.dispatch(startSession()) // gen = 2
        store.dispatch(
          setCredentials({
            user: { id: 'uB', username: 'accountB', email: 'b@test.com', roles: ['SHOP_OWNER'] },
            accessToken: 'token-B',
            generation: 2,
          }),
        )
        tokenStorage.setRefreshToken('ref-B')

        return new Response(
          JSON.stringify({ success: true, data: { orderId: 100, owner: 'accountA' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }
    if (url.includes('/api/v1/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { access_token: 'token-A-refreshed', refresh_token: 'ref-A-new' },
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
      endpoint: 'getOrder',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/orders/100', fakeApi as any, {})

    // PASS Verification:
    // 1. Response của Account A bị loại bỏ
    assert.strictEqual(result.error?.status, 'CUSTOM_ERROR')
    assert.strictEqual((result.error as any)?.error, 'STALE_SESSION_DISCARDED')
    // 2. Phiên của Account B được bảo toàn 100%
    assert.strictEqual(store.getState().auth.user?.username, 'accountB')
    assert.strictEqual(store.getState().auth.accessToken, 'token-B')
    assert.strictEqual(tokenStorage.getRefreshToken(), 'ref-B')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-04.5: Logout khi Backend Revoke thất bại — Local session vẫn bị hủy hoàn toàn (fail-safe)', async () => {
  mockStorage.clear()
  const store = createTestStore()

  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'token-to-revoke',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('ref-token-stored')

  // Mock server revoke thất bại (503 Service Unavailable)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    throw new Error('503 Service Unavailable / Connection refused')
  }

  try {
    const logout = getLogoutFunction(store)
    await logout()

    // PASS Verification:
    // Kể cả khi backend revoke thất bại, local session vẫn bị hủy hoàn toàn (không revert lại login):
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.accessToken, null)
    assert.strictEqual(store.getState().auth.user, null)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

// ============================================================================
// AC-05: HTTP 403 không kích hoạt Refresh Token & Protected Route
// ============================================================================

test('AC-05.1: HTTP 403 Forbidden thông thường — KHÔNG kích hoạt Refresh Token và giữ nguyên session', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'staffUser', email: 's@test.com', roles: ['SALES_STAFF'] },
      accessToken: 'valid-staff-token',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('preserved-refresh-token')

  let refreshCallCount = 0

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/admin/super-secret')) {
      // 403 Forbidden: Không đủ thẩm quyền (AUTH_002)
      return new Response(
        JSON.stringify({
          success: false,
          code: 'AUTH_002',
          message: 'Không đủ quyền truy cập tài nguyên này',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/api/v1/auth/refresh')) {
      refreshCallCount++
      return new Response('{}', { status: 200 })
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
      endpoint: 'getSecret',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/admin/super-secret', fakeApi as any, {})

    // PASS Verification:
    // 1. Kết quả trả về đúng lỗi 403
    assert.strictEqual(result.error?.status, 403)
    // 2. TUYỆT ĐỐI KHÔNG kích hoạt endpoint refresh
    assert.strictEqual(refreshCallCount, 0)
    // 3. Refresh token trong storage được bảo toàn (không bị pop)
    assert.strictEqual(tokenStorage.getRefreshToken(), 'preserved-refresh-token')
    // 4. Session vẫn duy trì trạng thái authenticated
    assert.strictEqual(store.getState().auth.isAuthenticated, true)
    assert.strictEqual(store.getState().auth.accessToken, 'valid-staff-token')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-05.2: HTTP 403 AUTH_008 (Tài khoản bị vô hiệu hóa) — KHÔNG refresh và hủy phiên cục bộ ngay lập tức', async () => {
  mockStorage.clear()
  _resetActiveRefreshForTesting()
  const store = createTestStore()

  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: 'u1', username: 'lockedUser', email: 'locked@test.com', roles: [] },
      accessToken: 'locked-user-token',
      generation: 1,
    }),
  )
  tokenStorage.setRefreshToken('token-to-be-purged')

  let refreshCallCount = 0

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = getUrl(input)
    if (url.includes('/api/v1/account/status')) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'AUTH_008',
          message: 'Tài khoản không ở trạng thái hoạt động',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/api/v1/auth/refresh')) {
      refreshCallCount++
      return new Response('{}', { status: 200 })
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
      endpoint: 'getStatus',
      type: 'query' as const,
    }

    const result = await reauthBaseQuery('/account/status', fakeApi as any, {})

    // PASS Verification:
    // 1. Trả về đúng 403
    assert.strictEqual(result.error?.status, 403)
    // 2. KHÔNG refresh
    assert.strictEqual(refreshCallCount, 0)
    // 3. Phiên cục bộ bị xóa hoàn toàn do tài khoản bị khóa
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.accessToken, null)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('AC-05.3: Protected Route — Chặn người dùng anonymous và điều hướng về /login', () => {
  const store = createTestStore()
  // Trạng thái anonymous sau khi bootstrap hoàn tất
  store.dispatch(setBootstrapping(false))
  assert.strictEqual(store.getState().auth.isAuthenticated, false)
  assert.strictEqual(store.getState().auth.isBootstrapping, false)

  let capturedEl: any = null
  function Inspector() {
    capturedEl = ProtectedRoute()
    return capturedEl
  }

  renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(MemoryRouter, null, React.createElement(Inspector)),
    ),
  )

  // PASS Verification:
  // ProtectedRoute trả về Navigate to="/login" replace
  assert.strictEqual(capturedEl?.type, Navigate)
  assert.strictEqual(capturedEl?.props.to, '/login')
  assert.strictEqual(capturedEl?.props.replace, true)
})
