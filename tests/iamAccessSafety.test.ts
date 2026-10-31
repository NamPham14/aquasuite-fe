import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
register('./loader.mjs', import.meta.url)

const { store } = await import('../src/app/store.ts')
const { iamAccessApi } = await import('../src/features/iam/api/iamAccessApi.ts')
const { beginIamProbe, finishIamProbe } = await import('../src/features/iam/model/iamAccessSlice.ts')
const { startSession, setCredentials, clearAuthLocal } = await import('../src/features/iam/model/authSlice.ts')
const { tokenStorage } = await import('../src/shared/lib/tokenStorage.ts')
const { baseApi } = await import('../src/shared/api/baseApi.ts')
const unrelatedApi = baseApi.injectEndpoints({ endpoints: (builder) => ({ unrelatedCheck: builder.query<{ marker: string }, void>({ query: () => '/unrelated-check' }) }) })

class MemoryStorage implements Storage {
  data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.get(key) ?? null }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, value) }
}
const storage = new MemoryStorage()
// @ts-expect-error Fake browser storage without a location keeps Node's absolute test URL.
globalThis.window = { sessionStorage: storage }
const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })
const role = { id: 'role-1', code: 'SHOP_OWNER', description: 'Owner', active: true, permissions: [] }
const envelope = (data: unknown) => ({ success: true, code: 'SUCCESS', message: '', data, timestamp: '' })
function login() {
  store.dispatch(startSession())
  const generation = store.getState().auth.sessionGeneration
  store.dispatch(setCredentials({ generation, accessToken: 'test-access', user: { id: 'u', username: 'test', email: 'test@example.invalid', roles: ['SHOP_OWNER'] } }))
  tokenStorage.setRefreshToken('test-refresh')
}

