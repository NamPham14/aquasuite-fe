const buttonClass =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'

/** Điều hướng trang server theo chỉ số bắt đầu từ 0, hiển thị số trang từ 1. */
export function CatalogPagination({
  page,
  totalPages,
  totalElements,
  noun,
  disabled,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalElements: number
  noun: string
  disabled?: boolean
  onPageChange: (page: number) => void
}) {
  const safeTotalPages = Math.max(totalPages, 1)
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span aria-live="polite">Tổng số: {totalElements.toLocaleString('vi-VN')} {noun}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Trước
        </button>
        <span>
          Trang {Math.min(page + 1, safeTotalPages)} / {safeTotalPages}
        </span>
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || totalPages === 0 || page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Tiếp
        </button>
      </div>
    </div>
  )
}
