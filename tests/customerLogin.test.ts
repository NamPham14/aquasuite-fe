import test from 'node:test'
import assert from 'node:assert/strict'
import { customerLoginSchema } from '../src/features/iam/schemas/customerLogin.schema.ts'
import { customerLoginApi, loginApi } from '../src/features/iam/api/authApi.ts'

test('customer validation matches BE phone boundaries and preserves password whitespace', () => {
  for (const prefix of ['03', '05', '07', '08', '09']) {
    const parsed = customerLoginSchema.parse({ phone: ` ${prefix}01234567 `, password: ' secret ' })
    assert.equal(parsed.phone, `${prefix}01234567`)
    assert.equal(parsed.password, ' secret ')
  }
  for (const phone of ['', '0401234567', '+84901234567', '090123456', '09012345678', '0901abc567']) {
    assert.equal(customerLoginSchema.safeParse({ phone, password: 'secret' }).success, false)
  }
  for (const password of ['', '   ', 'x'.repeat(101)]) {
    assert.equal(customerLoginSchema.safeParse({ phone: '0901234567', password }).success, false)
  }
})

test('customer and email use separate endpoints; customer errors retain API code', async () => {
  const originalFetch = globalThis.fetch
  const calls: { url: string; body: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) })
    return new Response(JSON.stringify({ code: 'AUTH_003', message: 'Invalid credentials' }), { status: 401 })
  }
  try {
    await assert.rejects(customerLoginApi({ phone: ' 0901234567 ', password: ' secret ' }), (error: unknown) => {
      assert.equal((error as { data: { code: string } }).data.code, 'AUTH_003')
      return true
    })
    await assert.rejects(loginApi({ email: ' user@example.com ', password: 'secret' }))
    assert.ok(calls[0].url.endsWith('/auth/customer-login'))
    assert.deepEqual(calls[0].body, { phone: '0901234567', password: ' secret ' })
    assert.ok(calls[1].url.endsWith('/auth/login'))
    assert.deepEqual(calls[1].body, { email: 'user@example.com', password: 'secret' })
  } finally { globalThis.fetch = originalFetch }
})
