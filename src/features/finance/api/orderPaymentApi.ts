import { baseApi } from '../../../shared/api/baseApi.ts'
import type {
  OrderMilestoneProgressResponse,
  OrderPaymentResponse,
  RecordOrderPaymentRequest,
} from '../types/orderPayment.types.ts'

/**
 * API UC-23 — ghi nhận và theo dõi thanh toán của đơn hàng (module Finance).
 *
 * Mọi endpoint dùng chung tag 'OrderPayment' theo orderId để một lần ghi nhận
 * tự làm mới lịch sử, tiến độ mốc và tổng quan; đồng thời invalidate 'SalesOrder'
 * để trạng thái thanh toán trên màn đơn (UC-21) được cập nhật theo.
 */
export const orderPaymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Lấy lịch sử giao dịch thu tiền của đơn (gồm cả khoản PENDING). */
    getOrderPayments: builder.query<OrderPaymentResponse[], string>({
      query: (orderId) => `/finance/orders/${orderId}/payments`,
      transformResponse: (res: any) => res?.data ?? res ?? [],
      providesTags: (_res, _err, orderId) => [{ type: 'OrderPayment', id: orderId }],
    }),

    /** Lấy tiến độ thanh toán theo từng mốc của đơn. */
    getOrderMilestoneProgress: builder.query<OrderMilestoneProgressResponse, string>({
      query: (orderId) => `/finance/orders/${orderId}/payment-milestones`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, orderId) => [{ type: 'OrderPayment', id: orderId }],
    }),

    /** Ghi nhận một khoản thanh toán cho đơn (tiền mặt -> VERIFIED, chuyển khoản -> PENDING). */
    recordOrderPayment: builder.mutation<
      OrderPaymentResponse,
      { orderId: string; body: RecordOrderPaymentRequest }
    >({
      query: ({ orderId, body }) => ({
        url: `/finance/orders/${orderId}/payments`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'OrderPayment', id: orderId },
        { type: 'SalesOrder', id: orderId },
      ],
    }),

    /** Tải nội dung chứng từ (ảnh/PDF) của một giao dịch để xem lại. */
    getOrderPaymentProof: builder.query<Blob, { orderId: string; paymentId: string }>({
      query: ({ orderId, paymentId }) => ({
        url: `/finance/orders/${orderId}/payments/${paymentId}/proof`,
        responseHandler: (response) => response.blob(),
      }),
      // Không cache lâu: luôn lấy bản mới khi người dùng bấm xem.
      keepUnusedDataFor: 0,
    }),

    /** Đính kèm chứng từ (ảnh/PDF) cho một khoản chuyển khoản đang chờ. */
    uploadOrderPaymentProof: builder.mutation<
      void,
      { orderId: string; paymentId: string; file: File }
    >({
      query: ({ orderId, paymentId, file }) => {
        const form = new FormData()
        form.append('file', file)
        return {
          url: `/finance/orders/${orderId}/payments/${paymentId}/proof`,
          method: 'POST',
          body: form,
        }
      },
      invalidatesTags: (_res, _err, { orderId }) => [{ type: 'OrderPayment', id: orderId }],
    }),
  }),
})

export const {
  useGetOrderPaymentsQuery,
  useGetOrderMilestoneProgressQuery,
  useRecordOrderPaymentMutation,
  useUploadOrderPaymentProofMutation,
  useLazyGetOrderPaymentProofQuery,
} = orderPaymentApi
