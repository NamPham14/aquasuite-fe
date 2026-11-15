import { useState } from 'react'
import {
  Calendar,
  ClipboardList,
  Eye,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import {
  ManagementFilterBar,
  ManagementPageHeader,
  ManagementSelect,
} from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { normalizeApiError } from '../../shared/api/apiError'
import { useGetMyWarrantyTicketsQuery } from '../../features/servicedesk/api/warrantyTicketApi'
import { TicketStatusBadge } from '../../features/servicedesk/components/TicketStatusBadge'
import { TicketDetailModal } from '../../features/servicedesk/components/TicketDetailModal'
import { CancelTicketModal } from '../../features/servicedesk/components/CancelTicketModal'
import type {
  PreferredSlot,
  WarrantyTicketListItem,
  WarrantyTicketStatus,
} from '../../features/servicedesk/types/warrantyTicket.types'

function formatSlot(slot?: PreferredSlot | null): string {
  if (!slot) return 'Linh hoạt'
  switch (slot) {
    case 'MORNING':
      return 'Sáng'
    case 'AFTERNOON':
      return 'Chiều'
    case 'EVENING':
      return 'Tối'
    default:
      return slot
  }
}

export function MyWarrantyTicketsPage() {
  const [status, setStatus] = useState<WarrantyTicketStatus | ''>('')
  const [page, setPage] = useState(1)

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [cancelTicketData, setCancelTicketData] = useState<{ id: string; code: string } | null>(null)

  const { data: pageData, isLoading, error, refetch } = useGetMyWarrantyTicketsQuery({
    status: status || undefined,
    page,
    size: 20,
  })

  const items = pageData?.items ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  const fetchError = error ? normalizeApiError(error).message : null

  const columns: ManagementTableColumn<WarrantyTicketListItem>[] = [
    {
      key: 'ticketCode',
      header: 'Mã yêu cầu',
      cell: (row) => (
        <span className="font-mono font-semibold text-sky-700">{row.ticketCode}</span>
      ),
    },
    {
      key: 'product',
      header: 'Thiết bị & Mã thẻ',
      cell: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-900">{row.productName || '—'}</div>
          <div className="font-mono text-xs text-slate-500">
            {row.warrantyCode || '—'} {row.serialNumber ? `• SN: ${row.serialNumber}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'issue',
      header: 'Mô tả sự cố',
      cell: (row) => (
        <p className="max-w-xs truncate text-xs text-slate-700" title={row.issueDescription}>
          {row.issueDescription}
        </p>
      ),
    },
    {
      key: 'schedule',
      header: 'Lịch hẹn mong muốn',
      cell: (row) => (
        <div className="text-xs text-slate-700">
          {row.preferredDate ? (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{row.preferredDate}</span>
              <span className="text-slate-400">({formatSlot(row.preferredSlot)})</span>
            </div>
          ) : (
            <span className="text-slate-400">Linh hoạt</span>
          )}
        </div>
      ),
    },
    {
      key: 'media',
      header: 'Đính kèm',
      cell: (row) => (
        <span className="text-xs text-slate-600">
          {row.mediaCount > 0 ? `${row.mediaCount} file` : 'Không có'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (row) => <TicketStatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày gửi',
      cell: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTicketId(row.ticketId)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-sky-700"
          >
            <Eye className="h-3.5 w-3.5" />
            Chi tiết
          </button>

          {row.canCancel && (
            <button
              type="button"
              onClick={() => setCancelTicketData({ id: row.ticketId, code: row.ticketCode })}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Hủy
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ManagementPageHeader
        title="Yêu cầu bảo hành của tôi"
        description="Theo dõi tiến độ xử lý và lịch sử các yêu cầu bảo hành kỹ thuật của bạn."
        group="Dịch vụ & Hậu mãi"
        breadcrumb="Yêu cầu bảo hành"
        icon={<ClipboardList className="h-5 w-5" />}
      />

      <ManagementFilterBar>
        <ManagementSelect
          id="ticket-status-filter"
          label="Trạng thái yêu cầu"
          value={status}
          onChange={(val) => {
            setStatus(val as WarrantyTicketStatus | '')
            setPage(1)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="NEW">Đã gửi (Chờ tiếp nhận)</option>
          <option value="IN_PROGRESS">Đang xử lý</option>
          <option value="DONE">Hoàn tất</option>
          <option value="REJECTED">Từ chối</option>
          <option value="CANCELLED">Đã hủy</option>
        </ManagementSelect>

        {Boolean(status) && (
          <button
            type="button"
            onClick={() => {
              setStatus('')
              setPage(1)
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Đặt lại bộ lọc
          </button>
        )}
      </ManagementFilterBar>

      {fetchError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
          {fetchError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 id="ticket-table-heading" className="text-sm font-semibold text-slate-900">
            Danh sách yêu cầu ({totalElements})
          </h2>
        </div>

        {isLoading ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Đang tải danh sách yêu cầu...</div>
        ) : (
          <ManagementTable
            columns={columns}
            rows={items}
            rowKey={(r) => r.ticketId}
            labelledBy="ticket-table-heading"
            emptyMessage="Bạn chưa gửi yêu cầu bảo hành nào."
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-500">
          <div>
            Hiển thị <span className="font-semibold text-slate-700">{items.length}</span> /{' '}
            <span className="font-semibold text-slate-700">{totalElements}</span> yêu cầu
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="px-2 py-1 text-xs font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          isOpen={Boolean(selectedTicketId)}
          onClose={() => setSelectedTicketId(null)}
          onCancelled={() => {
            refetch()
          }}
        />
      )}

      {cancelTicketData && (
        <CancelTicketModal
          ticketId={cancelTicketData.id}
          ticketCode={cancelTicketData.code}
          isOpen={Boolean(cancelTicketData)}
          onClose={() => setCancelTicketData(null)}
          onSuccess={() => {
            refetch()
          }}
        />
      )}
    </div>
  )
}
