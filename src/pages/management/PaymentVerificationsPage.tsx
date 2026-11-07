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
    <div className="space-y-4 text-xs">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Xác minh thanh toán chuyển khoản</h1>
            <p className="text-[11px] text-slate-500">
              Đối chiếu tiền thực nhận và quyết định xác minh hoặc từ chối các khoản chuyển khoản (UC-70).
            </p>
          </div>
        </div>
      </div>

      {/* Bộ lọc trạng thái */}
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          {TABS.find((t) => t.key === tab)?.label} {data ? `(${data.totalElements})` : ''}
        </div>

        {isLoading || (isFetching && items.length === 0) ? (
          <div className="flex items-center gap-2 px-4 py-8 text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
            Đang tải danh sách...
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-slate-500">
            Không tải được danh sách.{' '}
            <button type="button" onClick={() => refetch()} className="font-semibold text-sky-600">Thử lại</button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-500">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            {isPendingTab
              ? 'Không có khoản chuyển khoản nào đang chờ xác minh.'
              : 'Chưa có khoản nào ở trạng thái này.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">Mã GD</th>
                  <th className="px-3 py-2.5 text-right">Số tiền</th>
                  <th className="px-3 py-2.5">Mã tham chiếu</th>
                  <th className="px-3 py-2.5">{isPendingTab ? 'Ghi chú' : 'Trạng thái / Quyết định'}</th>
                  <th className="px-3 py-2.5">{isPendingTab ? 'Thời điểm' : 'Thời điểm xử lý'}</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const badge = STATUS_BADGE[item.status] ?? { label: item.status, className: 'bg-slate-50 text-slate-700 border-slate-200' }
                  return (
                    <tr key={item.transactionId} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <div className="font-mono text-[11px] text-slate-600">{item.transactionCode}</div>
                        <Link to={`/app/orders/${item.orderId}`} className="text-[10px] font-medium text-sky-600 hover:text-sky-700">
                          Xem đơn →
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{formatVnd(item.amount)}</td>
                      <td className="px-3 py-2.5 text-slate-600">{item.referenceNo || '—'}</td>
                      <td className="px-3 py-2.5">
                        {isPendingTab ? (
                          <span className="text-slate-500">{item.description || '—'}</span>
                        ) : (
                          <div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                            {item.status === 'REJECTED' && item.rejectReason && (
                              <div className="mt-1 flex max-w-[240px] items-start gap-1 text-[10px] leading-snug text-slate-400" title={item.rejectReason}>
                                <Info className="mt-px h-2.5 w-2.5 shrink-0" />
                                <span className="truncate italic">{item.rejectReason}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {formatDateTime(isPendingTab ? item.transactionDate : item.approvedAt || item.transactionDate)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewProof(item)}
                            disabled={viewingProof}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <Eye className="h-3 w-3" /> Chứng từ
                          </button>
                          {isPendingTab && (
                            <>
                              <button
                                type="button"
                                onClick={() => setRejecting(item)}
                                className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                              >
                                <XCircle className="h-3 w-3" /> Từ chối
                              </button>
                              <button
                                type="button"
                                onClick={() => handleVerify(item)}
                                disabled={verifying}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Xác minh
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

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md border border-slate-300 px-2 py-1 font-medium disabled:opacity-40"
            >
              Trang trước
            </button>
            <span>Trang {page + 1} / {data.totalPages}</span>
            <button
              type="button"
              disabled={page + 1 >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-300 px-2 py-1 font-medium disabled:opacity-40"
            >
              Trang tiếp
            </button>
          </div>
        )}
      </div>

      {rejecting && <RejectVerificationDialog item={rejecting} onClose={() => setRejecting(null)} />}
    </div>
  )
}
