import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useCreateTechnicalJobMutation } from '../api/technicalJobApi'
import { createJobSchema, type CreateJobFormData } from '../schemas/technicalJob.schema'
import { useTechnicians } from '../hooks/useTechnicians'
import { useGetCustomerOptionsQuery } from '../../sales/api/customerApi'

/**
 * Hộp thoại "Tạo công việc kỹ thuật" cho Chủ cửa hàng (Hướng A).
 * Cho phép tạo công việc cho BẤT KỲ khách hàng nào (khách lẻ/mua tại quầy/công trình) và chọn đủ 3 loại
 * (Khảo sát / Lắp đặt / Bảo hành) — không bị giới hạn bởi loại đơn. Có thể gán sẵn kỹ thuật viên hoặc
 * để trống để phân công sau. Gọi POST /technical-jobs; công việc tạo ra ở trạng thái Chờ tiếp nhận.
 */
export function CreateTechnicalJobDialog({ onClose }: { onClose: () => void }) {
  const [createJob, { isLoading }] = useCreateTechnicalJobMutation()
  const { technicians, isLoading: loadingTechs } = useTechnicians()
  const { data: customers, isFetching: loadingCustomers } = useGetCustomerOptionsQuery()

  const { register, handleSubmit, formState: { errors } } = useForm<CreateJobFormData>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { jobType: 'INSTALLATION', customerId: '', serviceAddress: '', issueDescription: '', scheduledAt: '', technicianId: '' },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await createJob({
        jobType: data.jobType,
        customerId: data.customerId,
        serviceAddress: data.serviceAddress,
        issueDescription: data.issueDescription,
        // datetime-local (giờ địa phương) -> ISO-8601 có offset; để trống nếu không nhập.
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
        technicianId: data.technicianId || null,
      }).unwrap()
      toast.success('Đã tạo công việc kỹ thuật.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể tạo công việc')
    }
  })

  return (
    <ManagementDialog title="Tạo công việc kỹ thuật" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang tạo…' : 'Tạo công việc'}>

        <ManagementFormField id="create-jobType" label="Loại công việc *" error={errors.jobType?.message}>
          <select id="create-jobType" className={managementFieldClass} {...register('jobType')}>
            <option value="SURVEY">Khảo sát</option>
            <option value="INSTALLATION">Lắp đặt</option>
            <option value="WARRANTY_REPAIR">Sửa chữa bảo hành</option>
          </select>
        </ManagementFormField>

        <ManagementFormField id="create-customer" label="Khách hàng *" error={errors.customerId?.message}>
          <select id="create-customer" className={managementFieldClass} disabled={loadingCustomers}
            aria-invalid={!!errors.customerId} aria-describedby={errors.customerId ? 'create-customer-error' : undefined}
            {...register('customerId')}>
            <option value="">{loadingCustomers ? 'Đang tải khách hàng…' : '— Chọn khách hàng —'}</option>
            {(customers ?? []).map((c) => (
              <option key={c.customerId} value={c.customerId}>
                {c.customerName}{c.phone ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </select>
        </ManagementFormField>

        <ManagementFormField id="create-address" label="Địa chỉ dịch vụ *" error={errors.serviceAddress?.message}>
          <input id="create-address" className={managementFieldClass} placeholder="Số nhà, đường, quận, thành phố…"
            aria-invalid={!!errors.serviceAddress} aria-describedby={errors.serviceAddress ? 'create-address-error' : undefined}
            {...register('serviceAddress')} />
        </ManagementFormField>

        <ManagementFormField id="create-desc" label="Mô tả / Yêu cầu *" error={errors.issueDescription?.message}>
          <textarea id="create-desc" rows={3} className={managementFieldClass} placeholder="Nội dung công việc cần thực hiện…"
            aria-invalid={!!errors.issueDescription} aria-describedby={errors.issueDescription ? 'create-desc-error' : undefined}
            {...register('issueDescription')} />
        </ManagementFormField>

        <ManagementFormField id="create-schedule" label="Lịch hẹn (tùy chọn)" error={errors.scheduledAt?.message}>
          <input id="create-schedule" type="datetime-local" className={managementFieldClass} {...register('scheduledAt')} />
        </ManagementFormField>

        <ManagementFormField id="create-technician" label="Phân công cho (tùy chọn)" error={errors.technicianId?.message}
          hint="Để trống nếu muốn phân công sau.">
          <select id="create-technician" className={managementFieldClass} disabled={loadingTechs} {...register('technicianId')}>
            <option value="">— Phân công sau —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.username} ({t.email})</option>
            ))}
          </select>
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
