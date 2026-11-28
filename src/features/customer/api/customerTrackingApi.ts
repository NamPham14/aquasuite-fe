import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { CustomerDebtDetail } from '../../finance/types/customerDebt.types.ts'
import type {
  QuotationListItemResponse,
  QuotationResponse,
} from '../../sales/types/quotation.types.ts'
import type {
  SalesOrderDetailResponse,
  SalesOrderSummaryResponse,
} from '../../sales/types/salesOrder.types.ts'
import type { CustomerDeliveryTracking } from '../types/tracking.types.ts'

function requireApiData<T>(res: ApiResponse<T>, label: string): T {
  if (res.data === undefined || res.data === null) {
    throw new Error(res.message || `Không nhận được dữ liệu ${label}`)
  }
  return res.data
}

export const customerTrackingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyDebtDetail: builder.query<CustomerDebtDetail, void>({
      query: () => '/finance/customer-debts/me',
      transformResponse: (res: ApiResponse<CustomerDebtDetail>) =>
        requireApiData(res, 'công nợ'),
      providesTags: [{ type: 'CustomerDebt', id: 'ME' }],
    }),
    getMyCustomerDeliveries: builder.query<CustomerDeliveryTracking[], void>({
      query: () => '/fulfillment/customer/deliveries',
      transformResponse: (res: ApiResponse<CustomerDeliveryTracking[]>) => res.data ?? [],
      providesTags: [{ type: 'OnlineOrder', id: 'DELIVERIES' }],
    }),
    getMyCustomerDeliveryPhoto: builder.query<string, { id: string; photoId: string }>({
      query: ({ id, photoId }) => ({
        url: `/fulfillment/customer/deliveries/${id}/photos/${photoId}`,
        cache: 'no-store',
        responseHandler: async (response) =>
          response.ok ? URL.createObjectURL(await response.blob()) : response.json(),
      }),
      keepUnusedDataFor: 0,
      async onCacheEntryAdded(_arg, { cacheDataLoaded, cacheEntryRemoved }) {
        try {
          const { data } = await cacheDataLoaded
          await cacheEntryRemoved
          URL.revokeObjectURL(data)
        } catch {
          /* Không có object URL hợp lệ khi tải ảnh thất bại */
        }
      },
    }),
    getMyAllOrders: builder.query<SalesOrderSummaryResponse[], void>({
      query: () => '/sales/orders/me',
      transformResponse: (res: ApiResponse<SalesOrderSummaryResponse[]>) => res.data ?? [],
      providesTags: [{ type: 'SalesOrder', id: 'ME_LIST' }],
    }),
    getMyOrderDetail: builder.query<SalesOrderDetailResponse, string>({
      query: (orderId) => `/sales/orders/me/${orderId}`,
      transformResponse: (res: ApiResponse<SalesOrderDetailResponse>) =>
        requireApiData(res, 'đơn hàng'),
      providesTags: (_result, _error, orderId) => [{ type: 'SalesOrder', id: orderId }],
    }),
    getMyQuotations: builder.query<QuotationListItemResponse[], void>({
      query: () => '/sales/quotations/me',
      transformResponse: (res: ApiResponse<QuotationListItemResponse[]>) => res.data ?? [],
      providesTags: [{ type: 'Quotation', id: 'ME_LIST' }],
    }),
    getMyQuotationDetail: builder.query<QuotationResponse, string>({
      query: (quotationId) => `/sales/quotations/me/${quotationId}`,
      transformResponse: (res: ApiResponse<QuotationResponse>) =>
        requireApiData(res, 'báo giá'),
      providesTags: (_result, _error, quotationId) => [{ type: 'Quotation', id: quotationId }],
    }),
  }),
})

export const {
  useGetMyDebtDetailQuery,
  useGetMyCustomerDeliveriesQuery,
  useGetMyCustomerDeliveryPhotoQuery,
  useGetMyAllOrdersQuery,
  useGetMyOrderDetailQuery,
  useGetMyQuotationsQuery,
  useGetMyQuotationDetailQuery,
} = customerTrackingApi
