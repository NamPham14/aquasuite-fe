import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PaymentVerificationItem, PaymentVerificationPage } from '../types/paymentVerification.types.ts'

/**
 * API UC-70 — kế toán xem, xác minh hoặc từ chối khoản chuyển khoản đang chờ.
 * Quyết định xác minh làm thay đổi tiền đã thu nên invalidate thêm 'OrderPayment' và 'SalesOrder'.
 */
export const paymentVerificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Danh sách khoản chuyển khoản đang chờ xác minh, lọc tùy chọn theo đơn. */
    getPaymentVerifications: builder.query<
      PaymentVerificationPage,
      { orderId?: string; status?: string; page?: number; size?: number } | void
    >({
      query: (params) => ({
        url: '/finance/payment-verifications',
        params: {
          orderId: params?.orderId || undefined,
          status: params?.status || 'PENDING',
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'PaymentVerification', id: 'LIST' }],
    }),

    /** Chi tiết một khoản chờ để đối chiếu. */
    getPaymentVerificationDetail: builder.query<PaymentVerificationItem, string>({
      query: (paymentId) => `/finance/payment-verifications/${paymentId}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, paymentId) => [{ type: 'PaymentVerification', id: paymentId }],
    }),

    /** Xác minh một khoản đang chờ. */
    verifyPayment: builder.mutation<PaymentVerificationItem, { paymentId: string; orderId: string }>({
      query: ({ paymentId }) => ({
        url: `/finance/payment-verifications/${paymentId}/verify`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'PaymentVerification', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
        { type: 'SalesOrder', id: orderId },
      ],
    }),

    /** Từ chối một khoản đang chờ với lý do bắt buộc. */
    rejectPayment: builder.mutation<
      PaymentVerificationItem,
      { paymentId: string; orderId: string; reason: string }
    >({
      query: ({ paymentId, reason }) => ({
        url: `/finance/payment-verifications/${paymentId}/reject`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { orderId }) => [
        { type: 'PaymentVerification', id: 'LIST' },
        { type: 'OrderPayment', id: orderId },
      ],
    }),
  }),
})

export const {
  useGetPaymentVerificationsQuery,
  useGetPaymentVerificationDetailQuery,
  useVerifyPaymentMutation,
  useRejectPaymentMutation,
} = paymentVerificationApi
