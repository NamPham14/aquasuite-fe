import type { InventoryStockStatus } from '../types/inventory.types'

/**
 * Nhãn trạng thái tồn kho (UC-31). Ánh xạ mỗi trạng thái nghiệp vụ sang màu và nhãn tiếng Việt:
 * - IN_STOCK: còn hàng, chưa chạm ngưỡng (xanh lá).
 * - LOW_STOCK: còn hàng nhưng tồn khả dụng đã ≤ ngưỡng tối thiểu (hổ phách — cần chú ý nhập thêm).
 * - OUT_OF_STOCK: tồn khả dụng ≤ 0 (đỏ).
 */
const STATUS_META: Record<InventoryStockStatus, { label: string; className: string }> = {
  IN_STOCK: { label: 'Còn hàng', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  LOW_STOCK: { label: 'Sắp hết', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  OUT_OF_STOCK: { label: 'Hết hàng', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

export function InventoryStatusBadge({ status }: { status: InventoryStockStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.IN_STOCK
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  )
}
