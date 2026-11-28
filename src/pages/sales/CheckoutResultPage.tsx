import { useEffect, useRef } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  LogIn,
  Package,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { formatVnd } from '../../shared/lib/money.ts'
import {
  PayosCheckoutPanel,
  useGetOnlineOrderDetailQuery,
  useOnlineCheckout,
  type OnlineOrderCheckoutResponse,
} from '../../features/sales'

/**
 * Trang Kết quả đặt hàng & Thanh toán PayOS trực tuyến (UC-18) theo thẩm mỹ Quiet-Luxury Showroom.
 * Xử lý chuyển hướng từ CheckoutPage và returnUrl từ PayOS (?orderId=...&code=00&status=PAID).
 */
export function CheckoutResultPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const autoVerifiedRef = useRef(false)

  const orderId = searchParams.get('orderId') ?? ''
  const payosRedirectStatus = searchParams.get('status') ?? ''
  const payosRedirectCode = searchParams.get('code') ?? ''
  const initialOrder = (location.state as { initialOrder?: OnlineOrderCheckoutResponse } | null)
    ?.initialOrder

  const {
    data: fetchedOrder,
    isLoading,
    refetch,
  } = useGetOnlineOrderDetailQuery(orderId, {
    skip: !isAuthenticated || !orderId,
  })

  const {
    isVerifyingPayos,
    isRefreshingLink,
    handleVerifyPayos,
    handleRefreshPayosLink,
  } = useOnlineCheckout(false)

  const order = fetchedOrder ?? (initialOrder?.orderId === orderId ? initialOrder : undefined)

  // Khi vừa quay về từ PayOS hosted page (?code=00 hoặc ?status=PAID), tự động gọi API verify 1 lần
  useEffect(() => {
    if (!isAuthenticated || !orderId || autoVerifiedRef.current) return
    if (
      order?.paymentMethod === 'BANK_TRANSFER' &&
      order?.paymentStatus !== 'PAID' &&
      (payosRedirectCode === '00' || payosRedirectStatus.toUpperCase() === 'PAID')
    ) {
      autoVerifiedRef.current = true
      void handleVerifyPayos(orderId, false)
    }
  }, [
    isAuthenticated,
    orderId,
    order?.paymentMethod,
    order?.paymentStatus,
    payosRedirectCode,
    payosRedirectStatus,
    handleVerifyPayos,
  ])

  if (isBootstrapping) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-3">
        <div className="w-7 h-7 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#6B6760]">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-12 border border-[#E6E2DA] bg-white px-8 py-14 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]">
          <LogIn className="h-5 w-5" />
        </div>
        <h1 className="font-editorial text-2xl font-normal text-[#171614]">
          Vui lòng đăng nhập
        </h1>
        <p className="text-xs text-[#6B6760]">
          Đăng nhập tài khoản khách hàng để xem trạng thái đơn hàng và xác nhận thanh toán PayOS.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
        >
          Đăng nhập ngay
        </Link>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="max-w-lg mx-auto my-12 border border-[#E6E2DA] bg-white px-8 py-14 text-center space-y-4">
        <h1 className="font-editorial text-2xl font-normal text-[#171614]">
          Thiếu mã đơn hàng
        </h1>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Về giỏ hàng
        </Link>
      </div>
    )
  }

  if (isLoading && !order) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-3">
        <div className="w-7 h-7 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#6B6760]">Đang tải thông tin đơn hàng trực tuyến...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto my-12 border border-[#E5B8B8] bg-white px-8 py-14 text-center space-y-4">
        <h1 className="font-editorial text-2xl font-normal text-[#171614]">
          Không tìm thấy đơn hàng
        </h1>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
        >
          Quay lại giỏ hàng
        </Link>
      </div>
    )
  }

  const isPaid = order.paymentStatus === 'PAID'

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header đơn hàng */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E6E2DA]">
        <div className="space-y-1.5">
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Tiếp tục khám phá Showroom</span>
          </Link>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#171614] tracking-[-0.01em]">
            Đơn hàng {order.orderCode}
          </h1>
          <p className="text-xs text-[#6B6760]">
            Kênh: {order.orderChannel} &middot; Loại: {order.orderType} &middot; Trạng thái đơn: {order.orderStatus}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold ${
              isPaid
                ? 'border-[#C6DDD0] bg-[#EEF5F1] text-[#245C42]'
                : 'border-[#E6D3B3] bg-[#FAF5EB] text-[#854D0E]'
            }`}
          >
            {isPaid ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            <span>{isPaid ? 'ĐÃ THANH TOÁN (PAID)' : 'CHỜ THANH TOÁN (UNPAID)'}</span>
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-9 w-9 flex items-center justify-center border border-[#D6D1C7] bg-white text-[#57534E] hover:border-[#171614] hover:text-[#171614] transition-colors cursor-pointer"
            title="Làm mới"
            aria-label="Làm mới trạng thái đơn hàng"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {order.paymentMethod === 'BANK_TRANSFER' ? (
        <PayosCheckoutPanel
          order={order}
          isVerifying={isVerifyingPayos}
          isRefreshing={isRefreshingLink}
          onVerify={(silent) => handleVerifyPayos(order.orderId, silent)}
          onRefreshLink={() => handleRefreshPayosLink(order.orderId)}
        />
      ) : (
        <div className="border border-[#C6DDD0] bg-[#EEF5F1] p-5 flex items-start gap-3.5">
          <CheckCircle2 className="h-5 w-5 text-[#245C42] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1E4734] space-y-1">
            <p className="font-semibold text-sm">Đặt hàng COD thành công!</p>
            <p className="leading-relaxed">
              Đơn hàng <strong className="font-mono">{order.orderCode}</strong> đang ở trạng thái Chờ xác nhận ({order.orderStatus}). Bạn sẽ thanh toán tiền mặt khi nhận hàng.
            </p>
          </div>
        </div>
      )}

      {/* Chi tiết sản phẩm & Thông tin giao nhận */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 border border-[#E6E2DA] bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E6E2DA]">
            <Package className="h-4 w-4 text-[#8C6D46]" />
            <h2 className="font-editorial text-lg font-normal text-[#171614]">
              Chi tiết sản phẩm ({order.items.length})
            </h2>
          </div>

          <div className="divide-y divide-[#E6E2DA]">
            {order.items.map((item) => (
              <div key={item.orderItemId} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <p className="font-medium text-[#171614]">{item.productName}</p>
                  <p className="text-[11px] text-[#78736A]">
                    {item.variantName} &middot; <span className="font-mono">SKU: {item.sku}</span> &middot; SL: {item.quantity} &times; {formatVnd(item.unitPrice)}
                  </p>
                </div>
                <div className="font-semibold text-[#171614] tabular-nums whitespace-nowrap">
                  {formatVnd(item.lineTotal)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 border border-[#E6E2DA] bg-white p-6 space-y-5 text-xs">
          <div className="pb-3 border-b border-[#E6E2DA]">
            <h2 className="font-editorial text-lg font-normal text-[#171614]">
              Thông tin giao nhận &amp; Tổng tiền
            </h2>
          </div>

          <div className="space-y-2.5 text-[#57534E]">
            <p>
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] block">
                Địa chỉ nhận hàng
              </span>
              {order.deliveryAddress}
            </p>
            {order.deliverySchedule && (
              <p>
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] block">
                  Lịch giao hàng
                </span>
                {order.deliverySchedule}
              </p>
            )}
            {order.note && (
              <p>
                <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] block">
                  Ghi chú
                </span>
                {order.note}
              </p>
            )}
            <p>
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] block">
                Phương thức thanh toán
              </span>
              {order.paymentMethod === 'BANK_TRANSFER' ? 'PayOS VietQR' : 'Tiền mặt COD'}
            </p>
          </div>

          <div className="border-t border-[#E6E2DA] pt-4 space-y-2">
            <div className="flex justify-between text-[#57534E]">
              <span>Tạm tính</span>
              <span className="tabular-nums font-medium text-[#171614]">{formatVnd(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#57534E]">
              <span>Phí vận chuyển</span>
              <span className="tabular-nums font-medium text-[#171614]">{formatVnd(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-[#E6E2DA]">
              <span className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614]">
                Tổng đơn hàng
              </span>
              <span className="text-xl font-semibold text-[#171614] tabular-nums">
                {formatVnd(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
