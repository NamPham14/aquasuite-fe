import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, CheckCircle2, XCircle, Eye, Inbox, Info } from 'lucide-react'
import { toast } from 'sonner'
import { formatVnd, formatDateTime } from '../../shared/lib/money'
import { normalizeApiError } from '../../shared/api/apiError'
import { useAuth } from '../../features/iam/hooks/useAuth'
import {
  useGetPaymentVerificationsQuery,
  useVerifyPaymentMutation,
} from '../../features/finance/api/paymentVerificationApi'
import { useLazyGetOrderPaymentProofQuery } from '../../features/finance/api/orderPaymentApi'
import { RejectVerificationDialog } from '../../features/finance/components/RejectVerificationDialog'
import type { PaymentVerificationItem } from '../../features/finance/types/paymentVerification.types'
import { ActivityLogPanel } from '../../features/audit'
import { ManagementPageHeader, ManagementPageShell, ManagementPanel } from '../../shared/ui/ManagementPage'
import { ManagementPagination, ManagementTableSkeleton } from '../../shared/ui/ManagementTable'
import { CodeChip, StatusBadge } from '../../shared/ui/Badge'
import { ErrorState } from '../../shared/ui/FeedbackStates'

type StatusTab = 'PENDING' | 'VERIFIED' | 'REJECTED'

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'PENDING', label: 'Đang chờ' },
  { key: 'VERIFIED', label: 'Đã xác minh' },
  { key: 'REJECTED', label: 'Đã từ chối' },
]

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ xác minh', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  VERIFIED: { label: 'Đã xác minh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

/**
 * UC-70 — Màn Kế toán xác minh/từ chối chuyển khoản, có lọc theo trạng thái
 * (Đang chờ / Đã xác minh / Đã từ chối) để theo dõi lại các quyết định và lý do.
 */
