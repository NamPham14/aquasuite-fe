import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { formatDateTime } from '../../../shared/lib/money'
import { useGetTechnicalJobDetailQuery } from '../api/technicalJobApi'
import { JOB_TYPE_LABEL, type TechnicalJobListItem, type TechnicalJobStatus } from '../types/technicalJob.types'

/** Nhãn tiếng Việt cho trạng thái, hiển thị trong ô chỉ-đọc. */
const STATUS_LABEL: Record<TechnicalJobStatus, string> = {
  ASSIGNED: 'Chờ tiếp nhận',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất',
  REJECTED: 'Bị từ chối',
}

/**
 * Hộp thoại xem chi tiết một công việc kỹ thuật (UC-59, luồng B) — chỉ đọc.
 * Trình bày theo đúng khuôn form quản lý (như Chi tiết Danh mục/Thương hiệu): dùng {@link ManagementForm}
 * ở chế độ {@code readOnly} với các ô nhập bị khóa, lưới 2 cột cho trường ngắn và ô nhiều dòng cho trường dài,
 * nút "Đóng" ở cuối. Lấy thêm dữ liệu chi tiết qua GET /technical-jobs/{id} (kết quả, ghi chú, lý do, liên kết).
 */
export function TechnicalJobDetailDialog({ item, onClose }: { item: TechnicalJobListItem; onClose: () => void }) {
  const { data } = useGetTechnicalJobDetailQuery(item.technicalJobId)
  const job = data ?? item

  return (
    <ManagementDialog title={`Chi tiết công việc — ${JOB_TYPE_LABEL[job.jobType] ?? job.jobType}`} onClose={onClose}>
      <ManagementForm onSubmit={(e) => e.preventDefault()} onClose={onClose} readOnly submitLabel="Đóng">
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadField id="tj-type" label="Loại công việc" value={JOB_TYPE_LABEL[job.jobType] ?? job.jobType} />
          <ReadField id="tj-status" label="Trạng thái" value={STATUS_LABEL[job.status] ?? job.status} />
          <ReadField id="tj-schedule" label="Lịch hẹn" value={formatDateTime(job.scheduledAt)} />
          <ReadField id="tj-completed" label="Hoàn tất lúc" value={job.completedAt ? formatDateTime(job.completedAt) : '—'} />
          <ReadField id="tj-technician" label="Kỹ thuật viên phụ trách" value={job.technicianId ?? 'Chưa phân công'} />
          {data?.orderId && <ReadField id="tj-order" label="Đơn hàng liên quan" value={data.orderId} />}
          {data?.warrantyRecordId && <ReadField id="tj-warranty" label="Bản ghi bảo hành" value={data.warrantyRecordId} />}
        </div>

        <ReadField id="tj-address" label="Địa chỉ dịch vụ" value={job.serviceAddress} />
        <ReadArea id="tj-desc" label="Mô tả / Yêu cầu" value={job.issueDescription} />
        {data?.result && <ReadArea id="tj-result" label="Kết quả thực hiện" value={data.result} />}
        {data?.technicalNote && <ReadArea id="tj-note" label="Ghi chú kỹ thuật" value={data.technicalNote} />}
        {data?.rejectionReason && <ReadArea id="tj-reject" label="Lý do từ chối" value={data.rejectionReason} />}
      </ManagementForm>
    </ManagementDialog>
  )
}

/** Ô một dòng, chỉ đọc — khớp style input của form quản lý. */
function ReadField({ id, label, value }: { id: string; label: string; value?: string | null }) {
  return (
    <ManagementFormField id={id} label={label}>
      <input id={id} className={managementFieldClass} value={value || '—'} disabled readOnly />
    </ManagementFormField>
  )
}

/** Ô nhiều dòng, chỉ đọc — dùng cho trường dài (mô tả, kết quả, ghi chú, lý do). */
function ReadArea({ id, label, value }: { id: string; label: string; value?: string | null }) {
  return (
    <ManagementFormField id={id} label={label}>
      <textarea id={id} className={managementFieldClass} rows={3} value={value || '—'} disabled readOnly />
    </ManagementFormField>
  )
}
