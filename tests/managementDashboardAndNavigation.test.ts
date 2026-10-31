import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { iamAccessApi } from '../src/features/iam/api/iamAccessApi.ts'
import { iamAccessReducer } from '../src/features/iam/model/iamAccessSlice.ts'
import {
  authReducer,
  setCredentials,
  setBootstrapping,
  startSession,
} from '../src/features/iam/model/authSlice.ts'
import { tokenStorage } from '../src/shared/lib/tokenStorage.ts'
import { useAuthBootstrap } from '../src/features/iam/hooks/useAuthBootstrap.ts'
import { filterProducts } from '../src/pages/management/productFilters.ts'

// Register ESM loader for TSX support in Node.js test runner
register('./loader.mjs', import.meta.url)

const React = (await import('react')).default
const { act } = await import('react')
const ReactDOMClient = await import('react-dom/client')
const { renderToStaticMarkup } = await import('react-dom/server')
const { ManagementTable } = await import('../src/shared/ui/ManagementTable.tsx')
const { ManagementForm } = await import('../src/shared/ui/ManagementDialog.tsx')
const { RouterProvider } = await import('react-router-dom')
const { Provider } = await import('react-redux')

// Production Router
const { createAppMemoryRouter, routeConfig } = await import('../src/app/router.tsx')

// ============================================================================
// Test Environment Setup Helpers
// ============================================================================

class MockSessionStorage implements Storage {
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

let mediaQueryMatchesState = false
const mediaQueryListeners = new Set<(e: { matches: boolean }) => void>()

function setupDOMEnvironment(initialIsDesktop = false) {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost/' },
  )

  mediaQueryMatchesState = initialIsDesktop
  mediaQueryListeners.clear()

  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.KeyboardEvent = dom.window.KeyboardEvent
  globalThis.MouseEvent = dom.window.MouseEvent

  // Mock sessionStorage via Object.defineProperty
  const storage = new MockSessionStorage()
  Object.defineProperty(dom.window, 'sessionStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })

  // Mock matchMedia for responsive viewport transitions
  // @ts-expect-error Mocking matchMedia
  globalThis.window.matchMedia = (query: string) => ({
    matches: mediaQueryMatchesState,
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: (e: { matches: boolean }) => void) => {
      mediaQueryListeners.add(listener)
    },
    removeEventListener: (_type: string, listener: (e: { matches: boolean }) => void) => {
      mediaQueryListeners.delete(listener)
    },
    addListener: (listener: (e: { matches: boolean }) => void) => {
      mediaQueryListeners.add(listener)
    },
    removeListener: (listener: (e: { matches: boolean }) => void) => {
      mediaQueryListeners.delete(listener)
    },
    dispatchEvent: (event: { matches: boolean }) => {
      mediaQueryListeners.forEach((l) => l(event))
      return true
    },
  })

  // Wrap Node's Request constructor to resolve relative paths in test runner
  const OriginalRequest = globalThis.Request
  globalThis.Request = class extends OriginalRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === 'string' && input.startsWith('/')) {
        super(`http://localhost${input}`, init)
      } else {
        super(input, init)
      }
    }
  } as unknown as typeof Request

  return {
    dom,
    rootElement: dom.window.document.getElementById('root')!,
    storage,
  }
}

function createTestStore(authenticated = true, userOverride?: Record<string, unknown>) {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [iamAccessApi.reducerPath]: iamAccessApi.reducer,
      iamAccess: iamAccessReducer,
      auth: authReducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware, iamAccessApi.middleware),
  })

  if (authenticated) {
    store.dispatch(startSession())
    store.dispatch(
      setCredentials({
        accessToken: 'valid-test-access-token',
        user: {
          id: 'usr-uuid-12345',
          username: 'shop_owner_test',
          email: 'owner@aquasuite.vn',
          roles: ['SHOP_OWNER'],
          ...userOverride,
        },
        generation: 1,
      }),
    )
  }

  store.dispatch(setBootstrapping(false))
  return store
}

async function renderAppWithRouter(
  initialUrl: string,
  authenticated = true,
  userOverride?: Record<string, unknown>,
) {
  const { rootElement } = setupDOMEnvironment()
  const store = createTestStore(authenticated, userOverride)
  const router = createAppMemoryRouter([initialUrl])
  const root = ReactDOMClient.createRoot(rootElement)

  await act(async () => {
    root.render(
      React.createElement(
        Provider,
        { store },
        React.createElement(RouterProvider, { router }),
      ),
    )
  })

  return { store, router, root, container: rootElement }
}

// ============================================================================
// Group 1: Production Router & Route Guard Protection (Behavioral Integration)
// ============================================================================

test('Router Integration — routeConfig contains all required production routes and alias', () => {
  assert.ok(routeConfig.length >= 4)
  const rootRoute = routeConfig.find((r) => r.path === '/')
  assert.ok(rootRoute)

  // Verify protected routes container (contains /dashboard alias and /app)
  const protectedRouteWrapper = routeConfig.find(
    (r) => r.children && r.children.some((c) => c.path === '/dashboard'),
  )
  assert.ok(protectedRouteWrapper, 'Protected route wrapper containing /dashboard must exist')
  assert.ok(protectedRouteWrapper.children)

  // Alias /dashboard
  const aliasRoute = protectedRouteWrapper.children.find((r) => r.path === '/dashboard')
  assert.ok(aliasRoute, 'Alias /dashboard must be configured under ProtectedRoute')

  // /app management container
  const appRoute = protectedRouteWrapper.children.find((r) => r.path === '/app')
  assert.ok(appRoute, '/app layout route must exist')
  assert.ok(appRoute.children)

  const childPaths = appRoute.children.map((c) => c.path).filter(Boolean)
  assert.ok(childPaths.includes('dashboard'))
  assert.ok(childPaths.includes('products'))
  assert.ok(childPaths.includes('categories'))
  assert.ok(childPaths.includes('brands'))
  assert.ok(childPaths.includes('inventory'))
  assert.ok(childPaths.includes('system-info'))
})

