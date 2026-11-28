import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Banknote,
  Calendar,
  MapPin,
  Package,
  QrCode,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useGetMyOnlineOrdersQuery } from '../../sales/api/onlineCheckoutApi.ts'

const ORDER_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING_CONFIRMATION: {
    label: 'Chờ xác nhận',
    cls: 'bg-[#FAF5EB] text-[#854D0E] border-[#E6D3B3]',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    cls: 'bg-[#F2EFE9] text-[#171614] border-[#D6D1C7]',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    cls: 'bg-[#FAF9F6] text-[#57534E] border-[#D6D1C7]',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    cls: 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    cls: 'bg-[#FEF2F2] text-[#991B1B] border-[#E5B8B8]',
  },
}

const PAYMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  UNPAID: {
    label: 'Chưa thanh toán',
    cls: 'bg-[#FAF5EB] text-[#854D0E] border-[#E6D3B3]',
  },
  PARTIAL: {
    label: 'Thanh toán một phần',
    cls: 'bg-[#F2EFE9] text-[#57534E] border-[#D6D1C7]',
  },
  PAID: {
    label: 'Đã thanh toán',
    cls: 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]',
  },
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Tab Lịch sử đơn hàng trực tuyến của khách hàng (/api/v1/sales/online-orders).
 */
export function ProfileOrdersSection() {
  const { data: orders = [], isLoading, isFetching, refetch } = useGetMyOnlineOrdersQuery()

  return (
    <div className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Giao dịch trực tuyến
          </p>
          <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
            Lịch sử đơn hàng của tôi ({orders.length})
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Theo dõi trạng thái xử lý, giao hàng và mở lại mã QR PayOS cho đơn chưa thanh toán.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="h-9 inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3.5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#171614] hover:border-[#171614] disabled:opacity-50 cursor-pointer transition-colors"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Làm mới</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#78736A]">
          Đang tải danh sách đơn hàng...
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-12 text-center space-y-3">
          <ShoppingBag className="h-8 w-8 text-[#8C6D46] mx-auto" />
          <p className="font-editorial text-xl text-[#171614]">
            Bạn chưa có đơn hàng trực tuyến nào
          </p>
          <p className="text-xs text-[#6B6760] max-w-md mx-auto leading-relaxed">
            Khám phá thiết bị vệ sinh chính hãng tại Showroom và đặt hàng trực tuyến qua VietQR PayOS hoặc COD.
          </p>
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
          >
            <span>Mua sắm ngay</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const orderMeta = ORDER_STATUS_META[order.orderStatus] ?? {
              label: order.orderStatus,
              cls: 'bg-[#FAF9F6] text-[#57534E] border-[#E6E2DA]',
            }
            const payMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
              label: order.paymentStatus,
              cls: 'bg-[#FAF9F6] text-[#57534E] border-[#E6E2DA]',
            }
            const needsPayos =
              order.paymentMethod === 'BANK_TRANSFER' &&
              order.paymentStatus !== 'PAID' &&
              order.orderStatus !== 'CANCELLED'

            return (
              <article
                key={order.orderId}
                className="border border-[#E6E2DA] bg-white p-5 hover:border-[#B5AFA5] transition-colors space-y-4"
              >
                {/* Header đơn hàng */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#E6E2DA]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#171614] bg-[#FAF9F6] border border-[#E6E2DA] px-2.5 py-1">
                      {order.orderCode}
                    </span>
                    <span className={`border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-medium ${orderMeta.cls}`}>
                      {orderMeta.label}
                    </span>
                    <span className={`border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-medium ${payMeta.cls}`}>
                      {payMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#78736A]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                </div>

                {/* Danh sách sản phẩm trong đơn */}
                <div className="divide-y divide-[#F0EDE6]">
                  {order.items.map((item) => (
                    <div
                      key={item.orderItemId}
                      className="flex items-center justify-between gap-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="h-3.5 w-3.5 text-[#8C6D46] shrink-0" aria-hidden="true" />
                        <span className="font-medium text-[#171614] truncate">
                          {item.productName}
                        </span>
                        <span className="text-[11px] font-mono text-[#78736A] shrink-0">
                          &times; {item.quantity}
                        </span>
                      </div>
                      <span className="font-semibold text-[#171614] tabular-nums shrink-0">
                        {formatVnd(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer địa chỉ & hành động */}
                <div className="pt-3 border-t border-[#E6E2DA] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-start gap-1.5 text-[11px] text-[#6B6760]">
                      <MapPin className="h-3.5 w-3.5 text-[#8C867C] shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{order.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#171614]">
                      {order.paymentMethod === 'BANK_TRANSFER' ? (
                        <>
                          <QrCode className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                          <span>Chuyển khoản VietQR PayOS</span>
                        </>
                      ) : (
                        <>
                          <Banknote className="h-3.5 w-3.5 text-[#245C42]" aria-hidden="true" />
                          <span>Thanh toán tiền mặt (COD)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#78736A] block">
                        Tổng thanh toán
                      </span>
                      <span className="text-base font-semibold text-[#171614] tabular-nums">
                        {formatVnd(order.totalAmount)}
                      </span>
                    </div>

                    <Link
                      to={`/checkout/result?orderId=${encodeURIComponent(order.orderId)}`}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors ${
                        needsPayos
                          ? 'border border-[#171614] bg-[#171614] text-[#FAF9F6] hover:bg-[#2A2825]'
                          : 'border border-[#D6D1C7] bg-white text-[#171614] hover:border-[#171614]'
                      }`}
                    >
                      <span>{needsPayos ? 'Thanh toán PayOS' : 'Chi tiết đơn'}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
