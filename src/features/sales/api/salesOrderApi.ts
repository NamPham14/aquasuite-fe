import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  CreateSalesOrderRequest,
  CreditCheckRequest,
  CreditCheckResponse,
  CustomerDebtDetailResponse,
  OrderPaymentSummaryResponse,
  SalesOrderDetailResponse,
  SalesOrderFilterParams,
  SalesOrderSummaryResponse,
  UpdateOrderFulfillmentRequest,
} from '../types/salesOrder.types'

function cleanParams(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val
    }
  }
  return result
}

export const salesOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSalesOrders: builder.query<PageResponse<SalesOrderSummaryResponse>, SalesOrderFilterParams | void>({
      query: (params) => {
        let mappedParams: Record<string, unknown> | undefined
        if (params) {
          const { page, ...rest } = params
          mappedParams = {
            ...rest,
            page: page !== undefined ? Math.max(0, page - 1) : 0,
          }
        }
        return {
          url: '/sales/orders',
          params: mappedParams ? cleanParams(mappedParams) : undefined,
        }
      },
      transformResponse: (res: any) => {
        const payload = res?.data ?? res
        // Chuẩn hóa cấu trúc Page từ Spring Data (page, size, totalElements, totalPages, content)
        if (payload?.content && Array.isArray(payload.content)) {
          return {
            items: payload.content,
            totalElements: payload.totalElements ?? payload.content.length,
            page: (payload.number ?? 0) + 1,
            size: payload.size ?? 20,
            totalPages: payload.totalPages ?? 1,
          }
        }
        return payload
      },
      providesTags: (result) => [
        { type: 'SalesOrder', id: 'LIST' },
        ...(result?.items?.map(({ orderId }) => ({ type: 'SalesOrder' as const, id: orderId })) ?? []),
      ],
    }),

    getSalesOrderById: builder.query<SalesOrderDetailResponse, string>({
      query: (orderId) => `/sales/orders/${orderId}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'SalesOrder', id }],
    }),

    createSalesOrder: builder.mutation<SalesOrderDetailResponse, CreateSalesOrderRequest>({
      query: (body) => ({
        url: '/sales/orders',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'Quotation', id: 'CUSTOMER_OPTIONS' },
      ],
    }),

    // ========== TÍCH HỢP HÀO (CREDIT CONTROL) ==========
    getCustomerDebtDetail: builder.query<CustomerDebtDetailResponse, string>({
      query: (customerId) => `/finance/customer-debts/${customerId}`,
      transformResponse: (res: any) => res?.data ?? res,
    }),

    checkCustomerCredit: builder.mutation<CreditCheckResponse, { customerId: string; body: CreditCheckRequest }>({
      query: ({ customerId, body }) => ({
        url: `/finance/customer-debts/${customerId}/credit-check`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),

    // ========== TÍCH HỢP NAM (FINANCE PAYMENT SUMMARY) ==========
    getOrderPaymentSummary: builder.query<OrderPaymentSummaryResponse, string>({
      query: (orderId) => `/finance/orders/${orderId}/payment-summary`,
      transformResponse: (res: any) => res?.data ?? res,
    }),

    // ========== QUẢN LÝ ĐIỀU PHỐI & HOÀN TẤT ĐƠN HÀNG (UC-21.2) ==========
    updateOrderFulfillment: builder.mutation<
      SalesOrderDetailResponse,
      { orderId: string; body: UpdateOrderFulfillmentRequest }
    >({
      query: ({ orderId, body }) => ({
        url: `/sales/orders/${orderId}/fulfillment`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),

    completeSalesOrder: builder.mutation<SalesOrderDetailResponse, string>({
      query: (orderId) => ({
        url: `/sales/orders/${orderId}/complete`,
        method: 'PATCH',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, orderId) => [
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetSalesOrdersQuery,
  useGetSalesOrderByIdQuery,
  useCreateSalesOrderMutation,
  useGetCustomerDebtDetailQuery,
  useLazyGetCustomerDebtDetailQuery,
  useCheckCustomerCreditMutation,
  useGetOrderPaymentSummaryQuery,
  useUpdateOrderFulfillmentMutation,
  useCompleteSalesOrderMutation,
} = salesOrderApi