test('Router Integration — Unauthenticated access to /dashboard is blocked and redirects to /login', async () => {
  const { router, container } = await renderAppWithRouter('/dashboard', false)

  assert.strictEqual(router.state.location.pathname, '/login')
  assert.ok(container.innerHTML.includes('Đăng nhập'))
})

test('Router Integration — Unauthenticated access to /app/products is blocked and redirects to /login', async () => {
  const { router, container } = await renderAppWithRouter('/app/products', false)

  assert.strictEqual(router.state.location.pathname, '/login')
  assert.ok(container.innerHTML.includes('Đăng nhập'))
})

test('Router Integration — Unauthenticated access to all 6 protected URLs redirects to /login', async () => {
  const protectedUrls = [
    '/app/dashboard',
    '/app/products',
    '/app/categories',
    '/app/brands',
    '/app/inventory',
    '/app/system-info',
  ]

  for (const url of protectedUrls) {
    const { router } = await renderAppWithRouter(url, false)
    assert.strictEqual(
      router.state.location.pathname,
      '/login',
      `Unauthenticated access to ${url} must redirect to /login`,
    )
  }
})

test('Router Integration — Authenticated access to alias /dashboard redirects replace to /app/dashboard', async () => {
  const { router, container } = await renderAppWithRouter('/dashboard', true)

  assert.strictEqual(router.state.location.pathname, '/app/dashboard')
  assert.ok(container.innerHTML.includes('AquaSuite'))
  assert.ok(container.innerHTML.includes('Chỉ số tổng quan kinh doanh'))
})

test('Router Integration — Root path / redirects replace to /app/dashboard for authenticated user', async () => {
  const { router, container } = await renderAppWithRouter('/', true)

  assert.strictEqual(router.state.location.pathname, '/app/dashboard')
  assert.ok(container.innerHTML.includes('Chỉ số tổng quan kinh doanh'))
})

// ============================================================================
// Group 2: Behavioral Navigation & Active State (Clicking Real Router Links)
// ============================================================================

test('Navigation Behavioral — Clicking links updates route, renders target page, and updates active state', async () => {
  const { router, container } = await renderAppWithRouter('/app/dashboard', true)

  // 1. Initial on /app/dashboard
  assert.strictEqual(router.state.location.pathname, '/app/dashboard')
  const dashLink = container.querySelector(
    '#desktop-sidebar-navigation a[href="/app/dashboard"]',
  ) as HTMLAnchorElement
  assert.ok(dashLink)
  assert.strictEqual(dashLink.getAttribute('aria-current'), 'page')

  const prodLink = container.querySelector(
    '#desktop-sidebar-navigation a[href="/app/products"]',
  ) as HTMLAnchorElement
  assert.ok(prodLink)
  assert.strictEqual(prodLink.getAttribute('aria-current'), null)

  // 2. Click Sản phẩm link
  await act(async () => {
    prodLink.click()
  })

  assert.strictEqual(router.state.location.pathname, '/app/products')
  assert.ok(container.innerHTML.includes('Quản lý Sản phẩm'))
  assert.strictEqual(prodLink.getAttribute('aria-current'), 'page')
  assert.strictEqual(dashLink.getAttribute('aria-current'), null)

  // 3. Click Danh mục link
  const catLink = container.querySelector(
    '#desktop-sidebar-navigation a[href="/app/categories"]',
  ) as HTMLAnchorElement
  assert.ok(catLink)
  await act(async () => {
    catLink.click()
  })

  assert.strictEqual(router.state.location.pathname, '/app/categories')
  assert.ok(container.innerHTML.includes('Quản lý Danh mục'))
  assert.strictEqual(catLink.getAttribute('aria-current'), 'page')
  assert.strictEqual(prodLink.getAttribute('aria-current'), null)

  // 4. Click Thương hiệu link
  const brandLink = container.querySelector(
    '#desktop-sidebar-navigation a[href="/app/brands"]',
  ) as HTMLAnchorElement
  assert.ok(brandLink)
  await act(async () => {
    brandLink.click()
  })

  assert.strictEqual(router.state.location.pathname, '/app/brands')
  assert.ok(container.innerHTML.includes('Quản lý Thương hiệu'))
  assert.strictEqual(brandLink.getAttribute('aria-current'), 'page')

  // 5. Click Tồn kho link
  const invLink = container.querySelector(
    '#desktop-sidebar-navigation a[href="/app/inventory"]',
  ) as HTMLAnchorElement
  assert.ok(invLink)
  await act(async () => {
    invLink.click()
  })

  assert.strictEqual(router.state.location.pathname, '/app/inventory')
  assert.ok(container.innerHTML.includes('Quản lý Tồn kho'))
  assert.strictEqual(invLink.getAttribute('aria-current'), 'page')

  // 6. Click Bảng điều khiển link to return
  await act(async () => {
    dashLink.click()
  })

  assert.strictEqual(router.state.location.pathname, '/app/dashboard')
  assert.strictEqual(dashLink.getAttribute('aria-current'), 'page')
  assert.strictEqual(invLink.getAttribute('aria-current'), null)
})

// ============================================================================
// Group 3: Finding M1 — Mobile Drawer Responsive Lifecycle & Accessibility
// ============================================================================

