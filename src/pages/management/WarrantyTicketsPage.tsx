import { useState } from 'react'
import { toast } from 'sonner'
import { LifeBuoy, RotateCcw, RefreshCw } from 'lucide-react'
import {
  ManagementFilterCard,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSelect,
} from '../../shared/ui/ManagementPage'
import { ManagementTable, ManagementTableSkeleton, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../shared/ui/ManagementRowActions'
import { Button } from '../../shared/ui/Button'
import { CodeChip } from '../../shared/ui/Badge'
import { OPERATIONAL_TOAST_CLASS } from '../../shared/ui/FeedbackStates'
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
  const totalElements = data?.totalElements ?? 0

  const [detailId, setDetailId] = useState<string | null>(null)
  const [completeItem, setCompleteItem] = useState<WarrantyTicketListItem | null>(null)
  const [startTicket, { isLoading: isStarting }] = useStartManagedWarrantyTicketMutation()

  async function handleStart(item: WarrantyTicketListItem) {
    try {
      await startTicket(item.ticketId).unwrap()
      toast.success('Đã tiếp nhận xử lý yêu cầu bảo hành.', { className: OPERATIONAL_TOAST_CLASS })
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể tiếp nhận xử lý yêu cầu bảo hành', {
        className: OPERATIONAL_TOAST_CLASS,
      })
    }
  }
  const [rejectItem, setRejectItem] = useState<WarrantyTicketListItem | null>(null)

  function resetFilters() {
    setStatus('')
    setPage(1)
  }

  const columns: readonly ManagementTableColumn<WarrantyTicketListItem>[] = [
    {
      key: 'ticket',
      header: 'Yêu cầu',
      cellClassName: 'max-w-[260px]',
      cell: (r) => (
        <div className="max-w-[260px]">
          <CodeChip>{r.ticketCode}</CodeChip>
          <p className="mt-1 truncate text-xs text-aqs-ink-muted" title={r.issueDescription}>
            {r.issueDescription}
          </p>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Sản phẩm',
      cellClassName: 'max-w-[200px]',
      cell: (r) => (
        <div className="max-w-[200px]">
          <p className="truncate font-semibold text-aqs-ink" title={r.productName ?? ''}>
            {r.productName || '—'}
          </p>
          <p className="truncate text-xs text-aqs-ink-muted">{r.serialNumber || r.warrantyCode || ''}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      cellClassName: 'max-w-[200px] truncate',
      cell: (r) => (
        <span className="text-aqs-ink-muted" title={r.siteAddress}>
          {r.siteAddress}
        </span>
      ),
    },
    { key: 'createdAt', header: 'Ngày gửi', align: 'center', cellClassName: 'tabular-nums text-aqs-ink-muted', cell: (r) => formatDateTime(r.createdAt) },
    { key: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <TicketStatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      cell: (r) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
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
    <ManagementPageShell>
      <ManagementPageHeader
        title="Yêu cầu bảo hành"
        description="Tiếp nhận xử lý yêu cầu bảo hành của khách, ghi kết quả khi hoàn tất hoặc từ chối yêu cầu không hợp lệ."
        group="Bảo hành"
        breadcrumb="Yêu cầu bảo hành"
        icon={<LifeBuoy className="h-5 w-5" aria-hidden="true" />}
        actions={
          <Button variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
            Làm mới
          </Button>
        }
      />

      <ManagementFilterCard
        headingId="warranty-ticket-filters"
        title="Lọc yêu cầu bảo hành"
        resultCount={`Hiển thị ${rows.length} / ${totalElements} yêu cầu`}
        hasActiveFilters={Boolean(status)}
        onReset={resetFilters}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,280px)_auto]">
          <ManagementSelect
            id="wt-status"
            label="Trạng thái"
            value={status}
            onChange={(v) => {
              setStatus(v as WarrantyTicketStatus | '')
              setPage(1)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Chờ tiếp nhận</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="DONE">Hoàn tất</option>
            <option value="REJECTED">Bị từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </ManagementSelect>
          <div>
            <Button variant="secondary" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Đặt lại
            </Button>
          </div>
        </div>
      </ManagementFilterCard>

      <ManagementPanel
        headingId="warranty-tickets-title"
        title="Danh sách yêu cầu bảo hành"
        description={`Tổng số ${totalElements} yêu cầu bảo hành trong hệ thống.`}
        refreshing={isFetching && rows.length > 0}
        busy={isFetching}
      >
        {isLoading && !rows.length ? (
          <ManagementTableSkeleton columns={6} rows={5} />
        ) : (
          <ManagementTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.ticketId}
            labelledBy="warranty-tickets-title"
            emptyMessage={isFetching ? 'Đang tải danh sách yêu cầu…' : 'Không có yêu cầu bảo hành phù hợp.'}
          />
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-aqs-border bg-aqs-surface-subtle/60 px-5 py-3 text-xs text-aqs-ink-muted">
            <p className="tabular-nums">
              Trang <strong className="text-aqs-ink">{page}</strong> / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                Trang trước
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </ManagementPanel>

      {detailId && <WarrantyTicketManageDetailModal ticketId={detailId} onClose={() => setDetailId(null)} />}
      {completeItem && <CompleteWarrantyTicketDialog item={completeItem} onClose={() => setCompleteItem(null)} />}
      {rejectItem && <RejectWarrantyTicketDialog item={rejectItem} onClose={() => setRejectItem(null)} />}
    </ManagementPageShell>
  )
}
