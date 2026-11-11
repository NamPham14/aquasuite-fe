import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ManagementDialog, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'
import { useGetCodBalanceQuery, useGetCodCollectionQuery, useGetCodHistoryQuery, useReviewCodMutation } from '../api/codApi.ts'
import { codButton, codStatusLabel } from '../lib/cod.ts'

export function CodCollectionDetailDialog({ id, actorId, accountant, canSeeBalance, onClose }: { id: string; actorId: string; accountant: boolean; canSeeBalance: boolean; onClose: () => void }) {
  const detail = useGetCodCollectionQuery(id, { refetchOnMountOrArgChange: true })
  const history = useGetCodHistoryQuery(id)
  const balance = useGetCodBalanceQuery(detail.data?.orderId ?? '', { skip: !canSeeBalance || !detail.data })
  const [inspected, setInspected] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [review, state] = useReviewCodMutation()
  const busy = useRef(false)
  const item = detail.currentData
  async function decide(accept: boolean) {
    if (!item || busy.current || detail.isFetching || detail.isError) return
    if (!inspected) { setError('Cần đối chiếu số khai thu với shipper trước khi quyết định.'); return }
    if (!accept && !reason.trim()) { setError('Nhập lý do bác khai thu.'); return }
    busy.current = true; setError('')
    try {
      await review({ id, accept, expectedVersion: item.version, reason: accept ? undefined : reason.trim() }).unwrap()
      toast.success(accept ? 'Đã chấp nhận khai thu; chưa ghi nhận tiền về cửa hàng.' : 'Đã bác khai thu, giữ nguyên lịch sử.')
      setInspected(false)
    } catch (err) { setError(normalizeApiError(err).message); void detail.refetch(); setInspected(false) }
    finally { busy.current = false }
  }
  return <ManagementDialog title="Chi tiết khoản thu COD" onClose={onClose} closeDisabled={state.isLoading} size="wide">
    <div className="space-y-6 p-5 text-sm leading-relaxed text-slate-900 sm:p-6">
      {detail.isFetching && <p role="status">Đang tải khoản thu...</p>}
      {detail.isError ? <div role="alert">{normalizeApiError(detail.error).message} <button className={codButton} onClick={() => void detail.refetch()}>Thử lại</button></div> : item && <>
        <section aria-labelledby="cod-detail-info" className="overflow-hidden rounded-lg border border-slate-200">
          <h3 id="cod-detail-info" className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold">Thông tin khoản thu</h3>
          <dl className="grid gap-4 p-4 sm:grid-cols-2">
            <CodDetailField label="Mã khoản thu" identifier>{item.collectionId}</CodDetailField>
            <CodDetailField label="Đợt giao">{item.deliveryCode || item.deliveryId}</CodDetailField>
            <CodDetailField label="ID shipper" identifier>{item.shipperId}</CodDetailField>
            <CodDetailField label="ID đơn hàng" identifier>{canSeeBalance ? <Link className="text-sky-800 underline underline-offset-4" to={`/app/orders/${item.orderId}`}>{item.orderId}</Link> : item.orderId}</CodDetailField>
            <CodDetailField label="Trạng thái khai thu">{codStatusLabel(item.reviewStatus)}</CodDetailField>
            <CodDetailField label="Trạng thái bàn giao">{codStatusLabel(item.remittanceStatus)}</CodDetailField>
            <CodDetailField label="Thời điểm thu tiền">{formatDateTime(item.collectedAt)}</CodDetailField>
            <CodDetailField label="Thời điểm gửi khai thu">{formatDateTime(item.submittedAt)}</CodDetailField>
            <CodDetailField label="Người xác nhận" identifier>{item.reviewedBy || 'Chưa xác nhận'}</CodDetailField>
            <CodDetailField label="Thời điểm xác nhận">{item.reviewedAt ? formatDateTime(item.reviewedAt) : 'Chưa xác nhận'}</CodDetailField>
          </dl>
          {(item.note || item.rejectReason) && <dl className="space-y-4 border-t border-slate-200 p-4">
            {item.note && <CodDetailField label="Ghi chú">{item.note}</CodDetailField>}
            {item.rejectReason && <CodDetailField label="Lý do bác khai thu"><span className="text-rose-800">{item.rejectReason}</span></CodDetailField>}
          </dl>}
        </section>
        <section aria-labelledby="cod-detail-amounts">
          <h3 id="cod-detail-amounts" className="mb-3 text-sm font-semibold">Tiền thu và bàn giao của khoản này</h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[
            ['COD dự kiến', item.expectedAmount], ['Số tiền khai thu', item.amount], ['Đã nộp về cửa hàng', item.remittedAmount], ['Shipper còn giữ đã xác minh', item.heldAmount],
          ].map(([label, amount]) => <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4"><dt className="text-sm font-medium text-slate-700">{label}</dt><dd className="mt-2 break-words text-sm font-semibold tabular-nums text-slate-950">{formatVnd(Number(amount))}</dd></div>)}</dl>
        </section>
        {accountant && item.shipperId !== actorId && item.reviewStatus === 'SUBMITTED' && <section aria-labelledby="cod-detail-review" className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/50 p-4">
          <h3 id="cod-detail-review" className="text-sm font-semibold">Xác nhận khai thu</h3>
          <p className="text-sm text-slate-700">Đối chiếu đơn và đợt giao với shipper trước khi xác nhận. Chỉ khi nhận bàn giao mới tăng tiền đã thanh toán.</p>
          <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={inspected} disabled={state.isLoading} onChange={(e) => setInspected(e.target.checked)} />Tôi đã đối chiếu số tiền khai thu với shipper.</label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="cod-reject-reason">Lý do bác (bắt buộc khi bác)<textarea id="cod-reject-reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} disabled={state.isLoading} className={`${managementFieldClass} min-h-24`} /></label>
          {error && <p role="alert" className="text-rose-700">{error}</p>}
          <div className="flex flex-wrap gap-2"><button className={codButton} disabled={!inspected || state.isLoading || detail.isFetching || detail.isError} onClick={() => void decide(false)}>Bác khai thu</button><button className={codButton} disabled={!inspected || state.isLoading || detail.isFetching || detail.isError} onClick={() => void decide(true)}>Chấp nhận khai thu</button></div>
        </section>}
        {canSeeBalance && <section aria-labelledby="cod-detail-balance"><h3 id="cod-detail-balance" className="mb-1 text-sm font-semibold">Số dư toàn đơn hàng</h3>
          <p className="mb-3 text-sm text-slate-700">Các khoản dưới đây tính trên toàn bộ đơn hàng, gồm các lần thu và bàn giao khác.</p>
          {balance.isFetching ? <p role="status">Đang tải số dư...</p> : balance.isError ? <div role="alert">Không tải được số dư. <button className={codButton} onClick={() => void balance.refetch()}>Thử lại</button></div> : balance.data && <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[
            ['Cửa hàng chưa nhận', balance.data.storeOutstanding], ['Shipper còn giữ', balance.data.shipperHeld], ['Khách còn phải trả', balance.data.customerCollectible], ['Khai thu chờ kiểm tra', balance.data.pendingClaimAmount],
          ].map(([label, amount]) => <div key={label} className="min-w-0 rounded-lg border border-slate-200 p-4"><dt className="text-sm font-medium text-slate-700">{label}</dt><dd className="mt-2 break-words text-sm font-semibold tabular-nums text-slate-950">{formatVnd(Number(amount))}</dd></div>)}</dl>}
        </section>}
        <section aria-labelledby="cod-detail-history" className="space-y-3"><h3 id="cod-detail-history" className="text-sm font-semibold">Lịch sử bàn giao</h3>
          {history.isFetching ? <p role="status">Đang tải lịch sử...</p> : history.isError ? <div role="alert">Không tải được lịch sử. <button className={codButton} onClick={() => void history.refetch()}>Thử lại</button></div> : history.data?.length ? history.data.map((receipt) => <article key={receipt.remittanceId} className="space-y-1 rounded-md border border-slate-200 p-3">
            <dl className="grid gap-4 sm:grid-cols-2">
              <CodDetailField label="Mã phiếu bàn giao" identifier>{receipt.remittanceId}</CodDetailField>
              <CodDetailField label="Thời điểm nhận tiền">{formatDateTime(receipt.receivedAt)}</CodDetailField>
              <CodDetailField label="Người nhận tiền" identifier>{receipt.receivedBy}</CodDetailField>
              <CodDetailField label="Tổng tiền trên phiếu">{formatVnd(receipt.amount)}</CodDetailField>
            </dl>
            {receipt.note && <dl className="mt-4 border-t border-slate-200 pt-4"><CodDetailField label="Ghi chú bàn giao">{receipt.note}</CodDetailField></dl>}
            {receipt.items.filter((line) => line.collectionId === id).map((line) => <dl key={line.transactionId} className="mt-4 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
              <CodDetailField label="Số tiền nhận cho khoản thu này">{formatVnd(line.amount)}</CodDetailField>
              <CodDetailField label="Mã giao dịch thanh toán" identifier>{line.transactionId}</CodDetailField>
            </dl>)}
          </article>) : <p className="text-slate-500">Chưa có tiền bàn giao về cửa hàng.</p>}
        </section>
      </>}
    </div>
  </ManagementDialog>
}

function CodDetailField({ label, children, identifier = false }: { label: string; children: ReactNode; identifier?: boolean }) {
  return <div className="min-w-0">
    <dt className="text-sm font-medium text-slate-700">{label}</dt>
    <dd className={`mt-1 whitespace-pre-wrap break-words font-semibold text-slate-950 [overflow-wrap:anywhere] text-sm ${identifier ? 'font-mono leading-6' : ''}`}>{children}</dd>
  </div>
}
