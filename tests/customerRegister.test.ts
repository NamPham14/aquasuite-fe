import test from 'node:test'
import assert from 'node:assert/strict'
import { customerRegisterSchema, registrationOtpSchema } from '../src/features/iam/schemas/customerRegister.schema.ts'
import { registerCustomerApi, resendRegistrationApi, verifyRegistrationApi } from '../src/features/iam/api/authApi.ts'

const valid = { fullName: ' Nguyen Van A ', email: ' a@example.com ', phone: ' 0901234567 ', password: ' Secure123! ', passwordConfirmation: ' Secure123! ', termsAccepted: true }

test('registration matches backend constraints and preserves password whitespace', () => {
  const parsed = customerRegisterSchema.parse(valid)
  assert.equal(parsed.fullName, 'Nguyen Van A')
  assert.equal(parsed.email, 'a@example.com')
  assert.equal(parsed.phone, '0901234567')
  assert.equal(parsed.password, valid.password)
  for (const patch of [{ fullName: 'a' }, { fullName: 'a'.repeat(51) }, { email: 'invalid' }, { phone: '+84901234567' }, { password: 'lowercase123!' }, { passwordConfirmation: 'wrong' }, { termsAccepted: false }, { password: `Aa1!${'ề'.repeat(24)}`, passwordConfirmation: `Aa1!${'ề'.repeat(24)}` }]) {
    assert.equal(customerRegisterSchema.safeParse({ ...valid, ...patch }).success, false)
  }
  assert.equal(registrationOtpSchema.parse('012345'), '012345')
  for (const otp of ['12345', '1234567', '12a456', ' 12345']) assert.equal(registrationOtpSchema.safeParse(otp).success, false)
})

test('registration APIs use confirmed paths and preserve error codes', async () => {
  const original = globalThis.fetch
  const calls: { url: string; body: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) })
    return new Response(JSON.stringify({ code: 'REG_003', message: 'Expired' }), { status: 410 })
  }
  try {
    const data = customerRegisterSchema.parse(valid)
    await assert.rejects(registerCustomerApi(data))
    await assert.rejects(verifyRegistrationApi({ email: data.email, otp: '012345' }), (error: unknown) => {
      assert.equal((error as { data: { code: string } }).data.code, 'REG_003')
      return true
    })
    await assert.rejects(resendRegistrationApi(data.email))
    assert.ok(calls[0].url.endsWith('/iam/register'))
    assert.deepEqual(calls[0].body, data)
    assert.ok(calls[1].url.endsWith('/iam/register/verifications'))
    assert.deepEqual(calls[1].body, { email: data.email, otp: '012345' })
    assert.ok(calls[2].url.endsWith('/iam/register/otp-resends'))
    assert.deepEqual(calls[2].body, { email: data.email })
  } finally { globalThis.fetch = original }
})
