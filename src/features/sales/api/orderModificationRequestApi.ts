import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  ApproveOrderModificationRequest,
  CreateMyOrderModificationRequestPayload,
  CreateOrderModificationRequestPayload,
  CustomerOrderModificationRequestReceipt,
  OrderModificationRequestResponse,
  RecordOrderModificationTaxResultRequest,
  ReviewOrderModificationRequest,
} from '../types/orderModificationRequest.types.ts'

type SpringPage<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

function pageOf(response: unknown): PageResponse<OrderModificationRequestResponse> {
  const value = response as { data?: SpringPage<OrderModificationRequestResponse> } | SpringPage<OrderModificationRequestResponse>
  const page = ('data' in value && value.data ? value.data : value) as SpringPage<OrderModificationRequestResponse>
  return {
    items: page.content ?? [],
    totalElements: page.totalElements ?? 0,
    totalPages: page.totalPages ?? 0,
    page: (page.number ?? 0) + 1,
    size: page.size ?? 20,
  }
}

function dataOf<T>(response: unknown): T {
  const value = response as { data?: T } | T
  return typeof value === 'object' && value !== null && 'data' in value && value.data !== undefined ? value.data : value as T
}

/** UC-26: review requests only. Request submission remains the UC-20/Order boundary. */
export const orderModificationRequestApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrderModificationRequests: builder.query<PageResponse<OrderModificationRequestResponse>, { page?: number; size?: number }>({
      query: ({ page = 1, size = 100 } = {}) => ({
        url: '/sales/order-modification-requests',
        params: { page: Math.max(0, page - 1), size, sort: 'createdAt,desc' },
      }),
      transformResponse: pageOf,
      providesTags: (result) => [
        { type: 'SalesOrder', id: 'MODIFICATION_REQUEST_LIST' },
        ...(result?.items.map((request) => ({ type: 'SalesOrder' as const, id: `MODIFICATION_REQUEST-${request.id}` })) ?? []),
      ],
    }),
    getOrderModificationRequest: builder.query<OrderModificationRequestResponse, string>({
      query: (requestId) => `/sales/order-modification-requests/${requestId}`,
      transformResponse: (response) => dataOf<OrderModificationRequestResponse>(response),
      providesTags: (_result, _error, requestId) => [{ type: 'SalesOrder', id: `MODIFICATION_REQUEST-${requestId}` }],
    }),
    approveOrderModificationRequest: builder.mutation<OrderModificationRequestResponse, { requestId: string; body: ApproveOrderModificationRequest }>({
      query: ({ requestId, body }) => ({ url: `/sales/order-modification-requests/${requestId}/approve`, method: 'POST', body }),
      transformResponse: (response) => dataOf<OrderModificationRequestResponse>(response),
      invalidatesTags: (result, _error, { requestId }) => [
        { type: 'SalesOrder', id: 'MODIFICATION_REQUEST_LIST' },
        { type: 'SalesOrder', id: `MODIFICATION_REQUEST-${requestId}` },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesOrder', id: 'ME_LIST' },
        ...(result?.orderId
          ? [
              { type: 'SalesOrder' as const, id: result.orderId },
              { type: 'StockReservation' as const, id: result.orderId },
              { type: 'SalesInvoice' as const, id: `ORDER-${result.orderId}` },
              { type: 'OrderPayment' as const, id: result.orderId },
            ]
          : []),
        'SalesInvoice',
        'OrderPayment',
        { type: 'StockReservation', id: 'ORDER_LIST' },
        'Delivery',
        'CustomerDebt',
        { type: 'AuditLog', id: `ORDER_MODIFICATION_REQUEST:${requestId}` },
      ],
    }),
    rejectOrderModificationRequest: builder.mutation<OrderModificationRequestResponse, { requestId: string; body: ReviewOrderModificationRequest }>({
      query: ({ requestId, body }) => ({ url: `/sales/order-modification-requests/${requestId}/reject`, method: 'POST', body }),
      transformResponse: (response) => dataOf<OrderModificationRequestResponse>(response),
      invalidatesTags: (result, _error, { requestId }) => [
        { type: 'SalesOrder', id: 'MODIFICATION_REQUEST_LIST' },
        { type: 'SalesOrder', id: `MODIFICATION_REQUEST-${requestId}` },
        ...(result?.orderId ? [{ type: 'SalesOrder' as const, id: result.orderId }] : []),
        { type: 'AuditLog', id: `ORDER_MODIFICATION_REQUEST:${requestId}` },
      ],
    }),
    recordOrderModificationTaxResult: builder.mutation<OrderModificationRequestResponse, { requestId: string; body: RecordOrderModificationTaxResultRequest }>({
      query: ({ requestId, body }) => ({ url: `/sales/order-modification-requests/${requestId}/tax-result`, method: 'POST', body }),
      transformResponse: (response) => dataOf<OrderModificationRequestResponse>(response),
      invalidatesTags: (result, _error, { requestId }) => [
        { type: 'SalesOrder', id: 'MODIFICATION_REQUEST_LIST' },
        { type: 'SalesOrder', id: `MODIFICATION_REQUEST-${requestId}` },
        { type: 'SalesOrder', id: 'LIST' },
        ...(result?.orderId
          ? [
              { type: 'SalesOrder' as const, id: result.orderId },
              { type: 'SalesInvoice' as const, id: `ORDER-${result.orderId}` },
              { type: 'OrderPayment' as const, id: result.orderId },
            ]
          : []),
        'SalesInvoice',
        'OrderPayment',
        { type: 'PaymentAllocation', id: 'QUEUE' },
        'CustomerDebt',
        { type: 'AuditLog', id: `ORDER_MODIFICATION_REQUEST:${requestId}` },
      ],
    }),
    sendOrderModificationResultEmail: builder.mutation<void, string>({
      query: (requestId) => ({ url: `/sales/order-modification-requests/${requestId}/send-result-email`, method: 'POST' }),
      invalidatesTags: (_result, _error, requestId) => [
        { type: 'SalesOrder', id: `MODIFICATION_REQUEST-${requestId}` },
        { type: 'AuditLog', id: `ORDER_MODIFICATION_REQUEST:${requestId}` },
      ],
    }),
    createOrderModificationRequest: builder.mutation<OrderModificationRequestResponse, CreateOrderModificationRequestPayload>({
      query: (body) => ({ url: '/sales/order-modification-requests', method: 'POST', body }),
      transformResponse: (response) => dataOf<OrderModificationRequestResponse>(response),
      invalidatesTags: (_result, _error, body) => [
        { type: 'SalesOrder', id: 'MODIFICATION_REQUEST_LIST' },
        { type: 'SalesOrder', id: body.orderId },
        { type: 'StockReservation', id: body.orderId },
      ],
    }),
    createMyOrderModificationRequest: builder.mutation<
      CustomerOrderModificationRequestReceipt,
      { orderId: string; body: CreateMyOrderModificationRequestPayload }
    >({
      query: ({ orderId, body }) => ({
        url: `/sales/orders/me/${orderId}/modification-requests`,
        method: 'POST',
        body,
      }),
      transformResponse: (response) => dataOf<CustomerOrderModificationRequestReceipt>(response),
    }),
  }),
})

export const {
  useGetOrderModificationRequestsQuery,
  useGetOrderModificationRequestQuery,
  useApproveOrderModificationRequestMutation,
  useRejectOrderModificationRequestMutation,
  useRecordOrderModificationTaxResultMutation,
  useSendOrderModificationResultEmailMutation,
  useCreateOrderModificationRequestMutation,
  useCreateMyOrderModificationRequestMutation,
} = orderModificationRequestApi
