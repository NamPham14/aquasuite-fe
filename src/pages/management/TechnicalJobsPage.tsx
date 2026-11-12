import { useState } from 'react'
import { toast } from 'sonner'
import { Wrench, RotateCcw, SlidersHorizontal, RefreshCw, Plus } from 'lucide-react'
import { ManagementPageHeader, ManagementFilterBar, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../shared/ui/ManagementRowActions'
import { formatDateTime } from '../../shared/lib/money'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { useTechnicalJobFilters } from '../../features/servicedesk/hooks/useTechnicalJobFilters'
import {
  useSearchTechnicalJobsQuery,
  useAcceptTechnicalJobMutation,
} from '../../features/servicedesk/api/technicalJobApi'
import { TechnicalJobStatusBadge } from '../../features/servicedesk/components/TechnicalJobBadges'
import { TechnicalJobDetailDialog } from '../../features/servicedesk/components/TechnicalJobDetailDialog'
import { RejectTechnicalJobDialog } from '../../features/servicedesk/components/RejectTechnicalJobDialog'
import { CompleteTechnicalJobDialog } from '../../features/servicedesk/components/CompleteTechnicalJobDialog'
import { AssignTechnicalJobDialog } from '../../features/servicedesk/components/AssignTechnicalJobDialog'
import { CreateTechnicalJobDialog } from '../../features/servicedesk/components/CreateTechnicalJobDialog'
import { JOB_TYPE_LABEL, type TechnicalJobListItem, type TechnicalJobStatus, type TechnicalJobType } from '../../features/servicedesk/types/technicalJob.types'

function hasRole(roles: string[] | undefined, role: string): boolean {
  return roles?.some((r) => [role, `ROLE_${role}`].includes(r.toUpperCase())) ?? false
}

/**
 * Trang Công việc kỹ thuật (FE-13, UC-59/60/61 + phân công của Chủ cửa hàng).
 * Gom các luồng nghiệp vụ theo vai trò và trạng thái công việc:
 * - UC-59: tra cứu/lịch (lọc trạng thái, loại việc, khoảng ngày) + xem chi tiết — mọi vai trò xem phạm vi của mình.
 * - UC-60: Kỹ thuật viên tiếp nhận (accept) / từ chối (reject) việc đang chờ (ASSIGNED).
 * - UC-61: Kỹ thuật viên ghi kết quả & hoàn tất (complete) việc đang thực hiện (IN_PROGRESS).
 * - Phân công: Chủ cửa hàng gán kỹ thuật viên cho việc ASSIGNED/REJECTED — khép luồng auto-sinh từ Order.
 * Tái dùng toàn bộ bộ UI quản lý dùng chung; phạm vi dữ liệu và phân quyền do backend quyết định.
 */
export function TechnicalJobsPage() {
  const { user } = useAuth()
  const isOwner = hasRole(user?.roles, 'SHOP_OWNER')
  const isTechnician = hasRole(user?.roles, 'TECHNICAL_STAFF')
  const currentUserId = user?.id

  const { status, setStatus, jobType, setJobType, fromDate, setFromDate, toDate, setToDate, page, setPage, resetFilters, queryParams } =
    useTechnicalJobFilters({ page: 1, size: 10 })

  // Danh sách tự làm mới khi quay lại trang và poll nhẹ mỗi 15s, để kỹ thuật viên sớm thấy việc
  // vừa được Chủ cửa hàng phân công mà không phải tải lại trang thủ công (app chưa có realtime/websocket).
  const { data, isLoading, isFetching, refetch } = useSearchTechnicalJobsQuery(queryParams, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 15000,
  })
  const rows = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const [acceptJob, { isLoading: isAccepting }] = useAcceptTechnicalJobMutation()

  // Công việc đang mở từng loại hộp thoại.
  const [detailItem, setDetailItem] = useState<TechnicalJobListItem | null>(null)
  const [rejectItem, setRejectItem] = useState<TechnicalJobListItem | null>(null)
  const [completeItem, setCompleteItem] = useState<TechnicalJobListItem | null>(null)
  const [assignItem, setAssignItem] = useState<TechnicalJobListItem | null>(null)
  const [creating, setCreating] = useState(false)

  /** Tiếp nhận công việc trực tiếp (không cần form): ASSIGNED → IN_PROGRESS. */
  async function handleAccept(job: TechnicalJobListItem) {
    try {
      await acceptJob(job.technicalJobId).unwrap()
      toast.success('Đã tiếp nhận công việc. Bắt đầu thực hiện.')
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể tiếp nhận công việc')
    }
  }

  // Kỹ thuật viên chỉ được thao tác trên công việc được phân cho chính mình.
  const ownedByMe = (job: TechnicalJobListItem) => !!currentUserId && job.technicianId === currentUserId

  const columns: readonly ManagementTableColumn<TechnicalJobListItem>[] = [
    {
      key: 'job', header: 'Công việc', cellClassName: 'max-w-[260px]',
      cell: (r) => (
        <div className="max-w-[260px]">
          <p className="font-medium text-slate-900">{JOB_TYPE_LABEL[r.jobType] ?? r.jobType}</p>
          <p className="truncate text-2xs text-slate-500" title={r.issueDescription}>{r.issueDescription}</p>
        </div>
      ),
    },
    { key: 'address', header: 'Địa chỉ dịch vụ', cellClassName: 'max-w-[220px] truncate', cell: (r) => <span className="text-slate-700" title={r.serviceAddress}>{r.serviceAddress}</span> },
    { key: 'schedule', header: 'Lịch hẹn', align: 'center', cell: (r) => formatDateTime(r.scheduledAt) },
    {
      key: 'technician', header: 'Kỹ thuật viên', align: 'center',
      cell: (r) =>
        r.technicianId
          ? <span className="text-xs text-slate-600">{r.technicianId === currentUserId ? 'Tôi' : 'Đã phân công'}</span>
          : <span className="text-xs italic text-slate-400">Chưa phân công</span>,
    },
    { key: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <TechnicalJobStatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Thao tác', align: 'right',
      cell: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ManagementActionButton variant="view" label="Chi tiết" ariaLabel={`Xem chi tiết công việc ${r.technicalJobId}`} onClick={() => setDetailItem(r)} />

          {/* Chủ cửa hàng: phân công / phân công lại */}
          {isOwner && (r.status === 'ASSIGNED' || r.status === 'REJECTED') && (
            <ManagementActionButton variant="edit" label={r.status === 'REJECTED' ? 'Phân công lại' : 'Phân công'} ariaLabel="Phân công công việc" onClick={() => setAssignItem(r)} />
          )}

          {/* Kỹ thuật viên: tiếp nhận / từ chối việc được giao */}
          {isTechnician && r.status === 'ASSIGNED' && ownedByMe(r) && (
            <>
              <ManagementActionButton variant="edit" label="Tiếp nhận" ariaLabel="Tiếp nhận công việc" disabled={isAccepting} onClick={() => handleAccept(r)} />
              <ManagementActionButton variant="delete" label="Từ chối" ariaLabel="Từ chối công việc" onClick={() => setRejectItem(r)} />
            </>
          )}

          {/* Kỹ thuật viên: hoàn tất việc đang thực hiện */}
          {isTechnician && r.status === 'IN_PROGRESS' && ownedByMe(r) && (
            <ManagementActionButton variant="edit" label="Hoàn tất" ariaLabel="Hoàn tất công việc" onClick={() => setCompleteItem(r)} />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <ManagementPageHeader
        title="Công việc kỹ thuật"
        description="Lịch khảo sát, lắp đặt và sửa chữa bảo hành; tiếp nhận, thực hiện và nghiệm thu công việc"
        group="Dịch vụ kỹ thuật"
        breadcrumb="Công việc kỹ thuật"
        icon={<Wrench className="h-6 w-6" aria-hidden="true" />}
      />

      {/* Bộ lọc tra cứu (UC-59) */}
      <ManagementFilterBar>
        <ManagementSelect id="tj-status" label="Trạng thái" value={status} onChange={(v) => setStatus(v as TechnicalJobStatus | '')}>
          <option value="">Tất cả trạng thái</option>
          <option value="ASSIGNED">Chờ tiếp nhận</option>
          <option value="IN_PROGRESS">Đang thực hiện</option>
          <option value="COMPLETED">Hoàn tất</option>
          <option value="REJECTED">Bị từ chối</option>
        </ManagementSelect>
        <ManagementSelect id="tj-type" label="Loại công việc" value={jobType} onChange={(v) => setJobType(v as TechnicalJobType | '')}>
          <option value="">Tất cả loại</option>
          <option value="SURVEY">Khảo sát</option>
          <option value="INSTALLATION">Lắp đặt</option>
          <option value="WARRANTY_REPAIR">Sửa chữa bảo hành</option>
        </ManagementSelect>
        <div className="flex flex-col">
          <label htmlFor="tj-from" className="mb-1 text-xs font-medium text-slate-600">Lịch hẹn từ</label>
          <input id="tj-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
        </div>
        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <label htmlFor="tj-to" className="mb-1 text-xs font-medium text-slate-600">đến</label>
            <input id="tj-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500" />
          </div>
          <button type="button" onClick={resetFilters}
            className="mb-0.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
          </button>
        </div>
      </ManagementFilterBar>

      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Hiển thị {rows.length} / {data?.totalElements ?? 0} công việc
        </span>
        <span className="flex items-center gap-2">
          {isOwner && (
            <button type="button" onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 font-medium text-white hover:bg-sky-700">
              <Plus className="h-3.5 w-3.5" /> Tạo công việc
            </button>
          )}
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </span>
      </div>

      {/* Bảng công việc */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <h2 id="technical-jobs-title" className="sr-only">Danh sách công việc kỹ thuật</h2>
        <ManagementTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.technicalJobId}
          labelledBy="technical-jobs-title"
          emptyMessage={isLoading || isFetching ? 'Đang tải danh sách công việc…' : 'Không có công việc phù hợp.'}
        />
      </div>

      {/* Phân trang */}
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

      {detailItem && <TechnicalJobDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />}
      {rejectItem && <RejectTechnicalJobDialog item={rejectItem} onClose={() => setRejectItem(null)} />}
      {completeItem && <CompleteTechnicalJobDialog item={completeItem} onClose={() => setCompleteItem(null)} />}
      {assignItem && <AssignTechnicalJobDialog item={assignItem} onClose={() => setAssignItem(null)} />}
      {creating && <CreateTechnicalJobDialog onClose={() => setCreating(false)} />}
    </div>
  )
}
