import { Eye, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OrderStatus, PaymentStatus, SalesOrderSummaryResponse } from '../types/salesOrder.types'

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string; border: string; dotColor: string }
> = {
  DRAFT: {
    label: 'Nháp (Chờ duyệt nợ)',
    className: 'bg-amber-50 text-amber-800',
    border: 'border-amber-300',
    dotColor: 'bg-amber-500',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    className: 'bg-sky-50 text-sky-700',
    border: 'border-sky-200',
    dotColor: 'bg-sky-500',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    className: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-rose-50 text-rose-700',
    border: 'border-rose-200',
    dotColor: 'bg-rose-500',
  },
}

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; className: string; border: string; dotColor: string }
> = {
  UNPAID: {
    label: 'Chưa thanh toán',
    className: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200',
    dotColor: 'bg-amber-500',
  },
  PARTIALLY_PAID: {
    label: 'Thanh toán 1 phần',
    className: 'bg-sky-50 text-sky-700',
    border: 'border-sky-200',
    dotColor: 'bg-sky-500',
  },
  PAID: {
    label: 'Đã thanh toán',
    className: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
}

interface OrderTableProps {
  orders: SalesOrderSummaryResponse[]
  isLoading?: boolean
}

export function OrderTable({ orders, isLoading = false }: OrderTableProps) {
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  if (isLoading) {
    return (
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg bg-white p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900">Không tìm thấy đơn hàng nào</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Không có đơn hàng nào khớp với bộ lọc hiện tại hoặc hệ thống chưa phát sinh đơn hàng.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-xs text-slate-700 table-fixed min-w-[880px]">
          <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3 w-[16%] text-left">Mã & Ngày tạo</th>
              <th className="px-2 py-3 w-[12%] text-center">Loại đơn</th>
              <th className="px-4 py-3 w-[22%] text-left">Khách hàng & Kênh</th>
              <th className="px-4 py-3 w-[14%] text-right">Tổng tiền</th>
              <th className="px-2 py-3 w-[14%] text-center">Trạng thái đơn</th>
              <th className="px-2 py-3 w-[16%] text-center">Thanh toán</th>
              <th className="px-2 py-3 w-[6%] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const isProject = order.orderType === 'PROJECT'
              const orderStatusConfig = ORDER_STATUS_CONFIG[order.orderStatus] ?? {
                label: order.orderStatus,
                className: 'bg-slate-50 text-slate-700',
                border: 'border-slate-200',
                dotColor: 'bg-slate-400',
              }
              const paymentStatusConfig = PAYMENT_STATUS_CONFIG[order.paymentStatus] ?? {
                label: order.paymentStatus,
                className: 'bg-slate-50 text-slate-700',
                border: 'border-slate-200',
                dotColor: 'bg-slate-400',
              }

              return (
                <tr key={order.orderId} className="hover:bg-slate-50/70 transition-colors">
                  {/* Cột 1: Mã & Ngày tạo */}
                  <td className="px-4 py-3.5 align-middle text-left">
                    <Link
                      to={`/app/orders/${order.orderId}`}
                      className="font-mono font-bold text-xs text-sky-700 hover:text-sky-800 hover:underline block"
                    >
                      {order.orderCode}
                    </Link>
                    <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span>{formatDate(order.orderDate || order.createdAt)}</span>
                      {order.quotationCode && (
                        <Link
                          to={order.quotationId ? `/app/quotations/${order.quotationId}` : '/app/quotations'}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-sky-50 border border-sky-200 text-sky-700 font-bold text-[10px] hover:bg-sky-100"
                          title="Bấm để xem Báo giá gốc"
                        >
                          <span>BG: {order.quotationCode}</span>
                        </Link>
                      )}
                    </div>
                  </td>

                  {/* Cột 2: Loại đơn hàng (Căn giữa cân đối tuyệt đối) */}
                  <td className="px-2 py-3.5 align-middle text-center">
                    <div className="flex items-center justify-center">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          isProject
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
                        {isProject ? 'Dự án (PROJECT)' : 'Bán lẻ (RETAIL)'}
                      </span>
                    </div>
                  </td>

                  {/* Cột 3: Khách hàng & Kênh */}
                  <td className="px-4 py-3.5 align-middle text-left">
                    <div className="font-semibold text-slate-900 truncate">
                      {order.customerName && order.customerName !== 'Walk-in Retail Customer'
                        ? order.customerName
                        : 'Khách lẻ tại quầy'}
                    </div>
                    {order.customerPhone && order.customerPhone !== '0000000000' && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        <span>SĐT: {order.customerPhone}</span>
                      </div>
                    )}
                    {isProject && order.projectName && (
                      <div className="text-[11px] text-indigo-700 truncate mt-0.5">
                        Dự án: {order.projectName}
                      </div>
                    )}
                  </td>

                  {/* Cột 4: Tổng tiền */}
                  <td className="px-4 py-3.5 align-middle text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatMoney(order.totalAmount)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {order.itemCount} mặt hàng
                    </div>
                  </td>

                  {/* Cột 5: Trạng thái đơn hàng (Cột riêng biệt, căn giữa cân đối) */}
                  <td className="px-2 py-3.5 align-middle text-center">
                    <div className="flex items-center justify-center">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${orderStatusConfig.className} ${orderStatusConfig.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${orderStatusConfig.dotColor}`} />
                        {orderStatusConfig.label}
                      </span>
                    </div>
                  </td>

                  {/* Cột 6: Thanh toán (Cột riêng biệt, căn giữa cân đối) */}
                  <td className="px-2 py-3.5 align-middle text-center">
                    <div className="flex items-center justify-center">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${paymentStatusConfig.className} ${paymentStatusConfig.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${paymentStatusConfig.dotColor}`} />
                        {paymentStatusConfig.label}
                      </span>
                    </div>
                  </td>

                  {/* Cột 7: Thao tác */}
                  <td className="px-2 py-3.5 align-middle text-center">
                    <div className="flex items-center justify-center">
                      <Link
                        to={`/app/orders/${order.orderId}`}
                        className="inline-flex items-center justify-center p-1.5 rounded text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                        title="Xem chi tiết đơn hàng"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
