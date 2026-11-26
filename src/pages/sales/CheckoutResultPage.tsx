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
import {
  PayosCheckoutPanel,
  useGetOnlineOrderDetailQuery,
  useOnlineCheckout,
  type OnlineOrderCheckoutResponse,
} from '../../features/sales'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

/**
 * Trang Kết quả đặt hàng & Thanh toán PayOS trực tuyến (UC-18).
 * Xử lý cả chuyển hướng từ CheckoutPage và returnUrl từ PayOS (?orderId=...&code=00&status=PAID).
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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <LogIn className="mx-auto h-10 w-10 text-sky-600" />
        <h1 className="text-lg font-bold text-slate-900">Vui lòng đăng nhập</h1>
        <p className="text-xs text-slate-500">
          Đăng nhập tài khoản khách hàng để xem trạng thái đơn hàng và xác nhận thanh toán PayOS.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          Đăng nhập ngay
        </Link>
      </div>
    )
  }

  if (!orderId) {
    return (
      <div className="max-w-lg mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <h1 className="text-lg font-bold text-slate-900">Thiếu mã đơn hàng</h1>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Về giỏ hàng
        </Link>
      </div>
    )
  }

  if (isLoading && !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        Đang tải thông tin đơn hàng trực tuyến...
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-lg mx-auto my-12 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm space-y-4">
        <h1 className="text-lg font-bold text-slate-900">Không tìm thấy đơn hàng</h1>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          Quay lại giỏ hàng
        </Link>
      </div>
    )
  }

  const isPaid = order.paymentStatus === 'PAID'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tiếp tục mua sắm
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Đơn hàng {order.orderCode}
          </h1>
          <p className="text-xs text-slate-500">
            Kênh: {order.orderChannel} • Loại: {order.orderType} • Trạng thái đơn: {order.orderStatus}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
              isPaid
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {isPaid ? 'ĐÃ THANH TOÁN (PAID)' : 'CHỜ THANH TOÁN (UNPAID)'}
          </span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            title="Làm mới"
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-700 shrink-0" />
          <div className="text-xs text-emerald-900">
            <p className="font-bold text-sm">Đặt hàng COD thành công!</p>
            <p className="mt-0.5">
              Đơn hàng {order.orderCode} đang ở trạng thái Chờ xác nhận ({order.orderStatus}). Bạn sẽ thanh toán tiền mặt khi nhận hàng.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-4 w-4 text-sky-600" />
            Chi tiết sản phẩm ({order.items.length})
          </h2>
          <div className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <div key={item.orderItemId} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{item.productName}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.variantName} • SKU: {item.sku} • SL: {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="font-bold text-slate-900">{formatCurrency(item.lineTotal)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3 text-xs">
          <h2 className="text-sm font-bold text-slate-900">Thông tin giao nhận & tổng tiền</h2>
          <div className="space-y-1.5 text-slate-600">
            <p>
              <span className="font-semibold text-slate-800">Địa chỉ: </span>
              {order.deliveryAddress}
            </p>
            {order.deliverySchedule && (
              <p>
                <span className="font-semibold text-slate-800">Lịch giao: </span>
                {order.deliverySchedule}
              </p>
            )}
            {order.note && (
              <p>
                <span className="font-semibold text-slate-800">Ghi chú: </span>
                {order.note}
              </p>
            )}
            <p>
              <span className="font-semibold text-slate-800">Phương thức: </span>
              {order.paymentMethod === 'BANK_TRANSFER' ? 'PayOS VietQR' : 'Tiền mặt COD'}
            </p>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span>{formatCurrency(order.shippingFee)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-100">
              <span>Tổng đơn hàng</span>
              <span className="text-sky-700">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

