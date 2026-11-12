import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useAssignTechnicalJobMutation } from '../api/technicalJobApi'
import { assignJobSchema, type AssignJobFormData } from '../schemas/technicalJob.schema'
import { useTechnicians } from '../hooks/useTechnicians'
import type { TechnicalJobListItem } from '../types/technicalJob.types'

/** Đổi ISO-8601 sang giá trị cho input datetime-local ("yyyy-MM-ddTHH:mm" theo giờ địa phương). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Hộp thoại "Phân công công việc" cho Chủ cửa hàng (FE-13, khép luồng auto-sinh từ Order).
 * Lấy danh sách tài khoản có vai trò TECHNICAL_STAFF (đang hoạt động) từ module IAM để chọn người phụ trách,
 * đồng thời cho đặt/cập nhật lịch hẹn ngay khi phân công, rồi gọi POST /technical-jobs/{id}/assign.
 * Dùng cho việc đang ASSIGNED hoặc REJECTED (phân công lại).
 */
export function AssignTechnicalJobDialog({ item, onClose }: { item: TechnicalJobListItem; onClose: () => void }) {
  const [assignJob, { isLoading }] = useAssignTechnicalJobMutation()
  const { technicians, isLoading: loadingTechs } = useTechnicians()

  const { register, handleSubmit, formState: { errors } } = useForm<AssignJobFormData>({
    resolver: zodResolver(assignJobSchema),
    defaultValues: { technicianId: item.technicianId ?? '', scheduledAt: toLocalInput(item.scheduledAt) },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await assignJob({
        id: item.technicalJobId,
        body: {
          technicianId: data.technicianId,
          // datetime-local (giờ địa phương) -> ISO có offset; để trống thì giữ lịch hiện có.
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
        },
      }).unwrap()
      toast.success('Đã phân công công việc cho kỹ thuật viên.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể phân công công việc')
    }
  })

  return (
    <ManagementDialog title="Phân công công việc kỹ thuật" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang phân công…' : 'Phân công'}>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Công việc tại <strong>{item.serviceAddress}</strong>. Chọn kỹ thuật viên phụ trách; người được chọn sẽ thấy việc trong lịch của mình để tiếp nhận.
        </p>
        <ManagementFormField id="assign-technician" label="Kỹ thuật viên *" error={errors.technicianId?.message}>
          <select id="assign-technician" className={managementFieldClass}
            aria-invalid={!!errors.technicianId} aria-describedby={errors.technicianId ? 'assign-technician-error' : undefined}
            disabled={loadingTechs} {...register('technicianId')}>
            <option value="">{loadingTechs ? 'Đang tải danh sách…' : '— Chọn kỹ thuật viên —'}</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.username} ({t.email})</option>
            ))}
          </select>
        </ManagementFormField>
        <ManagementFormField id="assign-schedule" label="Lịch hẹn (tùy chọn)" error={errors.scheduledAt?.message}
          hint="Đặt thời gian hẹn thực hiện khi phân công; để trống nếu chốt lịch sau.">
          <input id="assign-schedule" type="datetime-local" className={managementFieldClass} {...register('scheduledAt')} />
        </ManagementFormField>
        {!loadingTechs && technicians.length === 0 && (
          <p className="text-xs text-amber-700">Chưa có tài khoản kỹ thuật viên (TECHNICAL_STAFF) đang hoạt động để phân công.</p>
        )}
      </ManagementForm>
    </ManagementDialog>
  )
}
