import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authReducer,
  startSession,
  setCredentials,
  updateAccessToken,
  setUserProfile,
  clearAuthLocal,
  setBootstrapping,
} from '../src/features/iam/model/authSlice.ts'
import type { AuthState, UserSummary } from '../src/features/iam/types/auth.types.ts'

const initialAuthState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,
  sessionGeneration: 0,
}

const mockUser: UserSummary = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'shopowner',
  email: 'owner@aquasuite.vn',
  roles: ['SHOP_OWNER'],
}

test('authSlice: startSession increments sessionGeneration', () => {
  const state = authReducer(initialAuthState, startSession())
  assert.strictEqual(state.sessionGeneration, 1)

  const state2 = authReducer(state, startSession())
  assert.strictEqual(state2.sessionGeneration, 2)
})

test('authSlice: setCredentials commits when generation matches', () => {
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  state = authReducer(
    state,
    setCredentials({
      user: mockUser,
      accessToken: 'access-token-1',
      generation: 1,
    }),
  )

  assert.strictEqual(state.isAuthenticated, true)
  assert.strictEqual(state.isBootstrapping, false)
  assert.strictEqual(state.accessToken, 'access-token-1')
  assert.deepStrictEqual(state.user, mockUser)
})

test('authSlice: setCredentials DROPS stale payload when generation does not match', () => {
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  state = authReducer(state, startSession()) // gen = 2

  // An old callback from gen 1 arrives
  const nextState = authReducer(
    state,
    setCredentials({
      user: mockUser,
      accessToken: 'stale-token',
      generation: 1, // generation mismatch!
    }),
  )

  // State should remain unchanged
  assert.strictEqual(nextState.isAuthenticated, false)
  assert.strictEqual(nextState.accessToken, null)
  assert.strictEqual(nextState.user, null)
})

test('authSlice: updateAccessToken commits when generation matches and drops when mismatched', () => {
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  state = authReducer(
    state,
    setCredentials({
      user: mockUser,
      accessToken: 'old-access-token',
      generation: 1,
    }),
  )

  // Stale update from gen 0
  const staleState = authReducer(
    state,
    updateAccessToken({
      accessToken: 'stale-token',
      generation: 0,
    }),
  )
  assert.strictEqual(staleState.accessToken, 'old-access-token')

  // Valid update from gen 1
  const updatedState = authReducer(
    state,
    updateAccessToken({
      accessToken: 'new-access-token',
      generation: 1,
    }),
  )
  assert.strictEqual(updatedState.accessToken, 'new-access-token')
})

test('authSlice: setUserProfile commits when generation matches and drops when mismatched', () => {
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  const updatedUser: UserSummary = {
    ...mockUser,
    username: 'updated-name',
  }

  // Stale update from gen 0
  const staleState = authReducer(
    state,
    setUserProfile({
      user: updatedUser,
      generation: 0,
    }),
  )
  assert.strictEqual(staleState.user, null)

  // Valid update from gen 1
  const updatedState = authReducer(
    state,
    setUserProfile({
      user: updatedUser,
      generation: 1,
    }),
  )
  assert.deepStrictEqual(updatedState.user, updatedUser)
})

test('authSlice: clearAuthLocal synchronously increments generation and wipes all credentials', () => {
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  state = authReducer(
    state,
    setCredentials({
      user: mockUser,
      accessToken: 'active-token',
      generation: 1,
    }),
  )
  assert.strictEqual(state.isAuthenticated, true)

  const clearedState = authReducer(state, clearAuthLocal())
  assert.strictEqual(clearedState.sessionGeneration, 2)
  assert.strictEqual(clearedState.isAuthenticated, false)
  assert.strictEqual(clearedState.accessToken, null)
  assert.strictEqual(clearedState.user, null)
  assert.strictEqual(clearedState.isBootstrapping, false)
})

test('authSlice: setBootstrapping toggles flag', () => {
  const state = authReducer(initialAuthState, setBootstrapping(false))
  assert.strictEqual(state.isBootstrapping, false)
})
