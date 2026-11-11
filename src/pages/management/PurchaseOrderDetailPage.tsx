import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  CheckCircle2,
  XCircle,
  FileDown,
  Building2,
  Warehouse,
  AlertCircle,
  Clock,
  Layers,
  PackageCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetPurchaseOrderQuery,
  useConfirmPurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useClosePurchaseOrderMutation,
} from '../../features/purchasing/api/purchaseOrderApi'
import { PurchaseOrderStatusBadge } from '../../features/purchasing/components/PurchaseOrderStatusBadge'
import { ReceiptProgressTable } from '../../features/purchasing/components/ReceiptProgressTable'
import {
  PurchaseOrderActionDialog,
  type POActionType,
} from '../../features/purchasing/components/PurchaseOrderActionDialog'
import { GoodsReceiptDialog } from '../../features/inventory/components/GoodsReceiptDialog'
import { useAuth } from '../../features/iam/hooks/useAuth'

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: po, isLoading, error, refetch } = useGetPurchaseOrderQuery(id!, { skip: !id })
  const [confirmPo] = useConfirmPurchaseOrderMutation()
  const [cancelPo] = useCancelPurchaseOrderMutation()
  const [closePo] = useClosePurchaseOrderMutation()

  const { user } = useAuth()
  const canReceiveStock = (user?.roles ?? []).some((r) => r === 'SHOP_OWNER' || r === 'ACCOUNTANT')

  const [dialogAction, setDialogAction] = useState<POActionType | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Goods receipt dialog (SCRUM-27)
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false)

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return '—'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(val)
  }

  const handleExportPdf = async () => {
    if (!po) return
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'
      const token =
        localStorage.getItem('auth_access_token') || sessionStorage.getItem('auth_access_token')

      const response = await fetch(`${baseUrl}/purchasing/purchase-orders/${po.purchaseOrderId}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        throw new Error(`Xuất PDF thất bại (Mã lỗi ${response.status})`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${po.poCode}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`Đã tải xuống file PDF cho đơn ${po.poCode}`)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xuất file PDF')
    }
  }

  const handleExecuteAction = async (reason?: string) => {
    if (!po || !dialogAction) return
    setIsSubmittingAction(true)
    try {
      if (dialogAction === 'confirm') {
        await confirmPo(po.purchaseOrderId).unwrap()
        toast.success(`Đã xác nhận đơn mua hàng ${po.poCode}`)
      } else if (dialogAction === 'cancel') {
        await cancelPo({
          id: po.purchaseOrderId,
          body: { cancelReason: reason || '' },
        }).unwrap()
        toast.success(`Đã hủy đơn mua hàng ${po.poCode}`)
      } else if (dialogAction === 'close') {
        await closePo({
          id: po.purchaseOrderId,
          body: { closeReason: reason || '' },
        }).unwrap()
        toast.success(`Đã đóng đơn mua hàng ${po.poCode}`)
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện')
      throw err
    } finally {
      setIsSubmittingAction(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-3"></div>
        <p className="text-sm">Đang tải thông tin đơn mua hàng...</p>
      </div>
    )
  }

  if (error || !po) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Không tìm thấy đơn mua hàng</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Đơn mua hàng không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link
          to="/app/purchase-orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Về danh sách đơn mua
        </Link>
      </div>
    )
  }

  const isDraft = po.status === 'DRAFT'
  const isConfirmed = po.status === 'CONFIRMED'
  const isPartiallyReceived = po.status === 'PARTIALLY_RECEIVED'

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/purchase-orders')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-slate-900">{po.poCode}</h1>
              <PurchaseOrderStatusBadge status={po.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Ngày tạo: {po.createdAt ? new Date(po.createdAt).toLocaleDateString('vi-VN') : '—'}</span>
              <span>•</span>
              <span>Người tạo: {po.createdByName || '—'}</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-400">v{po.version}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <>
              <Link
                to={`/app/purchase-orders/${po.purchaseOrderId}/edit`}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-4 h-4 text-sky-600" />
                Sửa / Nhập giá
              </Link>

              <button
                type="button"
                onClick={() => setDialogAction('confirm')}
                className="px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận PO
              </button>
            </>
          )}

          {/* Nhập kho (goods receipts - SCRUM-27) */}
          {(isConfirmed || isPartiallyReceived) && canReceiveStock && (
            <button
              type="button"
              onClick={() => setIsReceiptDialogOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PackageCheck className="w-4 h-4" />
              Nhập kho
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            Xuất PDF
          </button>

          {(isDraft || isConfirmed) && (
            <button
              type="button"
              onClick={() => setDialogAction('cancel')}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              Hủy PO
            </button>
          )}

          {isPartiallyReceived && (
            <button
              type="button"
              onClick={() => setDialogAction('close')}
              className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Đóng PO nhận thiếu
            </button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Supplier Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Building2 className="w-4 h-4 text-sky-600" />
            Thông tin nhà cung cấp
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="text-slate-500">Tên nhà cung cấp:</div>
            <div className="font-semibold text-slate-900 text-sm">{po.supplierName || '—'}</div>
            <div className="text-slate-500 pt-1">Mã NCC:</div>
            <div className="font-mono text-slate-700">{po.supplierCode || '—'}</div>
            {po.supplierPhone && (
              <>
                <div className="text-slate-500 pt-1">Số điện thoại:</div>
                <div className="text-slate-700">{po.supplierPhone}</div>
              </>
            )}
          </div>
        </div>

        {/* Warehouse & Delivery Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            Giao hàng & Kho nhận
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="text-slate-500">Kho nhận hàng:</div>
            <div className="font-semibold text-slate-900 font-mono text-sm">
              {po.warehouseCode || 'WH_MAIN'}
            </div>
            <div className="text-slate-500 pt-1">Ngày lập đơn:</div>
            <div className="text-slate-700 font-medium">{po.orderDate}</div>
            <div className="text-slate-500 pt-1">Ngày giao dự kiến:</div>
            <div className="text-slate-700 font-medium">{po.expectedDate || 'Chưa ấn định'}</div>
          </div>
        </div>

        {/* Audit & Workflow Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Clock className="w-4 h-4 text-amber-600" />
            Nhật ký phê duyệt
          </div>
          <div className="space-y-1.5 text-xs">
            {po.confirmedBy && (
              <div>
                <span className="text-slate-500">Xác nhận bởi: </span>
                <span className="font-medium text-slate-800">{po.confirmedByName || po.confirmedBy}</span>
                <span className="text-slate-400 block text-[11px]">
                  {po.confirmedAt ? new Date(po.confirmedAt).toLocaleString('vi-VN') : ''}
                </span>
              </div>
            )}
            {po.cancelledBy && (
              <div className="text-rose-700 pt-1">
                <span className="font-medium">Đã hủy bởi: </span>
                <span>{po.cancelledByName || po.cancelledBy}</span>
                <div className="text-[11px] text-rose-500">Lý do: {po.cancelReason}</div>
              </div>
            )}
            {po.closedBy && (
              <div className="text-amber-700 pt-1">
                <span className="font-medium">Đã đóng nhận thiếu bởi: </span>
                <span>{po.closedByName || po.closedBy}</span>
                <div className="text-[11px] text-amber-600">Lý do: {po.closeReason}</div>
              </div>
            )}
            {!po.confirmedBy && !po.cancelledBy && !po.closedBy && (
              <p className="text-slate-400 italic">Đơn hàng đang ở trạng thái soạn thảo (nháp).</p>
            )}
          </div>
        </div>
      </div>

      {/* Note Terms */}
      {po.note && (
        <div className="bg-amber-50/60 rounded-xl border border-amber-200/80 p-4 shadow-sm text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Điều khoản & Ghi chú: </span>
          {po.note}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Chi tiết mặt hàng ({po.items?.length ?? 0})
            </h3>
          </div>
          {isDraft && (
            <span className="text-xs text-amber-600 font-medium">
              * PO nháp: Đơn giá có thể để trống khi chưa chốt thương lượng
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100 font-semibold">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center">STT</th>
                <th className="px-4 py-3.5">Mã SKU</th>
                <th className="px-4 py-3.5">Tên sản phẩm</th>
                <th className="px-4 py-3.5 text-center">ĐVT</th>
                <th className="px-4 py-3.5 text-right">Số lượng đặt</th>
                <th className="px-4 py-3.5 text-right">Đã nhận</th>
                <th className="px-4 py-3.5 text-right">Còn lại</th>
                <th className="px-4 py-3.5 text-right">Đơn giá nhập</th>
                <th className="px-4 py-3.5 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {po.items?.map((it, idx) => (
                <tr key={it.poItemId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800">
                    {it.sku}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    {it.productName}
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-600 font-medium">
                    {it.unit}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                    {formatNumber(it.quantity)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-emerald-600">
                    {formatNumber(it.receivedQty)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium text-amber-600">
                    {formatNumber(it.remainingQty)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-700">
                    {formatCurrency(it.unitCost)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                    {formatCurrency(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            * Chỉ các dòng có đơn giá mới được tính vào tổng giá trị đơn mua
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Tổng giá trị đơn mua:</span>
            <span className="text-xl font-bold text-sky-600">
              {formatCurrency(po.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Receipts Section for confirmed/ongoing orders */}
      {po.status !== 'DRAFT' && po.status !== 'CANCELLED' && (
        <ReceiptProgressTable
          items={po.items || []}
          receipts={po.receipts || []}
        />
      )}

      {/* Dialog for Actions */}
      <PurchaseOrderActionDialog
        isOpen={dialogAction !== null}
        action={dialogAction}
        poId={po.purchaseOrderId}
        poCode={po.poCode}
        totalAmount={po.totalAmount}
        itemCount={po.items?.length ?? 0}
        isLoading={isSubmittingAction}
        onClose={() => setDialogAction(null)}
        onConfirm={handleExecuteAction}
      />

      {/* UC-32: Dialog lập & xác nhận phiếu nhập kho (SCRUM-27) */}
      {isReceiptDialogOpen && (
        <GoodsReceiptDialog
          isOpen={isReceiptDialogOpen}
          purchaseOrderId={po.purchaseOrderId}
          poCode={po.poCode}
          onClose={() => setIsReceiptDialogOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  )
}
