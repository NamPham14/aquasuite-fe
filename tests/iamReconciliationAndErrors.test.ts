import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { iamAccessApi } from '../src/features/iam/api/iamAccessApi.ts'
import { iamAccessReducer, requirePermissionReconciliation, clearPermissionReconciliation } from '../src/features/iam/model/iamAccessSlice.ts'
import {
  authReducer,
  setCredentials,
  setBootstrapping,
  startSession,
} from '../src/features/iam/model/authSlice.ts'

register('./loader.mjs', import.meta.url)

const React = (await import('react')).default
const { act } = await import('react')
const ReactDOMClient = await import('react-dom/client')
const { RouterProvider } = await import('react-router-dom')
const { Provider } = await import('react-redux')
const { createAppMemoryRouter } = await import('../src/app/router.tsx')

class MockSessionStorage implements Storage {
  public store = new Map<string, string>()
  get length(): number { return this.store.size }
  clear(): void { this.store.clear() }
  getItem(key: string): string | null { return this.store.get(key) ?? null }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null }
  removeItem(key: string): void { this.store.delete(key) }
  setItem(key: string, value: string): void { this.store.set(key, String(value)) }
}

function setupDOMEnvironment() {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost/' },
  )

  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  globalThis.HTMLInputElement = dom.window.HTMLInputElement
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement
  globalThis.HTMLSelectElement = dom.window.HTMLSelectElement
  globalThis.HTMLButtonElement = dom.window.HTMLButtonElement
  globalThis.HTMLDialogElement = dom.window.HTMLDialogElement
  globalThis.KeyboardEvent = dom.window.KeyboardEvent
  globalThis.MouseEvent = dom.window.MouseEvent
  globalThis.Event = dom.window.Event

  const storage = new MockSessionStorage()
  Object.defineProperty(dom.window, 'sessionStorage', {
    value: storage,
    configurable: true,
    writable: true,
  })

  // @ts-expect-error Mocking matchMedia
  globalThis.window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  })

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

  return { dom, rootElement: dom.window.document.getElementById('root')! }
}

function createTestStore() {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [iamAccessApi.reducerPath]: iamAccessApi.reducer,
      iamAccess: iamAccessReducer,
      auth: authReducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware, iamAccessApi.middleware),
  })

  store.dispatch(startSession())
  store.dispatch(
    setCredentials({
      accessToken: 'valid-test-access-token',
      user: {
        id: 'usr-uuid-12345',
        username: 'shop_owner_test',
        email: 'owner@aquasuite.vn',
        roles: ['SHOP_OWNER'],
      },
      generation: 1,
    }),
  )
  store.dispatch(setBootstrapping(false))
  return store
}

