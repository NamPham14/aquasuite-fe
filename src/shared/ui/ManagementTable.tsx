import type { Key, ReactNode } from 'react'
import { Button } from './Button'

export interface ManagementTableColumn<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
  headerClassName?: string
  cellClassName?: string
}

const alignment = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function ManagementTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  labelledBy,
  wrapCells = false,
  compact = false,
}: {
  columns: readonly ManagementTableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => Key
  emptyMessage: ReactNode
  labelledBy: string
  wrapCells?: boolean
  compact?: boolean
}) {
  const cellPad = compact ? 'px-2.5' : 'px-3.5'
  return (
    <div className="overflow-x-auto" role="region" aria-labelledby={labelledBy} tabIndex={0}>
      <table
        aria-labelledby={labelledBy}
        className={`${wrapCells ? 'w-full table-fixed' : 'min-w-full'} border-collapse text-[13px] text-aqs-ink-muted`}
      >
        <thead className="bg-aqs-surface text-aqs-ink-faint">
          <tr className="border-b border-aqs-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`h-[42px] ${cellPad} text-xs font-semibold ${alignment[column.align ?? 'left']} ${column.headerClassName ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-aqs-divider">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors duration-150 hover:bg-aqs-surface-subtle">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`${wrapCells ? 'break-words whitespace-normal align-top' : 'whitespace-nowrap align-middle'} py-3 ${cellPad} ${alignment[column.align ?? 'left']} ${column.cellClassName ?? ''}`}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-aqs-ink-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function ManagementTableSkeleton({
  rows = 5,
  columns = 5,
  withLeadingAvatar = false,
  label = 'Đang tải dữ liệu',
}: {
  rows?: number
  columns?: number
  withLeadingAvatar?: boolean
  label?: string
}) {
  return (
    <div className="py-1" aria-label={label}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid min-h-[62px] items-center gap-4 border-b border-aqs-divider px-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((__, colIndex) =>
            colIndex === 0 && withLeadingAvatar ? (
              <div key={colIndex} className="flex items-center gap-3">
                <span className="aqs-animate-skeleton h-10 w-10 shrink-0 rounded-md bg-aqs-skeleton" />
                <span className="flex flex-1 flex-col gap-2">
                  <span className="aqs-animate-skeleton h-3 w-1/2 rounded bg-aqs-skeleton" />
                  <span className="aqs-animate-skeleton h-3 w-4/5 rounded bg-aqs-skeleton" />
                </span>
              </div>
            ) : (
              <span
                key={colIndex}
                className={`aqs-animate-skeleton h-3 rounded bg-aqs-skeleton ${
                  colIndex % 2 === 0 ? 'w-3/4' : 'w-1/2'
                }`}
              />
            ),
          )}
        </div>
      ))}
    </div>
  )
}

export function ManagementMobileList<T>({
  rows,
  rowKey,
  emptyMessage,
  renderRow,
  breakpoint = 'md',
}: {
  rows: readonly T[]
  rowKey: (row: T) => Key
  emptyMessage: ReactNode
  renderRow: (row: T) => ReactNode
  breakpoint?: 'sm' | 'md'
}) {
  const hideClass = breakpoint === 'sm' ? 'sm:hidden' : 'md:hidden'
  return (
    <div className={hideClass}>
      {rows.map((row) => (
        <article key={rowKey(row)} className="border-b border-aqs-border p-4 last:border-b-0">
          {renderRow(row)}
        </article>
      ))}
      {rows.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-aqs-ink-muted">{emptyMessage}</div>
      )}
    </div>
  )
}

export function ManagementPagination({
  page,
  totalPages,
  totalElements,
  shownCount,
  noun,
  disabled = false,
  onPageChange,
  ariaLabel,
}: {
  page: number
  totalPages: number
  totalElements: number
  shownCount?: number
  noun: string
  disabled?: boolean
  onPageChange: (nextPage: number) => void
  ariaLabel?: string
}) {
  const safeTotalPages = Math.max(totalPages, 1)
  const displayPage = Math.min(page + 1, safeTotalPages)
  return (
    <div
      className="flex flex-col items-start justify-between gap-3 border-t border-aqs-border px-5 py-3.5 text-[13px] text-aqs-ink-muted sm:flex-row sm:items-center"
      aria-label={ariaLabel ?? `Phân trang ${noun}`}
    >
      <span className="tabular-nums">
        {shownCount != null
          ? `Hiển thị ${shownCount.toLocaleString('vi-VN')} / ${totalElements.toLocaleString('vi-VN')} ${noun}`
          : `Tổng số: ${totalElements.toLocaleString('vi-VN')} ${noun}`}
      </span>
      <div className="flex w-full items-center justify-between gap-2.5 sm:w-auto sm:justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || page <= 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
          Trang trước
        </Button>
        <span className="min-w-[88px] text-center tabular-nums" aria-live="polite">
          Trang {displayPage} / {safeTotalPages}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || totalPages === 0 || page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Trang sau
        </Button>
      </div>
    </div>
  )
}
