import { useCallback } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import {
  useGetCheckoutPreviewQuery,
  usePlaceOnlineOrderMutation,
  useVerifyPayosPaymentMutation,
  useCreateOrRefreshPayosPaymentLinkMutation,
} from '../api/onlineCheckoutApi.ts'
import { placeOnlineOrderSchema } from '../schemas/onlineCheckout.schema.ts'
import type {
  OnlineOrderCheckoutResponse,
  PlaceOnlineOrderRequest,
} from '../types/onlineCheckout.types.ts'

/**
 * Hook điều phối quy trình Đặt hàng & Thanh toán PayOS trực tuyến (UC-18).
 */
export function useOnlineCheckout(enabled = true) {
  const previewQuery = useGetCheckoutPreviewQuery(undefined, { skip: !enabled })
  const [placeOnlineOrderMutation, { isLoading: isPlacingOrder }] = usePlaceOnlineOrderMutation()
  const [verifyPayosMutation, { isLoading: isVerifyingPayos }] = useVerifyPayosPaymentMutation()
  const [refreshLinkMutation, { isLoading: isRefreshingLink }] = useCreateOrRefreshPayosPaymentLinkMutation()

  const handlePlaceOrder = useCallback(
    async (payload: PlaceOnlineOrderRequest): Promise<OnlineOrderCheckoutResponse | null> => {
      const parsed = placeOnlineOrderSchema.safeParse(payload)
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        toast.error(firstIssue?.message ?? 'Thông tin đặt hàng không hợp lệ')
        return null
      }

      try {
        const order = await placeOnlineOrderMutation(parsed.data).unwrap()
        toast.success(
          order.paymentMethod === 'BANK_TRANSFER'
            ? `Đã tạo đơn hàng ${order.orderCode}. Vui lòng quét mã VietQR PayOS để thanh toán.`
            : `Đặt hàng COD thành công! Mã đơn: ${order.orderCode}`,
        )
        return order
      } catch (err) {
        const normalized = normalizeApiError(err)
        toast.error(normalized.message || 'Không thể đặt hàng trực tuyến')
        return null
      }
    },
    [placeOnlineOrderMutation],
  )

  const handleVerifyPayos = useCallback(
    async (orderId: string, silent = false): Promise<OnlineOrderCheckoutResponse | null> => {
      try {
        const res = await verifyPayosMutation(orderId).unwrap()
        if (!silent) {
          if (res.paymentStatus === 'PAID') {
            toast.success('Hệ thống PayOS đã xác nhận thanh toán thành công!')
          } else {
            toast.info(`Trạng thái PayOS hiện tại: ${res.payosPayment?.status ?? 'PENDING'}`)
          }
        }
        return res
      } catch (err) {
        if (!silent) {
          const normalized = normalizeApiError(err)
          toast.error(normalized.message || 'Không thể kiểm tra trạng thái PayOS')
        }
        return null
      }
    },
    [verifyPayosMutation],
  )

  const handleRefreshPayosLink = useCallback(
    async (orderId: string): Promise<OnlineOrderCheckoutResponse | null> => {
      try {
        const res = await refreshLinkMutation(orderId).unwrap()
        toast.success('Đã cập nhật link thanh toán PayOS mới')
        return res
      } catch (err) {
        const normalized = normalizeApiError(err)
        toast.error(normalized.message || 'Không thể tạo lại link thanh toán PayOS')
        return null
      }
    },
    [refreshLinkMutation],
  )

  return {
    preview: previewQuery.data,
    isLoadingPreview: previewQuery.isLoading,
    isFetchingPreview: previewQuery.isFetching,
    previewError: previewQuery.error,
    refetchPreview: previewQuery.refetch,
    isPlacingOrder,
    isVerifyingPayos,
    isRefreshingLink,
    handlePlaceOrder,
    handleVerifyPayos,
    handleRefreshPayosLink,
  }
}

