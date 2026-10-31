import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import {
  authReducer,
  setCredentials,
  setBootstrapping,
  setBootstrapError,
  startSession,
} from '../src/features/iam/model/authSlice.ts'
import { tokenStorage, type StorageClearResult } from '../src/shared/lib/tokenStorage.ts'
import { toast } from 'sonner'

// Register ESM loader for TSX support in Node.js test runner
register('./loader.mjs', import.meta.url)

const React = (await import('react')).default
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { MemoryRouter, Navigate } = await import('react-router-dom')
const { useAuth } = await import('../src/features/iam/hooks/useAuth.ts')
const { ProtectedRoute } = await import('../src/features/iam/components/ProtectedRoute.tsx')
const { LoginPage } = await import('../src/pages/auth/LoginPage.tsx')
const { getApiBaseUrl } = await import('../src/shared/api/reauthBaseQuery.ts')
const { resolveApiBaseUrl } = await import('../src/shared/api/apiBaseUrl.ts')

// In-memory mock storage
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

interface ToastCall {
  level: 'success' | 'warning' | 'error' | 'info'
  message: string
}

function spyToast(): { calls: ToastCall[]; restore: () => void } {
  const calls: ToastCall[] = []
  const origSuccess = toast.success
  const origWarning = toast.warning
  const origError = toast.error
  const origInfo = toast.info

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast.success = (msg: any) => {
    calls.push({ level: 'success', message: String(msg) })
    return '' as any
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast.warning = (msg: any) => {
    calls.push({ level: 'warning', message: String(msg) })
    return '' as any
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast.error = (msg: any) => {
    calls.push({ level: 'error', message: String(msg) })
    return '' as any
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast.info = (msg: any) => {
    calls.push({ level: 'info', message: String(msg) })
    return '' as any
  }

  return {
    calls,
    restore: () => {
      toast.success = origSuccess
      toast.warning = origWarning
      toast.error = origError
      toast.info = origInfo
    },
  }
}

// Helper component to extract useAuth().logout in React context
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
// Group 1: Logout Notification Matrix Tests (All 9 cases)
// ============================================================================

test('Logout Notification — Case A1: Access token present, BE revoke succeeds, storage CLEARED', async () => {
  const store = createTestStore()
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: true,
    tombstoneVerified: true,
    status: 'CLEARED',
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    return new Response(JSON.stringify({ success: true, message: 'Revoked' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'success')
    assert.ok(toastSpy.calls[0].message.includes('Đăng xuất thành công'))
    assert.ok(toastSpy.calls[0].message.includes('Đã thu hồi phiên trên máy chủ'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case A2: Access token present, BE revoke succeeds, storage TOMBSTONED', async () => {
  const store = createTestStore()
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: false,
    tombstoneVerified: true,
    status: 'TOMBSTONED',
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    return new Response('{}', { status: 200 })
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'warning')
    assert.ok(toastSpy.calls[0].message.includes('Đã thu hồi phiên trên máy chủ'))
    assert.ok(toastSpy.calls[0].message.includes('Đã đặt khóa phiên trên trình duyệt'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case A3: Access token present, BE revoke succeeds, storage FAILED', async () => {
  const store = createTestStore()
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: false,
    tombstoneVerified: false,
    status: 'FAILED',
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    return new Response('{}', { status: 200 })
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'warning')
    assert.ok(toastSpy.calls[0].message.includes('Đã thu hồi phiên trên máy chủ'))
    assert.ok(toastSpy.calls[0].message.includes('Không thể xóa bộ nhớ cục bộ'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case B1: Access token present, BE revoke fails, storage CLEARED', async () => {
  const store = createTestStore()
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: true,
    tombstoneVerified: true,
    status: 'CLEARED',
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    throw new TypeError('Network error')
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'warning')
    assert.ok(toastSpy.calls[0].message.includes('Đã đăng xuất trên thiết bị'))
    assert.ok(toastSpy.calls[0].message.includes('Không thể thu hồi phiên trên máy chủ'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case B2: Access token present, BE revoke fails, storage TOMBSTONED', async () => {
  const store = createTestStore()
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: false,
    tombstoneVerified: true,
    status: 'TOMBSTONED',
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    throw new Error('503 Service Unavailable')
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'error')
    assert.ok(toastSpy.calls[0].message.includes('máy chủ chưa thu hồi phiên'))
    assert.ok(toastSpy.calls[0].message.includes('Đã đặt khóa phiên'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case B3: Access token present, BE revoke fails, storage FAILED', async () => {
  const store = createTestStore()
  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      user: { id: '1', username: 'user1', email: 'u1@test.com', roles: [] },
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: false,
    tombstoneVerified: false,
    status: 'FAILED',
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    throw new Error('Revoke network failure')
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'error')
    assert.ok(toastSpy.calls[0].message.includes('Cảnh báo bảo mật'))
    assert.ok(toastSpy.calls[0].message.includes('Không thể xóa dữ liệu phiên trên trình duyệt'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case C1: Access token missing (BE revoke NOT CALLED), storage CLEARED warns unconfirmed', async () => {
  const store = createTestStore()
  // Store has NO access token
  assert.strictEqual(store.getState().auth.accessToken, null)

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: true,
    tombstoneVerified: true,
    status: 'CLEARED',
  })

  let fetchCalled = false
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (): Promise<Response> => {
    fetchCalled = true
    return new Response('{}', { status: 200 })
  }

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    // 1. BE revoke was NOT called
    assert.strictEqual(fetchCalled, false)
    // 2. Toast does NOT falsely claim server revocation
    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'warning')
    assert.ok(toastSpy.calls[0].message.includes('Đã đăng xuất trên thiết bị'))
    assert.ok(toastSpy.calls[0].message.includes('Chưa xác nhận thu hồi phiên trên máy chủ do thiếu token xác thực'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    globalThis.fetch = originalFetch
    toastSpy.restore()
  }
})

test('Logout Notification — Case C2: Access token missing, storage TOMBSTONED warns unconfirmed', async () => {
  const store = createTestStore()
  assert.strictEqual(store.getState().auth.accessToken, null)

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: false,
    tombstoneVerified: true,
    status: 'TOMBSTONED',
  })

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'warning')
    assert.ok(toastSpy.calls[0].message.includes('Chưa xác nhận thu hồi phiên trên máy chủ do thiếu token xác thực'))
    assert.ok(toastSpy.calls[0].message.includes('Đã đặt khóa phiên trên trình duyệt'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    toastSpy.restore()
  }
})

test('Logout Notification — Case C3: Access token missing, storage FAILED issues security warning', async () => {
  const store = createTestStore()
  assert.strictEqual(store.getState().auth.accessToken, null)

  const originalClear = tokenStorage.clearRefreshToken
  tokenStorage.clearRefreshToken = (): StorageClearResult => ({
    storageCleared: false,
    tombstoneVerified: false,
    status: 'FAILED',
  })

  const toastSpy = spyToast()
  try {
    const logout = getLogoutFunction(store)
    await logout()

    assert.strictEqual(toastSpy.calls.length, 1)
    assert.strictEqual(toastSpy.calls[0].level, 'error')
    assert.ok(toastSpy.calls[0].message.includes('Cảnh báo bảo mật'))
    assert.ok(toastSpy.calls[0].message.includes('Chưa xác nhận thu hồi phiên trên máy chủ'))
    assert.ok(toastSpy.calls[0].message.includes('không thể xóa bộ nhớ phiên'))
  } finally {
    tokenStorage.clearRefreshToken = originalClear
    toastSpy.restore()
  }
})

// ============================================================================
// Group 2: Bootstrap Outage Notification UI Rendering (LoginPage)
// ============================================================================

test('UI Render — LoginPage displays saved outage error alert when bootstrap fails with 503', () => {
  const store = createTestStore()
  const outageMsg =
    'Dịch vụ xác thực tạm thời không khả dụng trong quá trình khôi phục phiên (503 / Mất kết nối). Vui lòng đăng nhập lại.'

  store.dispatch(
    setBootstrapError({
      type: 'SESSION_EXPIRED',
      message: outageMsg,
    }),
  )

  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/login'] },
        React.createElement(LoginPage),
      ),
    ),
  )

  // 1. Role alert and test id are present
  assert.ok(html.includes('role="alert"'))
  assert.ok(html.includes('data-testid="bootstrap-alert"'))
  // 2. Outage message is accurately displayed
  assert.ok(html.includes(outageMsg))
  // 3. Login form elements are present
  assert.ok(html.includes('Email'))
  assert.ok(html.includes('Mật khẩu'))
  assert.ok(html.includes('Đăng nhập'))
})

test('UI Render — LoginPage does NOT render alert banner when there is no bootstrap error', () => {
  const store = createTestStore()
  // bootstrapError is null by default

  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/login'] },
        React.createElement(LoginPage),
      ),
    ),
  )

  assert.strictEqual(html.includes('data-testid="bootstrap-alert"'), false)
  assert.strictEqual(html.includes('role="alert"'), false)
  assert.ok(html.includes('Đăng nhập tài khoản'))
})

// ============================================================================
// Group 3: ProtectedRoute Rendering & Navigation Behavior
// ============================================================================

test('UI Render — ProtectedRoute renders loading spinner when isBootstrapping is true', () => {
  const store = createTestStore()
  store.dispatch(setBootstrapping(true))

  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(ProtectedRoute),
      ),
    ),
  )

  assert.ok(html.includes('role="status"'))
  assert.ok(html.includes('Đang khôi phục phiên làm việc...'))
  assert.ok(html.includes('animate-spin'))
})

