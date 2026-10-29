import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { tokenStorage } from '../lib/tokenStorage.ts'
import { clearAuthLocal, updateAccessToken } from './authActions.ts'
import type { ApiResponse } from './types.ts'

interface AuthStateSlice {
  accessToken: string | null
  sessionGeneration: number
}

interface AppState {
  auth?: AuthStateSlice
}

interface RefreshOutcome {
  success: boolean
  accessToken?: string
  generation: number
}

interface ActiveRefreshState {
  generation: number
  promise: Promise<RefreshOutcome>
}

let activeRefresh: ActiveRefreshState | null = null

export function _resetActiveRefreshForTesting(): void {
  activeRefresh = null
}

export function getApiBaseUrl(): string {
  // If in browser (window.location is defined)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const envUrl =
      typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined
    // Prevent direct cross-origin calls to backend host from browser in dev
    if (envUrl && !envUrl.startsWith('http://localhost:8080')) {
      return envUrl
    }
    // Default to relative /api/v1 so browser requests go through Vite dev proxy
    return '/api/v1'
  }

  // In test / Node.js non-browser environment, fetch requires an absolute URL with scheme
  const envUrl =
    typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl
  }
  return 'http://localhost/api/v1'
}

export const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: (headers, { getState }) => {
    if (!headers.has('authorization')) {
      const token = (getState() as AppState)?.auth?.accessToken
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
    }
    return headers
  },
})

export const reauthBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // CRITICAL: Snapshot session generation BEFORE the initial network request
  const initialAppState = api.getState() as AppState
  const requestGen = initialAppState.auth?.sessionGeneration ?? 0

  let result = await rawBaseQuery(args, api, extraOptions)

  // Verify that the session has not changed or ended while this request was in flight
  const postRequestGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
  if (postRequestGen !== requestGen) {
    // Critical: Do NOT return stale result to RTK Query cache!
    // Returning an error prevents late data from Account A from populating Account B's cache.
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'STALE_SESSION_DISCARDED',
      },
    }
  }

  const requestUrl = typeof args === 'string' ? args : args.url
  const isAuthEndpoint =
    requestUrl.includes('/auth/login') ||
    requestUrl.includes('/auth/refresh') ||
    requestUrl.includes('/auth/logout')

  // Handle 403 Forbidden: AUTH_008 terminates local session; 403 never triggers refresh
  if (result.error?.status === 403) {
    const errorData = result.error.data as { code?: string } | undefined
    if (errorData?.code === 'AUTH_008') {
      tokenStorage.clearRefreshToken()
      api.dispatch(clearAuthLocal())
    }
    return result
  }

  // Only handle 401 on non-auth endpoints
  if (result.error?.status !== 401 || isAuthEndpoint) {
    return result
  }

  // Single-flight refresh token coordination
  if (!activeRefresh || activeRefresh.generation !== requestGen) {
    const refreshPromise = (async (): Promise<RefreshOutcome> => {
      try {
        // Pop refresh token: fail-closed before any network call
        const refreshToken = tokenStorage.popRefreshToken()
        if (!refreshToken) {
          api.dispatch(clearAuthLocal())
          return { success: false, generation: requestGen }
        }

        const refreshResult = await rawBaseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refresh_token: refreshToken },
          },
          api,
          extraOptions,
        )

        // Drop response if session generation changed during the refresh network call
        const currentGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
        if (currentGen !== requestGen) {
          return { success: false, generation: requestGen }
        }

        if (refreshResult.data) {
          const envelope = refreshResult.data as ApiResponse<{
            access_token: string
            refresh_token: string
            token_type?: string
            expires_in?: number
          }>

          const tokenData = envelope.data
          if (tokenData?.access_token && tokenData?.refresh_token) {
            // Save new refresh token into sessionStorage
            const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
            if (!saved) {
              // Storage write failure -> fail-closed per Spec §7
              api.dispatch(clearAuthLocal())
              return { success: false, generation: requestGen }
            }

            // Update in-memory access token
            api.dispatch(
              updateAccessToken({
                accessToken: tokenData.access_token,
                generation: requestGen,
              }),
            )

            return {
              success: true,
              accessToken: tokenData.access_token,
              generation: requestGen,
            }
          }
        }

        // Refresh failed (401 invalid/expired/reused or error response)
        api.dispatch(clearAuthLocal())
        return { success: false, generation: requestGen }
      } catch {
        // Network or unexpected failure: do NOT retry old refresh token
        api.dispatch(clearAuthLocal())
        return { success: false, generation: requestGen }
      }
    })()

    activeRefresh = {
      generation: requestGen,
      promise: refreshPromise,
    }

    // High: Clean up activeRefresh on settle based on promise identity
    refreshPromise.finally(() => {
      if (activeRefresh?.promise === refreshPromise) {
        activeRefresh = null
      }
    })
  }

  const outcome = await activeRefresh.promise

  // Retry original request only if refresh succeeded and generation remains identical
  const finalGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
  if (outcome.success && finalGen === requestGen) {
    result = await rawBaseQuery(args, api, extraOptions)

    // Verify session generation AGAIN after the retry request completes
    const postRetryGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
    if (postRetryGen !== requestGen) {
      // Stale retry response discarded: prevents Account A retry data from entering Account B cache
      return {
        error: {
          status: 'CUSTOM_ERROR',
          error: 'STALE_SESSION_DISCARDED',
        },
      }
    }
  }

  return result
}
