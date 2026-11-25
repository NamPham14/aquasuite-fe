import { useState } from 'react'
import { OrderComboRow } from '../../features/sales/components/OrderComboRow'
import { DeliveryList } from '../../features/fulfillment'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShoppingBag,
  User,
  MapPin,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  Edit3,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetSalesOrderByIdQuery,
  useGetOrderPaymentSummaryQuery,
  useCompleteSalesOrderMutation,
  useConfirmOnlineOrderMutation,
  useRejectOnlineOrderMutation,
  useSyncOnlineOrderPayosPaymentMutation,
} from '../../features/sales/api/salesOrderApi'
import { OrderStatusBadge } from '../../features/sales/components/OrderStatusBadge'
import { PaymentStatusBadge } from '../../features/sales/components/PaymentStatusBadge'
import { EditOrderFulfillmentModal } from '../../features/sales/components/EditOrderFulfillmentModal'
import { OrderInvoicesModal } from '../../features/sales/components/OrderInvoicesModal'
import { OrderCodPanel, OrderPaymentPanel } from '../../features/finance'
import { useAuth } from '../../features/iam/hooks/useAuth'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'order' | 'delivery'>('order')
  // Chỉ Sales Staff / Shop Owner được ghi nhận thanh toán tại quầy (UC-23); BE vẫn thực thi phân quyền.
  const canRecordPayment = (user?.roles ?? []).some((r) => r === 'SALES_STAFF' || r === 'SHOP_OWNER')

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isInvoicesModalOpen, setIsInvoicesModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [confirmAddress, setConfirmAddress] = useState('')
  const [confirmSchedule, setConfirmSchedule] = useState('')
  const [confirmNote, setConfirmNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const { data: order, isLoading, error } = useGetSalesOrderByIdQuery(id || '', {
    skip: !id,
  })

  // API payment-summary đọc số tiền đã thanh toán thực tế (verifiedPaid) và còn lại
  const { data: paymentSummary } = useGetOrderPaymentSummaryQuery(id || '', {
    skip: !id,
  })

  const [completeOrder, { isLoading: isCompleting }] = useCompleteSalesOrderMutation()
  const [confirmOnlineOrder, { isLoading: isConfirmingOnline }] = useConfirmOnlineOrderMutation()
  const [rejectOnlineOrder, { isLoading: isRejectingOnline }] = useRejectOnlineOrderMutation()
  const [syncPayosPayment, { isLoading: isSyncingPayos }] = useSyncOnlineOrderPayosPaymentMutation()

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

  const handleCompleteOrder = async () => {
    if (!order) return
    if (order.paymentStatus !== 'PAID') {
      toast.error('Đơn hàng chưa thanh toán đủ (PAID). Không thể hoàn tất đơn hàng!')
      return
    }

    const confirmed = window.confirm(
      `Xác nhận hoàn tất đơn hàng ${order.orderCode}?\nSau khi hoàn tất, đơn hàng sẽ không thể chỉnh sửa điều phối.`
    )
    if (!confirmed) return

    try {
      await completeOrder(order.orderId).unwrap()
      toast.success(`Đơn hàng ${order.orderCode} đã được hoàn tất thành công!`)
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Có lỗi xảy ra khi hoàn tất đơn hàng'
      toast.error(msg)
    }
  }

  const openConfirmOnlineModal = () => {
    if (!order) return
    setConfirmAddress(order.deliveryAddress || '')
    setConfirmSchedule(order.deliverySchedule || '')
    setConfirmNote(order.note || '')
    setIsConfirmModalOpen(true)
  }

  const handleConfirmOnlineOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    try {
      await confirmOnlineOrder({
        orderId: order.orderId,
        body: {
          deliveryAddress: confirmAddress.trim() || undefined,
          deliverySchedule: confirmSchedule.trim() || undefined,
          note: confirmNote.trim() || undefined,
        },
      }).unwrap()
      toast.success(`Đã xác nhận đơn hàng ${order.orderCode}, giữ tồn kho và tạo hóa đơn nháp thành công!`)
      setIsConfirmModalOpen(false)
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Không thể xác nhận đơn hàng trực tuyến'
      toast.error(msg)
    }
  }

  const handleRejectOnlineOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối hoặc hủy đơn hàng!')
      return
    }
    try {
      await rejectOnlineOrder({
        orderId: order.orderId,
        body: { reason: rejectReason.trim() },
      }).unwrap()
      toast.success(`Đã từ chối/hủy đơn hàng ${order.orderCode} thành công.`)
      setIsRejectModalOpen(false)
      setRejectReason('')
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Không thể từ chối/hủy đơn hàng'
      toast.error(msg)
    }
  }

  const handleSyncPayos = async () => {
    if (!order) return
    try {
      const res = await syncPayosPayment(order.orderId).unwrap()
      if (res.paymentStatus === 'PAID') {
        toast.success('Đồng bộ PayOS thành công: Đơn hàng đã thanh toán đủ (PAID)!')
      } else {
        toast.info(`Đã đồng bộ PayOS: Trạng thái hiện tại là ${res.payosPayment?.status || res.paymentStatus}`)
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Không thể đồng bộ trạng thái PayOS'
      toast.error(msg)
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
  const isOnline = order.orderChannel === 'ONLINE'
  const isPendingConfirmation = order.orderStatus === 'PENDING_CONFIRMATION'
  const isProcessing = order.orderStatus === 'PROCESSING'
  const isPaid = order.paymentStatus === 'PAID'
  const isPayosMethod =
    order.paymentMethod === 'BANK_TRANSFER' && (isOnline || Boolean(order.payosPayment))
  const formatPaymentMethodLabel = () => {
    if (isPayosMethod) return 'Chuyển khoản VietQR PayOS'
    if (isOnline && order.paymentMethod === 'CASH') return 'Thanh toán khi nhận hàng (COD)'
    if (order.paymentMethod === 'CASH') return 'Tiền mặt (CASH)'
    if (order.paymentMethod === 'BANK_TRANSFER') return 'Chuyển khoản ngân hàng'
    if (order.paymentMethod === 'CREDIT') return 'Mua nợ / Công nợ (CREDIT)'
    return order.paymentMethod || 'Chưa xác định'
  }
  const displayItems = order.displayItems?.length ? order.displayItems : order.items.map((item) => ({
    itemType: 'SINGLE' as const, comboId: null, productName: item.productName,
    quantity: item.quantity, lineTotal: item.lineTotal, sku: item.sku,
    unitPrice: item.unitPrice, discountAmount: item.discountAmount, item, components: [],
  }))

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
                    : isOnline
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isProject
                  ? 'Dự án (PROJECT)'
                  : isOnline
                    ? 'Đơn hàng Online (ONLINE)'
                    : 'Bán lẻ tại quầy (POS)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Ngày tạo: {formatDate(order.orderDate || order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.orderStatus} />
          <PaymentStatusBadge status={order.paymentStatus} />

          {/* UC-22: Thao tác nhanh trên Header khi đơn đang Chờ xác nhận */}
          {isPendingConfirmation && canRecordPayment && (
            <>
              <button
                type="button"
                onClick={openConfirmOnlineModal}
                disabled={isConfirmingOnline || (isPayosMethod && !isPaid)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition shadow-2xs ${
                  !isPayosMethod || isPaid
                    ? 'bg-sky-600 text-white hover:bg-sky-700'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
                title={
                  isPayosMethod && !isPaid
                    ? 'Đơn hàng PayOS cần hoàn tất thanh toán trước khi xác nhận'
                    : 'Xác nhận đơn hàng Online, đặt giữ tồn kho và tạo hóa đơn nháp'
                }
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Xác nhận & Giữ tồn kho</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={isRejectingOnline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold transition"
                title="Từ chối hoặc hủy đơn hàng Online đang chờ xác nhận"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Từ chối / Hủy đơn</span>
              </button>
            </>
          )}

          {/* Action: Quản lý Hóa đơn (DRAFT -> ISSUED) - Hiển thị sau khi đơn đã được xác nhận */}
          {!isPendingConfirmation && (
            <button
              type="button"
              onClick={() => setIsInvoicesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold transition"
              title="Xem, chỉnh sửa hóa đơn Nháp (DRAFT) hoặc Chốt & Phát hành (ISSUED)"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Hóa đơn</span>
              {(order.totalInvoiceCount ?? 0) > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {order.issuedInvoiceCount ?? 0}/{order.totalInvoiceCount}
                </span>
              )}
            </button>
          )}

          {/* Action: Sửa thông tin điều phối giao nhận (UC-21.2) */}
          {isProcessing && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold transition"
              title="Chỉnh sửa địa chỉ giao hàng, tiến độ & ghi chú điều phối"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Sửa giao nhận & ghi chú</span>
            </button>
          )}

          {/* Action: Hoàn tất đơn hàng (UC-21.2) */}
          {isProcessing && (
            <button
              type="button"
              onClick={handleCompleteOrder}
              disabled={isCompleting || !isPaid}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition shadow-2xs ${
                isPaid
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
              title={
                isPaid
                  ? 'Đánh dấu đơn hàng hoàn tất'
                  : 'Đơn hàng cần thanh toán 100% (PAID) trước khi hoàn tất'
              }
            >
              {isCompleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Hoàn tất đơn hàng</span>
            </button>
          )}
        </div>
      </div>

      {/* UC-22: Khối điều khiển Xác nhận & Xử lý Đơn hàng Online khi đang PENDING_CONFIRMATION */}
      {isPendingConfirmation && (
        <div className="p-3.5 rounded-lg bg-amber-50/90 border border-amber-300 text-amber-950 shadow-2xs space-y-2.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Đơn hàng Trực tuyến đang Chờ xác nhận (UC-22)</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Đơn hàng này mới được khách đặt trên cổng Online và <strong>chưa giữ tồn kho</strong>. Nhân viên vui lòng kiểm tra hình thức thanh toán ({formatPaymentMethodLabel()}), liên hệ xác nhận địa chỉ/lịch giao với khách rồi bấm <strong>Xác nhận & Giữ tồn kho</strong> để chuyển sang Đang xử lý và lập Hóa đơn xuất kho.
              </p>
              {isPayosMethod && !isPaid && (
                <p className="text-[11px] font-semibold text-rose-700">
                  * Lưu ý: Khách chọn thanh toán qua VietQR PayOS nhưng đơn vẫn đang Chưa thanh toán (UNPAID). Nếu khách báo đã chuyển khoản, hãy bấm "Đồng bộ PayOS" để cập nhật trước khi xác nhận đơn.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {(isPayosMethod || order.payosPayment) && (
                <button
                  type="button"
                  onClick={handleSyncPayos}
                  disabled={isSyncingPayos}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 font-semibold transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPayos ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ PayOS</span>
                </button>
              )}
              {canRecordPayment && (
                <>
                  <button
                    type="button"
                    onClick={openConfirmOnlineModal}
                    disabled={isConfirmingOnline || (isPayosMethod && !isPaid)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition ${
                      !isPayosMethod || isPaid
                        ? 'bg-sky-600 text-white hover:bg-sky-700'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Xác nhận & Giữ tồn kho</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={isRejectingOnline}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-300 bg-white text-rose-700 hover:bg-rose-50 font-semibold transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Từ chối / Hủy đơn</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cảnh báo hoàn tất nếu đơn chưa thanh toán đủ */}
      {isProcessing && !isPaid && (
        <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            Đơn hàng đang ở trạng thái <strong>Đang xử lý</strong>. Để <strong>Hoàn tất đơn hàng</strong>, khách hàng cần hoàn tất thanh toán đủ 100% (Trạng thái thanh toán: Đã thanh toán).
          </span>
        </div>
      )}

      {user?.roles.some((role) => role === 'ACCOUNTANT' || role === 'SHOP_OWNER') && <div className="flex gap-4 border-b border-slate-200" role="tablist" aria-label="Thông tin đơn hàng" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 'order' : event.key === 'End' ? 'delivery' : tab === 'order' ? 'delivery' : 'order'
        setTab(next)
        document.getElementById(`${next}-tab`)?.focus()
      }}><button id="order-tab" role="tab" tabIndex={tab === 'order' ? 0 : -1} aria-selected={tab === 'order'} aria-controls="order-panel" className={`px-3 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-sky-600 ${tab === 'order' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-600'}`} onClick={() => setTab('order')}>Thông tin đơn</button><button id="delivery-tab" role="tab" tabIndex={tab === 'delivery' ? 0 : -1} aria-selected={tab === 'delivery'} aria-controls="delivery-panel" className={`px-3 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-sky-600 ${tab === 'delivery' ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-600'}`} onClick={() => setTab('delivery')}>Giao hàng</button></div>}
      {tab === 'delivery' && id && <div id="delivery-panel" role="tabpanel" aria-labelledby="delivery-tab"><DeliveryList orderId={id} /></div>}
      <div id="order-panel" hidden={tab !== 'order'} className="space-y-4">
      {/* Grid thông tin chung */}
      <div className={`grid grid-cols-1 ${isProject ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
        {/* Khối 1: Khách hàng */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-600" />
            <span>Khách hàng & Giao nhận</span>
          </h4>
          <div className="font-semibold text-slate-900 text-sm">
            {order.customerName && order.customerName !== 'Walk-in Retail Customer'
              ? order.customerName
              : 'Khách lẻ tại quầy'}
          </div>
          {order.customerPhone && order.customerPhone !== '0000000000' && (
            <div className="text-slate-600">SĐT: {order.customerPhone}</div>
          )}
          {order.deliveryAddress ? (
            <div className="text-slate-600 flex items-start gap-1 pt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{order.deliveryAddress}</span>
            </div>
          ) : (
            <div className="text-slate-400 italic pt-0.5">Nhận tại quầy Showroom</div>
          )}
          {order.deliverySchedule && (
            <div className="text-slate-600 flex items-start gap-1 pt-1 border-t border-slate-100">
              <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-700">Lịch/Tiến độ:</strong> {order.deliverySchedule}
              </span>
            </div>
          )}
        </div>

        {/* Khối 2: Kênh & Nhân viên */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-sky-600" />
            <span>Kênh & Hình thức thanh toán</span>
          </h4>
          <div className="text-slate-700">
            Kênh bán: <strong className="text-slate-900">{order.orderChannel}</strong>
          </div>
          <div className="text-slate-700">
            Phương thức TT: <strong className="text-slate-900">{formatPaymentMethodLabel()}</strong>
          </div>
          <div className="text-slate-700">
            Nhân viên phụ trách:{' '}
            <strong className="text-slate-900">
              {order.salesStaffId ? order.salesStaffName || 'Nhân viên bán hàng' : isOnline ? 'Chưa phân công (Đơn Online)' : order.salesStaffName || 'Nhân viên bán hàng'}
            </strong>
          </div>
          {order.payosPayment && (
            <div className="pt-1.5 mt-1.5 border-t border-slate-100 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1 font-medium text-sky-700">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Mã GD PayOS: #{order.payosPayment.payosOrderCode}</span>
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    order.payosPayment.status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : order.payosPayment.status === 'CANCELLED'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  PayOS: {order.payosPayment.status}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncPayos}
                disabled={isSyncingPayos}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingPayos ? 'animate-spin' : ''}`} />
                <span>Đồng bộ trạng thái từ cổng PayOS</span>
              </button>
            </div>
          )}
          {order.storeInvoiceId && (
            <div className="text-[11px] text-slate-500 pt-1">
              Mã hóa đơn nháp: <span className="font-mono text-slate-700">{order.storeInvoiceId}</span>
            </div>
          )}
        </div>

        {/* Khối 3 (Dự án): Thông tin công trình */}
        {isProject && (
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
            <h4 className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Dự án & Báo giá</span>
            </h4>
            <div className="text-slate-900 font-semibold text-sm">
              {order.projectName || 'Dự án công trình'}
            </div>
            {order.quotationCode && (
              <div className="text-slate-600">
                Từ báo giá: <span className="font-mono font-semibold text-sky-700">{order.quotationCode}</span>
              </div>
            )}
            {order.creditTermDays !== undefined && order.creditTermDays !== null && (
              <div className="text-slate-600">
                Hạn nợ: <strong className="text-slate-800">{order.creditTermDays} ngày</strong>
              </div>
            )}
            {order.depositPercent !== undefined && order.depositPercent !== null && (
              <div className="text-slate-600">
                Tạm ứng: <strong className="text-slate-800">{order.depositPercent}%</strong> ({formatMoney(order.depositAmount || 0)})
              </div>
            )}
          </div>
        )}

        {/* Khối 4: Trạng thái Tài chính (TÍCH HỢP NAM - PAYMENT SUMMARY) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-1.5">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tình trạng thanh toán</span>
          </h4>
          <div className="flex justify-between items-center text-slate-600">
            <span>Tổng tiền đơn:</span>
            <span className="font-bold text-slate-900">{formatMoney(order.totalAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Đã xác minh thu:</span>
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

      {/* Tiến độ thanh toán công trình (Milestones) */}
      {isProject && order.milestones && order.milestones.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
          <div className="px-4 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
            <h4 className="font-semibold text-indigo-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kế hoạch thanh toán theo giai đoạn ({order.milestones.length} đợt)</span>
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 w-16 text-center">Đợt</th>
                  <th className="px-4 py-2.5">Giai đoạn thanh toán</th>
                  <th className="px-3 py-2.5 text-center">Tỷ lệ (%)</th>
                  <th className="px-4 py-2.5 text-right">Số tiền quy định</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.milestones.map((m, idx) => (
                  <tr key={m.milestoneId || idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-500">
                      #{m.sortOrder || idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{m.stageName}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-indigo-700">
                      {m.percent}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {formatMoney(m.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Danh sách mặt hàng trong đơn */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="font-semibold text-slate-900 uppercase text-[11px] tracking-wider">
            Chi tiết mặt hàng ({displayItems.length})
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
              {displayItems.map((row, index) => {
                if (row.itemType === 'COMBO') return (
                  <OrderComboRow key={row.components[0]?.orderItemId ?? `combo-${index}`} row={row} formatMoney={formatMoney} />
                )
                const it = row.item
                if (!it) return null
                return (
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
                )
              })}
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
        <>
          <OrderCodPanel orderId={id} />
          <OrderPaymentPanel
            orderId={id}
            canRecord={canRecordPayment}
            payable={order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'PENDING_CONFIRMATION'}
          />
        </>
      )}

      {/* Ghi chú & Lịch giao hàng */}
      {(order.note || order.deliverySchedule) && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs space-y-2">
          {order.deliverySchedule && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>Tiến độ / Lịch giao hàng:</span>
              </div>
              <div className="text-slate-800 font-medium pl-5">{order.deliverySchedule}</div>
            </div>
          )}
          {order.note && (
            <div className={order.deliverySchedule ? 'pt-2 border-t border-slate-100' : ''}>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-600" />
                <span>Ghi chú điều phối nội bộ:</span>
              </div>
              <div className="text-slate-700 pl-5">{order.note}</div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Modal chỉnh sửa giao nhận & ghi chú điều phối */}
      <EditOrderFulfillmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        orderId={order.orderId}
        orderCode={order.orderCode}
        initialAddress={order.deliveryAddress}
        initialSchedule={order.deliverySchedule}
        initialNote={order.note}
        isProject={isProject}
      />

      {/* Modal Hóa đơn bán hàng (DRAFT chỉnh sửa được -> ISSUED chốt khóa để xuất kho) */}
      <OrderInvoicesModal
        isOpen={isInvoicesModalOpen}
        onClose={() => setIsInvoicesModalOpen(false)}
        orderId={order.orderId}
        orderCode={order.orderCode}
        orderType={order.orderType}
        orderStatus={order.orderStatus}
        vatRate={order.vatRate}
        canManageInvoices={canRecordPayment}
      />

      {/* UC-22: Modal Xác nhận Đơn hàng Online & Giữ tồn kho */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Xác nhận Đơn hàng Online ({order.orderCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOnlineOrder} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px] text-slate-700">
                <div>
                  Khách hàng: <strong>{order.customerName || 'Khách hàng Online'}</strong>{' '}
                  {order.customerPhone ? `(${order.customerPhone})` : ''}
                </div>
                <div>
                  Hình thức thanh toán: <strong>{formatPaymentMethodLabel()}</strong> — Trạng thái:{' '}
                  <strong className={isPaid ? 'text-emerald-700' : 'text-amber-700'}>
                    {isPaid ? 'Đã thanh toán (PAID)' : 'Chưa thanh toán (UNPAID - Thu COD khi giao)'}
                  </strong>
                </div>
                <div className="text-sky-700 font-medium pt-0.5">
                  Khi xác nhận, hệ thống sẽ tự động kiểm tra & giữ tồn kho cho {order.items.length} dòng sản phẩm và khởi tạo Hóa đơn bán lẻ nháp (DRAFT).
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Địa chỉ giao hàng đã chốt với khách
                </label>
                <textarea
                  rows={2}
                  value={confirmAddress}
                  onChange={(e) => setConfirmAddress(e.target.value)}
                  placeholder="Nhập địa chỉ nhận hàng chi tiết..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lịch giao hàng dự kiến (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={confirmSchedule}
                  onChange={(e) => setConfirmSchedule(e.target.value)}
                  placeholder="VD: Giao trong giờ hành chính ngày mai..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú điều phối nội bộ (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="Ghi chú sau khi gọi điện xác nhận với khách..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingOnline}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700 font-semibold disabled:opacity-50"
                >
                  {isConfirmingOnline ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Xác nhận đơn & Giữ tồn kho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UC-22: Modal Từ chối / Hủy Đơn hàng Online khi đang Chờ xác nhận */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Từ chối / Hủy Đơn hàng Online ({order.orderCode})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectOnlineOrder} className="p-5 space-y-3.5 text-xs">
              {isPaid ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <strong>Lưu ý hoàn tiền:</strong> Đơn hàng này đã được khách thanh toán (PAID). Khi xác nhận hủy đơn, hệ thống sẽ tự động khởi tạo <strong>Yêu cầu hoàn tiền chờ Kế toán xử lý</strong> cho khách hàng.
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  Đơn hàng sẽ chuyển sang trạng thái <strong>Đã hủy (CANCELLED)</strong>. Nếu đơn có link thanh toán PayOS đang chờ, hệ thống sẽ tự động hủy link thanh toán.
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lý do từ chối / hủy đơn <span className="text-rose-600">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    'Khách hàng liên hệ yêu cầu hủy đơn',
                    'Không liên hệ được khách hàng để xác nhận',
                    'Tạm hết hàng / không đủ tồn kho',
                    'Địa chỉ nằm ngoài khu vực hỗ trợ giao hàng',
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setRejectReason(sample)}
                      className="px-2 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-700 transition"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể..."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isRejectingOnline || !rejectReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 font-semibold disabled:opacity-50"
                >
                  {isRejectingOnline ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>Xác nhận Từ chối / Hủy đơn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