export function PaymentVerificationsPage() {
  const { user } = useAuth()
  const isAccountant = (user?.roles ?? []).includes('ACCOUNTANT')
  const [tab, setTab] = useState<StatusTab>('PENDING')
  const [page, setPage] = useState(0)
  const [rejecting, setRejecting] = useState<PaymentVerificationItem | null>(null)

  const { data, isLoading, isFetching, error, refetch } = useGetPaymentVerificationsQuery(
    { status: tab, page, size: 20 },
    { skip: !isAccountant },
  )
  const [verify, { isLoading: verifying }] = useVerifyPaymentMutation()
  const [fetchProof, { isFetching: viewingProof }] = useLazyGetOrderPaymentProofQuery()

  const changeTab = (next: StatusTab) => {
    setTab(next)
    setPage(0)
  }

  const handleVerify = async (item: PaymentVerificationItem) => {
    try {
      await verify({ paymentId: item.transactionId, orderId: item.orderId }).unwrap()
      toast.success(`Đã xác minh ${formatVnd(item.amount)} vào đơn.`)
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  const handleViewProof = async (item: PaymentVerificationItem) => {
    try {
      const blob = await fetchProof({ orderId: item.orderId, paymentId: item.transactionId }).unwrap()
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank', 'noopener,noreferrer')
      if (!win) {
        const a = document.createElement('a')
        a.href = url
        a.download = `chung-tu-${item.transactionCode}`
        a.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error('Chưa có chứng từ cho giao dịch này hoặc không xem được.')
    }
  }

  if (!isAccountant) {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center">
        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Chỉ dành cho Kế toán</h3>
        <p className="mt-1 text-xs text-slate-500">
          Xác minh chuyển khoản (UC-70) chỉ dành cho vai trò Kế toán (ACCOUNTANT).
        </p>
        <Link to="/app/dashboard" className="mt-3 inline-block text-xs font-semibold text-sky-600 hover:text-sky-700">
          Về bảng điều khiển
        </Link>
      </div>
    )
  }

  const items = data?.content ?? []
  const isPendingTab = tab === 'PENDING'

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        group="Tài chính & Công nợ"
        breadcrumb="Xác minh thanh toán"
        title="Xác minh thanh toán chuyển khoản"
        description="Đối chiếu tiền thực nhận và quyết định xác minh hoặc từ chối các khoản chuyển khoản."
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {/* Bộ lọc trạng thái */}
      <div className="inline-flex w-fit rounded-control border border-aqs-border bg-aqs-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              tab === t.key ? 'bg-aqs-accent text-white' : 'text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <ManagementPanel
        headingId="payment-verifications-list"
        title={`${TABS.find((t) => t.key === tab)?.label ?? ''} ${data ? `(${data.totalElements})` : ''}`}
        refreshing={isFetching && items.length > 0}
        busy={isFetching}
      >
        {isLoading || (isFetching && items.length === 0) ? (
          <ManagementTableSkeleton columns={6} rows={5} />
        ) : error ? (
          <div className="p-5">
            <ErrorState
              sectionLabel="Danh sách xác minh thanh toán"
              title="Không tải được danh sách"
              message={normalizeApiError(error).message}
              onRetry={() => void refetch()}
              retrying={isFetching}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-aqs-ink-muted">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {isPendingTab
              ? 'Không có khoản chuyển khoản nào đang chờ xác minh.'
              : 'Chưa có khoản nào ở trạng thái này.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-aqs-ink-muted">
              <thead className="border-b border-aqs-border bg-aqs-surface-subtle text-xs font-semibold text-aqs-ink-muted">
                <tr>
                  <th className="px-4 py-3">Mã GD</th>
                  <th className="px-3 py-3 text-right">Số tiền</th>
                  <th className="px-3 py-3">Mã tham chiếu</th>
                  <th className="px-3 py-3">{isPendingTab ? 'Ghi chú' : 'Trạng thái / Quyết định'}</th>
                  <th className="px-3 py-3">{isPendingTab ? 'Thời điểm' : 'Thời điểm xử lý'}</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-aqs-border">
                {items.map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? { label: item.status, className: '' }
                  const tone = item.status === 'VERIFIED' ? 'positive' : item.status === 'REJECTED' ? 'danger' : 'warning'
                  return (
                    <tr key={item.transactionId} className="transition-colors hover:bg-aqs-surface-subtle/60">
                      <td className="px-4 py-3">
                        <CodeChip>{item.transactionCode}</CodeChip>
                        <div className="mt-1">
                          <Link to={`/app/orders/${item.orderId}`} className="text-xs font-medium text-aqs-accent hover:text-aqs-accent-hover hover:underline">
                            Xem đơn →
                          </Link>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-aqs-ink">{formatVnd(item.amount)}</td>
                      <td className="px-3 py-3 text-aqs-ink-muted">{item.referenceNo || '—'}</td>
                      <td className="px-3 py-3">
                        {isPendingTab ? (
                          <span className="text-aqs-ink-muted">{item.description || '—'}</span>
                        ) : (
                          <div>
                            <StatusBadge tone={tone}>{badge.label}</StatusBadge>
                            {item.status === 'REJECTED' && item.rejectReason && (
                              <div className="mt-1 flex max-w-[240px] items-start gap-1 text-xs leading-snug text-aqs-ink-faint" title={item.rejectReason}>
                                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                                <span className="truncate italic">{item.rejectReason}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-xs text-aqs-ink-muted">
                        {formatDateTime(isPendingTab ? item.transactionDate : item.approvedAt || item.transactionDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewProof(item)}
                            disabled={viewingProof}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-aqs-border bg-aqs-surface px-2.5 text-xs font-medium text-aqs-ink transition-colors hover:bg-aqs-surface-subtle disabled:opacity-50"
                          >
                            <Eye className="h-3.5 w-3.5" /> Chứng từ
                          </button>
                          {isPendingTab && (
                            <>
                              <button
                                type="button"
                                onClick={() => setRejecting(item)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-aqs-danger-border bg-aqs-danger-soft px-2.5 text-xs font-semibold text-aqs-danger transition-colors hover:bg-rose-100"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Từ chối
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerify(item)}
                                disabled={verifying}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-aqs-accent px-3 text-xs font-semibold text-white transition-colors hover:bg-aqs-accent-hover disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Xác minh
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <ManagementPagination
          page={page}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          noun="giao dịch"
          disabled={isFetching}
          onPageChange={setPage}
        />
      </ManagementPanel>

      {rejecting && <RejectVerificationDialog item={rejecting} onClose={() => setRejecting(null)} />}
      <ActivityLogPanel operational entityType="PAYMENT_RECEIPT" title="Nhật ký phân bổ tiền vào hóa đơn" description="Các khoản thu đã được phân bổ vào hóa đơn cửa hàng." />
    </ManagementPageShell>
  )
}
