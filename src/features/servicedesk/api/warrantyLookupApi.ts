import { baseApi } from '../../../shared/api/baseApi'
import type { ApiResponse } from '../../../shared/api/types'
import type { WarrantyLookupRecord } from '../types/warrantyLookup.types'

function dataOf<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error('Phản hồi tra cứu bảo hành thiếu dữ liệu.')
  return response.data
}

/** UC-48. Server scopes the records to the authenticated CUSTOMER; the client sends no customer ID. */
export const warrantyLookupApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyWarranties: builder.query<WarrantyLookupRecord[], { keyword?: string } | void>({
      query: (params) => ({ url: '/customer/warranties', params: params ?? undefined }),
      transformResponse: dataOf<WarrantyLookupRecord[]>,
      providesTags: (result) => [
        { type: 'WarrantyRecord', id: 'MINE' },
        ...(result?.map((record) => ({ type: 'WarrantyRecord' as const, id: record.warrantyRecordId })) ?? []),
      ],
    }),
  }),
})

export const { useGetMyWarrantiesQuery } = warrantyLookupApi
