import { Eye, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SalesOrderSummaryResponse } from '../types/salesOrder.types'
import { OrderStatusBadge } from './OrderStatusBadge'
import { PaymentStatusBadge } from './PaymentStatusBadge'

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
      <div className="w-full">
        <table className="w-full text-left text-xs text-slate-700 table-fixed">
          <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3 w-[22%]">Mã & Ngày tạo</th>
              <th className="px-4 py-3 w-[28%]">Khách hàng & Kênh</th>
              <th className="px-4 py-3 w-[18%] text-right">Tổng tiền</th>
              <th className="px-4 py-3 w-[22%] text-center">Trạng thái & TT</th>
              <th className="px-4 py-3 w-[10%] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const isProject = order.orderType === 'PROJECT'

              return (
                <tr key={order.orderId} className="hover:bg-slate-50/70 transition-colors">
                  {/* Cột 1: Mã & Ngày tạo */}
                  <td className="px-4 py-3 align-top">
                    <Link
                      to={`/app/orders/${order.orderId}`}
                      className="font-mono font-bold text-xs text-sky-700 hover:text-sky-800 hover:underline block"
                    >
                      {order.orderCode}
                    </Link>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {formatDate(order.orderDate || order.createdAt)}
                    </div>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          isProject
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isProject ? 'Dự án (PROJECT)' : 'Bán lẻ (RETAIL)'}
                      </span>
                    </div>
                  </td>

                  {/* Cột 2: Khách hàng & Kênh */}
                  <td className="px-4 py-3 align-top">
                    <div className="font-semibold text-slate-900 truncate">
                      {order.customerName || 'Khách vãng lai tại quầy'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {order.customerPhone ? (
                        <span>SĐT: {order.customerPhone}</span>
                      ) : (
                        <span className="italic text-slate-400">Không có SĐT</span>
                      )}
                    </div>
                    {isProject && order.projectName && (
                      <div className="text-[11px] text-indigo-700 truncate mt-0.5">
                        Dự án: {order.projectName}
                      </div>
                    )}
                  </td>

                  {/* Cột 3: Tổng tiền */}
                  <td className="px-4 py-3 align-top text-right">
                    <div className="font-bold text-slate-900 text-sm">
                      {formatMoney(order.totalAmount)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {order.itemCount} mặt hàng
                    </div>
                  </td>

                  {/* Cột 4: Trạng thái & Thanh toán */}
                  <td className="px-4 py-3 align-top text-center space-y-1.5">
                    <div>
                      <OrderStatusBadge status={order.orderStatus} />
                    </div>
                    <div>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </td>

                  {/* Cột 5: Thao tác */}
                  <td className="px-4 py-3 align-top text-center">
                    <Link
                      to={`/app/orders/${order.orderId}`}
                      className="inline-flex items-center justify-center p-1.5 rounded text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                      title="Xem chi tiết đơn hàng"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
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