async function renderAppWithRouter(initialUrl: string) {
  const { rootElement } = setupDOMEnvironment()
  const store = createTestStore()
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

test('Role uncertain mutation locks reconciliation across navigation: unrelated reload stays locked, error reload stays locked, targeted reload unlocks', async () => {
  const originalFetch = globalThis.fetch
  const role = { id: 'r1', code: 'SHOP_OWNER', description: 'Chủ', active: true, permissions: [] }
  let roleReloadFails = false
  let permissionReloadFails = false

  globalThis.fetch = async (input) => {
    const req = input as Request
    if (req.method === 'PUT' || (req.method === 'DELETE' && req.url.includes('/iam/roles/'))) {
      return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (req.url.includes('/iam/permissions')) {
      if (permissionReloadFails) {
        return new Response(JSON.stringify({ message: 'Permissions service error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            items: [{ id: 'p1', code: 'ORDER_READ', description: 'Xem đơn' }],
            page: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    if (req.url.includes('/iam/roles')) {
      if (roleReloadFails) {
        return new Response(JSON.stringify({ message: 'Roles service error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      const data = req.url.endsWith('/r1') ? role : [role]
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const { container, router, store } = await renderAppWithRouter('/app/roles')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    // Bước 1: Role mutation gặp lỗi 500
    const view = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xem quyền')!
    await act(async () => { view.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    const assign = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Gán quyền')!
    await act(async () => { assign.click() })
    const confirm = Array.from(container.querySelectorAll('dialog button')).find((button) => button.textContent?.includes('Xác nhận gán quyền'))!
    await act(async () => { confirm.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })

    // Kiểm tra state role reconciliation
    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'role', roleId: 'r1' })
    assert.ok(container.textContent?.includes('Dữ liệu vai trò cần được đối soát sau thao tác chưa xác định kết quả.'))

    // Bước 2: Điều hướng sang trang Quyền (/app/permissions)
    await act(async () => { await router.navigate('/app/permissions'); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Quản lý Quyền'))
    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.ok(container.textContent?.includes('Dữ liệu vai trò đang chờ đối soát. Thao tác quyền bị tạm khóa cho tới khi dữ liệu liên quan được đồng bộ.'))

    const addPermission = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Thêm quyền'))!
    assert.equal(addPermission.disabled, true)
    assert.equal(container.querySelector<HTMLInputElement>('#permission-search')?.disabled, true)
    assert.equal(container.querySelector<HTMLSelectElement>('#permission-sort')?.disabled, true)
    assert.equal(container.querySelector<HTMLSelectElement>('#permission-direction')?.disabled, true)

    // Bước 3: Tải lại dữ liệu không liên quan (Permissions reload) -> KHÔNG gỡ khóa
    const reloadBtnPerm = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Tải lại dữ liệu')!
    assert.ok(reloadBtnPerm)
    await act(async () => { reloadBtnPerm.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, true, 'Reloading unrelated permissions MUST NOT unlock role reconciliation')
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'role', roleId: 'r1' })
    assert.equal(addPermission.disabled, true)

    // Bước 4: Quay lại trang Vai trò (/app/roles)
    await act(async () => { await router.navigate('/app/roles'); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Quản lý Vai trò'))
    assert.equal(store.getState().iamAccess.needsReconciliation, true)

    const reloadBtnRole = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Tải lại dữ liệu')!
    assert.ok(reloadBtnRole)

    // Bước 5: Tải lại vai trò nhưng server lỗi 500 -> VẪN GIỮ KHÓA
    roleReloadFails = true
    await act(async () => { reloadBtnRole.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, true, 'Failed reload MUST NOT unlock reconciliation')
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'role', roleId: 'r1' })

    // Bước 6: Tải lại vai trò khi server trả 200 thành công -> MỞ KHÓA
    roleReloadFails = false
    await act(async () => { reloadBtnRole.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, false, 'Successful affected reload MUST unlock reconciliation')
    assert.equal(store.getState().iamAccess.reconciliationTarget, null)

    // Kiểm tra nút thao tác trên RolesPage đã mở khóa
    const viewUnlocked = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xem quyền')!
    assert.equal(viewUnlocked.disabled, false)

    // Bước 7: Quay lại trang Quyền -> cũng đã mở khóa
    await act(async () => { await router.navigate('/app/permissions'); await new Promise((resolve) => setTimeout(resolve, 50)) })
    const addPermissionUnlocked = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Thêm quyền'))!
    assert.equal(addPermissionUnlocked.disabled, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Permission uncertain mutation locks reconciliation across navigation: unrelated reload stays locked, error reload stays locked, targeted reload unlocks', async () => {
  const originalFetch = globalThis.fetch
  const role = { id: 'r1', code: 'SHOP_OWNER', description: 'Chủ', active: true, permissions: [] }
  let roleReloadFails = false
  let permissionReloadFails = false
  let targetedPermissionReads = 0

  globalThis.fetch = async (input) => {
    const req = input as Request
    if (req.method === 'DELETE' && req.url.includes('/iam/permissions/')) {
      return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (req.method === 'GET' && req.url.endsWith('/iam/permissions/p1')) {
      targetedPermissionReads += 1
      if (permissionReloadFails) {
        return new Response(JSON.stringify({ message: 'Permission detail error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(
        JSON.stringify({ success: false, code: 'IAM_004', message: 'Permission not found' }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      )
    }
    if (req.url.includes('/iam/permissions')) {
      if (permissionReloadFails) {
        return new Response(JSON.stringify({ message: 'Permissions reload error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      const search = new URL(req.url).searchParams.get('search')
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            items: search ? [] : [{ id: 'p1', code: 'ORDER_READ', description: 'Xem đơn' }],
            page: 0,
            size: 20,
            totalElements: search ? 0 : 1,
            totalPages: search ? 0 : 1,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    }
    if (req.url.includes('/iam/roles')) {
      if (roleReloadFails) {
        return new Response(JSON.stringify({ message: 'Roles reload error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      const data = req.url.endsWith('/r1') ? role : [role]
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const { container, router, store } = await renderAppWithRouter('/app/permissions')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    // Bước 1: Xóa quyền gặp lỗi 500
    const deleteBtn = Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.includes('Xóa ORDER_READ'))!
    await act(async () => { deleteBtn.click() })
    const confirmForm = container.querySelector('dialog form')!
    await act(async () => {
      confirmForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Kiểm tra state permission reconciliation
    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'permission', permissionId: 'p1' })
    assert.ok(container.textContent?.includes('Dữ liệu quyền cần được đối soát sau thao tác chưa xác định kết quả.'))

    // Bước 2: Điều hướng sang trang Vai trò (/app/roles)
    await act(async () => { await router.navigate('/app/roles'); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Quản lý Vai trò'))
    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.ok(container.textContent?.includes('Dữ liệu quyền đang chờ đối soát. Thao tác vai trò bị tạm khóa cho tới khi dữ liệu liên quan được đồng bộ.'))

    // Bước 3: Tải lại dữ liệu không liên quan (Roles reload) -> KHÔNG gỡ khóa
    const reloadBtnRole = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Tải lại dữ liệu')!
    assert.ok(reloadBtnRole)
    await act(async () => { reloadBtnRole.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, true, 'Reloading unrelated roles MUST NOT unlock permission reconciliation')
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'permission', permissionId: 'p1' })

    // Bước 4: Quay lại trang Quyền (/app/permissions)
    await act(async () => { await router.navigate('/app/permissions'); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Quản lý Quyền'))
    assert.equal(store.getState().iamAccess.needsReconciliation, true)

    const searchInput = container.querySelector<HTMLInputElement>('#permission-search')!
    assert.equal(searchInput.disabled, true, 'The list query remains fixed for the full reconciliation attempt')

    const reloadBtnPerm = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Tải lại dữ liệu')!
    assert.ok(reloadBtnPerm)

    // Bước 5: Tải lại quyền nhưng server lỗi 500 -> VẪN GIỮ KHÓA
    permissionReloadFails = true
    await act(async () => { reloadBtnPerm.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, true, 'Failed reload MUST NOT unlock reconciliation')
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'permission', permissionId: 'p1' })

    // Bước 6: Tải lại quyền khi server trả 200 thành công -> MỞ KHÓA
    permissionReloadFails = false
    await act(async () => { reloadBtnPerm.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, false, 'Successful affected reload MUST unlock reconciliation')
    assert.equal(store.getState().iamAccess.reconciliationTarget, null)
    assert.ok(targetedPermissionReads >= 2, 'The affected permission is fetched by ID, including the confirmed 404 after deletion')

    const addPermissionUnlocked = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Thêm quyền'))!
    assert.equal(addPermissionUnlocked.disabled, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Uncertain permission creation checks every targeted search page before unlocking', async () => {
  const originalFetch = globalThis.fetch
  async function runCase(scenario: 'later-page-match' | 'absent' | 'middle-page-error') {
    const targetedPages: number[] = []
    globalThis.fetch = async (input) => {
      const req = input as Request
      if (req.method === 'POST' && req.url.endsWith('/iam/permissions')) {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (req.url.includes('/iam/permissions')) {
        const url = new URL(req.url)
        const search = url.searchParams.get('search')
        const page = Number(url.searchParams.get('page') ?? 0)
        const isTargetSearch = search === 'NEW_PERMISSION'
        if (isTargetSearch) targetedPages.push(page)
        if (isTargetSearch && scenario === 'middle-page-error' && page === 1) {
          return new Response(JSON.stringify({ message: 'Temporary page error' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
          })
        }
        const items = isTargetSearch && scenario === 'later-page-match' && page === 1
          ? [{ id: 'p-new', code: 'NEW_PERMISSION', description: 'Created before timeout' }]
          : isTargetSearch && scenario === 'later-page-match' && page === 0
            ? [{ id: 'p-other', code: 'OTHER', description: 'NEW_PERMISSION appears in description' }]
            : []
        const totalPages = isTargetSearch ? (scenario === 'middle-page-error' ? 3 : 2) : 0
        return new Response(JSON.stringify({
          success: true,
          data: {
            items,
            page,
            size: Number(url.searchParams.get('size') ?? 20),
            totalElements: items.length,
            totalPages,
          },
        }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (req.url.includes('/iam/roles')) {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const { container, store, root } = await renderAppWithRouter('/app/permissions')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Thêm quyền'))!
    await act(async () => { addButton.click() })
    const codeInput = container.querySelector<HTMLInputElement>('#iam-permission-code')!
    const propsKey = Object.keys(codeInput).find((key) => key.startsWith('__reactProps$'))!
    const props = (codeInput as unknown as Record<string, { onChange?: (event: { target: { value: string } }) => void }>)[propsKey]
    await act(async () => {
      props.onChange?.({ target: { value: 'NEW_PERMISSION' } })
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    const form = container.querySelector('dialog form')!
    await act(async () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, {
      type: 'permission',
      permissionCode: 'NEW_PERMISSION',
    })

    const reloadButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Tải lại dữ liệu')!
    await act(async () => { reloadButton.click(); await new Promise((resolve) => setTimeout(resolve, 75)) })

    assert.deepEqual(targetedPages, [0, 1])
    if (scenario === 'middle-page-error') {
      assert.equal(store.getState().iamAccess.needsReconciliation, true, 'A failed page in the target search must keep the lock')
      assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'permission', permissionCode: 'NEW_PERMISSION' })
    } else {
      assert.equal(store.getState().iamAccess.needsReconciliation, false)
      assert.equal(store.getState().iamAccess.reconciliationTarget, null)
    }
    await act(async () => { root.unmount() })
  }
  try {
    await runCase('later-page-match')
    await runCase('absent')
    await runCase('middle-page-error')
  } finally { globalThis.fetch = originalFetch }
})

test('Permission reconciliation drops cached and pending role data before unlocking and refreshes an updated permission by UUID', async () => {
  const originalFetch = globalThis.fetch
  const requestLog: string[] = []
  let roleDetailReads = 0
  let permissionDetailReads = 0
  let holdNextRoleDetail = false
  let signalPendingRoleRequest!: () => void
  const pendingRoleStarted = new Promise<void>((resolve) => {
    signalPendingRoleRequest = resolve
  })
  let resolvePendingRoleResponse!: (response: Response) => void
  const pendingRoleResponse = new Promise<Response>((resolve) => {
    resolvePendingRoleResponse = resolve
  })
  let mutationFailed = false
  const oldRole = {
    id: 'r1', code: 'SHOP_OWNER', description: 'Chủ', active: true,
    permissions: [{ id: 'p1', code: 'ORDER_READ', description: 'Mô tả cũ' }],
  }
  const freshRole = {
    ...oldRole,
    permissions: [{ id: 'p1', code: 'ORDER_READ', description: 'Mô tả mới' }],
  }
  globalThis.fetch = async (input) => {
    const req = input as Request
    const url = new URL(req.url)
    requestLog.push(`${req.method} ${url.pathname}${url.search}`)
    if (req.method === 'PATCH' && url.pathname.endsWith('/iam/permissions/p1')) {
      mutationFailed = true
      return new Response(JSON.stringify({ message: 'Mutation response lost' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (req.method === 'GET' && url.pathname.endsWith('/iam/permissions/p1')) {
      permissionDetailReads += 1
      return new Response(JSON.stringify({
        success: true,
        data: { id: 'p1', code: 'ORDER_READ', description: 'Mô tả mới' },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (req.method === 'GET' && url.pathname.endsWith('/iam/roles/r1')) {
      roleDetailReads += 1
      if (holdNextRoleDetail) {
        holdNextRoleDetail = false
        signalPendingRoleRequest()
        return pendingRoleResponse
      }
      const role = roleDetailReads === 1 ? oldRole : freshRole
      return new Response(JSON.stringify({ success: true, data: role }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (req.method === 'GET' && url.pathname.endsWith('/iam/roles')) {
      return new Response(JSON.stringify({ success: true, data: [oldRole] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    if (url.pathname.endsWith('/iam/permissions')) {
      const data = {
        items: [{ id: 'p1', code: 'ORDER_READ', description: 'Mô tả mới' }],
        page: Number(url.searchParams.get('page') ?? 0),
        size: Number(url.searchParams.get('size') ?? 20),
        totalElements: 1,
        totalPages: 1,
      }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ success: true, data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const { container, router, store } = await renderAppWithRouter('/app/permissions')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    const initialRoleRequest = store.dispatch(
      iamAccessApi.endpoints.role.initiate('r1', { subscribe: false }),
    )
    await act(async () => { await initialRoleRequest.unwrap() })
    initialRoleRequest.unsubscribe()

    const editButton = Array.from(container.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Sửa ORDER_READ')!
    await act(async () => { editButton.click() })
    const description = container.querySelector<HTMLTextAreaElement>('#iam-permission-description')!
    const propsKey = Object.keys(description).find((key) => key.startsWith('__reactProps$'))!
    const props = (description as unknown as Record<string, { onChange?: (event: { target: { value: string } }) => void }>)[propsKey]
    await act(async () => { props.onChange?.({ target: { value: 'Mô tả mới' } }) })
    const editForm = container.querySelector('dialog form')!
    await act(async () => {
      editForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    assert.equal(mutationFailed, true)
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'permission', permissionId: 'p1' })

    holdNextRoleDetail = true
    const pendingRequest = store.dispatch(iamAccessApi.endpoints.role.initiate('r1', { forceRefetch: true, subscribe: false }))
    await pendingRoleStarted

    const reloadButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Tải lại dữ liệu')!
    await act(async () => { reloadButton.click(); await new Promise((resolve) => setTimeout(resolve, 75)) })

    assert.equal(store.getState().iamAccess.needsReconciliation, true, 'The lock remains while an older IAM request is pending')
    resolvePendingRoleResponse(new Response(JSON.stringify({ success: true, data: oldRole }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    await act(async () => {
      await pendingRequest.unwrap()
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    pendingRequest.unsubscribe()

    assert.equal(store.getState().iamAccess.needsReconciliation, false)
    assert.equal(store.getState().iamAccess.reconciliationTarget, null)
    assert.ok(permissionDetailReads >= 1, 'Update reconciliation must refetch the permission by UUID')
    const roleQueries = Object.values(store.getState().iamAccessApi.queries).filter(
      (query) => query?.endpointName === 'role' || query?.endpointName === 'roles',
    )
    assert.equal(roleQueries.length, 0, 'Role caches are cleared before the reconciliation lock is released')

    await act(async () => { await router.navigate('/app/roles'); await new Promise((resolve) => setTimeout(resolve, 200)) })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    const freshViewRole = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xem quyền')!
    assert.ok(freshViewRole, `Expected fresh role rows after cache reset. UI: ${container.textContent}; requests=${requestLog.join(' | ')}; queries=${JSON.stringify(store.getState().iamAccessApi.queries)}`)
    await act(async () => { freshViewRole.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Mô tả mới'), 'The role detail is fetched again from the server after cache reset')
  } finally {
    resolvePendingRoleResponse(new Response(JSON.stringify({ success: true, data: oldRole }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    globalThis.fetch = originalFetch
  }
})

test('Pending role mutation stays globally locked across navigation and records late uncertainty', async () => {
  const originalFetch = globalThis.fetch
  const role = { id: 'r1', code: 'SHOP_OWNER', description: 'Owner', active: true, permissions: [] }
  let resolveMutation!: (response: Response) => void
  let signalMutation!: () => void
  const mutationStarted = new Promise<void>((resolve) => { signalMutation = resolve })
  globalThis.fetch = async (input) => {
    const req = input as Request
    if (req.url.endsWith('/iam/roles/r1/permissions/p1') && req.method === 'PUT') {
      signalMutation()
      return await new Promise<Response>((resolve) => { resolveMutation = resolve })
    }
    if (req.url.includes('/iam/permissions')) {
      return new Response(JSON.stringify({ success: true, data: { items: [{ id: 'p1', code: 'ORDER_READ', description: 'Read orders' }], page: 0, size: 20, totalElements: 1, totalPages: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const data = req.url.endsWith('/r1') ? role : [role]
    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const { container, router, store } = await renderAppWithRouter('/app/roles')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    const view = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xem quyền')!
    await act(async () => { view.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    const assign = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Gán quyền')!
    await act(async () => { assign.click() })
    const confirm = Array.from(container.querySelectorAll('dialog button')).find((button) => button.textContent?.includes('Xác nhận gán quyền'))!
    await act(async () => { confirm.click() })
    await mutationStarted
    assert.equal(store.getState().iamAccess.pendingMutations, 1)

    await act(async () => { await router.navigate('/app/permissions'); await new Promise((resolve) => setTimeout(resolve, 50)) })
    const add = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Thêm quyền'))!
    assert.equal(add.disabled, true, 'Other IAM writes stay locked while the role mutation is pending')
    assert.equal(container.querySelector<HTMLInputElement>('#permission-search')?.disabled, true)

    resolveMutation(new Response(JSON.stringify({ message: 'server failure' }), { status: 500, headers: { 'content-type': 'application/json' } }))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 100)) })
    assert.equal(store.getState().iamAccess.pendingMutations, 0)
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'role', roleId: 'r1' })
    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.equal(add.disabled, true, 'Late uncertain result keeps the cross-page lock active')
  } finally {
    resolveMutation(new Response(JSON.stringify({ message: 'server failure' }), { status: 500, headers: { 'content-type': 'application/json' } }))
    globalThis.fetch = originalFetch
  }
})

test('Empty or null 2xx mutation response enters uncertain reconciliation flow without TypeError', async () => {
  const originalFetch = globalThis.fetch
  const role = { id: 'r1', code: 'SHOP_OWNER', description: 'Chủ', active: true, permissions: [] }
  globalThis.fetch = async (input) => {
    const req = input as Request
    if (req.method === 'PUT' || req.method === 'DELETE') {
      return new Response(JSON.stringify(null), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (req.url.includes('/iam/permissions')) {
      return new Response(JSON.stringify({ success: true, data: { items: [{ id: 'p1', code: 'ORDER_READ', description: 'Xem' }], page: 0, size: 20, totalElements: 1, totalPages: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const data = req.url.endsWith('/r1') ? role : [role]
    return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const { container, store } = await renderAppWithRouter('/app/roles')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    const view = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Xem quyền')!
    await act(async () => { view.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    const assign = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Gán quyền')!
    await act(async () => { assign.click() })
    const confirm = Array.from(container.querySelectorAll('dialog button')).find((button) => button.textContent?.includes('Xác nhận gán quyền'))!

    await act(async () => { confirm.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.needsReconciliation, true)
    assert.deepEqual(store.getState().iamAccess.reconciliationTarget, { type: 'role', roleId: 'r1' })
    assert.ok(container.textContent?.includes('Dữ liệu vai trò cần được đối soát'))
  } finally { globalThis.fetch = originalFetch }
})

test('IAM response started before reconciliation epoch transition is discarded when it arrives late', async () => {
  const originalFetch = globalThis.fetch
  let resolveResponse!: (response: Response) => void
  let signalStarted!: () => void
  const started = new Promise<void>((resolve) => { signalStarted = resolve })
  globalThis.fetch = async () => {
    signalStarted()
    return await new Promise<Response>((resolve) => { resolveResponse = resolve })
  }
  try {
    const store = createTestStore()
    store.dispatch(requirePermissionReconciliation({ permissionId: 'p-late' }))
    const request = store.dispatch(iamAccessApi.endpoints.permission.initiate('p-late', { forceRefetch: true, subscribe: false }))
    await started
    const previousEpoch = store.getState().iamAccess.epoch
    store.dispatch(iamAccessApi.util.resetApiState())
    store.dispatch(clearPermissionReconciliation({ permissionId: 'p-late' }))
    assert.equal(store.getState().iamAccess.epoch, previousEpoch + 1)

    resolveResponse(new Response(JSON.stringify({ success: true, data: { id: 'p-late', code: 'LATE_READ', description: 'stale' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    await request.unwrap()
    request.unsubscribe()
    const cached = Object.values(store.getState().iamAccessApi.queries).find((query) => query?.endpointName === 'permission')
    assert.equal(cached?.data, undefined, 'The pre-epoch response must not repopulate IAM cache')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('IAM Access Gate probe fails on 403 or network error, maintaining denied status and displaying error', async () => {
  const originalFetch = globalThis.fetch
  let probeAttempts = 0
  globalThis.fetch = async (input) => {
    const req = input as Request
    if (req.url.endsWith('/iam/roles') && req.method === 'GET') {
      probeAttempts++
      if (probeAttempts === 1) {
        return new Response(JSON.stringify({ success: false, code: 'AUTH_002', message: 'Không có quyền' }), { status: 403, headers: { 'content-type': 'application/json' } })
      }
      if (probeAttempts === 2) {
        return new Response(JSON.stringify({ success: false, code: 'AUTH_002', message: 'Forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } })
      }
      if (probeAttempts === 3) {
        throw new TypeError('Failed to fetch')
      }
    }
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const { container, store } = await renderAppWithRouter('/app/roles')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    assert.equal(store.getState().iamAccess.status, 'denied')
    assert.ok(container.textContent?.includes('Không có quyền truy cập'))

    const probeBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Kiểm tra lại quyền')!
    assert.ok(probeBtn)

    await act(async () => { probeBtn.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.status, 'denied')
    assert.ok(container.textContent?.includes('Chưa thể xác nhận quyền truy cập'))

    await act(async () => { probeBtn.click(); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.equal(store.getState().iamAccess.status, 'denied')
    assert.ok(container.textContent?.includes('Chưa thể xác nhận quyền truy cập'))
  } finally { globalThis.fetch = originalFetch }
})

test('Permission creation and deletion conflict error mappings (IAM_005 and IAM_006)', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    const req = input as Request
    if (req.method === 'POST') {
      return new Response(JSON.stringify({ success: false, code: 'IAM_005', message: 'Mã quyền đã tồn tại.' }), { status: 409, headers: { 'content-type': 'application/json' } })
    }
    if (req.method === 'DELETE') {
      return new Response(JSON.stringify({ success: false, code: 'IAM_006', message: 'Không thể xóa quyền đang được gán cho vai trò.' }), { status: 409, headers: { 'content-type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true, data: { items: [{ id: 'p1', code: 'ORDER_READ', description: 'Xem đơn' }], page: 0, size: 20, totalElements: 1, totalPages: 1 } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  try {
    const { container } = await renderAppWithRouter('/app/permissions')
    window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
    window.HTMLDialogElement.prototype.close = function () { this.open = false }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })

    const addBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Thêm quyền'))!
    await act(async () => { addBtn.click() })
    const codeInput = container.querySelector<HTMLInputElement>('#iam-permission-code')!
    await act(async () => {
      const propsKey = Object.keys(codeInput).find((k) => k.startsWith('__reactProps$'))!
      const props = (codeInput as unknown as Record<string, { onChange?: (e: { target: { value: string } }) => void }>)[propsKey]
      props.onChange?.({ target: { value: 'ORDER_READ' } })
    })
    const form = container.querySelector('dialog form')!
    await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Mã quyền đã tồn tại.'))

    const closeBtn = Array.from(container.querySelectorAll('dialog button')).find((b) => b.textContent === 'Hủy')!
    await act(async () => { closeBtn.click() })

    const deleteBtn = Array.from(container.querySelectorAll('button')).find((b) => b.getAttribute('aria-label')?.includes('Xóa ORDER_READ'))!
    await act(async () => { deleteBtn.click() })
    const deleteForm = container.querySelector('dialog form')!
    await act(async () => { deleteForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(container.textContent?.includes('Không thể xóa quyền đang được gán cho vai trò.'))
  } finally { globalThis.fetch = originalFetch }
})
