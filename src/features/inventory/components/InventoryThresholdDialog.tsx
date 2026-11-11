import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useUpdateThresholdMutation } from '../api/inventoryApi'
import { thresholdSchema, type ThresholdFormData } from '../schemas/threshold.schema'
import type { InventoryListItem } from '../types/inventory.types'

/**
 * Hộp thoại "Cấu hình ngưỡng tồn an toàn" cho một SKU (UC-31, luồng D — chỉ Chủ cửa hàng).
 * Cho phép đặt ngưỡng tối thiểu (safety stock) và tối đa; ngưỡng tối đa là đầu vào để
 * module Mua hàng gợi ý số lượng nhập. Gọi PATCH /inventory/{variantId}/threshold và
 * hiển thị đúng thông báo MSG69 khi thành công.
 */
export function InventoryThresholdDialog({ item, onClose }: { item: InventoryListItem; onClose: () => void }) {
  const [updateThreshold, { isLoading }] = useUpdateThresholdMutation()

  const { register, handleSubmit, formState: { errors } } = useForm<ThresholdFormData>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: {
      minimumQty: item.minimumQty ?? 0,
      maximumQty: item.maximumQty ?? null,
    },
  })

  /** Gửi ngưỡng mới lên backend; chuẩn hóa maximumQty rỗng thành null (bỏ trần). */
  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateThreshold({
        variantId: item.variantId,
        body: {
          minimumQty: data.minimumQty,
          maximumQty: data.maximumQty ?? null,
        },
      }).unwrap()
      toast.success('Đã cập nhật ngưỡng tồn an toàn thành công.')
      onClose()
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Không thể cập nhật ngưỡng tồn kho')
    }
  })

  return (
    <ManagementDialog title={`Cấu hình ngưỡng tồn — ${item.sku ?? item.productName ?? 'SKU'}`} onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm onSubmit={onSubmit} onClose={onClose} submitDisabled={isLoading} closeDisabled={isLoading} submitLabel={isLoading ? 'Đang lưu…' : 'Lưu ngưỡng'}>
        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {item.productName ?? '—'} · Tồn khả dụng hiện tại: <strong>{item.availableQty}</strong> {item.unit ?? ''}
        </p>

        <ManagementFormField id="minimumQty" label="Ngưỡng tồn tối thiểu (safety stock)" error={errors.minimumQty?.message}
          hint="Khi tồn khả dụng ≤ mức này, SKU được đánh dấu sắp hết và phát cảnh báo.">
          <input id="minimumQty" type="number" min={0} step="0.01" className={managementFieldClass}
            {...register('minimumQty', { valueAsNumber: true })} />
        </ManagementFormField>

        <ManagementFormField id="maximumQty" label="Ngưỡng tồn tối đa (tùy chọn)" error={errors.maximumQty?.message}
          hint="Dùng để gợi ý số lượng nhập hàng ở module Mua hàng. Để trống nếu không giới hạn.">
          <input id="maximumQty" type="number" min={0} step="0.01" className={managementFieldClass}
            {...register('maximumQty', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })} />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
