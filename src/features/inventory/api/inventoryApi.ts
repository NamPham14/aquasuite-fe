import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  InventoryFilterParams,
  InventoryListItem,
  StockMovement,
  StockSummary,
  UpdateThresholdRequest,
} from '../types/inventory.types.ts'

/**
 * Chuyển Spring Page JSON ({ content, number, size, totalElements, totalPages })
 * về PageResponse chuẩn của FE ({ items, page 1-based, size, totalElements, totalPages }).
 */
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
 * Endpoints RTK Query cho UC-31 (Tra cứu & Quản lý Tồn kho).
 * Tra cứu dùng chung tag 'Inventory'; cập nhật ngưỡng invalidate lại danh sách và chi tiết SKU.
 */
export const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Tra cứu danh sách tồn kho có phân trang + lọc theo từ khóa, trạng thái, cờ tồn thấp.
     * BE dùng Spring Pageable: page 0-based, sort="field,dir".
     */
    searchInventory: builder.query<PageResponse<InventoryListItem>, InventoryFilterParams | void>({
      query: (params) => {
        const qs = new URLSearchParams()
        const pageIndex = params?.page !== undefined ? Math.max(0, params.page - 1) : 0
        qs.append('page', String(pageIndex))
        if (params?.size !== undefined) qs.append('size', String(params.size))
        if (params?.sortBy) qs.append('sort', `${params.sortBy},${params.direction ?? 'desc'}`)
        if (params?.keyword) qs.append('keyword', params.keyword)
        if (params?.status) qs.append('status', params.status)
        if (params?.lowStockOnly) qs.append('lowStockOnly', 'true')
        return { url: `/inventory?${qs.toString()}`, method: 'GET' }
      },
      transformResponse: (res: any) => toPageResponse<InventoryListItem>(res),
      providesTags: (result) => [
        { type: 'Inventory', id: 'LIST' },
        ...(result?.items?.map(({ variantId }) => ({ type: 'Inventory' as const, id: variantId })) ?? []),
      ],
    }),

    /** Danh sách SKU đang ở mức tồn thấp (toàn kho) — phục vụ giám sát/cảnh báo. */
    getLowStock: builder.query<PageResponse<InventoryListItem>, InventoryFilterParams | void>({
      query: (params) => {
        const qs = new URLSearchParams()
        const pageIndex = params?.page !== undefined ? Math.max(0, params.page - 1) : 0
        qs.append('page', String(pageIndex))
        if (params?.size !== undefined) qs.append('size', String(params.size))
        return { url: `/inventory/low-stock?${qs.toString()}`, method: 'GET' }
      },
      transformResponse: (res: any) => toPageResponse<InventoryListItem>(res),
      providesTags: [{ type: 'Inventory', id: 'LOW_STOCK' }],
    }),

    /** Tồn kho chi tiết của một SKU. */
    getInventoryDetail: builder.query<StockSummary, string>({
      query: (variantId) => `/inventory/${variantId}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, variantId) => [{ type: 'Inventory', id: variantId }],
    }),

    /** Lịch sử thẻ kho của một SKU (mới nhất trước), có phân trang. */
    getStockMovements: builder.query<PageResponse<StockMovement>, { variantId: string; page?: number; size?: number }>({
      query: ({ variantId, page = 1, size = 10 }) => {
        const qs = new URLSearchParams()
        qs.append('page', String(Math.max(0, page - 1)))
        qs.append('size', String(size))
        return { url: `/inventory/${variantId}/movements?${qs.toString()}`, method: 'GET' }
      },
      transformResponse: (res: any) => toPageResponse<StockMovement>(res),
      providesTags: (_res, _err, { variantId }) => [{ type: 'Inventory', id: `MOVEMENTS-${variantId}` }],
    }),

    /**
     * Cấu hình ngưỡng tồn an toàn (min/max) của một SKU — chỉ Chủ cửa hàng.
     * Invalidate danh sách + chi tiết để UI phản ánh trạng thái tồn thấp mới ngay.
     */
    updateThreshold: builder.mutation<StockSummary, { variantId: string; body: UpdateThresholdRequest }>({
      query: ({ variantId, body }) => ({
        url: `/inventory/${variantId}/threshold`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { variantId }) => [
        { type: 'Inventory', id: variantId },
        { type: 'Inventory', id: 'LIST' },
        { type: 'Inventory', id: 'LOW_STOCK' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useSearchInventoryQuery,
  useGetLowStockQuery,
  useGetInventoryDetailQuery,
  useGetStockMovementsQuery,
  useUpdateThresholdMutation,
} = inventoryApi
