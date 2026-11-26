import { StatusBadge, type StatusTone } from '../../../shared/ui/Badge'
import type { ProductStatus } from '../types'

const statusConfig: Record<ProductStatus, { label: string; tone: StatusTone; strike?: boolean }> = {
  DRAFT: { label: 'Bản nháp', tone: 'warning' },
  ACTIVE: { label: 'Đang kinh doanh', tone: 'positive' },
  INACTIVE: { label: 'Tạm ngưng', tone: 'neutral' },
  DISCONTINUED: { label: 'Ngừng kinh doanh', tone: 'danger' },
  DELETED: { label: 'Đã xóa', tone: 'danger', strike: true },
}

/** Hiển thị trạng thái sản phẩm với nhãn tiếng Việt và màu nhận diện chuẩn. */
export function ProductStatusBadge({
  status,
}: {
  status: ProductStatus
  /** Giữ tương thích ngược; badge hiện luôn dùng chuẩn thống nhất */
  operational?: boolean
}) {
  const config = statusConfig[status] ?? { label: status, tone: 'neutral' as const }

  return (
    <StatusBadge tone={config.tone} className={config.strike ? 'line-through' : ''}>
      {config.label}
    </StatusBadge>
  )
}