test('UI Render — ProtectedRoute renders outage card with Retry button when token is preserved in storage', () => {
  mockStorage.clear()
  tokenStorage.setRefreshToken('new-valid-token-after-me-outage')

  const store = createTestStore()
  store.dispatch(
    setBootstrapError({
      type: 'SERVICE_UNAVAILABLE',
      message: 'Máy chủ 503 Outage khi tải hồ sơ',
    }),
  )

  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(ProtectedRoute),
      ),
    ),
  )

  assert.ok(html.includes('Lỗi kết nối máy chủ xác thực'))
  assert.ok(html.includes('Máy chủ 503 Outage khi tải hồ sơ'))
  // Token exists -> "Thử lại (Retry)" button MUST be rendered
  assert.ok(html.includes('Thử lại (Retry)'))
  assert.ok(html.includes('Về trang đăng nhập'))
})

test('UI Render — ProtectedRoute renders outage card WITHOUT Retry button when token is absent', () => {
  mockStorage.clear()
  // No token in storage

  const store = createTestStore()
  store.dispatch(
    setBootstrapError({
      type: 'SERVICE_UNAVAILABLE',
      message: 'Máy chủ bảo trì',
    }),
  )

  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/dashboard'] },
        React.createElement(ProtectedRoute),
      ),
    ),
  )

  assert.ok(html.includes('Lỗi kết nối máy chủ xác thực'))
  // No token -> Retry button must NOT be rendered to avoid dead-end UI
  assert.strictEqual(html.includes('Thử lại (Retry)'), false)
  assert.ok(html.includes('Về trang đăng nhập'))
})

