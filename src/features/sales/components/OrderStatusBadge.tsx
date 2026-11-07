import type { OrderStatus } from '../types/salesOrder.types'

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  PROCESSING: {
    label: 'Đang xử lý',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

interface OrderStatusBadgeProps {
  status: OrderStatus | string
  className?: string
}

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status as OrderStatus] ?? {
    label: status,
    className: 'bg-slate-50 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {config.label}
    </span>
  )
}
