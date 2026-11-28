import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  ConfirmOnlineOrderRequest,
  CreateDraftInvoiceRequest,
  CreateSalesOrderRequest,
  CreditCheckRequest,
  CreditCheckResponse,
  CustomerCreditSummaryResponse,
  OrderPaymentSummaryResponse,
  RejectOnlineOrderRequest,
  SalesInvoiceResponse,
  SalesOrderDetailResponse,
  SalesOrderFilterParams,
  SalesOrderSummaryResponse,
  UpdateOrderFulfillmentRequest,
  UpdateSalesInvoiceRequest,
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
      invalidatesTags: (res) => [
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesOrder', id: 'ME_LIST' },
        { type: 'Quotation', id: 'CUSTOMER_OPTIONS' },
        { type: 'SalesCatalog', id: 'LIST' },
        'Inventory',
        { type: 'CustomerDebt', id: 'LIST' },
        { type: 'CustomerDebt', id: 'STATS' },
        { type: 'CustomerDebt', id: 'ME' },
        ...(res?.customerId ? [{ type: 'CustomerDebt' as const, id: res.customerId }] : []),
      ],
    }),

    // ========== TÍCH HỢP HÀO (CREDIT CONTROL) ==========
    getCustomerCreditSummary: builder.query<CustomerCreditSummaryResponse, string>({
      query: (customerId) => `/finance/credit-control/customers/${customerId}/summary`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, customerId) => [
        { type: 'CustomerDebt', id: customerId },
        { type: 'CustomerDebt', id: 'LIST' },
      ],
      keepUnusedDataFor: 0,
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
      // Dùng chung tag 'OrderPayment' với các endpoint UC-23 để tự làm mới sau khi ghi nhận.
      providesTags: (_res, _err, orderId) => [
        { type: 'OrderPayment', id: orderId },
        { type: 'OrderPayment', id: 'LIST' },
      ],
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
        { type: 'SalesOrder', id: 'ME_LIST' },
        'OnlineOrder',
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
        { type: 'SalesOrder', id: 'ME_LIST' },
        'OnlineOrder',
        { type: 'WarrantyRecord', id: 'LIST' },
        { type: 'WarrantyRecord', id: 'MY_LIST' },
        'CustomerDebt',
      ],
    }),

    // ========== XÁC NHẬN & XỬ LÝ ĐƠN HÀNG ONLINE (UC-22) ==========
    confirmOnlineOrder: builder.mutation<
      SalesOrderDetailResponse,
      { orderId: string; body?: ConfirmOnlineOrderRequest }
    >({
      query: ({ orderId, body }) => ({
        url: `/sales/orders/${orderId}/confirm`,
        method: 'PATCH',
        body: body ?? {},
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesOrder', id: 'ME_LIST' },
        'OnlineOrder',
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
        { type: 'StockReservation', id: orderId },
        { type: 'StockReservation', id: 'ORDER_LIST' },
        'Inventory',
        { type: 'SalesCatalog', id: 'LIST' },
      ],
    }),

    rejectOnlineOrder: builder.mutation<
      SalesOrderDetailResponse,
      { orderId: string; body: RejectOnlineOrderRequest }
    >({
      query: ({ orderId, body }) => ({
        url: `/sales/orders/${orderId}/reject`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesOrder', id: 'ME_LIST' },
        'OnlineOrder',
        { type: 'OrderPayment', id: orderId },
        { type: 'StockReservation', id: orderId },
        { type: 'StockReservation', id: 'ORDER_LIST' },
        'Inventory',
        { type: 'SalesCatalog', id: 'LIST' },
      ],
    }),

    syncOnlineOrderPayosPayment: builder.mutation<SalesOrderDetailResponse, string>({
      query: (orderId) => ({
        url: `/sales/orders/${orderId}/payos/sync`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, orderId) => [
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesOrder', id: 'ME_LIST' },
        'OnlineOrder',
        { type: 'OrderPayment', id: orderId },
        { type: 'PaymentAllocation', id: 'QUEUE' },
        'CustomerDebt',
      ],
    }),

    // ========== QUẢN LÝ HÓA ĐƠN BÁN HÀNG (DRAFT -> ISSUED) ==========
    getOrderInvoices: builder.query<SalesInvoiceResponse[], string>({
      query: (orderId) => `/sales/orders/${orderId}/invoices`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, orderId) => [
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
        { type: 'SalesInvoice', id: 'LIST' },
      ],
    }),

    createDraftInvoice: builder.mutation<
      SalesInvoiceResponse,
      { orderId: string; body: CreateDraftInvoiceRequest }
    >({
      query: ({ orderId, body }) => ({
        url: `/sales/orders/${orderId}/invoices`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
      ],
    }),

    updateDraftInvoice: builder.mutation<
      SalesInvoiceResponse,
      { invoiceId: string; orderId: string; body: UpdateSalesInvoiceRequest }
    >({
      query: ({ invoiceId, body }) => ({
        url: `/sales/invoices/${invoiceId}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
      ],
    }),

    issueSalesInvoice: builder.mutation<
      SalesInvoiceResponse,
      { invoiceId: string; orderId: string }
    >({
      query: ({ invoiceId }) => ({
        url: `/sales/invoices/${invoiceId}/issue`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
        'Delivery',
        { type: 'PaymentAllocation', id: 'QUEUE' },
        'CustomerDebt',
      ],
    }),

    cancelDraftInvoice: builder.mutation<void, { invoiceId: string; orderId: string }>({
      query: ({ invoiceId }) => ({
        url: `/sales/invoices/${invoiceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
        { type: 'SalesInvoice', id: 'LIST' },
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
      ],
    }),
  }),
})

export const {
  useGetSalesOrdersQuery,
  useGetSalesOrderByIdQuery,
  useCreateSalesOrderMutation,
  useGetCustomerCreditSummaryQuery,
  useLazyGetCustomerCreditSummaryQuery,
  useCheckCustomerCreditMutation,
  useGetOrderPaymentSummaryQuery,
  useUpdateOrderFulfillmentMutation,
  useCompleteSalesOrderMutation,
  useConfirmOnlineOrderMutation,
  useRejectOnlineOrderMutation,
  useSyncOnlineOrderPayosPaymentMutation,
  useGetOrderInvoicesQuery,
  useCreateDraftInvoiceMutation,
  useUpdateDraftInvoiceMutation,
  useIssueSalesInvoiceMutation,
  useCancelDraftInvoiceMutation,
} = salesOrderApi
