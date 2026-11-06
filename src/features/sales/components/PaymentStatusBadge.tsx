import type { PaymentStatus } from '../types/salesOrder.types'

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  UNPAID: {
    label: 'Chưa thanh toán',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  PARTIALLY_PAID: {
    label: 'Thanh toán một phần',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  PAID: {
    label: 'Đã thanh toán',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string
  className?: string
}

export function PaymentStatusBadge({ status, className = '' }: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status as PaymentStatus] ?? {
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
