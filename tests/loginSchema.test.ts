import test from 'node:test'
import assert from 'node:assert/strict'
import { loginSchema } from '../src/features/iam/schemas/login.schema.ts'

test('loginSchema: valid credentials pass and trim email', () => {
  const result = loginSchema.safeParse({
    email: '  admin@aquasuite.vn  ',
    password: 'password123',
  })
  assert.strictEqual(result.success, true)
  if (result.success) {
    assert.strictEqual(result.data.email, 'admin@aquasuite.vn')
    assert.strictEqual(result.data.password, 'password123')
  }
})

test('loginSchema: empty or whitespace-only email fails', () => {
  const result = loginSchema.safeParse({
    email: '   ',
    password: 'password123',
  })
  assert.strictEqual(result.success, false)
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message.includes('Email không được để trống')),
    )
  }
})

test('loginSchema: invalid email format fails', () => {
  const result = loginSchema.safeParse({
    email: 'invalid-email',
    password: 'password123',
  })
  assert.strictEqual(result.success, false)
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message.includes('Email không đúng định dạng')),
    )
  }
})

test('loginSchema: email longer than 320 characters fails', () => {
  const longEmail = 'a'.repeat(310) + '@example.com' // 322 characters
  const result = loginSchema.safeParse({
    email: longEmail,
    password: 'password123',
  })
  assert.strictEqual(result.success, false)
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message.includes('Email tối đa 320 ký tự')),
    )
  }
})

test('loginSchema: empty password fails', () => {
  const result = loginSchema.safeParse({
    email: 'admin@aquasuite.vn',
    password: '',
  })
  assert.strictEqual(result.success, false)
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message.includes('Mật khẩu không được để trống')),
    )
  }
})

test('loginSchema: password longer than 100 characters fails', () => {
  const longPassword = 'p'.repeat(101)
  const result = loginSchema.safeParse({
    email: 'admin@aquasuite.vn',
    password: longPassword,
  })
  assert.strictEqual(result.success, false)
  if (!result.success) {
    assert.ok(
      result.error.issues.some((i) => i.message.includes('Mật khẩu tối đa 100 ký tự')),
    )
  }
})
