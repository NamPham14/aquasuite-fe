import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useDispatchWarrantyTicketMutation } from '../api/warrantyTicketApi'
import { dispatchWarrantyTicketSchema, type DispatchWarrantyTicketFormData } from '../schemas/warrantyTicketSchemas'
import { useTechnicians } from '../hooks/useTechnicians'
import type { WarrantyTicketListItem } from '../types/warrantyTicket.types'

/**
 * Hộp thoại "Bắn công việc sửa chữa bảo hành" cho Chủ cửa hàng (FE-13 Giai đoạn 2b).
 * Tạo một công việc kỹ thuật WARRANTY_REPAIR gán sẵn kỹ thuật viên, liên kết với ticket và
 * chuyển ticket NEW → IN_PROGRESS. Địa chỉ mặc định lấy theo địa chỉ khách ghi trên yêu cầu.
 */
export function DispatchWarrantyTicketDialog({ item, onClose }: { item: WarrantyTicketListItem; onClose: () => void }) {
  const [dispatchTicket, { isLoading }] = useDispatchWarrantyTicketMutation()
  const { technicians, isLoading: loadingTechs } = useTechnicians()

  const { register, handleSubmit, formState: { errors } } = useForm<DispatchWarrantyTicketFormData>({
    resolver: zodResolver(dispatchWarrantyTicketSchema),
    defaultValues: { technicianId: '', scheduledAt: '', serviceAddress: item.siteAddress ?? '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await dispatchTicket({
        id: item.ticketId,
        body: {
          technicianId: data.technicianId,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
          serviceAddress: data.serviceAddress?.trim() ? data.serviceAddress.trim() : null,
        },
      }).unwrap()
      toast.success('Đã bắn công việc sửa chữa bảo hành cho kỹ thuật viên.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể bắn công việc sửa chữa bảo hành')
    }
  })

  return (
    <ManagementDialog title="Bắn công việc sửa chữa bảo hành" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang bắn công việc…' : 'Bắn công việc'}>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Yêu cầu <strong>{item.ticketCode}</strong>. Chọn kỹ thuật viên đi khảo sát & xử lý; kỹ thuật viên sẽ xác định
          tình trạng thiết bị tại hiện trường rồi ghi kết quả khi hoàn tất.
        </p>
        <ManagementFormField id="dispatch-technician" label="Kỹ thuật viên *" error={errors.technicianId?.message}>
          <select id="dispatch-technician" className={managementFieldClass}
            aria-invalid={!!errors.technicianId} disabled={loadingTechs} {...register('technicianId')}>
            <option value="">{loadingTechs ? 'Đang tải danh sách…' : '— Chọn kỹ thuật viên —'}</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.username} ({t.email})</option>
            ))}
          </select>
        </ManagementFormField>
        <ManagementFormField id="dispatch-schedule" label="Lịch hẹn (tùy chọn)" error={errors.scheduledAt?.message}
          hint="Đặt thời gian hẹn khảo sát/sửa chữa; để trống nếu chốt lịch sau.">
          <input id="dispatch-schedule" type="datetime-local" className={managementFieldClass} {...register('scheduledAt')} />
        </ManagementFormField>
        <ManagementFormField id="dispatch-address" label="Địa chỉ dịch vụ (tùy chọn)" error={errors.serviceAddress?.message}
          hint="Mặc định theo địa chỉ khách ghi trên yêu cầu; sửa nếu cần.">
          <input id="dispatch-address" type="text" className={managementFieldClass} {...register('serviceAddress')} />
        </ManagementFormField>
        {!loadingTechs && technicians.length === 0 && (
          <p className="text-xs text-amber-700">Chưa có tài khoản kỹ thuật viên (TECHNICAL_STAFF) đang hoạt động để phân công.</p>
        )}
      </ManagementForm>
    </ManagementDialog>
  )
}
