import type { Key, ReactNode } from 'react'

/** Hiển thị danh sách catalog dạng các mục dễ đọc trên màn hình nhỏ. */
export function CatalogMobileList<T>({
  rows,
  rowKey,
  emptyMessage,
  renderRow,
}: {
  rows: readonly T[]
  rowKey: (row: T) => Key
  emptyMessage: ReactNode
  renderRow: (row: T) => ReactNode
}) {
  return (
    <div className="sm:hidden">
      {rows.map((row) => (
        <article key={rowKey(row)} className="border-t border-slate-100 p-4 first:border-t-0">
          {renderRow(row)}
        </article>
      ))}
      {rows.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-600">{emptyMessage}</div>}
    </div>
  )
}
