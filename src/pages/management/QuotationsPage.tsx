import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, Plus, RefreshCw, Search, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { ManagementPageHeader } from '../../shared/ui/ManagementPage'
import {
  useGetQuotationsQuery,
  useDeleteQuotationMutation,
  useSubmitApprovalMutation,
  useApproveQuotationMutation,
  useRejectQuotationMutation,
  useSendQuotationMutation,
  useCreateRevisionMutation,
  useMarkAcceptedMutation,
  useMarkLostMutation,
  QuotationTable,
  QuotationActionDialog,
  QuotationRevisionHistoryDrawer,
  useQuotationFilters,
  useGetCustomerOptionsQuery,
  type QuotationListItemResponse,
  type QuotationActionType,
  type QuotationStatus,
} from '../../features/sales'
import { useAuth } from '../../features/iam/hooks/useAuth'

const buttonClass =
  'inline-flex h-8 items-center justify-center rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
const primaryButtonClass =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800 transition-colors shadow-2xs cursor-pointer'

export function QuotationsPage() {
  const {
    search,
    setSearch,
    status,
    setStatus,
    customerId,
    setCustomerId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    page,
    setPage,
    sortBy,
    setSortBy,
    direction,
    setDirection,
    resetFilters,
    queryParams,
  } = useQuotationFilters()

  // User auth & role
  const { user } = useAuth()
  const isAdmin = user?.roles?.some((r) => ['ADMIN', 'ROLE_ADMIN', 'SHOP_OWNER', 'ROLE_SHOP_OWNER'].includes(r.toUpperCase())) ?? false

  // API List & Customers
  const { data: pageResponse, isLoading, isFetching, refetch } = useGetQuotationsQuery(queryParams)
  const { data: customerOptions } = useGetCustomerOptionsQuery()

  // Mutations
  const [deleteQuotation, { isLoading: isDeleting }] = useDeleteQuotationMutation()
  const [submitApproval, { isLoading: isSubmittingApproval }] = useSubmitApprovalMutation()
  const [approveQuotation, { isLoading: isApproving }] = useApproveQuotationMutation()
  const [rejectQuotation, { isLoading: isRejecting }] = useRejectQuotationMutation()
  const [sendQuotation, { isLoading: isSending }] = useSendQuotationMutation()
  const [createRevision, { isLoading: isCreatingRev }] = useCreateRevisionMutation()
  const [markAccepted, { isLoading: isAccepting }] = useMarkAcceptedMutation()
  const [markLost, { isLoading: isLosing }] = useMarkLostMutation()

  const navigate = useNavigate()

  const [actionDialog, setActionDialog] = useState<{
    type: QuotationActionType
    quotationId: string
    quotationCode: string
  } | null>(null)

  const [historyDrawerCode, setHistoryDrawerCode] = useState<string | null>(null)

  // Handlers chuyển sang trang tạo mới / sửa
  const handleCreateNew = () => {
    navigate('/app/quotations/new')
  }

  const handleEdit = (item: QuotationListItemResponse) => {
    navigate(`/app/quotations/${item.quotationId}/edit`)
  }

  const handleView = (item: QuotationListItemResponse) => {
    navigate(`/app/quotations/${item.quotationId}`)
  }

  // Handler xử lý Action Dialog
  const handleConfirmAction = async (noteOrReason: string) => {
    if (!actionDialog) return
    const { type, quotationId, quotationCode } = actionDialog

    try {
      if (type === 'submit_approval') {
        await submitApproval({ id: quotationId, body: { approvalNote: noteOrReason } }).unwrap()
        toast.success(`Đã trình phê duyệt báo giá ${quotationCode}!`)
      } else if (type === 'approve') {
        await approveQuotation({ id: quotationId, body: { approvalNote: noteOrReason } }).unwrap()
        toast.success(`Đã phê duyệt báo giá ${quotationCode}!`)
      } else if (type === 'reject') {
        await rejectQuotation({ id: quotationId, body: { rejectionReason: noteOrReason } }).unwrap()
        toast.success(`Đã từ chối báo giá ${quotationCode}!`)
      } else if (type === 'send') {
        await sendQuotation(quotationId).unwrap()
        toast.success(`Đã phát hành báo giá ${quotationCode} gửi khách hàng!`)
      } else if (type === 'mark_accepted') {
        await markAccepted({ id: quotationId, body: { signedFileUrl: noteOrReason } }).unwrap()
        toast.success(`Chúc mừng! Đã chốt đơn thành công cho báo giá ${quotationCode}!`)
      } else if (type === 'mark_lost') {
        await markLost({ id: quotationId, body: { lostReason: noteOrReason } }).unwrap()
        toast.success(`Đã ghi nhận mất đơn cho ${quotationCode}!`)
      } else if (type === 'create_revision') {
        const rev = await createRevision(quotationId).unwrap()
        toast.success(`Đã tạo bản sửa đổi mới rev.${rev.revisionNo} cho mã ${quotationCode}!`)
      } else if (type === 'delete') {
        await deleteQuotation(quotationId).unwrap()
        toast.success(`Đã xóa vĩnh viễn báo giá ${quotationCode}!`)
      }
      setActionDialog(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác. Vui lòng thử lại!')
    }
  }

  const pageData = (pageResponse as any)?.data || pageResponse
  const items: QuotationListItemResponse[] = pageData?.items ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = pageData?.totalPages ?? 1

  return (
    <div className="space-y-4">
      <ManagementPageHeader
        title="Quản lý Báo giá Dự án"
        description="Lập, thẩm định chiết khấu, đàm phán phiên bản và chốt hợp đồng báo giá B2B"
        breadcrumb="Báo giá"
        group="Bán hàng & Đơn hàng"
        icon={<FileSpreadsheet className="h-5 w-5" />}
      />

      {/* Top Header Summary & Main Action */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-xs text-slate-500">
          Danh sách báo giá thời gian thực đồng bộ trực tiếp với hệ sinh thái AquaSuite.
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" className={primaryButtonClass} onClick={handleCreateNew}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tạo báo giá mới</span>
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc 4 Cột x 2 Hàng - Thẳng hàng tuyệt đối 1:1 từ trên xuống dưới */}
      <div className="rounded-lg border border-slate-200/90 bg-white p-3 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* HÀNG 1 */}
          {/* Cột 1: Tìm kiếm */}
          <div className="min-w-0">
            <label htmlFor="quotation-search" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="quotation-search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Tìm theo mã báo giá, công trình..."
                className="h-8 w-full rounded border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Cột 2: Khách hàng */}
          <div className="min-w-0">
            <label htmlFor="quotation-customer-filter" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Khách hàng
            </label>
            <select
              id="quotation-customer-filter"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value)
                setPage(1)
              }}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden truncate"
            >
              <option value="">Tất cả khách hàng</option>
              {customerOptions?.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerName} ({c.customerCode})
                </option>
              ))}
            </select>
          </div>

          {/* Cột 3: Từ ngày */}
          <div className="min-w-0">
            <label htmlFor="quotation-from-date" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Từ ngày
            </label>
            <input
              id="quotation-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setPage(1)
              }}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* Cột 4: Đến ngày */}
          <div className="min-w-0">
            <label htmlFor="quotation-to-date" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Đến ngày
            </label>
            <input
              id="quotation-to-date"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setPage(1)
              }}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            />
          </div>

          {/* HÀNG 2 */}
          {/* Cột 1: Trạng thái (thẳng tắp với Tìm kiếm) */}
          <div className="min-w-0">
            <label htmlFor="quotation-status-filter" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Trạng thái
            </label>
            <select
              id="quotation-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as QuotationStatus | '')
                setPage(1)
              }}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp (DRAFT)</option>
              <option value="PENDING_APPROVAL">Chờ phê duyệt</option>
              <option value="APPROVED">Đã phê duyệt</option>
              <option value="REJECTED">Từ chối</option>
              <option value="SENT">Đã gửi khách</option>
              <option value="ACCEPTED">Đã chốt đơn</option>
              <option value="LOST">Mất dự án</option>
            </select>
          </div>

          {/* Cột 2: Sắp xếp theo (thẳng tắp với Khách hàng) */}
          <div className="min-w-0">
            <label htmlFor="quotation-sort-filter" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Sắp xếp theo
            </label>
            <select
              id="quotation-sort-filter"
              value={sortBy}
              onChange={(val) => setSortBy(val.target.value)}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="createdAt">Ngày tạo</option>
              <option value="totalAmount">Tổng giá trị</option>
              <option value="validUntil">Hạn hiệu lực</option>
              <option value="quotationCode">Mã báo giá</option>
            </select>
          </div>

          {/* Cột 3: Thứ tự (thẳng tắp với Từ ngày) */}
          <div className="min-w-0">
            <label htmlFor="quotation-direction-filter" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Thứ tự
            </label>
            <select
              id="quotation-direction-filter"
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'asc' | 'desc')}
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-sky-500 focus:outline-hidden"
            >
              <option value="desc">Mới nhất / Lớn nhất</option>
              <option value="asc">Cũ nhất / Nhỏ nhất</option>
            </select>
          </div>

          {/* Cột 4: Thao tác (thẳng tắp với Đến ngày) */}
          <div className="min-w-0">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Thao tác
            </label>
            <button
              type="button"
              onClick={resetFilters}
              title="Đặt lại bộ lọc về mặc định"
              className="h-8 w-full inline-flex items-center justify-center gap-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách Table */}
      <section className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-2xs">
        <h2 id="quotation-list" className="sr-only">
          Danh sách báo giá
        </h2>
        <QuotationTable
          items={items}
          isLoading={isLoading || isFetching}
          isAdmin={isAdmin}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={(item) =>
            setActionDialog({
              type: 'delete',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onSubmitApproval={(item) =>
            setActionDialog({
              type: 'submit_approval',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onApprove={(item) =>
            setActionDialog({
              type: 'approve',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onReject={(item) =>
            setActionDialog({
              type: 'reject',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onSend={(item) =>
            setActionDialog({
              type: 'send',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onCreateRevision={(item) =>
            setActionDialog({
              type: 'create_revision',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onMarkAccepted={(item) =>
            setActionDialog({
              type: 'mark_accepted',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onMarkLost={(item) =>
            setActionDialog({
              type: 'mark_lost',
              quotationId: item.quotationId,
              quotationCode: item.quotationCode,
            })
          }
          onRevisionHistory={(item) => setHistoryDrawerCode(item.quotationCode)}
        />

        {/* Phân trang gọn gàng */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-600 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <button
              className={buttonClass}
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Trang trước
            </button>
            <span className="font-medium text-slate-700 px-1">
              Trang {page} / {Math.max(1, totalPages)}
            </span>
            <button
              className={buttonClass}
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Trang tiếp
            </button>
          </div>
          <span className="text-slate-500">Tổng số: <strong className="text-slate-700">{totalElements}</strong> báo giá</span>
        </div>
      </section>

      {/* Dialog Xác nhận Hành động (Trình duyệt, Duyệt, Từ chối, Mất đơn, Xóa) */}
      {actionDialog && (
        <QuotationActionDialog
          type={actionDialog.type}
          quotationCode={actionDialog.quotationCode}
          onClose={() => setActionDialog(null)}
          onSubmit={handleConfirmAction}
          submitting={
            isDeleting ||
            isSubmittingApproval ||
            isApproving ||
            isRejecting ||
            isSending ||
            isCreatingRev ||
            isAccepting ||
            isLosing
          }
        />
      )}

      {/* Lịch sử phiên bản đàm phán Drawer */}
      {historyDrawerCode && (
        <QuotationRevisionHistoryDrawer
          quotationCode={historyDrawerCode}
          isOpen={!!historyDrawerCode}
          onClose={() => setHistoryDrawerCode(null)}
          onSelectRevision={(quotationId) => {
            setHistoryDrawerCode(null)
            navigate(`/app/quotations/${quotationId}`)
          }}
        />
      )}
    </div>
  )
}
