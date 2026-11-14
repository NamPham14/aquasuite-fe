import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useClaimCodMutation } from '../api/codApi.ts'
import { isUuid, isVndAmount, isUncertainCodError } from '../lib/cod.ts'
import type { CodClaim } from '../types/cod.types.ts'
import { useGetDeliveriesQuery } from '../../fulfillment'
import { useAuth } from '../../iam'
import { formatVnd } from '../../../shared/lib/money.ts'
import { codButton } from '../lib/cod.ts'

export function CodClaimDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [page, setPage] = useState(0)
  const [deliveryId, setDeliveryId] = useState('')
  const deliveries = useGetDeliveriesQuery({ mine: true, status: 'DELIVERED', page, size: 20 }, { skip: !user?.roles.includes('SHIPPER'), refetchOnMountOrArgChange: true })
  const options = (deliveries.currentData?.content ?? []).filter(d => d.shipperId === user?.id && d.deliveryStatus === 'DELIVERED' && d.codRequired && Number(d.codAmount) > 0)
  const selected = options.find(d => d.deliveryId === deliveryId)
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
      if (!selected || deliveries.isFetching || deliveries.isError) { setError('Chọn một đợt giao COD đã giao thành công của bạn.'); return }
      const amount = Number(form.get('amount'))
      const collectedAt = new Date(`${String(form.get('collectedAt'))}+07:00`)
      if (!isUuid(deliveryId) || !isVndAmount(amount) || !Number.isFinite(collectedAt.getTime())) { setError('Chọn đợt giao, nhập số tiền nguyên dương và thời điểm thu.'); return }
      if (collectedAt.getTime() > Date.now() + 5 * 60 * 1000) { setError('Thời điểm thu không được vượt quá giờ hiện tại 5 phút. Vui lòng nhập giờ Việt Nam thực tế đã thu tiền.'); return }
      request.current = { deliveryId, amount, collectedAt: collectedAt.toISOString(), note: String(form.get('note')).trim(), idempotencyKey: crypto.randomUUID() }
    }
    busy.current = true; setLocked(true); setError('')
    try {
      await claim(request.current).unwrap()
      toast.success('Đã khai tiền COD đã thu, chờ bàn giao tiền về cửa hàng.')
      onClose()
    } catch (err) {
      setError(normalizeApiError(err).message)
      if (!isUncertainCodError(err)) { request.current = null; setLocked(false) }
    } finally { busy.current = false }
  }
  return <ManagementDialog title="Khai thu COD tiền mặt" onClose={onClose} closeDisabled={locked}>
    <ManagementForm onSubmit={submit} onClose={onClose} closeDisabled={locked} submitDisabled={state.isLoading || (!locked && (!selected || deliveries.isFetching || deliveries.isError))} submitLabel={state.isLoading ? 'Đang gửi...' : locked ? 'Gửi lại cùng khoản khai' : 'Gửi khai thu'}>
      <p className="text-sm text-slate-600">Chọn đợt giao COD bạn đã giao thành công, rồi khai số tiền thực tế đã thu.</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {locked && !state.isLoading && <p role="status" className="text-sm text-amber-800">Chưa xác định kết quả. Gửi lại giữ nguyên thông tin để tránh thu trùng; giữ màn hình này mở.</p>}
      <fieldset disabled={locked} className="space-y-4">
        <ManagementFormField id="cod-delivery" label="Đợt giao COD"><select id="cod-delivery" name="deliveryId" required value={selected ? deliveryId : ''} disabled={deliveries.isFetching || deliveries.isError} onChange={e => { setDeliveryId(e.target.value); setError('') }} className={managementFieldClass}><option value="">Chọn đợt giao đã hoàn thành</option>{options.map(d => <option key={d.deliveryId} value={d.deliveryId}>{d.deliveryCode} · Đợt {d.batchNo ?? '—'} · {d.recipientName} · COD {formatVnd(Number(d.codAmount))}</option>)}</select></ManagementFormField>
        {deliveries.isFetching && <p role="status" className="text-sm text-slate-500">Đang tải các đợt giao của bạn...</p>}
        {deliveries.isError && <p role="alert" className="text-sm text-rose-700">Không tải được đợt giao. <button type="button" className={codButton} onClick={() => void deliveries.refetch()}>Thử lại</button></p>}
        {!deliveries.isFetching && !deliveries.isError && !options.length && <p className="text-sm text-slate-500">Trang này chưa có đợt giao COD đã hoàn thành để khai thu.</p>}
        {!!deliveries.currentData && deliveries.currentData.totalPages > 1 && <div className="flex items-center justify-between gap-2 text-sm"><button type="button" className={codButton} disabled={page === 0 || deliveries.isFetching} onClick={() => { setDeliveryId(''); setPage(page - 1) }}>Trước</button><span>Trang {page + 1} / {deliveries.currentData.totalPages}</span><button type="button" className={codButton} disabled={page + 1 >= deliveries.currentData.totalPages || deliveries.isFetching} onClick={() => { setDeliveryId(''); setPage(page + 1) }}>Sau</button></div>}
        {selected && <p className="text-sm text-slate-600">Người nhận: {selected.recipientName} · COD dự kiến: {formatVnd(Number(selected.codAmount))}. Nhập số thực thu bên dưới; hệ thống kiểm tra lại số được phép khai khi gửi.</p>}
        <ManagementFormField id="cod-amount" label="Tiền mặt đã thu (VND)"><input id="cod-amount" name="amount" type="number" min="1" max="9999999999999" step="1" required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-time" label="Thời điểm thu (giờ Việt Nam)"><input id="cod-time" name="collectedAt" type="datetime-local" defaultValue={new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16)} required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-note" label="Ghi chú"><textarea id="cod-note" name="note" maxLength={1000} className={managementFieldClass} /></ManagementFormField>
      </fieldset>
    </ManagementForm>
  </ManagementDialog>
}
