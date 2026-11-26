import { ClipboardList, RefreshCw } from 'lucide-react'
import { useGetAuditLogsQuery } from '../api/auditLogApi.ts'
import { Button } from '../../../shared/ui/Button'
import { CodeChip, Notice } from '../../../shared/ui/Badge'
import { ManagementPanel } from '../../../shared/ui/ManagementPage'

interface ActivityLogPanelProps {
  entityType: string
  entityId?: string
  productId?: string
  title?: string
  description?: string
  emptyMessage?: string
  enabled?: boolean
  operational?: boolean
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
  operational = false,
}: ActivityLogPanelProps) {
  const query = useGetAuditLogsQuery({ entityType, entityId, productId, page: 0, size: 10 }, { skip: !enabled })

  if (operational) {
    return (
      <ManagementPanel
        headingId={`activity-log-${entityType}`}
        title={title}
        description={description}
        busy={query.isFetching}
        headerActions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={query.isFetching}
            icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            onClick={() => void query.refetch()}
            aria-label="Tải lại nhật ký hoạt động"
          >
            Làm mới
          </Button>
        }
      >
        {query.isLoading ? (
          <div className="divide-y divide-aqs-divider" aria-label="Đang tải nhật ký hoạt động">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="space-y-2 px-5 py-3.5">
                <span className="aqs-animate-skeleton block h-3 w-3/4 rounded bg-aqs-skeleton" />
                <span className="aqs-animate-skeleton block h-3 w-1/3 rounded bg-aqs-skeleton" />
              </div>
            ))}
          </div>
        ) : query.isError ? (
          <div className="p-5">
            <Notice tone="danger" role="alert" title="Không thể tải nhật ký hoạt động">
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <span>Vui lòng thử tải lại để xem lịch sử thay đổi gần đây.</span>
                <Button type="button" variant="secondary" size="sm" onClick={() => void query.refetch()}>
                  Thử lại
                </Button>
              </div>
            </Notice>
          </div>
        ) : query.data?.content.length ? (
          <ul className="divide-y divide-aqs-divider">
            {query.data.content.map((entry) => {
              const summary = dataSummary(entry.newData) || dataSummary(entry.oldData)
              return (
                <li key={entry.id} className="flex flex-col gap-1 px-5 py-3.5 text-[13px] text-aqs-ink-muted">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs tabular-nums text-aqs-ink-faint">
                      {new Date(entry.createdAt).toLocaleString('vi-VN')}
                    </span>
                    <strong className="font-semibold text-aqs-ink">{entry.actorName || 'Hệ thống'}</strong>
                    <span>{actionLabel(entry.action)}</span>
                    {summary && <CodeChip>{summary}</CodeChip>}
                  </div>
                  {entry.reason && <p className="m-0 text-xs text-aqs-ink-faint">Lý do: {entry.reason}</p>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-5 py-6 text-sm text-aqs-ink-faint">{emptyMessage}</p>
        )}
      </ManagementPanel>
    )
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4" aria-busy={query.isFetching}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ClipboardList className="h-4 w-4 text-sky-700" />
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          aria-label="Tải lại nhật ký hoạt động"
        >
          <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {query.isLoading ? (
        <p className="py-4 text-sm text-slate-500">Đang tải nhật ký...</p>
      ) : query.isError ? (
        <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          Không thể tải nhật ký hoạt động. Vui lòng thử lại.
        </p>
      ) : query.data?.content.length ? (
        <div className="mt-3 divide-y divide-slate-100">
          {query.data.content.map((entry) => {
            const summary = dataSummary(entry.newData) || dataSummary(entry.oldData)
            return (
              <div key={entry.id} className="py-3 text-sm text-slate-700">
                <span className="mr-3 text-xs text-slate-500">
                  {new Date(entry.createdAt).toLocaleString('vi-VN')}
                </span>
                <strong>{entry.actorName || 'Hệ thống'}</strong>
                <span className="ml-2">{actionLabel(entry.action)}</span>
                {summary && <span className="ml-2 text-slate-500">{summary}</span>}
                {entry.reason && <p className="mt-1 text-xs text-slate-500">Lý do: {entry.reason}</p>}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="py-4 text-sm text-slate-500">{emptyMessage}</p>
      )}
    </section>
  )
}
