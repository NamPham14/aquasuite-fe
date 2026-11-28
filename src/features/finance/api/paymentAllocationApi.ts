import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type {
  CreatePaymentAllocationRequest,
  PaymentAllocationBatch,
  PaymentAllocationLine,
  PaymentAllocationReceiptPage,
  PaymentAllocationTargets,
} from '../types/paymentAllocation.types.ts'

function dataOf<T>(response: ApiResponse<T> | T): T {
  if (typeof response === 'object' && response !== null && 'data' in response && response.data !== undefined) return response.data
  return response as T
}

export const paymentAllocationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUnallocatedReceipts: builder.query<PaymentAllocationReceiptPage, { page?: number; size?: number; view?: 'UNALLOCATED' | 'ALLOCATED' | 'ALL' }>({
      query: ({ page = 0, size = 20, view = 'UNALLOCATED' } = {}) => ({ url: '/finance/receipts/unallocated', params: { page, size, view } }),
      transformResponse: (response: unknown) => dataOf<PaymentAllocationReceiptPage>(response as ApiResponse<PaymentAllocationReceiptPage>),
      providesTags: [{ type: 'PaymentAllocation', id: 'QUEUE' }],
    }),
    getPaymentAllocationTargets: builder.query<PaymentAllocationTargets, string>({
      query: (receiptId) => `/finance/receipts/${receiptId}/allocation-targets`,
      transformResponse: (response: unknown) => dataOf<PaymentAllocationTargets>(response as ApiResponse<PaymentAllocationTargets>),
      providesTags: (_result, _error, receiptId) => [{ type: 'PaymentAllocation', id: `TARGETS-${receiptId}` }],
    }),
    getPaymentAllocations: builder.query<PaymentAllocationLine[], string>({
      query: (receiptId) => `/finance/receipts/${receiptId}/allocations`,
      transformResponse: (response: unknown) => dataOf<PaymentAllocationLine[]>(response as ApiResponse<PaymentAllocationLine[]>),
      providesTags: (_result, _error, receiptId) => [{ type: 'PaymentAllocation', id: `HISTORY-${receiptId}` }],
    }),
    createPaymentAllocation: builder.mutation<PaymentAllocationBatch, { receiptId: string; body: CreatePaymentAllocationRequest }>({
      query: ({ receiptId, body }) => ({ url: `/finance/receipts/${receiptId}/allocations`, method: 'POST', body }),
      transformResponse: (response: unknown) => dataOf<PaymentAllocationBatch>(response as ApiResponse<PaymentAllocationBatch>),
      invalidatesTags: (result, _error, { receiptId, body }) => [
        { type: 'PaymentAllocation', id: 'QUEUE' },
        { type: 'PaymentAllocation', id: `TARGETS-${receiptId}` },
        { type: 'PaymentAllocation', id: `HISTORY-${receiptId}` },
        'OrderPayment',
        'SalesInvoice',
        ...(result?.orderId
          ? [
              { type: 'SalesOrder' as const, id: result.orderId },
              { type: 'SalesInvoice' as const, id: `ORDER-${result.orderId}` },
              { type: 'OrderPayment' as const, id: result.orderId },
            ]
          : []),
        { type: 'SalesOrder', id: 'LIST' },
        'CustomerDebt',
        { type: 'AuditLog', id: `PAYMENT_RECEIPT:${receiptId}` },
        { type: 'AuditLog', id: 'PAYMENT_RECEIPT:ALL' },
        { type: 'AuditLog', id: `PAYMENT_ALLOCATION:${body.allocationRequestId}` },
        { type: 'AuditLog', id: 'PAYMENT_ALLOCATION:ALL' },
      ],
    }),
    reversePaymentAllocation: builder.mutation<PaymentAllocationLine, { receiptId: string; allocationId: string; reason: string }>({
      query: ({ receiptId, allocationId, reason }) => ({
        url: `/finance/receipts/${receiptId}/allocations/${allocationId}/reverse`, method: 'POST', body: { reason },
      }),
      transformResponse: (response: unknown) => dataOf<PaymentAllocationLine>(response as ApiResponse<PaymentAllocationLine>),
      invalidatesTags: (result, _error, { receiptId }) => [
        { type: 'PaymentAllocation', id: 'QUEUE' },
        { type: 'PaymentAllocation', id: `TARGETS-${receiptId}` },
        { type: 'PaymentAllocation', id: `HISTORY-${receiptId}` },
        'OrderPayment',
        'SalesInvoice',
        ...(result?.orderId
          ? [
              { type: 'SalesOrder' as const, id: result.orderId },
              { type: 'SalesInvoice' as const, id: `ORDER-${result.orderId}` },
              { type: 'OrderPayment' as const, id: result.orderId },
            ]
          : []),
        { type: 'SalesOrder', id: 'LIST' },
        'CustomerDebt',
        { type: 'AuditLog', id: `PAYMENT_RECEIPT:${receiptId}` },
        { type: 'AuditLog', id: 'PAYMENT_RECEIPT:ALL' },
      ],
    }),
  }),
})

export const {
  useGetUnallocatedReceiptsQuery,
  useGetPaymentAllocationTargetsQuery,
  useGetPaymentAllocationsQuery,
  useCreatePaymentAllocationMutation,
  useReversePaymentAllocationMutation,
} = paymentAllocationApi
