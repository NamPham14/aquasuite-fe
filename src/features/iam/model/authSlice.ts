import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { clearAuthLocal, updateAccessToken } from '../../../shared/api/authActions.ts'
import type { AuthState, BootstrapError, UserSummary } from '../types/auth.types.ts'

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,
  sessionGeneration: 0,
  bootstrapError: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Increments the session generation counter to initiate a new session flow.
     * Any prior asynchronous operation holding an older generation will be dropped.
     */
    startSession: (state) => {
      state.sessionGeneration += 1
      state.bootstrapError = null
    },

    /**
     * Sets authenticated credentials if and only if the generation matches the current session.
     */
    setCredentials: (
      state,
      action: PayloadAction<{
        user: UserSummary
        accessToken: string
        generation: number
      }>,
    ) => {
      if (action.payload.generation !== state.sessionGeneration) {
        return
      }
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = true
      state.isBootstrapping = false
      state.bootstrapError = null
    },

    /**
     * Updates user profile if and only if the generation matches the current session.
     */
    setUserProfile: (
      state,
      action: PayloadAction<{
        user: UserSummary
        generation: number
      }>,
    ) => {
      if (action.payload.generation !== state.sessionGeneration) {
        return
      }
      state.user = action.payload.user
    },

    setBootstrapping: (state, action: PayloadAction<boolean>) => {
      state.isBootstrapping = action.payload
    },

    setBootstrapError: (state, action: PayloadAction<BootstrapError | null>) => {
      state.bootstrapError = action.payload
      state.isBootstrapping = false
    },

    clearBootstrapError: (state) => {
      state.bootstrapError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(clearAuthLocal, (state) => {
        state.sessionGeneration += 1
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.isBootstrapping = false
      })
      .addCase(updateAccessToken, (state, action) => {
        if (action.payload.generation !== state.sessionGeneration) {
          return
        }
        state.accessToken = action.payload.accessToken
      })
  },
})

export const {
  startSession,
  setCredentials,
  setUserProfile,
  setBootstrapping,
  setBootstrapError,
  clearBootstrapError,
} = authSlice.actions

export { clearAuthLocal, updateAccessToken }
export const authReducer = authSlice.reducer
