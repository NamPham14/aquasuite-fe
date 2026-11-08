import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  RotateCcw,
  Truck,
  DollarSign,
  Check,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetPurchaseOrderQuery,
  useConfirmPurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useCloseShortPurchaseOrderMutation,
  useReopenPurchaseOrderMutation,
  useSettlePurchaseOrderStageMutation,
  useRequestStageRollbackMutation,
  useReviewStageRollbackMutation,
  useDirectRollbackStageMutation,
} from '../../features/purchasing/api/purchaseOrderApi'
import { PurchaseOrderStatusBadge } from '../../features/purchasing/components/PurchaseOrderStatusBadge'
import {
  PurchaseOrderActionDialog,
  type POActionType,
} from '../../features/purchasing/components/PurchaseOrderActionDialog'
import { StageSettlementDialog } from '../../features/purchasing/components/StageSettlementDialog'
import { StageRollbackDialog } from '../../features/purchasing/components/StageRollbackDialog'
import type {
  PurchaseOrderStageResponse,
  SettleStageRequest,
  StageRollbackRequestResponse,
} from '../../features/purchasing/types/purchaseOrder.types'

interface StageDropdownItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  sublabel?: string
  onClick: () => void
  highlight?: 'default' | 'amber' | 'rose'
}

function StageActionDropdown({ items }: { items: StageDropdownItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)

  const handleToggle = () => {
    if (!isOpen) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const openUpward = spaceBelow < 180 && rect.top > 180
        setMenuPos({
          top: openUpward ? undefined : rect.bottom + 4,
          bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
          right: window.innerWidth - rect.right,
        })
      }
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    function handleScrollOrResize() {
      if (isOpen) setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title="Thao tác đợt"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 shadow-2xs focus:outline-hidden"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
              right: `${menuPos.right}px`,
              zIndex: 9999,
            }}
            className="w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5 focus:outline-hidden"
          >
            {items.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    item.onClick()
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-left rounded-md cursor-pointer transition-colors ${
                    item.highlight === 'amber'
                      ? 'hover:bg-amber-50 text-amber-900'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                      item.highlight === 'amber' ? 'text-amber-600' : 'text-slate-400'
                    }`}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium leading-tight">{item.label}</span>
                    {item.sublabel && (
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: po, isLoading, error } = useGetPurchaseOrderQuery(id!, { skip: !id })

  const [confirmPo] = useConfirmPurchaseOrderMutation()
  const [cancelPo] = useCancelPurchaseOrderMutation()
  const [closeShortPo] = useCloseShortPurchaseOrderMutation()
  const [reopenPo] = useReopenPurchaseOrderMutation()
  const [settleStage] = useSettlePurchaseOrderStageMutation()
  const [requestRollback] = useRequestStageRollbackMutation()
  const [reviewRollback] = useReviewStageRollbackMutation()
  const [directRollback] = useDirectRollbackStageMutation()

  // Dialog states
  const [dialogAction, setDialogAction] = useState<POActionType | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Stage Settle Dialog state
  const [stageToSettle, setStageToSettle] = useState<PurchaseOrderStageResponse | null>(null)
  const [isSettling, setIsSettling] = useState(false)

  // Stage Rollback Dialog state
  const [rollbackDialogState, setRollbackDialogState] = useState<{
    isOpen: boolean
    mode: 'request' | 'direct' | 'review'
    stage: PurchaseOrderStageResponse | null
    rollbackRequest?: StageRollbackRequestResponse | null
  }>({
    isOpen: false,
    mode: 'request',
    stage: null,
    rollbackRequest: null,
  })
  const [isSubmittingRollback, setIsSubmittingRollback] = useState(false)

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

  // Header PO Actions (confirm, cancel, close short, reopen)
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
        await closeShortPo({
          id: po.purchaseOrderId,
          body: { closeReason: reason || '' },
        }).unwrap()
        toast.success(`Đã đóng nhận thiếu đơn mua hàng ${po.poCode}`)
      } else if (dialogAction === 'reopen') {
        await reopenPo({
          id: po.purchaseOrderId,
          body: { reopenReason: reason || '' },
        }).unwrap()
        toast.success(`Đã mở lại đơn mua hàng ${po.poCode} để chỉnh sửa`)
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện')
      throw err
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Settle Stage Action
  const handleConfirmSettleStage = async (data: SettleStageRequest) => {
    if (!po || !stageToSettle) return
    setIsSettling(true)
    try {
      await settleStage({
        id: po.purchaseOrderId,
        stageId: stageToSettle.stageId,
        body: data,
      }).unwrap()
      toast.success(`Đã xác nhận nhận hàng & thanh toán cho ${stageToSettle.stageName}`)
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi thanh toán đợt')
      throw err
    } finally {
      setIsSettling(false)
    }
  }

  // Rollback Actions
  const handleRequestRollback = async (reason: string) => {
    if (!po || !rollbackDialogState.stage) return
    setIsSubmittingRollback(true)
    try {
      await requestRollback({
        id: po.purchaseOrderId,
        stageId: rollbackDialogState.stage.stageId,
        body: { requestReason: reason },
      }).unwrap()
      toast.success('Đã gửi yêu cầu hoàn tác đợt tới Chủ cửa hàng phê duyệt')
    } finally {
      setIsSubmittingRollback(false)
    }
  }

  const handleDirectRollback = async (reason: string) => {
    if (!po || !rollbackDialogState.stage) return
    setIsSubmittingRollback(true)
    try {
      await directRollback({
        id: po.purchaseOrderId,
        stageId: rollbackDialogState.stage.stageId,
        body: { requestReason: reason },
      }).unwrap()
      toast.success('Đã hoàn tác đợt thanh toán thành công')
    } finally {
      setIsSubmittingRollback(false)
    }
  }

  const handleReviewRollback = async (approved: boolean, note: string) => {
    if (!po || !rollbackDialogState.rollbackRequest) return
    setIsSubmittingRollback(true)
    try {
      await reviewRollback({
        id: po.purchaseOrderId,
        rollbackId: rollbackDialogState.rollbackRequest.rollbackId,
        body: { approved, reviewNote: note },
      }).unwrap()
      if (approved) {
        toast.success('Đã phê duyệt hoàn tác đợt thanh toán')
      } else {
        toast.info('Đã từ chối yêu cầu hoàn tác')
      }
    } finally {
      setIsSubmittingRollback(false)
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

  const isDraftOrQuoted = po.status === 'DRAFT' || po.status === 'QUOTED'
  const isConfirmed = po.status === 'CONFIRMED'
  const isCompleted = po.status === 'COMPLETED'

  const totalStages = po.totalStages ?? (po.stages?.length || 0)
  const settledStages = po.settledStages ?? (po.stages?.filter((s) => s.status === 'SETTLED').length || 0)
  const hasSettledStages = settledStages > 0

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
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold font-mono text-slate-900">{po.poCode}</h1>
              <PurchaseOrderStatusBadge status={po.status} isShortClosed={po.isShortClosed} />

              {/* Tiến độ đợt giao nhận nếu đã CONFIRMED hoặc COMPLETED */}
              {(isConfirmed || isCompleted) && totalStages > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  <Truck className="w-3.5 h-3.5" />
                  Đã xong {settledStages}/{totalStages} đợt
                </span>
              )}
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

        {/* Action Buttons according to business rules */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Phase 1 & 2: DRAFT / QUOTED */}
          {isDraftOrQuoted && (
            <>
              <Link
                to={`/app/purchase-orders/${po.purchaseOrderId}/edit`}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Edit className="w-4 h-4 text-sky-600" />
                Sửa / Chia đợt
              </Link>

              <button
                type="button"
                onClick={() => setDialogAction('confirm')}
                className="px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Xác nhận PO
              </button>

              <button
                type="button"
                onClick={() => setDialogAction('cancel')}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Hủy PO
              </button>
            </>
          )}

          {/* Phase 3: CONFIRMED */}
          {isConfirmed && (
            <>
              {/* Mở lại để sửa: chỉ khi 0 đợt SETTLED */}
              {!hasSettledStages ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDialogAction('reopen')}
                    className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Mở lại để sửa số lượng, giá hoặc chia đợt (chỉ khi chưa có đợt nào thanh toán)"
                  >
                    <RotateCcw className="w-4 h-4 text-indigo-600" />
                    Mở lại để sửa
                  </button>

                  <button
                    type="button"
                    onClick={() => setDialogAction('cancel')}
                    className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Hủy PO
                  </button>
                </>
              ) : (
                /* Đã có ít nhất 1 đợt SETTLED -> không được hủy, chỉ được đóng nhận thiếu */
                <button
                  type="button"
                  onClick={() => setDialogAction('close')}
                  className="px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Đóng PO nhận thiếu
                </button>
              )}
            </>
          )}

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPdf}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            Xuất PDF
          </button>
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

        {/* Warehouse & Payment Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800 font-semibold text-sm">
            <Warehouse className="w-4 h-4 text-indigo-600" />
            Giao hàng & Thanh toán
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="text-slate-500">Kho nhận hàng:</div>
            <div className="font-semibold text-slate-900 font-mono text-sm">
              {po.warehouseCode || 'WH_MAIN'}
            </div>
            <div className="text-slate-500 pt-1">Kiểu giao hàng:</div>
            <div className="font-medium text-slate-800">
              {po.deliveryPlanType === 'STAGED' ? 'Giao theo nhiều đợt' : 'Giao 1 lần duy nhất'}
            </div>
            <div className="text-slate-500 pt-1">Đã thanh toán (thực chi):</div>
            <div className="font-bold text-emerald-600 text-sm">
              {formatCurrency(po.paidAmount)} / {formatCurrency(po.totalAmount)}
            </div>
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
            {po.reopenedBy && (
              <div className="text-indigo-700 pt-1 border-t border-slate-100">
                <span className="font-medium">Mở lại bởi: </span>
                <span>{po.reopenedByName || po.reopenedBy}</span>
                <div className="text-[11px] text-indigo-600 italic">Lý do: {po.reopenReason}</div>
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
              <div className="text-purple-700 pt-1">
                <span className="font-medium">Đóng nhận thiếu bởi: </span>
                <span>{po.closedByName || po.closedBy}</span>
                <div className="text-[11px] text-purple-600">Lý do: {po.closeReason}</div>
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
          <span className="font-bold">Điều khoản & Ghi chú (Zalo, thanh toán, giao nhận): </span>
          {po.note}
        </div>
      )}

      {/* STAGED DELIVERY & PAYMENT TABLE (Pay-on-delivery workflow) */}
      {po.stages && po.stages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Kế hoạch & Tiến độ các Đợt Giao hàng - Thanh toán ({po.stages.length} đợt)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mô hình giao đợt nào trả đợt đó. Bấm "Xác nhận nhận hàng & thanh toán" khi kiểm hàng OK.
                </p>
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-700">
              Tiến độ: <span className="text-indigo-600">{settledStages}/{totalStages} đợt hoàn tất</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[960px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-3 py-3 w-10 text-center whitespace-nowrap">STT</th>
                  <th className="px-3 py-3 w-28 whitespace-nowrap">Tên đợt</th>
                  <th className="px-4 py-3 min-w-[240px] whitespace-nowrap">Mô tả hàng giao</th>
                  <th className="px-3 py-3 w-28 whitespace-nowrap">Ngày dự kiến</th>
                  <th className="px-3 py-3 text-right w-20 whitespace-nowrap">Tỷ lệ (%)</th>
                  <th className="px-3 py-3 text-right w-28 whitespace-nowrap">Tiền dự kiến (đ)</th>
                  <th className="px-3 py-3 text-right w-28 whitespace-nowrap">Thực chi (đ)</th>
                  <th className="px-3 py-3 text-center w-28 whitespace-nowrap">Trạng thái đợt</th>
                  <th className="px-3 py-3 w-40 whitespace-nowrap">Thông tin thanh toán</th>
                  <th className="px-3 py-3 text-center w-28 whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.stages.map((st, idx) => {
                  const isStagePending = st.status === 'PENDING'
                  const isStageSettled = st.status === 'SETTLED'
                  const isStageCancelled = st.status === 'CANCELLED'

                  return (
                    <tr key={st.stageId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-3 text-center font-mono text-slate-400 whitespace-nowrap">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {st.stageName}
                      </td>
                      <td className="px-4 py-3 text-slate-700 min-w-[240px]">
                        {st.description || '—'}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800 whitespace-nowrap">
                        {st.expectedDeliveryDate || '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 whitespace-nowrap">
                        {st.percent}%
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatCurrency(st.amount)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                        {st.actualAmount !== null && st.actualAmount !== undefined
                          ? formatCurrency(st.actualAmount)
                          : '—'}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {isStagePending && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Chờ nhận & trả</span>
                          </span>
                        )}
                        {isStageSettled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 whitespace-nowrap shadow-2xs">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Đã nhận & trả</span>
                          </span>
                        )}
                        {isStageCancelled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap line-through">
                            Đã hủy
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">
                        {isStageSettled ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{st.paidByName || 'Kế toán'}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 text-[11px]">
                                {st.paidAt ? new Date(st.paidAt).toLocaleDateString('vi-VN') : '—'}
                              </span>
                            </div>
                            {(st.paymentReference || st.settlementNote) && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                {st.paymentReference && (
                                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                    {st.paymentReference}
                                  </span>
                                )}
                                {st.settlementNote && (
                                  <span className="italic truncate max-w-[160px] text-slate-600" title={st.settlementNote}>
                                    "{st.settlementNote}"
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {/* PENDING Stage Action: Settle */}
                        {isConfirmed && isStagePending && (
                          <button
                            type="button"
                            onClick={() => setStageToSettle(st)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Xác nhận đợt</span>
                          </button>
                        )}

                        {/* SETTLED Stage Action: Rollback */}
                        {isStageSettled && !po.isShortClosed && (
                          <div>
                            {st.hasPendingRollback ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Chờ duyệt</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRollbackDialogState({
                                      isOpen: true,
                                      mode: 'review',
                                      stage: st,
                                      rollbackRequest: st.latestRollbackRequest,
                                    })
                                  }
                                  className="inline-flex items-center px-2 py-0.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                                >
                                  Duyệt
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center">
                                <StageActionDropdown
                                  items={[
                                    {
                                      icon: RotateCcw,
                                      label: 'Yêu cầu hoàn tác',
                                      sublabel: 'Kế toán gửi yêu cầu tới chủ',
                                      onClick: () =>
                                        setRollbackDialogState({
                                          isOpen: true,
                                          mode: 'request',
                                          stage: st,
                                        }),
                                    },
                                    {
                                      icon: RotateCcw,
                                      label: 'Chủ hoàn tác trực tiếp',
                                      sublabel: 'Chủ cửa hàng hoàn tác ngay',
                                      highlight: 'amber',
                                      onClick: () =>
                                        setRollbackDialogState({
                                          isOpen: true,
                                          mode: 'direct',
                                          stage: st,
                                        }),
                                    },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {isStageCancelled && <span className="text-slate-400 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
          {isDraftOrQuoted && (
            <span className="text-xs text-amber-600 font-medium">
              * PO đang ở vòng deal giá: Đơn giá có thể chỉnh sửa trước khi xác nhận đơn
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
            * Tổng giá trị đơn mua được tính từ các dòng đã nhập đơn giá thỏa thuận
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Tổng giá trị đơn mua:</span>
            <span className="text-xl font-bold text-sky-600">
              {formatCurrency(po.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Dialog for PO Header Actions (Confirm, Cancel, Close Short, Reopen) */}
      <PurchaseOrderActionDialog
        isOpen={dialogAction !== null}
        action={dialogAction}
        poId={po.purchaseOrderId}
        poCode={po.poCode}
        totalAmount={po.totalAmount}
        itemCount={po.items?.length ?? 0}
        expectedDate={po.expectedDate}
        isLoading={isSubmittingAction}
        onClose={() => setDialogAction(null)}
        onConfirm={handleExecuteAction}
      />

      {/* Dialog for Settle Stage */}
      <StageSettlementDialog
        isOpen={stageToSettle !== null}
        stage={stageToSettle}
        poCode={po.poCode}
        isLoading={isSettling}
        onClose={() => setStageToSettle(null)}
        onConfirm={handleConfirmSettleStage}
      />

      {/* Dialog for Stage Rollback Workflow */}
      <StageRollbackDialog
        isOpen={rollbackDialogState.isOpen}
        mode={rollbackDialogState.mode}
        stage={rollbackDialogState.stage}
        rollbackRequest={rollbackDialogState.rollbackRequest}
        poCode={po.poCode}
        isLoading={isSubmittingRollback}
        onClose={() =>
          setRollbackDialogState({
            isOpen: false,
            mode: 'request',
            stage: null,
            rollbackRequest: null,
          })
        }
        onRequestRollback={handleRequestRollback}
        onDirectRollback={handleDirectRollback}
        onReviewRollback={handleReviewRollback}
      />
    </div>
  )
}
