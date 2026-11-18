import { useRef, useState, type FormEvent } from 'react'
import { useDispatch } from 'react-redux'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { codApi, useClaimCodMutation, useGetCodClaimCapacityQuery } from '../api/codApi.ts'
import { isUuid, isVndAmount, isUncertainCodError } from '../lib/cod.ts'
import type { CodClaim } from '../types/cod.types.ts'
import { useGetDeliveriesQuery } from '../../fulfillment'
import { useAuth } from '../../iam'
import { formatVnd } from '../../../shared/lib/money.ts'
import { codButton } from '../lib/cod.ts'

function ClaimDeliveryOption({ id, label }: { id: string; label: string }) {
  const capacity = useGetCodClaimCapacityQuery(id, { refetchOnMountOrArgChange: true })
  const allowed = !capacity.isFetching && !capacity.isError && capacity.currentData?.deliveryId === id && capacity.currentData.claimable && capacity.currentData.maxClaimAmount > 0
  return <option value={id} disabled={!allowed}>{label} · {capacity.isFetching ? 'Đang kiểm tra số còn thu…' : capacity.isError ? 'Không tải được số còn thu' : allowed ? `Còn được khai ${formatVnd(capacity.currentData!.maxClaimAmount)}` : 'Không còn được khai thu'}</option>
}

