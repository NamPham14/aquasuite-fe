import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ManagementDialog, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'
import { useGetCodBalanceQuery, useGetCodCollectionQuery, useReviewCodMutation } from '../api/codApi.ts'
import { canReceiveCod, codButton, codStatusLabel, isUncertainCodError } from '../lib/cod.ts'

type Decision = { id: string; accept: boolean; expectedVersion: number; reason?: string }

export function CodCollectionDetailDialog({ id, actorId, accountant, canSeeBalance, onClose }: { id: string; actorId: string; accountant: boolean; canSeeBalance: boolean; onClose: () => void }) {
  const detail = useGetCodCollectionQuery(id, { refetchOnMountOrArgChange: true })
  const balance = useGetCodBalanceQuery(detail.currentData?.orderId ?? '', { skip: !canSeeBalance || !detail.currentData })
  const [received, setReceived] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState<Decision | null>(null)
  const [review, state] = useReviewCodMutation()
  const busy = useRef(false)
  const item = detail.currentData
  async function decide(accept: boolean) {
    if (busy.current || !accountant) return
    if (!retry && (!item || detail.isFetching || detail.isError || !canReceiveCod(item, actorId))) return
    if (!retry && accept && !received) { setError('Chỉ xác nhận sau khi đã nhận đủ tiền thực tế.'); return }
    if (!retry && !accept && !reason.trim()) { setError('Nhập lý do từ chối bàn giao.'); return }
    const request = retry ?? { id, accept, expectedVersion: item!.version, reason: accept ? undefined : reason.trim() }
    busy.current = true; setError('')
    try {
      await review(request).unwrap()
      setRetry(null); setReceived(false); setReason('')
      toast.success(request.accept ? 'Đã xác nhận nhận tiền COD về cửa hàng.' : 'Đã từ chối khoản bàn giao, không ghi nhận thanh toán.')
    } catch (err) {
      setError(normalizeApiError(err).message)
      if (isUncertainCodError(err)) setRetry(request)
      else { setRetry(null); setReceived(false); void detail.refetch() }
    } finally { busy.current = false }
  }
  return <ManagementDialog title="Bàn giao tiền COD" onClose={onClose} closeDisabled={state.isLoading || !!retry} size="wide">
    <div className="space-y-5 p-5 text-sm text-slate-900">
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {retry && <div role="alert" className="space-y-3 rounded-md bg-amber-50 p-3 text-amber-900"><p>Chưa xác định kết quả. Giữ màn hình này mở và gửi lại cùng quyết định để tránh ghi nhận trùng tiền.</p><button className={codButton} disabled={state.isLoading} onClick={() => void decide(retry.accept)}>Gửi lại cùng quyết định</button></div>}
      {detail.isFetching && <p role="status">Đang tải khoản bàn giao...</p>}
      {detail.isError ? <p role="alert">{normalizeApiError(detail.error).message} <button className={codButton} disabled={!!retry} onClick={() => void detail.refetch()}>Thử lại</button></p> : item && <>
        <dl className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
          <div><dt className="text-slate-500">Mã khoản thu</dt><dd className="break-all font-mono">{item.collectionId}</dd></div>
          <div><dt className="text-slate-500">Trạng thái bàn giao</dt><dd className="font-semibold">{codStatusLabel(item.status)}</dd></div>
          <div><dt className="text-slate-500">Đợt giao (ID)</dt><dd className="break-all font-mono">{item.deliveryId}</dd></div>
          <div><dt className="text-slate-500">Shipper (ID)</dt><dd className="break-all font-mono">{item.shipperId}</dd></div>
          <div><dt className="text-slate-500">Đơn hàng (ID)</dt><dd className="break-all font-mono">{canSeeBalance ? <Link className="text-sky-700 underline" to={`/app/orders/${item.orderId}`}>{item.orderId}</Link> : item.orderId}</dd></div>
          <div><dt className="text-slate-500">Tiền shipper khai đã thu</dt><dd className="text-lg font-semibold">{formatVnd(item.amount)}</dd></div>
          <div><dt className="text-slate-500">Cửa hàng đã nhận khoản này</dt><dd className="font-semibold">{formatVnd(item.status === 'VERIFIED' ? item.amount : 0)}</dd></div>
          <div><dt className="text-slate-500">Chờ shipper bàn giao khoản này</dt><dd className="font-semibold">{formatVnd(item.status === 'PENDING' ? item.amount : 0)}</dd></div>
        </dl>
        {item.note && <p className="whitespace-pre-wrap break-words">Ghi chú: {item.note}</p>}
        {item.rejectReason && <p className="whitespace-pre-wrap break-words text-rose-700">Lý do từ chối: {item.rejectReason}</p>}
        {accountant && canReceiveCod(item, actorId) && !retry && <section className="space-y-4 rounded-lg border border-sky-200 bg-sky-50 p-4" aria-label="Nhận tiền từ shipper">
          <h3 className="font-semibold">Nhận tiền thực tế từ shipper</h3>
          <p>Xác nhận nghĩa là cửa hàng đã nhận đủ <strong>{formatVnd(item.amount)}</strong> của khoản khai này. Tiền được tính vào thanh toán của đơn ngay sau xác nhận; không cần bàn giao lần hai.</p>
          <label className="flex items-start gap-3"><input type="checkbox" checked={received} disabled={state.isLoading} onChange={(e) => setReceived(e.target.checked)} /><span>Tôi đã nhận đủ tiền thực tế và đối chiếu với shipper.</span></label>
          <label className="block" htmlFor="cod-reject-reason">Lý do từ chối (bắt buộc khi từ chối)<textarea id="cod-reject-reason" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} disabled={state.isLoading} className={managementFieldClass} /></label>
          <div className="flex flex-wrap gap-2"><button className={codButton} disabled={!reason.trim() || state.isLoading || detail.isFetching || detail.isError} onClick={() => void decide(false)}>Từ chối bàn giao</button><button className={codButton} disabled={!received || state.isLoading || detail.isFetching || detail.isError} onClick={() => void decide(true)}>Xác nhận đã nhận tiền</button></div>
        </section>}
        {item.shipperId === actorId && accountant && item.status === 'PENDING' && <p className="text-amber-800">Không được tự xác nhận khoản tiền do chính mình khai. Cần người nhận tiền khác.</p>}
        <section className="space-y-2" aria-label="Mốc bàn giao"><h3 className="font-semibold">Ghi nhận bàn giao</h3><p>Shipper thu tiền: {formatDateTime(item.collectedAt)}</p><p>Gửi khai thu: {formatDateTime(item.submittedAt)}</p>
          {item.reviewedAt && <><p>{item.status === 'VERIFIED' ? 'Đã nhận tiền' : 'Đã từ chối'}: {formatDateTime(item.reviewedAt)}</p><p className="break-all">Người xác nhận: {item.reviewedBy}</p></>}
          {item.status === 'PENDING' && <p>Chưa ghi nhận tiền về cửa hàng.</p>}
        </section>
        {canSeeBalance && <section><h3 className="mb-3 font-semibold">Số dư toàn đơn hàng</h3>{balance.isFetching ? <p role="status">Đang tải số dư...</p> : balance.isError ? <p role="alert">Không tải được số dư. <button className={codButton} onClick={() => void balance.refetch()}>Thử lại</button></p> : balance.data && <dl className="grid gap-3 sm:grid-cols-2">{[
          ['Cửa hàng chưa nhận', balance.data.storeOutstanding], ['Shipper còn giữ', balance.data.shipperHeld], ['Khách còn phải trả', balance.data.customerCollectible], ['Chờ bàn giao tiền', balance.data.pendingClaimAmount],
        ].map(([label, amount]) => <div key={label} className="rounded-md border border-slate-200 p-3"><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{formatVnd(Number(amount))}</dd></div>)}</dl>}</section>}
      </>}
    </div>
  </ManagementDialog>
}
