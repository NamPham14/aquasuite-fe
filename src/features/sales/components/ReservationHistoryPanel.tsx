import { useId, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../../iam'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useExecuteReservationReleaseMutation, useReservationHistoryQuery } from '../api/reservationManagementApi'
import type { ReservationHistory } from '../types/reservationManagement.types'
import { primaryButton, secondaryButton } from '../lib/deposit'
import { reservationLabel, reservationProduct, type ReservationItems } from '../lib/reservationPresentation'

const date = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : '—'

export function ReservationHistoryPanel({ orderId, onReleased }: { orderId: string; onReleased?: () => void }) {
  const { user } = useAuth()
  const allowed = (user?.roles ?? []).some((role) => ['SALES_STAFF', 'SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(role))
  const history = useReservationHistoryQuery(orderId, { skip: !allowed, refetchOnMountOrArgChange: true })
  if (!allowed) return null
  return <ReservationHistoryContent orderId={orderId} view={history.currentData} loading={history.isFetching} loadError={history.error} onReload={() => void history.refetch()} onReleased={onReleased} />
}

export function ReservationHistoryContent({ orderId, view, loading, loadError, onReload, onReleased, items = [], disabled = false, onBusyChange }: {
  orderId: string; view?: ReservationHistory; loading: boolean; loadError?: unknown; onReload: () => void
  onReleased?: () => void; items?: ReservationItems; disabled?: boolean; onBusyChange?: (busy: boolean) => void
}) {
  const { user } = useAuth()
  const allowed = (user?.roles ?? []).some((role) => ['SALES_STAFF', 'SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(role))
  const owner = user?.roles.includes('SHOP_OWNER') ?? false
  const [execute, execution] = useExecuteReservationReleaseMutation()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const lock = useRef(false)
  const titleId = useId()
  const actorName = (id: string | null) => id ? view?.actorNames?.[id]?.trim() || 'Chưa có tên người dùng' : '—'
  const productName = (reservationId: string) => {
    const row = view?.reservations.find((stock) => stock.reservationId === reservationId)
    const product = row && reservationProduct(items, row.orderItemId, row.variantId)
    return product ? `${product.productName}${product.sku ? ` · ${product.sku}` : ''}` : 'Dòng hàng không còn trong đơn'
  }
  if (!allowed) return null

  async function release(decisionId: string) {
    if (lock.current || disabled || !owner || loading || loadError || !view?.decisions.some((decision) => decision.decisionId === decisionId && decision.releaseStatus === 'PENDING_RELEASE')) return
    lock.current = true; setError(''); setNotice(''); onBusyChange?.(true)
    try {
      const result = await execute({ orderId, decisionId }).unwrap()
      setConfirmId(null)
      setNotice(result.lines.length === 0 || result.lines.every((line) => line.releasedQty === 0) ? 'Đã thực hiện quyết định. Không có lượng giữ cần giải phóng.' : 'Đã thực hiện quyết định. Xem số lượng thực tế tại từng dòng bên dưới.')
      onReleased?.()
    } catch (failure) {
      setError(`${normalizeApiError(failure).message} Tải lại lịch sử để kiểm tra kết quả; nếu vẫn chờ giải phóng, có thể thử lại cùng quyết định.`)
    } finally { lock.current = false; onBusyChange?.(false) }
  }
  const decisions = [...(view?.decisions ?? [])].sort((a, b) => Number(b.releaseStatus === 'PENDING_RELEASE') - Number(a.releaseStatus === 'PENDING_RELEASE') || Date.parse(b.requestedAt) - Date.parse(a.requestedAt))
  const activities = [...(view?.activities ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return <section aria-labelledby={titleId} aria-busy={loading || execution.isLoading} className="space-y-4 text-sm leading-relaxed text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id={titleId} className="font-semibold">Lịch sử & giải phóng hàng giữ</h2><button type="button" className={secondaryButton} disabled={disabled || loading || execution.isLoading} onClick={() => { setConfirmId(null); onReload() }}>Tải lại lịch sử</button></div>
    <p className="text-slate-600">Thực hiện theo quyết định hủy/đổi đã duyệt. Giải phóng hàng giữ không xác nhận hoàn tiền.</p>
    {loading && <p role="status">Đang tải lịch sử hàng giữ...</p>}
    {!!loadError && <p role="alert" className="text-rose-800">{normalizeApiError(loadError).message}</p>}
    {error && <p role="alert" className="text-rose-800">{error}</p>}
    {notice && <p role="status" className="text-emerald-800">{notice}</p>}
    {view && !loadError && <>
      <h3 className="font-semibold">Quyết định hủy/đổi và giải phóng</h3>
      {decisions.length === 0 && <p className="text-slate-600">Chưa có quyết định cần giải phóng.</p>}
      <ul className="space-y-5">{decisions.map((decision) => <li key={decision.decisionId} className={`space-y-3 border-l-2 pl-4 ${decision.releaseStatus === 'PENDING_RELEASE' ? 'border-amber-500' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><p className="font-semibold">{reservationLabel(decision.type)}</p><span className={`rounded-md px-2 py-1 text-xs font-medium ${decision.releaseStatus === 'PENDING_RELEASE' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{reservationLabel(decision.releaseStatus)}</span></div>
        {decision.reason && <p className="break-words">{decision.reason}</p>}
        <p className="text-slate-600">{decision.reviewedBy ? `Đã duyệt bởi ${actorName(decision.reviewedBy)} · ${date(decision.reviewedAt)}` : `Yêu cầu bởi ${actorName(decision.requestedBy)} · ${date(decision.requestedAt)}`}</p>
        <details><summary className="cursor-pointer font-medium text-sky-800">Xem quyết định và thông tin duyệt</summary>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <HistoryField label="Người yêu cầu">{actorName(decision.requestedBy)}</HistoryField>
            <HistoryField label="Thời điểm yêu cầu">{date(decision.requestedAt)}</HistoryField>
            <HistoryField label="Người duyệt">{actorName(decision.reviewedBy)}</HistoryField>
            <HistoryField label="Thời điểm duyệt">{date(decision.reviewedAt)}</HistoryField>
            <HistoryField label="Trạng thái yêu cầu">{reservationLabel(decision.status)}</HistoryField>
            {decision.decisionNote && <HistoryField label="Ghi chú duyệt">{decision.decisionNote}</HistoryField>}
            <HistoryField label="Mã quyết định">{decision.decisionId}</HistoryField>
          </dl>
          {decision.release && <div className="mt-4 space-y-3 border-t border-slate-200 pt-4"><dl className="grid gap-4 sm:grid-cols-2">
            <HistoryField label="Người thực hiện giải phóng">{actorName(decision.release.executedBy)}</HistoryField>
            <HistoryField label="Thời điểm giải phóng">{date(decision.release.executedAt)}</HistoryField>
          </dl>{decision.release.lines.length === 0 ? <p>Không có lượng giữ cần giải phóng.</p> : <ul className="space-y-3">{decision.release.lines.map((line) => <li key={line.reservationId}><dl className="grid gap-4 sm:grid-cols-2"><HistoryField label="Sản phẩm">{productName(line.reservationId)}</HistoryField><HistoryField label="Số lượng giải phóng">{line.releasedQty}</HistoryField></dl></li>)}</ul>}</div>}
        </details>
        {owner && decision.releaseStatus === 'PENDING_RELEASE' && (confirmId === decision.decisionId ? <div className="space-y-3 rounded-md bg-amber-50 p-3"><p>Thực hiện theo quyết định đã duyệt này? Máy chủ xác định lượng còn giữ hợp lệ. Đây là bước thực hiện, không phải duyệt lại và không xác nhận hoàn tiền.</p><div className="flex flex-wrap gap-2"><button type="button" className={primaryButton} disabled={disabled || loading || execution.isLoading} onClick={() => void release(decision.decisionId)}>{execution.isLoading ? 'Đang thực hiện...' : 'Xác nhận giải phóng'}</button><button type="button" className={secondaryButton} disabled={execution.isLoading} onClick={() => setConfirmId(null)}>Hủy</button></div></div> : <button type="button" className={secondaryButton} disabled={disabled || loading || execution.isLoading} onClick={() => { setConfirmId(decision.decisionId); setError(''); setNotice('') }}>Thực hiện giải phóng</button>)}
      </li>)}</ul>
      <section className="space-y-3 border-t border-slate-200 pt-5"><h3 className="font-semibold">Nhật ký hàng giữ</h3><p className="text-slate-600">Mới nhất trước. Mở từng lần để xem lượng trước/sau và mã tham chiếu.</p>
        {activities.length === 0 && <p className="text-slate-600">Chưa có hoạt động.</p>}
        <ol className="divide-y divide-slate-200">{activities.map((activity, index) => <li key={`${activity.reservationId}-${activity.requestId}-${index}`} className="grid gap-2 py-4 sm:grid-cols-[150px_minmax(0,1fr)]">
          <time dateTime={activity.createdAt} className="text-xs text-slate-600">{date(activity.createdAt)}</time>
          <div className="min-w-0 space-y-1"><p className="break-words"><strong>{actorName(activity.actorId)}</strong> · {reservationLabel(activity.action)}</p><p className="break-words text-slate-600">{productName(activity.reservationId)}</p>
            <details><summary className="cursor-pointer font-medium text-sky-800">Xem chi tiết thao tác</summary><dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <HistoryField label="Số lượng trước">{activity.heldBefore}</HistoryField><HistoryField label="Số lượng sau">{activity.heldAfter}</HistoryField>
              <HistoryField label="Người thực hiện">{actorName(activity.actorId)}</HistoryField><HistoryField label="Kho">{view.reservations.find((row) => row.reservationId === activity.reservationId)?.warehouseCode || '—'}</HistoryField>
              <HistoryField label="Mã hàng giữ">{activity.reservationId}</HistoryField><HistoryField label="Mã xử lý">{activity.requestId}</HistoryField>
              {activity.reason && <HistoryField label="Lý do">{activity.reason}</HistoryField>}
            </dl></details>
          </div>
        </li>)}</ol>
      </section>
    </>}
  </section>
}

function HistoryField({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-sm font-medium text-slate-700">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-950 [overflow-wrap:anywhere]">{children}</dd></div>
}
