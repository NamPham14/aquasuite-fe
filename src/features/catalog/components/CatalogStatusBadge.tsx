import { StatusBadge } from '../../../shared/ui/Badge'
import type { CatalogStatus } from '../types'

/** Hiển thị trạng thái catalog bằng nhãn và màu nhất quán giữa các trang. */
export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <StatusBadge tone={status === 'ACTIVE' ? 'positive' : 'neutral'}>
      {status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
    </StatusBadge>
  )
}
