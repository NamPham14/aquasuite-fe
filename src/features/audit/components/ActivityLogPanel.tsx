import { ClipboardList, RefreshCw } from 'lucide-react'
import { useGetAuditLogsQuery } from '../api/auditLogApi.ts'

interface ActivityLogPanelProps {
  entityType: string
  entityId?: string
  productId?: string
  title?: string
  description?: string
  emptyMessage?: string
  enabled?: boolean
}

function actionLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase())
}

function dataSummary(data?: Record<string, unknown>) {
  if (!data) return ''
  for (const key of ['username', 'policyName', 'variantName', 'customerName', 'orderCode', 'receiptCode']) {
    const value = data[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export function ActivityLogPanel({
  entityType,
  entityId,
  productId,
  title = 'Nhật ký hoạt động',
  description,
  emptyMessage = 'Chưa có hoạt động nào được ghi nhận.',
  enabled = true,
}: ActivityLogPanelProps) {
  const query = useGetAuditLogsQuery({ entityType, entityId, productId, page: 0, size: 10 }, { skip: !enabled })

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" aria-busy={query.isFetching}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><ClipboardList className="h-4 w-4 text-sky-700" />{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <button type="button" onClick={() => query.refetch()} disabled={query.isFetching} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" aria-label="Tải lại nhật ký hoạt động">
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {query.isLoading ? <p className="py-4 text-sm text-slate-500">Đang tải nhật ký...</p> : query.isError ? (
        <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">Không thể tải nhật ký hoạt động. Vui lòng thử lại.</p>
      ) : query.data?.content.length ? (
        <div className="mt-3 divide-y divide-slate-100">
          {query.data.content.map((entry) => {
            const summary = dataSummary(entry.newData) || dataSummary(entry.oldData)
            return <div key={entry.id} className="py-3 text-sm text-slate-700">
              <span className="mr-3 text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString('vi-VN')}</span>
              <strong>{entry.actorName || 'Hệ thống'}</strong><span className="ml-2">{actionLabel(entry.action)}</span>
              {summary && <span className="ml-2 text-slate-500">{summary}</span>}
              {entry.reason && <p className="mt-1 text-xs text-slate-500">Lý do: {entry.reason}</p>}
            </div>
          })}
        </div>
      ) : <p className="py-4 text-sm text-slate-500">{emptyMessage}</p>}
    </section>
  )
}
