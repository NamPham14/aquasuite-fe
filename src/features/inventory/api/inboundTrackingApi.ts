import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  InventoryInboundKpiResponse,
  MovementGroupFilter,
  ReadableStockMovementResponse,
  VariantInboundDetailResponse,
  VariantInboundSummaryResponse,
} from '../types/inboundTracking.types.ts'

function toPageResponse<T>(res: any): PageResponse<T> {
  const data = res?.data ?? res ?? {}
  return {
    items: data.content ?? [],
    page: (data.number ?? 0) + 1,
    size: data.size ?? 0,
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  }
}

/**
 * RTK Query endpoints cho theo dõi Đơn mua đang về (PO/GRN) và Thẻ kho tường minh.
 * Tách riêng khỏi inventoryApi.ts để giữ nguyên contract và unit test của UC-17.1 / UC-17.2.
 */
export const inboundTrackingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventoryInboundKpi: builder.query<InventoryInboundKpiResponse, void>({
      query: () => '/inventory/inbound-tracking/kpi-overview',
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [
        { type: 'Inventory', id: 'LIST' },
        { type: 'GoodsReceipt', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    getInventoryInboundSummaries: builder.query<
      Record<string, VariantInboundSummaryResponse>,
      string[]
    >({
      query: (variantIds) => {
        const qs = new URLSearchParams()
        for (const id of variantIds) {
          if (id) qs.append('variantIds', id)
        }
        return {
          url: `/inventory/inbound-tracking/summaries?${qs.toString()}`,
          method: 'GET',
        }
      },
      transformResponse: (res: any) => res?.data ?? res ?? {},
      providesTags: [
        { type: 'Inventory', id: 'LIST' },
        { type: 'GoodsReceipt', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    getVariantPurchaseOrders: builder.query<
      VariantInboundDetailResponse,
      { variantId: string; includeCompleted?: boolean }
    >({
      query: ({ variantId, includeCompleted = false }) => {
        const qs = new URLSearchParams()
        if (includeCompleted) qs.append('includeCompleted', 'true')
        const suffix = qs.toString() ? `?${qs.toString()}` : ''
        return {
          url: `/inventory/inbound-tracking/variants/${variantId}/purchase-orders${suffix}`,
          method: 'GET',
        }
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, { variantId }) => [
        { type: 'Inventory', id: variantId },
        { type: 'Inventory', id: 'LIST' },
        { type: 'GoodsReceipt', id: 'LIST' },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    getReadableStockMovements: builder.query<
      PageResponse<ReadableStockMovementResponse>,
      { variantId: string; group?: MovementGroupFilter; page?: number; size?: number }
    >({
      query: ({ variantId, group = 'ALL', page = 1, size = 20 }) => {
        const qs = new URLSearchParams()
        qs.append('group', group)
        qs.append('page', String(Math.max(0, page - 1)))
        qs.append('size', String(size))
        return {
          url: `/inventory/inbound-tracking/variants/${variantId}/movements?${qs.toString()}`,
          method: 'GET',
        }
      },
      transformResponse: (res: any) => toPageResponse<ReadableStockMovementResponse>(res),
      providesTags: (_res, _err, { variantId }) => [
        { type: 'Inventory', id: variantId },
        { type: 'Inventory', id: `MOVEMENTS-${variantId}` },
        { type: 'GoodsReceipt', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetInventoryInboundKpiQuery,
  useGetInventoryInboundSummariesQuery,
  useGetVariantPurchaseOrdersQuery,
  useGetReadableStockMovementsQuery,
} = inboundTrackingApi
