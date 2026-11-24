import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useCompleteManagedWarrantyTicketMutation } from '../api/warrantyTicketApi'
import { completeWarrantyTicketSchema, type CompleteWarrantyTicketFormData } from '../schemas/warrantyTicketSchemas'
import type { WarrantyTicketListItem } from '../types/warrantyTicket.types'

/**
 * Hộp thoại "Hoàn tất yêu cầu bảo hành" cho Chủ cửa hàng: IN_PROGRESS → DONE kèm kết quả xử lý bắt buộc.
 * Nếu trong quá trình kiểm tra phát hiện không đủ điều kiện bảo hành, vẫn hoàn tất và ghi
 * "Không bảo hành vì …" vào kết quả (trạng thái Bị từ chối chỉ dùng khi từ chối ngay ở bước Chờ tiếp nhận).
 */
export function CompleteWarrantyTicketDialog({ item, onClose }: { item: WarrantyTicketListItem; onClose: () => void }) {
  const [completeTicket, { isLoading }] = useCompleteManagedWarrantyTicketMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<CompleteWarrantyTicketFormData>({
    resolver: zodResolver(completeWarrantyTicketSchema),
    defaultValues: { result: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await completeTicket({ id: item.ticketId, body: { result: data.result.trim() } }).unwrap()
      toast.success('Đã hoàn tất yêu cầu bảo hành.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể hoàn tất yêu cầu bảo hành')
    }
  })

  return (
    <ManagementDialog title="Hoàn tất yêu cầu bảo hành" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang lưu…' : 'Hoàn tất'}>
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Yêu cầu <strong>{item.ticketCode}</strong> sẽ chuyển sang <strong>Hoàn tất</strong>. Nếu sau khi kiểm tra không
          đủ điều kiện bảo hành, ghi rõ <em>“Không bảo hành vì …”</em> trong kết quả.
        </p>
        <ManagementFormField id="complete-result" label="Kết quả xử lý *" error={errors.result?.message}>
          <textarea id="complete-result" rows={4} className={managementFieldClass}
            placeholder="Ví dụ: Đã thay lõi lọc số 1, máy hoạt động bình thường. / Không bảo hành vì lỗi do va đập."
            {...register('result')} />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
