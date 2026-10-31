import test from 'node:test'
import assert from 'node:assert/strict'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer } from '../src/features/iam/model/authSlice.ts'
import { loginApi, refreshApi, logoutApi } from '../src/features/iam/api/authApi.ts'

test('authSecretsNoLeak: executing loginApi, refreshApi, logoutApi does not dispatch secrets or populate mutation cache', async () => {
  const dispatchedActions: any[] = []

  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware).concat(() => (next) => (action) => {
        dispatchedActions.push(action)
        return next(action)
      }),
  })

  const sensitivePassword = 'SuperSecretPassword_#999'
  const sensitiveRefreshToken = 'super-secret-refresh-token-xyz'
  const sensitiveAccessToken = 'super-secret-access-token-abc'

  const loggedMessages: string[] = []
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => loggedMessages.push(args.map(String).join(' '))
  console.error = (...args) => loggedMessages.push(args.map(String).join(' '))

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const url = String(input)
    if (url.includes('/api/v1/auth/login')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: sensitiveAccessToken,
            refresh_token: sensitiveRefreshToken,
            token_type: 'Bearer',
            expires_in: 900,
            user: { id: '1', username: 'admin', email: 'admin@test.com', roles: [] },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/api/v1/auth/refresh')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            access_token: 'new-acc',
            refresh_token: 'new-ref',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    if (url.includes('/api/v1/auth/logout')) {
      return new Response(
        JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }
    return new Response('{}', { status: 200 })
  }

  try {
    // Execute direct callers
    const loginRes = await loginApi({ email: 'admin@test.com', password: sensitivePassword })
    assert.strictEqual(loginRes.success, true)

    const refreshRes = await refreshApi(sensitiveRefreshToken)
    assert.strictEqual(refreshRes.success, true)

    const logoutRes = await logoutApi(sensitiveAccessToken)
    assert.strictEqual(logoutRes.success, true)

    // Verification 1: RTK Query mutation state remains completely empty
    const state = store.getState()
    assert.deepStrictEqual(state.api.mutations, {})

    // Verification 2: Neither password nor refresh token appears in any dispatched Redux action
    const actionsString = JSON.stringify(dispatchedActions)
    assert.strictEqual(actionsString.includes(sensitivePassword), false)
    assert.strictEqual(actionsString.includes(sensitiveRefreshToken), false)

    // Verification 3: Neither password nor token was logged to console
    const logsString = loggedMessages.join(' ')
    assert.strictEqual(logsString.includes(sensitivePassword), false)
    assert.strictEqual(logsString.includes(sensitiveRefreshToken), false)
  } finally {
    globalThis.fetch = originalFetch
    console.log = originalLog
    console.error = originalError
  }
})
