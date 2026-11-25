import { useState } from 'react'
import { toast } from 'sonner'
import { LifeBuoy, RotateCcw, SlidersHorizontal, RefreshCw } from 'lucide-react'
import { ManagementPageHeader, ManagementFilterBar, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../shared/ui/ManagementRowActions'
import { formatDateTime } from '../../shared/lib/money'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { useGetManagedWarrantyTicketsQuery, useStartManagedWarrantyTicketMutation } from '../../features/servicedesk/api/warrantyTicketApi'
import { TicketStatusBadge } from '../../features/servicedesk/components/TicketStatusBadge'
import { CompleteWarrantyTicketDialog } from '../../features/servicedesk/components/CompleteWarrantyTicketDialog'
import { RejectWarrantyTicketDialog } from '../../features/servicedesk/components/RejectWarrantyTicketDialog'
import { WarrantyTicketManageDetailModal } from '../../features/servicedesk/components/WarrantyTicketManageDetailModal'
import type { WarrantyTicketListItem, WarrantyTicketStatus } from '../../features/servicedesk/types/warrantyTicket.types'

function hasRole(roles: string[] | undefined, role: string): boolean {
  return roles?.some((r) => [role, `ROLE_${role}`].includes(r.toUpperCase())) ?? false
}

/**
 * Trang Yêu cầu bảo hành phía nội bộ (chỉ Chủ cửa hàng).
 * Luồng: Chờ tiếp nhận (NEW) → "Tiếp nhận xử lý" → Đang xử lý (IN_PROGRESS) → "Hoàn tất" + kết quả → Hoàn tất (DONE).
 * Từ chối tại bàn (NEW → REJECTED, lý do bắt buộc) chỉ áp dụng ở bước Chờ tiếp nhận; không đủ điều kiện phát hiện
 * trong lúc xử lý thì hoàn tất với kết quả "Không bảo hành vì …".
 */
export function WarrantyTicketsPage() {
  const { user } = useAuth()
  const isOwner = hasRole(user?.roles, 'SHOP_OWNER')

  const [status, setStatus] = useState<WarrantyTicketStatus | ''>('')
  const [page, setPage] = useState(1)

  const queryParams = { status: status || undefined, page, size: 10 }
  const { data, isLoading, isFetching, refetch } = useGetManagedWarrantyTicketsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 15000,
  })
  const rows = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const [detailId, setDetailId] = useState<string | null>(null)
  const [completeItem, setCompleteItem] = useState<WarrantyTicketListItem | null>(null)
  const [startTicket, { isLoading: isStarting }] = useStartManagedWarrantyTicketMutation()

  async function handleStart(item: WarrantyTicketListItem) {
    try {
      await startTicket(item.ticketId).unwrap()
      toast.success('Đã tiếp nhận xử lý yêu cầu bảo hành.')
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể tiếp nhận xử lý yêu cầu bảo hành')
    }
  }
  const [rejectItem, setRejectItem] = useState<WarrantyTicketListItem | null>(null)

  function resetFilters() {
    setStatus('')
    setPage(1)
  }

  const columns: readonly ManagementTableColumn<WarrantyTicketListItem>[] = [
    {
      key: 'ticket', header: 'Yêu cầu', cellClassName: 'max-w-[260px]',
      cell: (r) => (
        <div className="max-w-[260px]">
          <p className="font-mono font-semibold text-sky-700">{r.ticketCode}</p>
          <p className="truncate text-2xs text-slate-500" title={r.issueDescription}>{r.issueDescription}</p>
        </div>
      ),
    },
    {
      key: 'product', header: 'Sản phẩm', cellClassName: 'max-w-[200px]',
      cell: (r) => (
        <div className="max-w-[200px]">
          <p className="truncate font-medium text-slate-800" title={r.productName ?? ''}>{r.productName || '—'}</p>
          <p className="truncate text-2xs text-slate-500">{r.serialNumber || r.warrantyCode || ''}</p>
        </div>
      ),
    },
    { key: 'address', header: 'Địa chỉ', cellClassName: 'max-w-[200px] truncate', cell: (r) => <span className="text-slate-700" title={r.siteAddress}>{r.siteAddress}</span> },
    { key: 'createdAt', header: 'Ngày gửi', align: 'center', cell: (r) => formatDateTime(r.createdAt) },
    { key: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <TicketStatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Thao tác', align: 'right',
      cell: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ManagementActionButton variant="view" label="Chi tiết" ariaLabel={`Xem chi tiết yêu cầu ${r.ticketCode}`} onClick={() => setDetailId(r.ticketId)} />
          {isOwner && r.status === 'NEW' && (
            <>
              <ManagementActionButton variant="edit" label="Tiếp nhận xử lý" ariaLabel={`Tiếp nhận xử lý yêu cầu ${r.ticketCode}`} disabled={isStarting} onClick={() => handleStart(r)} />
              <ManagementActionButton variant="delete" label="Từ chối" ariaLabel="Từ chối yêu cầu bảo hành" onClick={() => setRejectItem(r)} />
            </>
          )}
          {isOwner && r.status === 'IN_PROGRESS' && (
            <ManagementActionButton variant="edit" label="Hoàn tất" ariaLabel={`Hoàn tất yêu cầu ${r.ticketCode}`} onClick={() => setCompleteItem(r)} />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <ManagementPageHeader
        title="Yêu cầu bảo hành"
        description="Tiếp nhận xử lý yêu cầu bảo hành của khách, ghi kết quả khi hoàn tất hoặc từ chối yêu cầu không hợp lệ"
        group="Bảo hành"
        breadcrumb="Yêu cầu bảo hành"
        icon={<LifeBuoy className="h-6 w-6" aria-hidden="true" />}
      />

      <ManagementFilterBar>
        <ManagementSelect id="wt-status" label="Trạng thái" value={status} onChange={(v) => { setStatus(v as WarrantyTicketStatus | ''); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>
          <option value="NEW">Chờ tiếp nhận</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="DONE">Hoàn tất</option>
          <option value="REJECTED">Bị từ chối</option>
          <option value="CANCELLED">Đã hủy</option>
        </ManagementSelect>
        <div className="flex items-end">
          <button type="button" onClick={resetFilters}
            className="mb-0.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
          </button>
        </div>
      </ManagementFilterBar>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Hiển thị {rows.length} / {data?.totalElements ?? 0} yêu cầu
        </span>
        <button type="button" onClick={() => refetch()} disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <h2 id="warranty-tickets-title" className="sr-only">Danh sách yêu cầu bảo hành</h2>
        <ManagementTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.ticketId}
          labelledBy="warranty-tickets-title"
          emptyMessage={isLoading || isFetching ? 'Đang tải danh sách yêu cầu…' : 'Không có yêu cầu bảo hành phù hợp.'}
        />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">Trang {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Trang trước</button>
            <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Trang sau</button>
          </div>
        </div>
      )}

      {detailId && <WarrantyTicketManageDetailModal ticketId={detailId} onClose={() => setDetailId(null)} />}
      {completeItem && <CompleteWarrantyTicketDialog item={completeItem} onClose={() => setCompleteItem(null)} />}
      {rejectItem && <RejectWarrantyTicketDialog item={rejectItem} onClose={() => setRejectItem(null)} />}
    </div>
  )
}
