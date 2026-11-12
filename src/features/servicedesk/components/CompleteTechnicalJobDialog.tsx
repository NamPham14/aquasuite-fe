import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useCompleteTechnicalJobMutation } from '../api/technicalJobApi'
import { completeJobSchema, type CompleteJobFormData } from '../schemas/technicalJob.schema'
import type { TechnicalJobListItem } from '../types/technicalJob.types'

/**
 * Hộp thoại "Ghi kết quả & hoàn tất công việc" (UC-61). Kỹ thuật viên nhập kết quả thực hiện
 * (bắt buộc) và ghi chú kỹ thuật (tùy chọn) cho công việc đang IN_PROGRESS.
 * Gọi POST /technical-jobs/{id}/complete; BE chuyển công việc sang COMPLETED và đóng việc.
 */
export function CompleteTechnicalJobDialog({ item, onClose }: { item: TechnicalJobListItem; onClose: () => void }) {
  const [completeJob, { isLoading }] = useCompleteTechnicalJobMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<CompleteJobFormData>({
    resolver: zodResolver(completeJobSchema),
    defaultValues: { result: '', technicalNote: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await completeJob({
        id: item.technicalJobId,
        body: { result: data.result, technicalNote: data.technicalNote?.trim() || null },
      }).unwrap()
      toast.success('Đã ghi kết quả và hoàn tất công việc kỹ thuật.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể hoàn tất công việc')
    }
  })

  return (
    <ManagementDialog title="Hoàn tất công việc kỹ thuật" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang lưu…' : 'Hoàn tất công việc'}>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Công việc tại <strong>{item.serviceAddress}</strong> sẽ được đánh dấu hoàn tất và không thể chỉnh sửa trạng thái sau đó.
        </p>
        <ManagementFormField id="complete-result" label="Kết quả thực hiện *" error={errors.result?.message}
          hint="Mô tả kết quả kiểm tra/lắp đặt/sửa chữa khi hoàn tất.">
          <textarea id="complete-result" rows={3} className={managementFieldClass} placeholder="Ví dụ: đã lắp đặt và kiểm tra áp lực nước đạt yêu cầu…"
            aria-invalid={!!errors.result} aria-describedby={errors.result ? 'complete-result-error' : undefined}
            {...register('result')} />
        </ManagementFormField>
        <ManagementFormField id="complete-note" label="Ghi chú kỹ thuật (tùy chọn)" error={errors.technicalNote?.message}>
          <textarea id="complete-note" rows={2} className={managementFieldClass} placeholder="Lưu ý thêm cho hồ sơ kỹ thuật…"
            {...register('technicalNote')} />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
