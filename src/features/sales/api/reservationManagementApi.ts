import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { ReservationHistory, ReservationRelease } from '../types/reservationManagement.types.ts'

const path = (id: string) => `/sales/orders/${encodeURIComponent(id)}/stock-reservations`
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data == null) throw new Error(response.message || 'Phản hồi máy chủ không hợp lệ.')
  return response.data
}
export const reservationManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    reservationHistory: builder.query<ReservationHistory, string>({
      query: (id) => `${path(id)}/history`, transformResponse: unwrap<ReservationHistory>,
      providesTags: (_result, _error, id) => [{ type: 'SalesOrder', id }],
    }),
    executeReservationRelease: builder.mutation<ReservationRelease, { orderId: string; decisionId: string }>({
      query: ({ orderId, decisionId }) => ({ url: `${path(orderId)}/releases/${encodeURIComponent(decisionId)}`, method: 'POST' }),
      transformResponse: unwrap<ReservationRelease>,
      invalidatesTags: (_result, _error, { orderId }) => [{ type: 'SalesOrder', id: orderId }],
    }),
  }),
})
export const { useReservationHistoryQuery, useExecuteReservationReleaseMutation } = reservationManagementApi
