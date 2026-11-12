import { JOB_TYPE_LABEL, type TechnicalJobStatus, type TechnicalJobType } from '../types/technicalJob.types'

/**
 * Nhãn trạng thái công việc kỹ thuật (FE-13). Ánh xạ mỗi trạng thái nghiệp vụ sang màu + nhãn tiếng Việt:
 * - ASSIGNED: đã phân công, chờ kỹ thuật viên tiếp nhận (xanh dương).
 * - IN_PROGRESS: đang thực hiện (hổ phách).
 * - COMPLETED: đã hoàn tất (xanh lá).
 * - REJECTED: bị từ chối (đỏ).
 */
const STATUS_META: Record<TechnicalJobStatus, { label: string; className: string }> = {
  ASSIGNED: { label: 'Chờ tiếp nhận', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  IN_PROGRESS: { label: 'Đang thực hiện', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  COMPLETED: { label: 'Hoàn tất', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export function TechnicalJobStatusBadge({ status }: { status: TechnicalJobStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.ASSIGNED
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function TechnicalJobTypeLabel({ type }: { type: TechnicalJobType }) {
  return <span className="text-slate-700">{JOB_TYPE_LABEL[type] ?? type}</span>
}
