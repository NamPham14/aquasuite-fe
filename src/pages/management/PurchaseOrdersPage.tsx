import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  RotateCcw,
  Truck,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetPurchaseOrdersQuery,
  useGetActiveSuppliersQuery,
  useConfirmPurchaseOrderMutation,
  useCancelPurchaseOrderMutation,
  useCloseShortPurchaseOrderMutation,
} from '../../features/purchasing/api/purchaseOrderApi'
import { usePurchaseOrderFilters } from '../../features/purchasing/hooks/usePurchaseOrderFilters'
import { PurchaseOrderTable } from '../../features/purchasing/components/PurchaseOrderTable'
import {
  PurchaseOrderActionDialog,
  type POActionType,
} from '../../features/purchasing/components/PurchaseOrderActionDialog'
import type {
  PurchaseOrderListItemResponse,
  PurchaseOrderStatus,
} from '../../features/purchasing/types/purchaseOrder.types'

export function PurchaseOrdersPage() {
  const {
    search,
    setSearch,
    status,
    setStatus,
    supplierId,
    setSupplierId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    page,
    setPage,
    resetFilters,
    queryParams,
  } = usePurchaseOrderFilters({ page: 1, size: 10 })

  const { data, isLoading, isFetching } = useGetPurchaseOrdersQuery(queryParams)
  const { data: suppliers = [] } = useGetActiveSuppliersQuery()

  const [confirmPo] = useConfirmPurchaseOrderMutation()
  const [cancelPo] = useCancelPurchaseOrderMutation()
  const [closeShortPo] = useCloseShortPurchaseOrderMutation()

  // Dialog State
  const [dialogAction, setDialogAction] = useState<POActionType | null>(null)
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderListItemResponse | null>(null)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  const handleOpenConfirm = (po: PurchaseOrderListItemResponse) => {
    setSelectedPo(po)
    setDialogAction('confirm')
  }

  const handleOpenCancel = (po: PurchaseOrderListItemResponse) => {
    setSelectedPo(po)
    setDialogAction('cancel')
  }

  const handleOpenClosePo = (po: PurchaseOrderListItemResponse) => {
    setSelectedPo(po)
    setDialogAction('close')
  }

  const handleExecuteAction = async (reason?: string) => {
    if (!selectedPo || !dialogAction) return
    setIsSubmittingAction(true)
    try {
      if (dialogAction === 'confirm') {
        await confirmPo(selectedPo.purchaseOrderId).unwrap()
        toast.success(`Đã xác nhận đơn mua hàng ${selectedPo.poCode}`)
      } else if (dialogAction === 'cancel') {
        await cancelPo({
          id: selectedPo.purchaseOrderId,
          body: { cancelReason: reason || '' },
        }).unwrap()
        toast.success(`Đã hủy đơn mua hàng ${selectedPo.poCode}`)
      } else if (dialogAction === 'close') {
        await closeShortPo({
          id: selectedPo.purchaseOrderId,
          body: { closeReason: reason || '' },
        }).unwrap()
        toast.success(`Đã đóng nhận thiếu đơn mua hàng ${selectedPo.poCode}`)
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện')
      throw err
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleExportPdf = async (po: PurchaseOrderListItemResponse) => {
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

  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-sky-600" />
            Quản lý đơn mua hàng (PO)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Lập đơn mua nháp gửi báo giá, thương lượng đơn giá và theo dõi tiến độ nhập kho
          </p>
        </div>

        <Link
          to="/app/purchase-orders/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tạo đơn mua hàng
        </Link>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search PO Code */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm mã đơn PO..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Supplier */}
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">Tất cả nhà cung cấp</option>
              {suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.supplierName} ({s.supplierCode})
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PurchaseOrderStatus | '')
                setPage(1)
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="QUOTED">Chờ chốt giá</option>
              <option value="CONFIRMED">Đang giao hàng</option>
              <option value="COMPLETED">Hoàn thành / Đóng thiếu</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Date range from / to */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="w-1/2 px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              title="Từ ngày"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="w-1/2 px-2 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              title="Đến ngày"
            />
          </div>
        </div>

        {/* Action reset */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Hiển thị {data?.items?.length ?? 0} / {data?.totalElements ?? 0} đơn mua hàng
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* Main Table */}
      <PurchaseOrderTable
        items={data?.items ?? []}
        isLoading={isLoading || isFetching}
        onConfirm={handleOpenConfirm}
        onCancel={handleOpenCancel}
        onClosePo={handleOpenClosePo}
        onExportPdf={handleExportPdf}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">
            Trang {page} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-40 transition-colors"
            >
              Trang trước
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-40 transition-colors"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* Dialog for Actions */}
      <PurchaseOrderActionDialog
        isOpen={dialogAction !== null}
        action={dialogAction}
        poId={selectedPo?.purchaseOrderId}
        poCode={selectedPo?.poCode ?? ''}
        totalAmount={selectedPo?.totalAmount ?? 0}
        itemCount={selectedPo?.totalItems ?? 0}
        expectedDate={selectedPo?.expectedDate}
        isLoading={isSubmittingAction}
        onClose={() => {
          setDialogAction(null)
          setSelectedPo(null)
        }}
        onConfirm={handleExecuteAction}
      />
    </div>
  )
}