test('Finding M1 — Navigation IDs are unique and aria-controls references valid ID', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  assert.ok(openButton)
  assert.strictEqual(openButton.getAttribute('aria-controls'), 'mobile-sidebar-navigation')

  // Desktop navigation ID
  const desktopNav = container.querySelector('#desktop-sidebar-navigation')
  assert.ok(desktopNav)

  // Open mobile drawer
  await act(async () => {
    openButton.click()
  })

  // Mobile navigation ID
  const mobileNav = container.querySelector('#mobile-sidebar-navigation')
  assert.ok(mobileNav)

  // Ensure no duplicate IDs exist
  const desktopElements = container.querySelectorAll('#desktop-sidebar-navigation')
  const mobileElements = container.querySelectorAll('#mobile-sidebar-navigation')
  assert.strictEqual(desktopElements.length, 1)
  assert.strictEqual(mobileElements.length, 1)
})

test('Finding M1 — Opening drawer shifts focus to close button after timer, and closing restores focus to trigger', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  openButton.focus()
  assert.strictEqual(document.activeElement, openButton)

  // Open drawer
  await act(async () => {
    openButton.click()
  })

  const closeButton = container.querySelector('button[aria-label="Đóng menu điều hướng"]') as HTMLButtonElement
  assert.ok(closeButton)

  // Await timer for initial focus shift
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
  })
  assert.strictEqual(document.activeElement, closeButton, 'Initial focus must shift to close button')

  // Close via button click -> focus must be restored to openButton
  await act(async () => {
    closeButton.click()
  })

  // Drawer is closed
  assert.strictEqual(container.querySelector('button[aria-label="Đóng menu điều hướng"]'), null)
  assert.strictEqual(document.activeElement, openButton, 'Focus must restore to openButton trigger')
})

test('Finding M1 — Escape key closes drawer and restores focus to openButton', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  openButton.focus()

  await act(async () => {
    openButton.click()
  })

  assert.ok(container.querySelector('div[role="dialog"]'))

  // Press Escape
  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })

  // Drawer closed
  assert.strictEqual(container.querySelector('div[role="dialog"]'), null)
  assert.strictEqual(document.activeElement, openButton)
})

test('Finding M1 — Backdrop click closes drawer and restores focus to openButton', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  openButton.focus()

  await act(async () => {
    openButton.click()
  })

  const backdrop = container.querySelector('div.fixed.inset-0.bg-gray-900\\/50') as HTMLDivElement
  assert.ok(backdrop)

  await act(async () => {
    backdrop.click()
  })

  assert.strictEqual(container.querySelector('div[role="dialog"]'), null)
  assert.strictEqual(document.activeElement, openButton)
})

test('Finding M1 — Keyboard focus is trapped within drawer during Tab and Shift+Tab', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  await act(async () => {
    openButton.click()
  })

  const drawer = container.querySelector('div[role="dialog"]') as HTMLDivElement
  assert.ok(drawer)

  const focusableElements = drawer.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )
  assert.ok(focusableElements.length > 2)

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  // 1. Tab on last element -> wraps to first element
  lastElement.focus()
  assert.strictEqual(document.activeElement, lastElement)

  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: false }))
  })
  assert.strictEqual(document.activeElement, firstElement)

  // 2. Shift+Tab on first element -> wraps to last element
  firstElement.focus()
  assert.strictEqual(document.activeElement, firstElement)

  await act(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
  })
  assert.strictEqual(document.activeElement, lastElement)
})

test('Finding M1 — Selecting a NavLink inside drawer closes drawer, navigates, and restores focus', async () => {
  const { router, container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  openButton.focus()

  await act(async () => {
    openButton.click()
  })

  assert.ok(container.querySelector('div[role="dialog"]'))

  // Click Sản phẩm link in mobile drawer
  const mobileProdLink = container.querySelector(
    '#mobile-sidebar-navigation a[href="/app/products"]',
  ) as HTMLAnchorElement
  assert.ok(mobileProdLink)

  await act(async () => {
    mobileProdLink.click()
  })

  // Assert: Drawer is closed, router navigated, ProductsPage rendered, and focus restored
  assert.strictEqual(container.querySelector('div[role="dialog"]'), null)
  assert.strictEqual(router.state.location.pathname, '/app/products')
  assert.ok(container.innerHTML.includes('Quản lý Sản phẩm'))
  assert.strictEqual(document.activeElement, openButton)
})

test('Finding M1 — Responsive Viewport: Automatically closes mobile drawer on resize to desktop, and remains closed on resize back to mobile', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  await act(async () => {
    openButton.click()
  })

  // Drawer is currently open on mobile
  assert.ok(container.querySelector('div[role="dialog"]'), 'Drawer must be open on mobile')

  // Simulate viewport resize to desktop (>= 768px)
  await act(async () => {
    mediaQueryMatchesState = true
    mediaQueryListeners.forEach((listener) => listener({ matches: true }))
  })

  // Assert: Drawer automatically closes and dialog unmounts
  assert.strictEqual(
    container.querySelector('div[role="dialog"]'),
    null,
    'Drawer must close on resize to desktop',
  )

  // Simulate viewport resize back to mobile (< 768px)
  await act(async () => {
    mediaQueryMatchesState = false
    mediaQueryListeners.forEach((listener) => listener({ matches: false }))
  })

  // Assert: Drawer must remain closed
  assert.strictEqual(
    container.querySelector('div[role="dialog"]'),
    null,
    'Drawer must remain closed when viewport transitions back to mobile',
  )
})

// ============================================================================
// Group 4: WORK-003 Single Header Logout & Absence of Duplicate Buttons
// ============================================================================

