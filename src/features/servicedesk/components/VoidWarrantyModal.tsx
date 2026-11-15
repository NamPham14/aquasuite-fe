import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../../shared/api/apiError'
import { voidWarrantySchema, type VoidWarrantyValues } from '../schemas/warrantySchemas'
import { useVoidWarrantyRecordMutation } from '../api/warrantyApi'

interface VoidWarrantyModalProps {
  warrantyRecordId: string
  warrantyCode: string
  onClose: () => void
  onVoided?: () => void
}

export function VoidWarrantyModal({
  warrantyRecordId,
  warrantyCode,
  onClose,
  onVoided,
}: VoidWarrantyModalProps) {
  const [voidWarranty, { isLoading }] = useVoidWarrantyRecordMutation()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VoidWarrantyValues>({
    resolver: zodResolver(voidWarrantySchema),
    defaultValues: { reason: '' },
  })

  const reasonValue = watch('reason') ?? ''

  const onSubmit = async (values: VoidWarrantyValues) => {
    try {
      await voidWarranty({
        id: warrantyRecordId,
        body: { reason: values.reason.trim() },
      }).unwrap()
      toast.success(`Đã hủy thẻ bảo hành ${warrantyCode}.`)
      onVoided?.()
      onClose()
    } catch (err) {
      const normalized = normalizeApiError(err)
      toast.error(normalized.message)
    }
  }

  return (
    <ManagementDialog
      title={`Hủy thẻ bảo hành ${warrantyCode}`}
      onClose={onClose}
      closeDisabled={isLoading}
    >
      <ManagementForm
        onSubmit={handleSubmit(onSubmit)}
        onClose={onClose}
        submitDisabled={isLoading}
        closeDisabled={isLoading}
        submitLabel={isLoading ? 'Đang xử lý...' : 'Xác nhận hủy thẻ'}
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Thao tác hủy thẻ bảo hành là bất biến và sẽ được ghi nhận vào nhật ký kiểm toán. Thẻ đã hủy không thể kích hoạt lại.
        </div>

        <ManagementFormField
          id="void-reason"
          label="Lý do hủy thẻ *"
          error={errors.reason?.message}
          hint={`${reasonValue.length}/500 ký tự`}
        >
          <textarea
            id="void-reason"
            rows={4}
            maxLength={500}
            placeholder="Ví dụ: Khách hàng hoàn trả sản phẩm, nhập nhầm số serial..."
            className={managementFieldClass}
            {...register('reason')}
          />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}

