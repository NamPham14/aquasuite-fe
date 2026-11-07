import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { userAccountApi } from '../src/features/iam/api/userAccountApi.ts'

const originalFetch = globalThis.fetch

afterEach(() => { globalThis.fetch = originalFetch })

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

test('UC-05 account API uses the confirmed IAM paths, multi-role payload and status command', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []
  const account = {
    id: 'user-1', username: 'sales_a', email: 'sales@example.com', phone: '0901234567', avatarUrl: null,
    roles: [{ id: 'role-sales', code: 'SALES_STAFF', description: 'Bán hàng' }], status: 'ACTIVE',
    provider: 'LOCAL', isVerified: false, createdAt: '2026-11-03T00:00:00Z', currentUser: false,
  }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method, body: ['POST', 'PATCH'].includes(request.method) ? await request.clone().json() : undefined })
    const url = new URL(request.url)
    let data: unknown = account
    if (url.pathname.endsWith('/iam/users/stats')) data = { total: 4, active: 2, inactive: 1, locked: 1 }
    else if (url.pathname.endsWith('/iam/roles')) data = [{ id: 'role-sales', code: 'SALES_STAFF', description: 'Bán hàng' }]
    else if (url.pathname.endsWith('/iam/users') && request.method === 'GET') data = { content: [account], page: 0, size: 10, totalElements: 1, totalPages: 1 }
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data, timestamp: new Date().toISOString() }), { status: request.method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const stats = await store.dispatch(userAccountApi.endpoints.getUserAccountStats.initiate()).unwrap()
  const roles = await store.dispatch(userAccountApi.endpoints.getAssignableRoles.initiate()).unwrap()
  const page = await store.dispatch(userAccountApi.endpoints.getUserAccounts.initiate({ keyword: 'sales', roleId: 'role-sales', status: 'ACTIVE', page: 0, size: 10 })).unwrap()
  await store.dispatch(userAccountApi.endpoints.createUserAccount.initiate({ username: 'sales_b', email: 'sales-b@example.com', phone: '0901234568', roleIds: ['role-sales', 'role-accountant'], autoGenerateTemporaryPassword: true })).unwrap()
  await store.dispatch(userAccountApi.endpoints.changeUserAccountStatus.initiate({ id: 'user-1', data: { targetStatus: 'LOCKED', reason: 'Vi phạm quy định' } })).unwrap()

  assert.equal(stats.locked, 1)
  assert.equal(roles[0]?.code, 'SALES_STAFF')
  assert.equal(page.content[0]?.username, 'sales_a')
  assert.ok(requests.some((request) => /\/api\/v1\/iam\/users\/stats$/.test(request.url)))
  assert.ok(requests.some((request) => /\/api\/v1\/iam\/roles\?assignable=true$/.test(request.url)))
  assert.ok(requests.some((request) => /\/api\/v1\/iam\/users\?keyword=sales&roleId=role-sales&status=ACTIVE&page=0&size=10$/.test(request.url)))
  const create = requests.find((request) => request.method === 'POST' && /\/api\/v1\/iam\/users$/.test(request.url))
  assert.deepEqual(create?.body, { username: 'sales_b', email: 'sales-b@example.com', phone: '0901234568', roleIds: ['role-sales', 'role-accountant'], autoGenerateTemporaryPassword: true })
  const statusChange = requests.find((request) => request.method === 'PATCH' && /\/api\/v1\/iam\/users\/user-1\/status$/.test(request.url))
  assert.deepEqual(statusChange?.body, { targetStatus: 'LOCKED', reason: 'Vi phạm quy định' })
})
