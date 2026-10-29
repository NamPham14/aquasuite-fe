import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authReducer,
  setBootstrapError,
  clearBootstrapError,
} from '../src/features/iam/model/authSlice.ts'
import type { AuthState } from '../src/features/iam/types/auth.types.ts'

const initialAuthState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: false,
  sessionGeneration: 0,
  bootstrapError: null,
}

test('bootstrapClassification: sets SERVICE_UNAVAILABLE error correctly without claiming session expired', () => {
  const state = authReducer(
    initialAuthState,
    setBootstrapError({
      type: 'SERVICE_UNAVAILABLE',
      message: 'Dịch vụ xác thực tạm thời không khả dụng (503 / Mất kết nối).',
    }),
  )

  assert.strictEqual(state.bootstrapError?.type, 'SERVICE_UNAVAILABLE')
  assert.ok(state.bootstrapError.message.includes('503'))
})

test('bootstrapClassification: sets SESSION_EXPIRED error correctly for 401/403 failures', () => {
  const state = authReducer(
    initialAuthState,
    setBootstrapError({
      type: 'SESSION_EXPIRED',
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    }),
  )

  assert.strictEqual(state.bootstrapError?.type, 'SESSION_EXPIRED')
  assert.strictEqual(state.isBootstrapping, false)
})

test('bootstrapClassification: clearBootstrapError resets the error state', () => {
  let state = authReducer(
    initialAuthState,
    setBootstrapError({
      type: 'SERVICE_UNAVAILABLE',
      message: 'Network error',
    }),
  )
  assert.notStrictEqual(state.bootstrapError, null)

  state = authReducer(state, clearBootstrapError())
  assert.strictEqual(state.bootstrapError, null)
})
