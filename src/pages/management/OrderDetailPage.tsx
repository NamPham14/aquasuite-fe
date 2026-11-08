import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  Receipt,
  CreditCard,
  FileText,
  ExternalLink,
} from 'lucide-react'
import {
  useGetSalesOrderByIdQuery,
  useGetOrderPaymentSummaryQuery,
} from '../../features/sales/api/salesOrderApi'
import { OrderStatusBadge } from '../../features/sales/components/OrderStatusBadge'
import { PaymentStatusBadge } from '../../features/sales/components/PaymentStatusBadge'
import { OrderPaymentPanel } from '../../features/finance'
import { useAuth } from '../../features/iam/hooks/useAuth'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  // Chỉ Sales Staff / Shop Owner được ghi nhận thanh toán tại quầy (UC-23); BE vẫn thực thi phân quyền.
  const canRecordPayment = (user?.roles ?? []).some((r) => r === 'SALES_STAFF' || r === 'SHOP_OWNER')

  const { data: order, isLoading, error } = useGetSalesOrderByIdQuery(id || '', {
    skip: !id,
  })

  // Gọi API payment-summary của Nam để đọc số tiền đã thanh toán thực tế (verifiedPaid) và còn lại
  const { data: paymentSummary } = useGetOrderPaymentSummaryQuery(id || '', {
    skip: !id,
  })

  const formatMoney = (val?: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)

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
      <div className="p-8 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Đang tải thông tin chi tiết đơn hàng...
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-slate-200 max-w-md mx-auto mt-8">
        <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-900">Không tìm thấy đơn hàng</h3>
        <p className="text-xs text-slate-500 mt-1">Đơn hàng không tồn tại hoặc đã bị xóa.</p>
        <Link
          to="/app/orders"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách</span>
        </Link>
      </div>
    )
  }

  const isProject = order.orderType === 'PROJECT'

  return (
    <div className="space-y-4 text-xs">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/orders')}
            className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 font-mono">
                {order.orderCode}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  isProject
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isProject ? 'Dự án (PROJECT)' : 'Bán lẻ POS (RETAIL)'}
              </span>
              {order.quotationCode && (
                <Link
                  to={order.quotationId ? `/app/quotations/${order.quotationId}` : '/app/quotations'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 border border-sky-300 text-sky-800 text-[10px] font-bold hover:bg-sky-100 transition group shadow-2xs"
                  title="Nhấn để xem báo giá gốc của đơn hàng này"
                >
                  <FileText className="w-3 h-3 text-sky-600" />
                  <span>Báo giá: {order.quotationCode}</span>
                  <ExternalLink className="w-2.5 h-2.5 text-sky-500 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ngày tạo: {formatDate(order.orderDate || order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {/* Grid thông tin chung */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Khối 1: Khách hàng */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-600" />
            <span>Khách hàng</span>
          </h4>
          <div className="font-semibold text-slate-900 text-sm">
            {order.customerName && order.customerName !== 'Walk-in Retail Customer'
              ? order.customerName
              : 'Khách lẻ tại quầy'}
          </div>
          {order.customerPhone && order.customerPhone !== '0000000000' && (
            <div className="text-slate-600">SĐT: {order.customerPhone}</div>
          )}
          {order.deliveryAddress && (
            <div className="text-slate-500 flex items-start gap-1 pt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{order.deliveryAddress}</span>
            </div>
          )}
        </div>

        {/* Khối 2: Nhân viên & Hóa đơn liên kết */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-sky-600" />
            <span>Kênh & Nhân viên</span>
          </h4>
          <div className="text-slate-700">
            Kênh bán: <strong className="text-slate-900">{order.orderChannel}</strong>
          </div>
          <div className="text-slate-700">
            Nhân viên lập đơn:{' '}
            <strong className="text-slate-900">
              {order.salesStaffName || 'Nhân viên bán hàng'}
            </strong>
          </div>
          {order.storeInvoiceId && (
            <div className="text-[11px] text-slate-500 pt-1">
              Mã hóa đơn nháp: <span className="font-mono text-slate-700">{order.storeInvoiceId}</span>
            </div>
          )}
        </div>

        {/* Khối 3: Trạng thái Tài chính (TÍCH HỢP NAM - PAYMENT SUMMARY) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tình trạng thanh toán (Finance)</span>
          </h4>
          <div className="flex justify-between items-center text-slate-600">
            <span>Tổng tiền đơn:</span>
            <span className="font-bold text-slate-900">{formatMoney(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Đã xác minh thu (Nam):</span>
            <span className="font-bold text-emerald-700">
              {formatMoney(paymentSummary?.verifiedPaid || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-100">
            <span>Còn phải trả:</span>
            <span className="font-bold text-rose-600">
              {formatMoney(paymentSummary?.remaining ?? order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Khối Điều khoản Dự án & Báo giá gốc */}
      {(order.quotationCode || isProject) && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h4 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Điều khoản Hợp đồng & Công nợ Dự án</span>
            </h4>
            {order.quotationCode && (
              <Link
                to={order.quotationId ? `/app/quotations/${order.quotationId}` : '/app/quotations'}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 hover:underline"
              >
                <span>Xem hồ sơ Báo giá gốc ({order.quotationCode})</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tên dự án</span>
              <span className="font-semibold text-slate-900 mt-0.5 block truncate" title={order.projectName || ''}>
                {order.projectName || '-'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Cam kết Đặt cọc</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {order.depositPercent ?? 0}% ({formatMoney(order.depositAmount ?? 0)})
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Thời hạn & Số tiền Nợ</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {order.creditTermDays ?? 0} ngày ({formatMoney(order.remainingDebtAmount ?? 0)})
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-100">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Hạn thanh toán (Due Date)</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {order.dueDate ? formatDate(order.dueDate) : '-'}
              </span>
            </div>
          </div>

          {(order.deliverySchedule || order.debtCondition) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-600">
              {order.deliverySchedule && (
                <div>
                  <strong className="text-slate-700">Tiến độ giao hàng:</strong> {order.deliverySchedule}
                </div>
              )}
              {order.debtCondition && (
                <div>
                  <strong className="text-slate-700">Điều kiện công nợ:</strong> {order.debtCondition}
                </div>
              )}
            </div>
          )}

          {/* Bảng Tiến độ thanh toán theo đợt (Milestones) */}
          {order.milestones && order.milestones.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                Tiến độ thanh toán theo đợt ({order.milestones.length} đợt):
              </span>
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5 w-16 text-center">Đợt</th>
                      <th className="px-3 py-1.5">Giai đoạn / Điều kiện</th>
                      <th className="px-3 py-1.5 text-right w-24">Tỷ lệ (%)</th>
                      <th className="px-3 py-1.5 text-right w-36">Số tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {order.milestones.map((m, idx) => (
                      <tr key={m.milestoneId || idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-1.5 text-center font-bold text-slate-600">
                          #{m.sortOrder || idx + 1}
                        </td>
                        <td className="px-3 py-1.5 font-medium text-slate-900">{m.stageName}</td>
                        <td className="px-3 py-1.5 text-right font-semibold text-sky-800">{m.percent}%</td>
                        <td className="px-3 py-1.5 text-right font-bold text-slate-900">
                          {formatMoney(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Danh sách mặt hàng trong đơn */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider">
            Chi tiết mặt hàng ({order.items.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Sản phẩm / Biến thể</th>
                <th className="px-3 py-2.5">Mã SKU</th>
                <th className="px-3 py-2.5 text-right">Đơn giá</th>
                <th className="px-3 py-2.5 text-center">Số lượng</th>
                <th className="px-3 py-2.5 text-right">Chiết khấu</th>
                <th className="px-4 py-2.5 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((it) => (
                <tr key={it.orderItemId} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-900">{it.productName}</div>
                    <div className="text-[11px] text-slate-500">{it.variantName}</div>
                    {it.comboId && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Thuộc Combo
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">{it.sku}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{formatMoney(it.unitPrice)}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{it.quantity}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">
                    {it.discountAmount > 0 ? formatMoney(it.discountAmount) : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                    {formatMoney(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tóm tắt tiền tệ */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-200 flex flex-col items-end gap-1.5">
          <div className="w-64 flex justify-between text-slate-600">
            <span>Tạm tính tiền hàng:</span>
            <span className="font-semibold text-slate-800">{formatMoney(order.subtotal)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="w-64 flex justify-between text-slate-600">
              <span>Chiết khấu đơn:</span>
              <span className="font-semibold text-rose-600">-{formatMoney(order.discountAmount)}</span>
            </div>
          )}
          <div className="w-64 flex justify-between text-slate-900 pt-2 border-t border-slate-200 text-sm">
            <span className="font-bold">Tổng thanh toán:</span>
            <span className="font-bold text-emerald-700">{formatMoney(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* UC-23: Ghi nhận & theo dõi thanh toán theo tiến độ các mốc của đơn */}
      {id && (
        <OrderPaymentPanel
          orderId={id}
          canRecord={canRecordPayment}
          payable={order.orderStatus !== 'CANCELLED'}
        />
      )}

      {order.note && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Ghi chú:
          </div>
          <div className="text-slate-700">{order.note}</div>
        </div>
      )}
    </div>
  )
}
