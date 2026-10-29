import type { Key, ReactNode } from 'react'

export interface ManagementTableColumn<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'center' | 'right'
  cellClassName?: string
}

const alignment = { left: 'text-left', center: 'text-center', right: 'text-right' }

export function ManagementTable<T>({ columns, rows, rowKey, emptyMessage, labelledBy }: {
  columns: readonly ManagementTableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => Key
  emptyMessage: ReactNode
  labelledBy: string
}) {
  return (
    <div className="overflow-x-auto" role="region" aria-labelledby={labelledBy} tabIndex={0}>
      <table aria-labelledby={labelledBy} className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-50 font-medium text-gray-500">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`px-4 py-3 ${alignment[column.align ?? 'left']}`}>{column.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-600">
          {rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} className={`whitespace-nowrap px-4 py-3 ${alignment[column.align ?? 'left']} ${column.cellClassName ?? ''}`}>{column.cell(row)}</td>)}</tr>)}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-600">{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
