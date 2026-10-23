import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type { TokenPair } from './types'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  prepareHeaders: (headers) => {
    const accessToken = localStorage.getItem('accessToken')

    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`)
    }

    return headers
  },
})

export const reauthBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status !== 401) {
    return result
  }

  const refreshToken = localStorage.getItem('refreshToken')

  if (!refreshToken) {
    clearTokens()
    return result
  }

  const refreshResult = await rawBaseQuery(
    {
      url: '/auth/refresh',
      method: 'POST',
      body: { refreshToken },
    },
    api,
    extraOptions,
  )

  if (refreshResult.data) {
    const tokens = refreshResult.data as TokenPair
    localStorage.setItem('accessToken', tokens.accessToken)

    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken)
    }

    result = await rawBaseQuery(args, api, extraOptions)
  } else {
    clearTokens()
  }

  return result
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

