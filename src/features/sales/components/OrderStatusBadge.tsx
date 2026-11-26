import { StatusBadge, type StatusTone } from '../../../shared/ui/Badge'
import type { OrderStatus } from '../types/salesOrder.types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'Nháp (Chờ duyệt nợ)', tone: 'warning' },
  PENDING_CONFIRMATION: { label: 'Chờ xác nhận', tone: 'warning' },
  PROCESSING: { label: 'Đang xử lý', tone: 'accent' },
  COMPLETED: { label: 'Hoàn tất', tone: 'positive' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
}

interface OrderStatusBadgeProps {
  status: OrderStatus | string
  className?: string
}

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status as OrderStatus] ?? {
    label: status,
    tone: 'neutral' as const,
  }

  return (
    <StatusBadge tone={config.tone} className={className}>
      {config.label}
    </StatusBadge>
  )
}