test('UI Navigation — ProtectedRoute redirects to /login on SESSION_EXPIRED bootstrap error', () => {
  const store = createTestStore()
  const outageMsg = 'Dịch vụ xác thực tạm thời không khả dụng. Vui lòng đăng nhập lại.'
  store.dispatch(
    setBootstrapError({
      type: 'SESSION_EXPIRED',
      message: outageMsg,
    }),
  )

  // 1. Verify ProtectedRoute returns Navigate to /login with replace: true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedEl: any = null
  function RouteInspector() {
    capturedEl = ProtectedRoute()
    return capturedEl
  }

  renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(MemoryRouter, null, React.createElement(RouteInspector)),
    ),
  )

  assert.strictEqual(capturedEl?.type, Navigate)
  assert.strictEqual(capturedEl?.props.to, '/login')
  assert.strictEqual(capturedEl?.props.replace, true)

  // 2. Verify destination page (LoginPage) renders the outage alert message
  const loginHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/login'] },
        React.createElement(LoginPage),
      ),
    ),
  )

  assert.ok(loginHtml.includes('Đăng nhập tài khoản'))
  assert.ok(loginHtml.includes('data-testid="bootstrap-alert"'))
  assert.ok(loginHtml.includes(outageMsg))
})

// ============================================================================
// Group 4: Local Development CORS Integration & getApiBaseUrl
// ============================================================================

test('CORS Integration — getApiBaseUrl returns relative /api/v1 in browser to use Vite proxy', () => {
  const originalWindow = globalThis.window
  try {
    // Simulate browser window on localhost:5173
    // @ts-expect-error Mocking browser window with location
    globalThis.window = {
      location: { origin: 'http://localhost:5173' },
      sessionStorage: mockStorage,
    }

    const baseUrl = getApiBaseUrl()
    // Must return relative URL so browser request stays on http://localhost:5173/api/v1 (same-origin, no CORS preflight)
    assert.strictEqual(baseUrl, '/api/v1')
  } finally {
    globalThis.window = originalWindow
  }
})

test('API configuration — browser uses the configured value without rewriting hosts', () => {
  assert.strictEqual(resolveApiBaseUrl('/api/v1', 'browser'), '/api/v1')
  assert.strictEqual(resolveApiBaseUrl('http://localhost:8080/api/v1', 'browser'), 'http://localhost:8080/api/v1')
  assert.strictEqual(resolveApiBaseUrl('http://127.0.0.1:8080/api/v1', 'browser'), 'http://127.0.0.1:8080/api/v1')
  assert.strictEqual(resolveApiBaseUrl('https://example.test/api/v1', 'browser'), 'https://example.test/api/v1')
  assert.strictEqual(resolveApiBaseUrl(undefined, 'browser'), '/api/v1')
  assert.strictEqual(resolveApiBaseUrl('', 'browser'), '/api/v1')
})

test('API configuration — Node uses an absolute URL or the test fallback', () => {
  assert.strictEqual(resolveApiBaseUrl('https://example.test/api/v1', 'node'), 'https://example.test/api/v1')
  assert.strictEqual(resolveApiBaseUrl('/api/v1', 'node'), 'http://localhost/api/v1')
  assert.strictEqual(resolveApiBaseUrl(undefined, 'node'), 'http://localhost/api/v1')
})

test('CORS Integration — getApiBaseUrl returns absolute URL in Node test environment', () => {
  const originalWindow = globalThis.window
  try {
    // In Node.js test environment without origin
    // @ts-expect-error Mocking Node environment
    globalThis.window = undefined

    const baseUrl = getApiBaseUrl()
    assert.strictEqual(baseUrl.startsWith('http'), true)
    assert.strictEqual(baseUrl, 'http://localhost/api/v1')
  } finally {
    globalThis.window = originalWindow
  }
})
