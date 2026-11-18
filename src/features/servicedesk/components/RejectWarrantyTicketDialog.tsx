import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useRejectManagedWarrantyTicketMutation } from '../api/warrantyTicketApi'
import { rejectWarrantyTicketSchema, type RejectWarrantyTicketFormData } from '../schemas/warrantyTicketSchemas'
import type { WarrantyTicketListItem } from '../types/warrantyTicket.types'

/**
 * Hộp thoại "Từ chối yêu cầu bảo hành" tại bàn cho Chủ cửa hàng (FE-13 Giai đoạn 2b).
 * Dùng cho ca hiển nhiên không đáng cử người đi: thẻ hết hạn, yêu cầu trùng/rác, ngoài phạm vi bảo hành.
 * Chuyển ticket NEW → REJECTED kèm lý do bắt buộc.
 */
export function RejectWarrantyTicketDialog({ item, onClose }: { item: WarrantyTicketListItem; onClose: () => void }) {
  const [rejectTicket, { isLoading }] = useRejectManagedWarrantyTicketMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<RejectWarrantyTicketFormData>({
    resolver: zodResolver(rejectWarrantyTicketSchema),
    defaultValues: { reason: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await rejectTicket({ id: item.ticketId, body: { reason: data.reason.trim() } }).unwrap()
      toast.success('Đã từ chối yêu cầu bảo hành.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể từ chối yêu cầu bảo hành')
    }
  })

  return (
    <ManagementDialog title="Từ chối yêu cầu bảo hành" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang từ chối…' : 'Từ chối yêu cầu'}>
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Yêu cầu <strong>{item.ticketCode}</strong> sẽ bị từ chối và không cử kỹ thuật viên. Chỉ dùng cho yêu cầu không
          hợp lệ (thẻ hết hạn, trùng, ngoài phạm vi). Nếu còn nghi ngờ tình trạng thiết bị, hãy bắn công việc để kiểm tra.
        </p>
        <ManagementFormField id="reject-reason" label="Lý do từ chối *" error={errors.reason?.message}>
          <textarea id="reject-reason" rows={4} className={managementFieldClass}
            placeholder="Ví dụ: Thẻ bảo hành đã hết hạn và khách không đồng ý sửa tính phí; yêu cầu trùng với phiếu đang xử lý..."
            {...register('reason')} />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
