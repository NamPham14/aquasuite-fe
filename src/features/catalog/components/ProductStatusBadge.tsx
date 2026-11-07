import type { ProductStatus } from '../types'

const statusConfig: Record<ProductStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Bản nháp', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ACTIVE: { label: 'Đang kinh doanh', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  INACTIVE: { label: 'Tạm ngưng', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  DISCONTINUED: { label: 'Ngừng kinh doanh', className: 'bg-rose-50 text-rose-800 border-rose-200' },
  DELETED: { label: 'Đã xóa', className: 'bg-gray-100 text-gray-500 border-gray-200 line-through' },
}

/** Hiển thị trạng thái sản phẩm với nhãn tiếng Việt và màu nhận diện chuẩn. */
export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const config = statusConfig[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <span
      className={`inline-flex min-h-6 items-center rounded border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