test('IAM AUTH_002 resets IAM cache and discards an older in-flight response', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let release!: (response: Response) => void
  const deferred = new Promise<Response>((resolve) => { release = resolve })
  globalThis.fetch = async (input) => {
    const url = (input as Request).url
    if (url.endsWith('/unrelated-check')) return json(200, { marker: 'feature-cache' })
    if (url.endsWith('/iam/roles/role-1')) return deferred
    if (url.includes('/iam/permissions')) return json(403, { code: 'AUTH_002', message: 'Forbidden' })
    return json(200, envelope([role]))
  }
  try {
    await store.dispatch(unrelatedApi.endpoints.unrelatedCheck.initiate())
    await store.dispatch(iamAccessApi.endpoints.roles.initiate())
    assert.equal(store.getState().iamAccess.status, 'allowed')
    const pending = store.dispatch(iamAccessApi.endpoints.role.initiate('role-1'))
    await store.dispatch(iamAccessApi.endpoints.permissions.initiate({ page: 0, size: 20, sortBy: 'code', direction: 'asc' }))
    assert.equal(store.getState().iamAccess.status, 'denied')
    assert.equal(store.getState().auth.isAuthenticated, true)
    assert.equal(unrelatedApi.endpoints.unrelatedCheck.select()(store.getState()).data?.marker, 'feature-cache')
    release(json(200, envelope(role)))
    await pending
    assert.equal(iamAccessApi.endpoints.roles.select()(store.getState()).data, undefined)
    assert.equal(iamAccessApi.endpoints.role.select('role-1')(store.getState()).data, undefined)
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('IAM denied gate blocks normal queries and only explicit probe can restore access', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return calls === 1 ? json(403, { code: 'AUTH_002' }) : json(200, envelope([role])) }
  try {
    await store.dispatch(iamAccessApi.endpoints.roles.initiate())
    assert.equal(store.getState().iamAccess.status, 'denied')
    await store.dispatch(iamAccessApi.endpoints.roles.initiate(undefined, { forceRefetch: true }))
    assert.equal(calls, 1)
    store.dispatch(beginIamProbe())
    const epoch = store.getState().iamAccess.epoch
    const result = await store.dispatch(iamAccessApi.endpoints.probe.initiate(undefined, { forceRefetch: true, subscribe: false })).unwrap()
    assert.ok(result.success && Array.isArray(result.data))
    store.dispatch(finishIamProbe({ epoch, allowed: true }))
    store.dispatch(iamAccessApi.util.resetApiState())
    assert.equal(store.getState().iamAccess.status, 'allowed')
    assert.equal(calls, 2)
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('AUTH_008 after refresh and retry clears the current session and token', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let rolesCalls = 0
  globalThis.fetch = async (input) => {
    if ((input as Request).url.endsWith('/auth/refresh')) return json(200, envelope({ access_token: 'fresh-access', refresh_token: 'fresh-refresh' }))
    rolesCalls++
    return rolesCalls === 1 ? json(401, { code: 'AUTH_001' }) : json(403, { code: 'AUTH_008' })
  }
  try {
    await store.dispatch(iamAccessApi.endpoints.roles.initiate(undefined, { forceRefetch: true }))
    assert.equal(rolesCalls, 2)
    assert.equal(store.getState().auth.isAuthenticated, false)
    assert.equal(tokenStorage.hasRefreshToken(), false)
    assert.equal(store.getState().iamAccess.status, 'unknown')
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('An old IAM AUTH_008 after access denial does not clear the current session', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let release!: (response: Response) => void
  const delayed = new Promise<Response>((resolve) => { release = resolve })
  globalThis.fetch = async (input) => (input as Request).url.endsWith('/iam/roles/role-1') ? delayed : json(403, { code: 'AUTH_002' })
  try {
    const old = store.dispatch(iamAccessApi.endpoints.role.initiate('role-1'))
    await store.dispatch(iamAccessApi.endpoints.roles.initiate(undefined, { forceRefetch: true }))
    assert.equal(store.getState().iamAccess.status, 'denied')
    release(json(403, { code: 'AUTH_008' }))
    await old
    assert.equal(store.getState().auth.isAuthenticated, true)
    assert.equal(tokenStorage.hasRefreshToken(), true)
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('AUTH_002 on retry denies IAM without logging out', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (input) => {
    if ((input as Request).url.endsWith('/auth/refresh')) return json(200, envelope({ access_token: 'fresh-access', refresh_token: 'fresh-refresh' }))
    calls++
    return calls === 1 ? json(401, { code: 'AUTH_001' }) : json(403, { code: 'AUTH_002' })
  }
  try {
    await store.dispatch(iamAccessApi.endpoints.roles.initiate(undefined, { forceRefetch: true }))
    assert.equal(calls, 2)
    assert.equal(store.getState().iamAccess.status, 'denied')
    assert.equal(store.getState().auth.isAuthenticated, true)
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('An old probe cannot restore access after a new session starts', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let release!: (response: Response) => void
  const delayed = new Promise<Response>((resolve) => { release = resolve })
  let calls = 0
  globalThis.fetch = async () => { calls++; return calls === 1 ? json(403, { code: 'AUTH_002' }) : delayed }
  try {
    await store.dispatch(iamAccessApi.endpoints.roles.initiate(undefined, { forceRefetch: true }))
    store.dispatch(beginIamProbe())
    const epoch = store.getState().iamAccess.epoch
    const probe = store.dispatch(iamAccessApi.endpoints.probe.initiate(undefined, { forceRefetch: true, subscribe: false }))
    login()
    release(json(200, envelope([role])))
    await probe
    store.dispatch(finishIamProbe({ epoch, allowed: true }))
    assert.equal(store.getState().iamAccess.status, 'unknown')
    assert.equal(iamAccessApi.endpoints.probe.select()(store.getState()).data, undefined)
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('Stale AUTH_008 from retry cannot clear a newer session', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  let release!: (response: Response) => void
  let signalRetry!: () => void
  const retryStarted = new Promise<void>((resolve) => { signalRetry = resolve })
  const retry = new Promise<Response>((resolve) => { release = resolve })
  let calls = 0
  globalThis.fetch = async (input) => {
    if ((input as Request).url.endsWith('/auth/refresh')) return json(200, envelope({ access_token: 'fresh-access', refresh_token: 'fresh-refresh' }))
    calls++
    if (calls === 1) return json(401, { code: 'AUTH_001' })
    signalRetry()
    return retry
  }
  try {
    const request = store.dispatch(iamAccessApi.endpoints.roles.initiate(undefined, { forceRefetch: true }))
    await retryStarted
    login()
    release(json(403, { code: 'AUTH_008' }))
    await request
    assert.equal(store.getState().auth.isAuthenticated, true)
    assert.equal(store.getState().auth.accessToken, 'test-access')
    assert.equal(tokenStorage.hasRefreshToken(), true)
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})

test('IAM permission and assignment requests follow the BE method and body contract', async () => {
  storage.clear(); login()
  const originalFetch = globalThis.fetch
  const requests: { url: string; method: string; body: unknown }[] = []
  globalThis.fetch = async (input) => {
    const req = input as Request
    const body = ['POST', 'PATCH'].includes(req.method) ? await req.clone().json() : undefined
    requests.push({ url: req.url, method: req.method, body })
    if (req.method === 'DELETE' && req.url.endsWith('/iam/permissions/p1')) return json(200, { success: true, code: 'SUCCESS' })
    return json(200, envelope({ id: 'p1', code: 'ORDER_READ', description: null }))
  }
  try {
    await store.dispatch(iamAccessApi.endpoints.permissions.initiate({ page: 2, size: 20, search: 'ORDER', sortBy: 'description', direction: 'desc' }))
    await store.dispatch(iamAccessApi.endpoints.createPermission.initiate({ code: 'ORDER_READ', description: null }))
    await store.dispatch(iamAccessApi.endpoints.updatePermission.initiate({ id: 'p1', description: null }))
    await store.dispatch(iamAccessApi.endpoints.changeAssignment.initiate({ roleId: 'r1', permissionId: 'p1', assign: true }))
    await store.dispatch(iamAccessApi.endpoints.changeAssignment.initiate({ roleId: 'r1', permissionId: 'p1', assign: false }))
    await store.dispatch(iamAccessApi.endpoints.deletePermission.initiate('p1'))
    const list = new URL(requests[0].url)
    assert.equal(list.searchParams.get('page'), '2')
    assert.equal(list.searchParams.get('search'), 'ORDER')
    assert.equal(list.searchParams.get('sortBy'), 'description')
    assert.deepEqual(requests.find((r) => r.method === 'POST')?.body, { code: 'ORDER_READ', description: null })
    assert.deepEqual(requests.find((r) => r.method === 'PATCH')?.body, { description: null })
    assert.ok(requests.some((r) => r.method === 'PUT' && r.url.endsWith('/iam/roles/r1/permissions/p1')))
    assert.ok(requests.some((r) => r.method === 'DELETE' && r.url.endsWith('/iam/roles/r1/permissions/p1')))
    assert.ok(requests.some((r) => r.method === 'DELETE' && r.url.endsWith('/iam/permissions/p1')))
  } finally { globalThis.fetch = originalFetch; store.dispatch(clearAuthLocal()) }
})
