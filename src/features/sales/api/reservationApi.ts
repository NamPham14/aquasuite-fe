import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { OrderReceipt, ReservationOrder, ReservationOrderPage, ReservationRequest, ReservationView } from '../types/reservation.types.ts'

const reservationPath = (id: string) => `/sales/orders/${id}/stock-reservations`
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data == null) throw new Error(response.message || 'Phản hồi máy chủ không hợp lệ.')
  return response.data
}
export const reservationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    reservationOrders: builder.query<ReservationOrderPage, { page: number; keyword: string }>({
      query: (params) => ({ url: '/sales/orders', params: { ...params, size: 20, depositReservationOnly: true } }),
      transformResponse: unwrap<ReservationOrderPage>,
    }),
    reservationOrder: builder.query<ReservationOrder, string>({
      query: (id) => `/sales/orders/${id}`, transformResponse: unwrap<ReservationOrder>,
    }),
    reservation: builder.query<ReservationView, string>({
      query: reservationPath, transformResponse: unwrap<ReservationView>,
      providesTags: (_result, _error, id) => [{ type: 'SalesOrder', id }, { type: 'OrderPayment', id }],
    }),
    reservationReceipts: builder.query<OrderReceipt[], string>({
      query: (id) => `/finance/orders/${id}/payments`, transformResponse: unwrap<OrderReceipt[]>,
      providesTags: (_result, _error, id) => [{ type: 'OrderPayment', id }],
    }),
    submitReservation: builder.mutation<ReservationView, { orderId: string; action: 'requests' | 'synchronize'; body: ReservationRequest }>({
      query: ({ orderId, action, body }) => ({ url: `${reservationPath(orderId)}/${action}`, method: 'POST', body }),
      transformResponse: unwrap<ReservationView>,
    }),
    retryReservation: builder.mutation<ReservationView, { orderId: string; allocationId: string }>({
      query: ({ orderId, allocationId }) => ({ url: `${reservationPath(orderId)}/allocations/${allocationId}/retry`, method: 'POST' }),
      transformResponse: unwrap<ReservationView>,
    }),
  }),
})
export const {
  useReservationOrdersQuery, useReservationOrderQuery, useReservationQuery, useReservationReceiptsQuery,
  useSubmitReservationMutation, useRetryReservationMutation,
} = reservationApi
