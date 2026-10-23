import { createApi } from '@reduxjs/toolkit/query/react'
import { reauthBaseQuery } from './reauthBaseQuery'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: reauthBaseQuery,
  tagTypes: ['Category', 'Brand'],
  endpoints: () => ({}),
})

