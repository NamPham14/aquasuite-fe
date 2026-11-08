import { baseApi } from '../../../shared/api/baseApi.ts'
import type {
  CreateGoodsReceiptRequest,
  GoodsReceiptResponse,
  ReceivablePurchaseOrderView,
} from '../types/goodsReceipt.types.ts'

/**
 * Endpoints RTK Query cho nghiệp vụ Nhập kho theo đơn mua hàng (UC-32).
 * Dùng chung baseApi; tạo phiếu sẽ invalidate cả GoodsReceipt lẫn PurchaseOrder
 * để màn chi tiết PO (tiến độ nhận + lịch sử phiếu) tự cập nhật.
 */
export const goodsReceiptApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Lấy snapshot PO (dòng còn phải nhận) để lập phiếu. */
    getReceivablePurchaseOrder: builder.query<ReceivablePurchaseOrderView, string>({
      query: (purchaseOrderId) => `/inventory/goods-receipts/receivable/${purchaseOrderId}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, poId) => [{ type: 'GoodsReceipt', id: `RECEIVABLE-${poId}` }],
    }),

    /** Lập và xác nhận phiếu nhập kho (một hành động atomic). */
    createGoodsReceipt: builder.mutation<GoodsReceiptResponse, CreateGoodsReceiptRequest>({
      query: (body) => ({
        url: '/inventory/goods-receipts',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, body) => [
        { type: 'GoodsReceipt', id: 'LIST' },
        { type: 'GoodsReceipt', id: `RECEIVABLE-${body.purchaseOrderId}` },
        { type: 'GoodsReceipt', id: `PO-${body.purchaseOrderId}` },
        // Đồng bộ lại tiến độ nhận trên màn chi tiết đơn mua hàng.
        { type: 'PurchaseOrder', id: body.purchaseOrderId },
        { type: 'PurchaseOrder', id: 'LIST' },
      ],
    }),

    /** Chi tiết một phiếu nhập kho kèm danh sách dòng. */
    getGoodsReceipt: builder.query<GoodsReceiptResponse, string>({
      query: (goodsReceiptId) => `/inventory/goods-receipts/${goodsReceiptId}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'GoodsReceipt', id }],
    }),

    /** Danh sách phiếu nhập kho của một đơn mua hàng (mới nhất trước). */
    getGoodsReceiptsByPurchaseOrder: builder.query<GoodsReceiptResponse[], string>({
      query: (purchaseOrderId) =>
        `/inventory/goods-receipts/by-purchase-order/${purchaseOrderId}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, poId) => [{ type: 'GoodsReceipt', id: `PO-${poId}` }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetReceivablePurchaseOrderQuery,
  useCreateGoodsReceiptMutation,
  useGetGoodsReceiptQuery,
  useGetGoodsReceiptsByPurchaseOrderQuery,
} = goodsReceiptApi
