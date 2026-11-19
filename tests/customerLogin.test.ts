import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loginSchema } from '../src/features/iam/schemas/login.schema.ts'
import { loginApi } from '../src/features/iam/api/authApi.ts'
import { isCustomerRole } from '../src/features/iam/types/auth.types.ts'

test('isCustomerRole identifies customer-only accounts versus staff accounts', () => {
  assert.equal(isCustomerRole(['CUSTOMER']), true)
  assert.equal(isCustomerRole(['CUSTOMER', 'SHOP_OWNER']), false)
  assert.equal(isCustomerRole(['SHOP_OWNER']), false)
  assert.equal(isCustomerRole(['SALES_STAFF']), false)
  assert.equal(isCustomerRole([]), false)
  assert.equal(isCustomerRole(null), false)
  assert.equal(isCustomerRole(undefined), false)
})

test('LoginForm and PublicOnlyRoute redirect customers to /storefront and guard management layout', () => {
  const loginFormSource = readFileSync(new URL('../src/features/iam/components/LoginForm.tsx', import.meta.url), 'utf8')
  assert.ok(loginFormSource.includes('isCustomerRole'))
  assert.ok(loginFormSource.includes("'/storefront'"))

  const publicOnlySource = readFileSync(new URL('../src/features/iam/components/PublicOnlyRoute.tsx', import.meta.url), 'utf8')
  assert.ok(publicOnlySource.includes('isCustomerRole'))
  assert.ok(publicOnlySource.includes("'/storefront'"))

  const managementLayoutSource = readFileSync(new URL('../src/layouts/ManagementLayout.tsx', import.meta.url), 'utf8')
  assert.ok(managementLayoutSource.includes('isCustomerRole'))
  assert.ok(managementLayoutSource.includes('to="/storefront"'))
})

test('customer page reuses email login and keeps registration link', () => {
  const source = readFileSync(new URL('../src/pages/auth/CustomerLoginPage.tsx', import.meta.url), 'utf8')
  assert.ok(source.includes('<LoginForm'))
  assert.ok(source.includes('to="/register-customer"'))
  assert.equal(source.includes('CustomerLoginForm'), false)
  const parsed = loginSchema.parse({ email: ' customer@example.com ', password: ' secret ' })
  assert.equal(parsed.email, 'customer@example.com')
  assert.equal(parsed.password, ' secret ')
  for (const email of ['', '0901234567', 'invalid']) assert.equal(loginSchema.safeParse({ email, password: 'secret' }).success, false)
})

test('customer email credentials use shared login endpoint and retain API errors', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestBody: unknown
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestBody = JSON.parse(String(init?.body))
    return new Response(JSON.stringify({ code: 'AUTH_003', message: 'Invalid credentials' }), { status: 401 })
  }
  try {
    await assert.rejects(loginApi({ email: ' customer@example.com ', password: ' secret ' }), (error: unknown) => {
      assert.equal((error as { data: { code: string } }).data.code, 'AUTH_003')
      return true
    })
    assert.ok(requestUrl.endsWith('/auth/login'))
    assert.deepEqual(requestBody, { email: 'customer@example.com', password: ' secret ' })
  } finally { globalThis.fetch = originalFetch }
})
