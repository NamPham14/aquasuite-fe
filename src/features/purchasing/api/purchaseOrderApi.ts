import { baseApi } from '../../../shared/api/baseApi'
import type { PageResponse } from '../../../shared/api/types'
import type {
  PurchaseOrderResponse,
  PurchaseOrderListItemResponse,
  PurchaseOrderFilterParams,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  CancelPurchaseOrderRequest,
  ClosePurchaseOrderRequest,
  LowStockSuggestionResponse,
  SupplierItemOptionResponse,
  SupplierOptionResponse,
} from '../types/purchaseOrder.types'

export const purchaseOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query<
      PageResponse<PurchaseOrderListItemResponse>,
      PurchaseOrderFilterParams | void
    >({
      query: (params) => {
        const queryParams = new URLSearchParams()
        const pageIndex = params?.page !== undefined ? Math.max(0, params.page - 1) : 0
        queryParams.append('page', String(pageIndex))
        if (params?.size !== undefined) queryParams.append('size', String(params.size))
        if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
        if (params?.direction) queryParams.append('sortDirection', params.direction)
        if (params?.search) queryParams.append('search', params.search)
        if (params?.supplierId) queryParams.append('supplierId', params.supplierId)
        if (params?.status) queryParams.append('status', params.status)
        if (params?.fromDate) queryParams.append('fromDate', params.fromDate)
        if (params?.toDate) queryParams.append('toDate', params.toDate)

        const qs = queryParams.toString()
        return {
          url: `/purchasing/purchase-orders${qs ? `?${qs}` : ''}`,
          method: 'GET',
        }
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (result) => [
        { type: 'PurchaseOrder', id: 'LIST' },
        ...(result?.items?.map(({ purchaseOrderId }) => ({
          type: 'PurchaseOrder' as const,
          id: purchaseOrderId,
        })) ?? []),
      ],
    }),

    getPurchaseOrder: builder.query<PurchaseOrderResponse, string>({
      query: (id) => `/purchasing/purchase-orders/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'PurchaseOrder', id }],
    }),

    createPurchaseOrder: builder.mutation<PurchaseOrderResponse, CreatePurchaseOrderRequest>({
      query: (body) => ({
        url: '/purchasing/purchase-orders',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'PurchaseOrder', id: 'LIST' }],
    }),

    updatePurchaseOrder: builder.mutation<
      PurchaseOrderResponse,
      { id: string; body: UpdatePurchaseOrderRequest }
    >({
      query: ({ id, body }) => ({
        url: `/purchasing/purchase-orders/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'PurchaseOrder', id },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    confirmPurchaseOrder: builder.mutation<PurchaseOrderResponse, string>({
      query: (id) => ({
        url: `/purchasing/purchase-orders/${id}/confirm`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, id) => [
        { type: 'PurchaseOrder', id },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    cancelPurchaseOrder: builder.mutation<
      PurchaseOrderResponse,
      { id: string; body: CancelPurchaseOrderRequest }
    >({
      query: ({ id, body }) => ({
        url: `/purchasing/purchase-orders/${id}/cancel`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'PurchaseOrder', id },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    closePurchaseOrder: builder.mutation<
      PurchaseOrderResponse,
      { id: string; body: ClosePurchaseOrderRequest }
    >({
      query: ({ id, body }) => ({
        url: `/purchasing/purchase-orders/${id}/close`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'PurchaseOrder', id },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    getLowStockSuggestions: builder.query<LowStockSuggestionResponse[], string>({
      query: (supplierId) => `/purchasing/purchase-orders/low-stock-suggestions?supplierId=${encodeURIComponent(supplierId)}`,
      transformResponse: (res: any) => res?.data ?? res,
    }),

    getSupplierItems: builder.query<
      SupplierItemOptionResponse[],
      { supplierId: string; all?: boolean }
    >({
      query: ({ supplierId, all }) =>
        `/purchasing/purchase-orders/supplier-items?supplierId=${encodeURIComponent(supplierId)}${all ? '&all=true' : ''}`,
      transformResponse: (res: any) => res?.data ?? res,
    }),

    getActiveSuppliers: builder.query<SupplierOptionResponse[], void>({
      query: () => '/purchasing/purchase-orders/suppliers',
      transformResponse: (res: any) => res?.data ?? res,
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useConfirmPurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useClosePurchaseOrderMutation,
  useLazyGetLowStockSuggestionsQuery,
  useGetSupplierItemsQuery,
  useGetActiveSuppliersQuery,
} = purchaseOrderApi
