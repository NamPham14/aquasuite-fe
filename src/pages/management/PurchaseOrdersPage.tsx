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
  useClosePurchaseOrderMutation,
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
import { ManagementFilterCard, ManagementPageHeader, ManagementPageShell, filterControlClass } from '../../shared/ui/ManagementPage'
import { Button } from '../../shared/ui/Button'

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
  const [closePo] = useClosePurchaseOrderMutation()

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
        await closePo({
          id: selectedPo.purchaseOrderId,
          body: { closeReason: reason || '' },
        }).unwrap()
        toast.success(`Đã đóng đơn mua hàng ${selectedPo.poCode}`)
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
    <ManagementPageShell>
      {/* Header */}
      <ManagementPageHeader
        group="Kho vận & Cung ứng"
        breadcrumb="Đơn mua hàng (PO)"
        title="Quản lý đơn mua hàng (PO)"
        description="Lập đơn mua nháp gửi báo giá, thương lượng đơn giá và theo dõi tiến độ nhập kho."
        icon={<Truck className="h-5 w-5" />}
        actions={
          <Link
            to="/app/purchase-orders/new"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo đơn mua hàng
          </Link>
        }
      />

      {/* Filter Section */}
      <ManagementFilterCard
        headingId="po-filters"
        title="Tìm và lọc đơn mua hàng"
        resultCount={`Hiển thị ${data?.items?.length ?? 0} / ${data?.totalElements ?? 0} đơn mua hàng`}
        hasActiveFilters={Boolean(search || supplierId || status || fromDate || toDate)}
        onReset={resetFilters}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search PO Code */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aqs-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm mã đơn PO..."
              className={`${filterControlClass} pl-9`}
            />
          </div>

          {/* Supplier */}
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aqs-ink-faint" />
            <select
              value={supplierId}
              onChange={(e) => {
                setSupplierId(e.target.value)
                setPage(1)
              }}
              className={`${filterControlClass} pl-9`}
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
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aqs-ink-faint" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as PurchaseOrderStatus | '')
                setPage(1)
              }}
              className={`${filterControlClass} pl-9`}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="PARTIALLY_RECEIVED">Nhận một phần</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Date range from / to */}
          <div className="flex min-w-0 items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className={`${filterControlClass} min-w-0 flex-1 px-2 text-xs`}
              title="Từ ngày"
            />
            <span className="shrink-0 text-aqs-ink-faint">-</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className={`${filterControlClass} min-w-0 flex-1 px-2 text-xs`}
              title="Đến ngày"
            />
          </div>
        </div>

        {/* Action reset */}
        <div className="mt-3 flex items-center justify-end border-t border-aqs-border pt-3">
          <Button variant="secondary" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Đặt lại bộ lọc
          </Button>
        </div>
      </ManagementFilterCard>

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
        isLoading={isSubmittingAction}
        onClose={() => {
          setDialogAction(null)
          setSelectedPo(null)
        }}
        onConfirm={handleExecuteAction}
      />
    </ManagementPageShell>
  )
}