test('Single Logout — Header Logout button has accessible name "Đăng xuất" via aria-label and works with logout handler', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const headerLogoutBtn = container.querySelector(
    'header button[aria-label="Đăng xuất"]',
  ) as HTMLButtonElement
  assert.ok(headerLogoutBtn, 'Header logout button must have aria-label="Đăng xuất"')
  assert.strictEqual(headerLogoutBtn.getAttribute('aria-label'), 'Đăng xuất')

  const textSpan = headerLogoutBtn.querySelector('span.hidden.sm\\:inline')
  assert.ok(textSpan, 'Text span is hidden on small screens but aria-label provides accessible name')

  // Verify NO duplicate logout buttons in Desktop Sidebar or Dashboard Page
  const desktopSidebar = container.querySelector('#desktop-sidebar-navigation')?.closest('aside')
  assert.ok(desktopSidebar)
  assert.strictEqual(
    desktopSidebar.querySelector('button[aria-label*="Đăng xuất"]'),
    null,
    'Desktop sidebar must NOT contain a logout button',
  )

  const dashboardContent = container.querySelector('main')
  assert.ok(dashboardContent)
  assert.strictEqual(
    dashboardContent.querySelector('button[aria-label*="Đăng xuất"]'),
    null,
    'Dashboard page must NOT contain a logout button',
  )
})

test('Single Logout — Mobile drawer does NOT contain duplicate logout button', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  const openButton = container.querySelector('button[aria-label="Mở menu điều hướng"]') as HTMLButtonElement
  await act(async () => {
    openButton.click()
  })

  const drawer = container.querySelector('div[role="dialog"]')
  assert.ok(drawer)
  assert.strictEqual(
    drawer.querySelector('button[aria-label*="Đăng xuất"]'),
    null,
    'Mobile drawer must NOT contain duplicate logout button',
  )
})

// ============================================================================
// Group 5: Finding M3 — F5 Auth Bootstrap & Deep-Link Preservation (Real WORK-001 Lifecycle)
// ============================================================================

