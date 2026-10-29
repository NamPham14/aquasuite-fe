import { createAction } from '@reduxjs/toolkit'

/**
 * Dispatched to clear local authentication state across the application:
 * increments session generation, clears tokens, user profile, and session state.
 */
export const clearAuthLocal = createAction('auth/clearAuthLocal')

/**
 * Dispatched when a fresh access token is acquired through refresh token rotation.
 */
export const updateAccessToken = createAction<{
  accessToken: string
  generation: number
}>('auth/updateAccessToken')
