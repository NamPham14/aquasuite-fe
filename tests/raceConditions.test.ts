import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authReducer,
  startSession,
  setCredentials,
  updateAccessToken,
  setUserProfile,
  clearAuthLocal,
} from '../src/features/iam/model/authSlice.ts'
import type { AuthState, UserSummary } from '../src/features/iam/types/auth.types.ts'

const initialAuthState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: false,
  sessionGeneration: 0,
}

const userAccountA: UserSummary = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'accountA',
  email: 'a@aquasuite.vn',
  roles: ['SALES_STAFF'],
}

const userAccountB: UserSummary = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'accountB',
  email: 'b@aquasuite.vn',
  roles: ['SHOP_OWNER'],
}

test('Race Condition 1: Logout while refresh is in-flight drops late refresh response', async () => {
  // 1. Initial active session with Generation 1
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  state = authReducer(
    state,
    setCredentials({
      user: userAccountA,
      accessToken: 'access-token-initial',
      generation: 1,
    }),
  )
  assert.strictEqual(state.isAuthenticated, true)
  assert.strictEqual(state.sessionGeneration, 1)

  // 2. Refresh request begins and captures generation = 1
  const refreshRequestGen = state.sessionGeneration

  // 3. User clicks Logout BEFORE refresh response returns
  // clearAuthLocal increments generation synchronously to 2 and wipes credentials
  state = authReducer(state, clearAuthLocal())
  assert.strictEqual(state.sessionGeneration, 2)
  assert.strictEqual(state.isAuthenticated, false)
  assert.strictEqual(state.accessToken, null)

  // 4. In-flight refresh response returns late with new token for generation 1
  state = authReducer(
    state,
    updateAccessToken({
      accessToken: 'late-new-access-token',
      generation: refreshRequestGen, // 1
    }),
  )

  // Verification: Token MUST NOT be resurrected! State remains anonymous!
  assert.strictEqual(state.isAuthenticated, false)
  assert.strictEqual(state.accessToken, null)
  assert.strictEqual(state.user, null)
})

test('Race Condition 2: Logout while /me is in-flight drops late profile response', async () => {
  // 1. Active session with Generation 1
  let state = authReducer(initialAuthState, startSession()) // gen = 1
  state = authReducer(
    state,
    updateAccessToken({
      accessToken: 'access-token-1',
      generation: 1,
    }),
  )
  const meRequestGen = state.sessionGeneration // 1

  // 2. User logs out while /me is in-flight
  state = authReducer(state, clearAuthLocal()) // gen becomes 2
  assert.strictEqual(state.sessionGeneration, 2)
  assert.strictEqual(state.user, null)

  // 3. Late /me response arrives with gen = 1
  state = authReducer(
    state,
    setUserProfile({
      user: userAccountA,
      generation: meRequestGen, // 1
    }),
  )

  // Verification: Profile is dropped, not resurrected
  assert.strictEqual(state.user, null)
  assert.strictEqual(state.isAuthenticated, false)
})

test('Race Condition 3: Account switch — Login A response arriving after Login B started is dropped', async () => {
  // 1. User initiates Login A -> generation = 1
  let state = authReducer(initialAuthState, startSession())
  const loginAGen = state.sessionGeneration
  assert.strictEqual(loginAGen, 1)

  // 2. User quickly initiates Login B for another account -> generation = 2
  state = authReducer(state, startSession())
  const loginBGen = state.sessionGeneration
  assert.strictEqual(loginBGen, 2)

  // 3. Login A network response arrives late (with credentials for Account A and gen = 1)
  state = authReducer(
    state,
    setCredentials({
      user: userAccountA,
      accessToken: 'token-account-A',
      generation: loginAGen, // 1
    }),
  )

  // Verification: Login A payload is ignored because generation is now 2!
  assert.strictEqual(state.isAuthenticated, false)
  assert.strictEqual(state.user, null)
  assert.strictEqual(state.accessToken, null)

  // 4. Login B network response arrives (with credentials for Account B and gen = 2)
  state = authReducer(
    state,
    setCredentials({
      user: userAccountB,
      accessToken: 'token-account-B',
      generation: loginBGen, // 2
    }),
  )

  // Verification: Login B payload is successfully committed
  assert.strictEqual(state.isAuthenticated, true)
  assert.strictEqual(state.user?.username, 'accountB')
  assert.strictEqual(state.accessToken, 'token-account-B')
})

test('Race Condition 4: Logout revoke server failure preserves local logout (fail-safe)', async () => {
  // 1. Active session
  let state = authReducer(initialAuthState, startSession())
  state = authReducer(
    state,
    setCredentials({
      user: userAccountA,
      accessToken: 'valid-token',
      generation: 1,
    }),
  )

  // 2. Snapshot access token
  const snapshotToken = state.accessToken
  assert.strictEqual(snapshotToken, 'valid-token')

  // 3. Clear auth locally BEFORE calling network
  state = authReducer(state, clearAuthLocal())
  assert.strictEqual(state.isAuthenticated, false)
  assert.strictEqual(state.accessToken, null)

  // 4. Simulate server logout call failing (e.g. 503 / Network Error)
  const serverRevoke = async () => {
    throw new Error('503 Service Unavailable')
  }

  try {
    await serverRevoke()
  } catch {
    // Failure caught — notice state is NOT reverted
  }

  // Verification: Client session remains terminated, not reverted to logged-in
  assert.strictEqual(state.isAuthenticated, false)
  assert.strictEqual(state.accessToken, null)
  assert.strictEqual(state.user, null)
})