test('Finding M3 — Valid Session: Direct deep-link initialization at /app/products performs real auth bootstrap, preserves URL, and renders ProductsPage', async () => {
  const { rootElement } = setupDOMEnvironment()

  // 1. Fresh unauthenticated Redux store with isBootstrapping: true
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  })

  assert.strictEqual(store.getState().auth.isAuthenticated, false)
  assert.strictEqual(store.getState().auth.isBootstrapping, true)

  // 2. Set valid initial refresh token in sessionStorage
  tokenStorage.setRefreshToken('valid-initial-refresh-token')
  assert.strictEqual(tokenStorage.hasRefreshToken(), true)

  // 3. Mock network boundary with deferred promise to keep refresh request pending
  let resolveRefresh: ((res: Response) => void) | null = null
  const refreshDeferred = new Promise<Response>((resolve) => {
    resolveRefresh = resolve
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const s = typeof input === 'object' && 'url' in input ? input.url : String(input)
    if (s.includes('/auth/refresh')) {
      return refreshDeferred
    }
    if (s.includes('/auth/me')) {
      return new Response(
        JSON.stringify({
          data: {
            id: 'usr-f5-owner-uuid',
            username: 'owner_f5_verified',
            email: 'owner.f5@aquasuite.vn',
            roles: ['SHOP_OWNER'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }

  try {
    // 4. Initialize production router directly at deep-link /app/products
    const router = createAppMemoryRouter(['/app/products'])

    function AppWithBootstrap() {
      useAuthBootstrap()
      return React.createElement(RouterProvider, { router })
    }

    const root = ReactDOMClient.createRoot(rootElement)

    // Initial render initiates bootstrap; refresh request stays pending via deferred promise
    await act(async () => {
      root.render(
        React.createElement(
          Provider,
          { store },
          React.createElement(AppWithBootstrap),
        ),
      )
    })

    // Allow microtasks to run while refresh fetch remains pending
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    // Assert pending state before resolving request:
    // - Auth bootstrap vẫn đang diễn ra
    assert.strictEqual(store.getState().auth.isBootstrapping, true, 'Auth bootstrap must still be in progress')
    assert.strictEqual(store.getState().auth.isAuthenticated, false, 'User must not be authenticated yet')
    // - Loading UI được hiển thị
    assert.ok(rootElement.querySelector('div[role="status"]'), 'Loading UI (role="status") must be displayed')
    assert.ok(
      rootElement.innerHTML.includes('Đang khôi phục phiên làm việc...'),
      'Loading message must be displayed',
    )
    // - URL vẫn giữ nguyên /app/products
    assert.strictEqual(
      router.state.location.pathname,
      '/app/products',
      'URL must remain /app/products while bootstrapping',
    )
    // - ProductsPage chưa được render
    assert.strictEqual(
      rootElement.innerHTML.includes('Quản lý Sản phẩm'),
      false,
      'ProductsPage must not be rendered while bootstrapping',
    )
    // - Không redirect về /login hoặc /app/dashboard
    assert.notStrictEqual(
      router.state.location.pathname,
      '/login',
      'Must not redirect to /login while bootstrapping',
    )
    assert.notStrictEqual(
      router.state.location.pathname,
      '/app/dashboard',
      'Must not redirect to /app/dashboard while bootstrapping',
    )

    // 5. Resolve deferred refresh request and await completion of refresh + /me
    await act(async () => {
      resolveRefresh!(
        new Response(
          JSON.stringify({
            data: {
              access_token: 'new-rotated-access-token',
              refresh_token: 'new-rotated-refresh-token',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    // 6. Verify bootstrap completion and authentication
    const authState = store.getState().auth
    assert.strictEqual(authState.isAuthenticated, true, 'User must be authenticated after bootstrap')
    assert.strictEqual(authState.isBootstrapping, false, 'Auth bootstrap must be complete')
    assert.strictEqual(authState.user?.username, 'owner_f5_verified')
    assert.strictEqual(tokenStorage.getRefreshToken(), 'new-rotated-refresh-token')

    // 7. Verify URL and target page are preserved (ProductsPage rendered, no redirect)
    assert.strictEqual(
      router.state.location.pathname,
      '/app/products',
      'Target URL /app/products must remain preserved after bootstrap completion',
    )
    assert.ok(
      rootElement.innerHTML.includes('Quản lý Sản phẩm'),
      'ProductsPage must be rendered after bootstrap',
    )
    assert.ok(rootElement.innerHTML.includes('owner_f5_verified'))
    assert.strictEqual(
      rootElement.querySelector('div[role="status"]'),
      null,
      'Loading UI must be dismissed after bootstrap',
    )

    const activeProdLink = rootElement.querySelector(
      '#desktop-sidebar-navigation a[href="/app/products"]',
    )
    assert.strictEqual(activeProdLink?.getAttribute('aria-current'), 'page')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Finding M3 — Valid Session: Parameterized check for all other protected deep-links retains exact URL after bootstrap', async () => {
  const routesToTest = [
    { url: '/app/categories', expectedText: 'Quản lý Danh mục' },
    { url: '/app/brands', expectedText: 'Quản lý Thương hiệu' },
    { url: '/app/inventory', expectedText: 'Quản lý Tồn kho' },
    { url: '/app/dashboard', expectedText: 'Chỉ số tổng quan kinh doanh' },
    { url: '/app/system-info', expectedText: 'Hồ sơ cá nhân' },
  ]

  for (const item of routesToTest) {
    const { rootElement } = setupDOMEnvironment()
    const store = configureStore({
      reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
      middleware: (gDM) => gDM().concat(baseApi.middleware),
    })

    tokenStorage.setRefreshToken('valid-token-for-deep-link')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const s = typeof input === 'object' && 'url' in input ? input.url : String(input)
      if (s.includes('/auth/refresh')) {
        return new Response(
          JSON.stringify({
            data: { access_token: 'acc-tok', refresh_token: 'ref-tok' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      if (s.includes('/auth/me')) {
        return new Response(
          JSON.stringify({
            data: { id: 'usr-1', username: 'owner_user', email: 'owner@test.com', roles: ['SHOP_OWNER'] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }
      return new Response('{}', { status: 404 })
    }

    try {
      const router = createAppMemoryRouter([item.url])

      function AppWrapper() {
        useAuthBootstrap()
        return React.createElement(RouterProvider, { router })
      }

      const root = ReactDOMClient.createRoot(rootElement)
      await act(async () => {
        root.render(React.createElement(Provider, { store }, React.createElement(AppWrapper)))
      })

      await act(async () => {
        await new Promise((r) => setTimeout(r, 80))
      })

      assert.strictEqual(store.getState().auth.isAuthenticated, true)
      assert.strictEqual(router.state.location.pathname, item.url)
      assert.ok(rootElement.innerHTML.includes(item.expectedText))
    } finally {
      globalThis.fetch = originalFetch
    }
  }
})

test('Finding M3 — Invalid Session: Refresh failure during bootstrap clears state and redirects ProtectedRoute to /login', async () => {
  const { rootElement } = setupDOMEnvironment()

  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  })

  // Set an expired token in storage
  tokenStorage.setRefreshToken('expired-token-session')

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const s = typeof input === 'object' && 'url' in input ? input.url : String(input)
    if (s.includes('/auth/refresh')) {
      // Return 401 Unauthorized
      return new Response(
        JSON.stringify({ error: { code: 'AUTH_001', message: 'Token expired' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('{}', { status: 404 })
  }

  try {
    const router = createAppMemoryRouter(['/app/products'])

    function AppWrapper() {
      useAuthBootstrap()
      return React.createElement(RouterProvider, { router })
    }

    const root = ReactDOMClient.createRoot(rootElement)
    await act(async () => {
      root.render(React.createElement(Provider, { store }, React.createElement(AppWrapper)))
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 80))
    })

    // Assert: Auth state is fail-closed, storage is empty
    assert.strictEqual(store.getState().auth.isAuthenticated, false)
    assert.strictEqual(store.getState().auth.isBootstrapping, false)
    assert.strictEqual(store.getState().auth.user, null)
    assert.strictEqual(tokenStorage.hasRefreshToken(), false)

    // Assert: ProtectedRoute intercepted and redirected to /login
    assert.strictEqual(
      router.state.location.pathname,
      '/login',
      'Invalid session must redirect to /login',
    )
    assert.ok(rootElement.innerHTML.includes('Đăng nhập'))
  } finally {
    globalThis.fetch = originalFetch
  }
})

// ============================================================================
// Group 6: Dashboard Mock Data & Placeholder Disclaimers
// ============================================================================

test('Dashboard Mockup — 4 KPI metrics have labels, values, units, and mockup badges', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  assert.ok(container.innerHTML.includes('Tổng doanh thu'))
  assert.ok(container.innerHTML.includes('128.500.000 ₫'))

  assert.ok(container.innerHTML.includes('Tổng đơn hàng'))
  assert.ok(container.innerHTML.includes('1.240'))
  assert.ok(container.innerHTML.includes('đơn hàng'))

  assert.ok(container.innerHTML.includes('Tổng sản phẩm'))
  assert.ok(container.innerHTML.includes('350'))
  assert.ok(container.innerHTML.includes('sản phẩm'))

  assert.ok(container.innerHTML.includes('Sản phẩm sắp hết hàng'))
  assert.ok(container.innerHTML.includes('12'))

  assert.ok(container.innerHTML.includes('Dữ liệu mẫu / Minh họa'))
})

test('Dashboard Mockup — 2 Charts render accessible data representations', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true)

  // Chart 1: Monthly revenue with accessible table
  assert.ok(container.innerHTML.includes('Biểu đồ doanh thu 6 tháng gần nhất'))
  assert.ok(container.innerHTML.includes('Xem bảng số liệu chi tiết (Hỗ trợ trình đọc màn hình)'))
  assert.ok(container.innerHTML.includes('95.000.000 ₫'))
  assert.ok(container.innerHTML.includes('128.500.000 ₫'))

  // Chart 2: Inventory status non-color-dependent details
  assert.ok(container.innerHTML.includes('Biểu đồ phân loại trạng thái tồn kho'))
  assert.ok(container.innerHTML.includes('Còn hàng'))
  assert.ok(container.innerHTML.includes('285'))
  assert.ok(container.innerHTML.includes('81.4%'))
  assert.ok(container.innerHTML.includes('Sắp hết hàng'))
  assert.ok(container.innerHTML.includes('12'))
  assert.ok(container.innerHTML.includes('3.4%'))
})

test('Placeholder Pages — All 4 placeholders render disclaimer of no CRUD or business API', async () => {
  const p1 = await renderAppWithRouter('/app/products', true)
  assert.ok(p1.container.innerHTML.includes('Quản lý Sản phẩm'))
  assert.ok(p1.container.textContent?.includes('chưa kết nối API nghiệp vụ'))
  assert.ok(!p1.container.textContent?.includes('Trang giao diện mẫu (Placeholder) — WORK-002'))

  const p2 = await renderAppWithRouter('/app/categories', true)
  assert.ok(p2.container.innerHTML.includes('Quản lý Danh mục'))
  assert.ok(p2.container.textContent?.includes('Dữ liệu mẫu'))
  assert.ok(p2.container.textContent?.includes('thay đổi sẽ mất khi rời trang hoặc tải lại'))

  const p3 = await renderAppWithRouter('/app/brands', true)
  assert.ok(p3.container.innerHTML.includes('Quản lý Thương hiệu'))
  assert.ok(p3.container.textContent?.includes('Dữ liệu mẫu'))

  const p4 = await renderAppWithRouter('/app/inventory', true)
  assert.ok(p4.container.innerHTML.includes('Quản lý Tồn kho'))
  assert.ok(p4.container.innerHTML.includes('chưa kết nối API nghiệp vụ'))
})

test('Categories — sample table filters and paginates', async () => {
  const { container } = await renderAppWithRouter('/app/categories', true)
  assert.equal(container.querySelector('#category-size'), null)
  const status = container.querySelector<HTMLSelectElement>('#category-filter')!
  await act(async () => {
    status.value = 'INACTIVE'
    status.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.ok(container.textContent?.includes('ACCESSORY'))
  assert.ok(!container.textContent?.includes('SANITARY'))
  assert.ok(container.textContent?.includes('Tổng số: 1 danh mục mẫu'))
})

test('Brands — filters sample data and validates the shared form', async () => {
  const { container } = await renderAppWithRouter('/app/brands', true)
  const status = container.querySelector<HTMLSelectElement>('#brand-filter')!
  await act(async () => { status.value = 'INACTIVE'; status.dispatchEvent(new window.Event('change', { bubbles: true })) })
  assert.ok(container.textContent?.includes('BRAND-C'))
  assert.ok(!container.textContent?.includes('BRAND-A'))
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  window.HTMLDialogElement.prototype.close = function () { this.open = false }
  const add = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Thêm thương hiệu'))!
  await act(async () => { add.click() })
  await act(async () => { container.querySelector('dialog form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })) })
  assert.ok(container.textContent?.includes('Vui lòng nhập mã thương hiệu.'))
  assert.ok(container.textContent?.includes('Vui lòng nhập tên thương hiệu.'))
})

test('Categories — shared form validates and prevents deleting a parent', async () => {
  const { container } = await renderAppWithRouter('/app/categories', true)
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  window.HTMLDialogElement.prototype.close = function () { this.open = false }
  const add = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Thêm danh mục'))!
  await act(async () => { add.click() })
  const form = container.querySelector('dialog form')!
  await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })) })
  assert.ok(container.textContent?.includes('Vui lòng nhập mã danh mục.'))
  assert.ok(container.textContent?.includes('Vui lòng nhập tên danh mục.'))
  await act(async () => { (container.querySelector('dialog button[aria-label="Đóng"]') as HTMLButtonElement).click() })
  await act(async () => { (container.querySelector('button[aria-label="Xóa Thiết bị vệ sinh"]') as HTMLButtonElement).click() })
  assert.ok(container.textContent?.includes('Không thể xóa danh mục đang có danh mục con.'))
  const remove = Array.from(container.querySelectorAll('dialog button')).find((button) => button.textContent === 'Xóa danh mục')!
  assert.equal(remove.disabled, true)
})

test('Access pages — routes are protected and present in navigation', async () => {
  for (const path of ['/app/roles', '/app/permissions']) {
    const anonymous = await renderAppWithRouter(path, false)
    assert.equal(anonymous.router.state.location.pathname, '/login')
    const authenticated = await renderAppWithRouter(path, true)
    assert.ok(authenticated.container.querySelector(`#desktop-sidebar-navigation a[href="${path}"]`))
    assert.ok(authenticated.container.textContent?.includes(path.endsWith('roles') ? 'Quản lý Vai trò' : 'Quản lý Quyền'))
  }
})

test('Role assignment requires confirmation and cancel sends no mutation', async () => {
  const originalFetch = globalThis.fetch
  let mutations = 0
  const role = { id: 'r1', code: 'SHOP_OWNER', description: 'Chủ cửa hàng', active: true, permissions: [] }
  let releaseMutation!: (response: Response) => void
  const pendingMutation = new Promise<Response>((resolve) => { releaseMutation = resolve })
  globalThis.fetch = async (input) => {
    const request = input as Request
    if (request.method === 'PUT' || request.method === 'DELETE') { mutations++; return pendingMutation }
    const data = request.url.includes('/iam/permissions') ? { items: [{ id: 'p1', code: 'ORDER_READ', description: 'Xem đơn' }], page: 0, size: 20, totalElements: 1, totalPages: 1 } : request.url.endsWith('/r1') ? role : [role]
    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const { container } = await renderAppWithRouter('/app/roles', true)
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    const view = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xem quyền')!
    assert.ok(view)
    await act(async () => { view.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    const assign = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Gán quyền')!
    assert.ok(assign)
    await act(async () => { assign.click() })
    assert.ok(container.querySelector('dialog')?.textContent?.includes('ORDER_READ'))
    assert.ok(container.querySelector('dialog')?.textContent?.includes('SHOP_OWNER'))
    assert.equal(mutations, 0)
    const cancel = Array.from(container.querySelectorAll('dialog button')).find((button) => button.textContent === 'Hủy')!
    await act(async () => { cancel.click() })
    assert.equal(mutations, 0)
    const assignAgain = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Gán quyền')!
    await act(async () => { assignAgain.click() })
    const confirm = Array.from(container.querySelectorAll('dialog button')).find((button) => button.textContent?.includes('Xác nhận gán quyền'))!
    await act(async () => { confirm.click(); confirm.click(); await new Promise((resolve) => setTimeout(resolve, 20)) })
    assert.equal(mutations, 1)
    assert.ok(container.querySelector('dialog button[aria-label="Đóng"]:disabled'))
    await act(async () => { releaseMutation(new Response(JSON.stringify({ success: true, data: role }), { status: 200, headers: { 'content-type': 'application/json' } })); await new Promise((resolve) => setTimeout(resolve, 40)) })
  } finally { globalThis.fetch = originalFetch }
})

test('Permission list shows a useful server error without treating it as empty data', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, code: 'DB_001', message: 'Không thể tải dữ liệu' }), { status: 500, headers: { 'content-type': 'application/json' } })
  try {
    const { container } = await renderAppWithRouter('/app/permissions', true)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Không tải được danh sách quyền.'))
    assert.ok(container.textContent?.includes('DB_001'))
    assert.ok(container.textContent?.includes('Thử lại'))
    assert.ok(!container.textContent?.includes('Không tìm thấy quyền.'))
  } finally { globalThis.fetch = originalFetch }
})

test('Products — combined filters, empty state and reset operate on sample rows', async () => {
  const { container } = await renderAppWithRouter('/app/products', true)
  const category = container.querySelector<HTMLSelectElement>('#product-category')!
  const status = container.querySelector<HTMLSelectElement>('#product-status')!
  await act(async () => {
    category.value = 'Máy lọc nước'
    category.dispatchEvent(new window.Event('change', { bubbles: true }))
    status.value = 'Sắp hết hàng'
    status.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.ok(container.textContent?.includes('Không tìm thấy sản phẩm phù hợp'))
  assert.ok(container.textContent?.includes('Hiển thị 0 / 3 sản phẩm mẫu'))
  const reset = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xóa bộ lọc')!
  await act(async () => { reset.click() })
  assert.ok(container.textContent?.includes('Hiển thị 3 / 3 sản phẩm mẫu'))
  assert.equal(category.value, '')
  assert.equal(status.value, '')
})

test('Products — search matches code and name, combined with filters', () => {
  const rows = [
    { id: 'SP-001', name: 'Máy lọc nước', category: 'Máy', status: 'Còn hàng' },
    { id: 'SP-002', name: 'Lõi lọc', category: 'Lõi', status: 'Sắp hết' },
  ]
  assert.deepEqual(filterProducts(rows, ' sp-002 ', '', ''), [rows[1]])
  assert.deepEqual(filterProducts(rows, 'LỌC', 'Máy', 'Còn hàng'), [rows[0]])
  assert.deepEqual(filterProducts(rows, 'lọc', 'Máy', 'Sắp hết'), [])
})

test('ManagementTable — supports different columns and an empty state', () => {
  const columns = [
    { key: 'name', header: 'Tên kho', cell: (row: { name: string; quantity: number }) => row.name },
    { key: 'quantity', header: 'Số lượng', cell: (row: { name: string; quantity: number }) => row.quantity, align: 'right' as const },
  ]
  const props = { columns, rowKey: (row: { name: string; quantity: number }) => row.name, emptyMessage: 'Không có kho', labelledBy: 'inventory-title' }
  const populated = renderToStaticMarkup(React.createElement(ManagementTable, { ...props, rows: [{ name: 'Kho A', quantity: 4 }] }))
  assert.ok(populated.includes('Tên kho'))
  assert.ok(populated.includes('Kho A'))
  assert.ok(populated.includes('text-right'))
  const empty = renderToStaticMarkup(React.createElement(ManagementTable, { ...props, rows: [] }))
  assert.ok(empty.includes('colSpan="2"'))
  assert.ok(empty.includes('Không có kho'))
})

test('ManagementForm — submit remains enabled by default and can be disabled', () => {
  const props = { onSubmit: () => {}, onClose: () => {}, submitLabel: 'Lưu', children: 'Nội dung' }
  const enabled = renderToStaticMarkup(React.createElement(ManagementForm, props))
  const disabled = renderToStaticMarkup(React.createElement(ManagementForm, { ...props, submitDisabled: true }))
  assert.match(enabled, /<button type="submit" class=/)
  assert.match(disabled, /<button type="submit" disabled=/)
})

test('Dashboard — Redesigned according to Achromatic Ledger with clean Welcome Header and no technical auth clutter', async () => {
  const { container } = await renderAppWithRouter('/app/dashboard', true, {
    id: 'usr-uuid-test-999',
    username: 'owner_live_test',
    email: 'live@aquasuite.vn',
    roles: ['SHOP_OWNER'],
  })

  // Welcome banner and actions
  assert.ok(container.innerHTML.includes('Xin chào, owner_live_test!'))
  assert.ok(container.innerHTML.includes('Bảng điều khiển kinh doanh'))
  assert.ok(container.innerHTML.includes('Dữ liệu mẫu / Minh họa'))

  // Quick link to System Info exists in Dashboard
  assert.ok(container.textContent?.includes('Hồ sơ cá nhân'))

  // Technical auth clutter was removed from Dashboard
  assert.strictEqual(container.innerHTML.includes('Mô hình bảo mật phiên (MVP Session)'), false)
  assert.strictEqual(container.innerHTML.includes('Danh mục 6 Canonical Roles theo chuẩn AquaSuite BE'), false)

  // Single header logout is present in header, but NO logout button in Dashboard main content
  assert.strictEqual(
    container.querySelector('main button[aria-label*="Đăng xuất"]'),
    null,
  )
})

test('SystemInfoPage — Shows the current profile without technical session details', async () => {
  const { container } = await renderAppWithRouter('/app/system-info', true, {
    id: 'usr-uuid-test-999',
    username: 'owner_live_test',
    email: 'live@aquasuite.vn',
    roles: ['SHOP_OWNER'],
  })

  // Welcome banner and actions
  assert.ok(container.textContent?.includes('Hồ sơ cá nhân'))
  assert.ok(container.innerHTML.includes('Làm mới hồ sơ'))

  // Current User Identity Card
  assert.ok(!container.querySelector('main')?.textContent?.includes('usr-uuid-test-999'))
  assert.ok(container.innerHTML.includes('owner_live_test'))
  assert.ok(container.innerHTML.includes('live@aquasuite.vn'))
  assert.ok(container.innerHTML.includes('SHOP_OWNER'))

  assert.ok(container.textContent?.includes('Chủ cửa hàng (SHOP_OWNER)'))
  assert.ok(container.querySelector('main details summary')?.textContent?.includes('Đổi mật khẩu'))
  assert.ok(!container.innerHTML.includes('Mô hình bảo mật phiên (MVP Session)'))
  assert.ok(!container.innerHTML.includes('Danh mục 6 Canonical Roles theo chuẩn AquaSuite BE'))
})

test('SystemInfoPage — Refresh /me profile button triggers fetch, handles loading and updates profile', async () => {
  const { container, store } = await renderAppWithRouter('/app/system-info', true, {
    id: 'usr-initial-id',
    username: 'initial_user',
    email: 'initial@aquasuite.vn',
    roles: ['SALES_STAFF'],
  })

  let resolveMeFetch: ((res: Response) => void) | null = null
  const meDeferred = new Promise<Response>((resolve) => {
    resolveMeFetch = resolve
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const s = typeof input === 'object' && 'url' in input ? input.url : String(input)
    if (s.includes('/auth/me')) {
      return meDeferred
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }

  try {
    const refreshBtn = container.querySelector(
      'main button:has(svg)',
    ) as HTMLButtonElement
    assert.ok(refreshBtn)
    assert.ok(refreshBtn.innerHTML.includes('Làm mới hồ sơ'))

    // Click refresh button
    await act(async () => {
      refreshBtn.click()
    })

    // Assert pending loading state
    assert.strictEqual(refreshBtn.disabled, true)
    assert.ok(refreshBtn.innerHTML.includes('Đang tải...'))

    // Resolve /me request
    await act(async () => {
      resolveMeFetch!(
        new Response(
          JSON.stringify({
            data: {
              id: 'usr-initial-id',
              username: 'updated_user_profile',
              email: 'updated@aquasuite.vn',
              roles: ['SHOP_OWNER'],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Verify updated profile in store and DOM
    assert.strictEqual(store.getState().auth.user?.username, 'updated_user_profile')
    assert.ok(container.innerHTML.includes('updated_user_profile'))
    assert.strictEqual(refreshBtn.disabled, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SystemInfoPage — Deferred /me response arriving after sessionGeneration change is discarded', async () => {
  const { container, store } = await renderAppWithRouter('/app/system-info', true, {
    id: 'usr-gen-1',
    username: 'user_gen_1',
    email: 'gen1@aquasuite.vn',
    roles: ['SALES_STAFF'],
  })

  let resolveMeFetch: ((res: Response) => void) | null = null
  const meDeferred = new Promise<Response>((resolve) => {
    resolveMeFetch = resolve
  })

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
    const s = typeof input === 'object' && 'url' in input ? input.url : String(input)
    if (s.includes('/auth/me')) {
      return meDeferred
    }
    return new Response(JSON.stringify({}), { status: 404 })
  }

  try {
    const refreshBtn = container.querySelector(
      'main button:has(svg)',
    ) as HTMLButtonElement
    assert.ok(refreshBtn)

    // Trigger refresh in generation 1
    await act(async () => {
      refreshBtn.click()
    })

    // Simulate session generation increment (e.g. account switch or session reset)
    await act(async () => {
      store.dispatch(startSession())
    })

    // Resolve the late /me response from generation 1
    await act(async () => {
      resolveMeFetch!(
        new Response(
          JSON.stringify({
            data: {
              id: 'usr-gen-1',
              username: 'stale_late_profile',
              email: 'late@aquasuite.vn',
              roles: ['CUSTOMER'],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Assert: Late response was dropped by authSlice due to generation mismatch!
    assert.notStrictEqual(store.getState().auth.user?.username, 'stale_late_profile')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('SystemInfoPage — Link from Header and Sidebar navigates to /app/system-info', async () => {
  const { container, router } = await renderAppWithRouter('/app/dashboard', true)

  const headerSystemLink = container.querySelector(
    'header a[href="/app/system-info"]',
  ) as HTMLAnchorElement
  assert.ok(headerSystemLink, 'Header must contain link to /app/system-info')

  await act(async () => {
    headerSystemLink.click()
  })

  assert.strictEqual(router.state.location.pathname, '/app/system-info')
  assert.ok(container.textContent?.includes('Hồ sơ cá nhân'))
})
