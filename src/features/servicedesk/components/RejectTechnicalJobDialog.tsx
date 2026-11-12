import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useRejectTechnicalJobMutation } from '../api/technicalJobApi'
import { rejectJobSchema, type RejectJobFormData } from '../schemas/technicalJob.schema'
import type { TechnicalJobListItem } from '../types/technicalJob.types'

/**
 * Hộp thoại "Từ chối công việc" (UC-60). Kỹ thuật viên nhập lý do từ chối một công việc
 * đang ở trạng thái chờ tiếp nhận (ASSIGNED). Gọi POST /technical-jobs/{id}/reject;
 * BE chuyển công việc sang REJECTED để Chủ cửa hàng phân công lại.
 */
export function RejectTechnicalJobDialog({ item, onClose }: { item: TechnicalJobListItem; onClose: () => void }) {
  const [rejectJob, { isLoading }] = useRejectTechnicalJobMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<RejectJobFormData>({
    resolver: zodResolver(rejectJobSchema),
    defaultValues: { reason: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await rejectJob({ id: item.technicalJobId, body: { reason: data.reason } }).unwrap()
      toast.success('Đã từ chối công việc kỹ thuật.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể từ chối công việc')
    }
  })

  return (
    <ManagementDialog title="Từ chối công việc kỹ thuật" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang gửi…' : 'Xác nhận từ chối'}>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Công việc tại <strong>{item.serviceAddress}</strong> sẽ được chuyển về trạng thái bị từ chối để Chủ cửa hàng phân công lại.
        </p>
        <ManagementFormField id="reject-reason" label="Lý do từ chối *" error={errors.reason?.message}>
          <textarea id="reject-reason" rows={3} className={managementFieldClass} placeholder="Ví dụ: trùng lịch, sai địa chỉ, ngoài chuyên môn…"
            aria-invalid={!!errors.reason} aria-describedby={errors.reason ? 'reject-reason-error' : undefined}
            {...register('reason')} />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