export function CodClaimDialog({ onClose }: { onClose: () => void }) {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [deliveryId, setDeliveryId] = useState('')
  const deliveries = useGetDeliveriesQuery({ mine: true, status: 'DELIVERED', page, size: 20 }, { skip: !user?.roles.includes('SHIPPER'), refetchOnMountOrArgChange: true })
  const options = (deliveries.currentData?.content ?? []).filter(d => d.shipperId === user?.id && d.deliveryStatus === 'DELIVERED' && d.codRequired && Number(d.codAmount) > 0)
  const selected = options.find(d => d.deliveryId === deliveryId)
  const capacity = useGetCodClaimCapacityQuery(deliveryId, { skip: !selected, refetchOnMountOrArgChange: true })
  const claimable = !!selected && !capacity.isFetching && !capacity.isError && capacity.currentData?.deliveryId === deliveryId && capacity.currentData.claimable && capacity.currentData.maxClaimAmount > 0
  const maximum = claimable ? capacity.currentData!.maxClaimAmount : 0
  const [initialTime] = useState(() => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16))
  const [claim, state] = useClaimCodMutation()
  const request = useRef<CodClaim | null>(null)
  const busy = useRef(false)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    const form = new FormData(event.currentTarget)
    if (!request.current) {
      if (!selected || !claimable || deliveries.isFetching || deliveries.isError) { setError('Chọn một đợt giao còn được phép khai thu COD của bạn.'); return }
      const amount = Number(form.get('amount'))
      const collectedAt = new Date(`${String(form.get('collectedAt'))}+07:00`)
      if (!isUuid(deliveryId) || !isVndAmount(amount) || !Number.isFinite(collectedAt.getTime())) { setError('Chọn đợt giao, nhập số tiền nguyên dương và thời điểm thu.'); return }
      if (amount > maximum) { setError(`Chỉ được khai tối đa ${formatVnd(maximum)} còn được thu của đợt giao và đơn hàng.`); return }
      if (collectedAt.getTime() > Date.now() + 5 * 60 * 1000) { setError('Thời điểm thu không được vượt quá giờ hiện tại 5 phút. Vui lòng nhập giờ Việt Nam thực tế đã thu tiền.'); return }
      request.current = { deliveryId, amount, collectedAt: collectedAt.toISOString(), note: String(form.get('note')).trim(), idempotencyKey: crypto.randomUUID() }
    }
    busy.current = true; setLocked(true); setError('')
    try {
      await claim(request.current).unwrap()
      toast.success('Đã khai tiền COD đã thu, chờ bàn giao tiền về cửa hàng.')
      onClose()
    } catch (err) {
      const failure = normalizeApiError(err)
      setError([failure.message, ...(failure.errors?.map(field => field.message) ?? [])].join('\n'))
      if (!isUncertainCodError(err)) { request.current = null; setLocked(false); void capacity.refetch() }
    } finally { busy.current = false }
  }
  return <ManagementDialog title="Khai thu COD tiền mặt" onClose={onClose} closeDisabled={locked}>
    <ManagementForm onSubmit={submit} onClose={onClose} closeDisabled={locked} submitDisabled={state.isLoading || (!locked && (!claimable || deliveries.isFetching || deliveries.isError))} submitLabel={state.isLoading ? 'Đang gửi...' : locked ? 'Gửi lại cùng khoản khai' : 'Gửi khai thu'}>
      <p className="text-sm text-slate-600">Chọn đợt giao COD bạn đã giao thành công, rồi khai số tiền thực tế đã thu.</p>
      {error && <p role="alert" className="whitespace-pre-line text-sm text-rose-700">{error}</p>}
      {locked && !state.isLoading && <p role="status" className="text-sm text-amber-800">Chưa xác định kết quả. Gửi lại giữ nguyên thông tin để tránh thu trùng; giữ màn hình này mở.</p>}
      <fieldset disabled={locked} className="space-y-4">
        <ManagementFormField id="cod-delivery" label="Đợt giao COD"><select id="cod-delivery" name="deliveryId" required value={selected ? deliveryId : ''} disabled={deliveries.isFetching || deliveries.isError} onChange={e => { setDeliveryId(e.target.value); setError('') }} className={managementFieldClass}><option value="">Chọn đợt giao đã hoàn thành</option>{options.map(d => <ClaimDeliveryOption key={d.deliveryId} id={d.deliveryId} label={`${d.deliveryCode} · Đợt ${d.batchNo ?? '—'} · ${d.recipientName}`} />)}</select></ManagementFormField>
        {deliveries.isFetching && <p role="status" className="text-sm text-slate-500">Đang tải các đợt giao của bạn...</p>}
        {deliveries.isError && <p role="alert" className="text-sm text-rose-700">Không tải được đợt giao. <button type="button" className={codButton} onClick={() => void deliveries.refetch()}>Thử lại</button></p>}
        {!deliveries.isFetching && !deliveries.isError && !options.length && <p className="text-sm text-slate-500">Trang này chưa có đợt giao COD đã hoàn thành để khai thu.</p>}
        {!!options.length && <button type="button" className={codButton} onClick={() => dispatch(codApi.util.invalidateTags(['Cod']))}>Kiểm tra lại số còn được khai</button>}
        {!!deliveries.currentData && deliveries.currentData.totalPages > 1 && <div className="flex items-center justify-between gap-2 text-sm"><button type="button" className={codButton} disabled={page === 0 || deliveries.isFetching} onClick={() => { setDeliveryId(''); setPage(page - 1) }}>Trước</button><span>Trang {page + 1} / {deliveries.currentData.totalPages}</span><button type="button" className={codButton} disabled={page + 1 >= deliveries.currentData.totalPages || deliveries.isFetching} onClick={() => { setDeliveryId(''); setPage(page + 1) }}>Sau</button></div>}
        {selected && <p className="text-sm text-slate-600">Người nhận: {selected.recipientName} · COD dự kiến: {formatVnd(Number(selected.codAmount))}. Nhập số thực thu bên dưới; hệ thống kiểm tra lại số được phép khai khi gửi.</p>}
        {selected && <div className="text-sm text-slate-600">{capacity.isFetching ? <p role="status">Đang kiểm tra số tiền còn được khai…</p> : capacity.error ? <p role="alert">{normalizeApiError(capacity.error).message} <button type="button" className={codButton} onClick={() => void capacity.refetch()}>Tải lại hạn mức</button></p> : capacity.currentData && <p>Còn nợ của đơn: {formatVnd(capacity.currentData.orderRemaining)} · Còn COD của đợt: {formatVnd(capacity.currentData.deliveryRemaining)} · Tối đa được khai: <strong>{formatVnd(maximum)}</strong>{!claimable && ' — Không còn đủ điều kiện khai thu.'}</p>}</div>}
        <ManagementFormField id="cod-amount" label="Tiền mặt đã thu (VND)"><input id="cod-amount" name="amount" type="number" min="1" max={maximum} disabled={!claimable} step="1" required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-time" label="Thời điểm thu (giờ Việt Nam)"><input id="cod-time" name="collectedAt" type="datetime-local" defaultValue={initialTime} required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-note" label="Ghi chú"><textarea id="cod-note" name="note" maxLength={1000} className={managementFieldClass} /></ManagementFormField>
      </fieldset>
    </ManagementForm>
  </ManagementDialog>
}
