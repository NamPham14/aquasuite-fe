import { baseApi } from '../../../shared/api/baseApi'
import type { ApiResponse } from '../../../shared/api/types'
import type { UserAccountPage } from '../../iam'

export const shipperApi = baseApi.injectEndpoints({
  endpoints: (b) => ({
    getDeliveryShippers: b.query<UserAccountPage, { keyword: string; page: number; size: number }>({
      query: (params) => ({ url: '/iam/users/shippers', params }),
      transformResponse: (r: ApiResponse<UserAccountPage>) => r.data!,
      providesTags: [{ type: 'UserAccount', id: 'LIST' }],
    }),
  }),
})
export const { useGetDeliveryShippersQuery } = shipperApi
