import type { CatalogStatus } from '../types'

/** Hiển thị trạng thái catalog bằng nhãn và màu nhất quán giữa các trang. */
export function CatalogStatusBadge({ status }: { status: CatalogStatus }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded px-2 text-xs font-medium ${
        status === 'ACTIVE'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-slate-100 text-slate-700'
      }`}
    >
      {status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}
    </span>
  )
}
