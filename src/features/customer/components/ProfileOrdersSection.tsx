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
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    cls: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    cls: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    cls: 'bg-rose-50 text-rose-800 border-rose-200',
  },
}

const PAYMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  UNPAID: {
    label: 'Chưa thanh toán',
    cls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PARTIAL: {
    label: 'Thanh toán một phần',
    cls: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  PAID: {
    label: 'Đã thanh toán',
    cls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
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
    <div className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 sm:p-7 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Lịch sử đơn hàng của tôi ({orders.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi trạng thái xử lý, giao hàng và mở lại mã QR PayOS cho các đơn chưa thanh toán.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer transition"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-sky-600' : ''}`}
            aria-hidden="true"
          />
          <span>Làm mới</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-xs text-slate-500">
          Đang tải danh sách đơn hàng...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <ShoppingBag className="h-9 w-9 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">Bạn chưa có đơn hàng trực tuyến nào</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Khám phá các thiết bị vệ sinh chính hãng tại Showroom và đặt hàng trực tuyến qua VietQR PayOS hoặc COD.
          </p>
          <Link
            to="/storefront#catalog"
            className="aqua-shine-btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-sky-500/20"
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
              cls: 'bg-slate-100 text-slate-700 border-slate-200',
            }
            const payMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
              label: order.paymentStatus,
              cls: 'bg-slate-100 text-slate-700 border-slate-200',
            }
            const needsPayos =
              order.paymentMethod === 'BANK_TRANSFER' &&
              order.paymentStatus !== 'PAID' &&
              order.orderStatus !== 'CANCELLED'

            return (
              <article
                key={order.orderId}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 hover:border-sky-300 transition shadow-2xs space-y-3.5"
              >
                {/* Header đơn hàng */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {order.orderCode}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${orderMeta.cls}`}
                    >
                      {orderMeta.label}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${payMeta.cls}`}
                    >
                      {payMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                </div>

                {/* Danh sách sản phẩm trong đơn */}
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div
                      key={item.orderItemId}
                      className="flex items-center justify-between gap-3 text-xs bg-slate-50/70 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="h-3.5 w-3.5 text-sky-600 shrink-0" aria-hidden="true" />
                        <span className="font-semibold text-slate-800 truncate">
                          {item.productName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          × {item.quantity}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums shrink-0">
                        {formatVnd(item.lineTotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer địa chỉ & hành động */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{order.deliveryAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                      {order.paymentMethod === 'BANK_TRANSFER' ? (
                        <>
                          <QrCode className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                          <span>Chuyển khoản VietQR PayOS</span>
                        </>
                      ) : (
                        <>
                          <Banknote className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          <span>Thanh toán tiền mặt (COD)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Tổng thanh toán
                      </span>
                      <span className="text-base font-black text-sky-700 tabular-nums">
                        {formatVnd(order.totalAmount)}
                      </span>
                    </div>

                    <Link
                      to={`/checkout/result?orderId=${encodeURIComponent(order.orderId)}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        needsPayos
                          ? 'aqua-shine-btn bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm shadow-sky-500/25'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'
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

