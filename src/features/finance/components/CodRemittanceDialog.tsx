import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useRemitCodMutation } from '../api/codApi.ts'
import { buildCodRemittance, isUncertainCodError } from '../lib/cod.ts'
import type { CodCollection, CodRemit } from '../types/cod.types.ts'

export function CodRemittanceDialog({ items, actorId, onClose }: { items: CodCollection[]; actorId: string; onClose: () => void }) {
  const [amounts, setAmounts] = useState(items.map((x) => String(x.heldAmount)))
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [stale, setStale] = useState(false)
  const request = useRef<CodRemit | null>(null)
  const busy = useRef(false)
  const [remit, state] = useRemitCodMutation()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current || stale) return
    try { request.current ??= buildCodRemittance(items, amounts, actorId, note, crypto.randomUUID()) }
    catch (err) { setError((err as Error).message); return }
    busy.current = true; setLocked(true); setError('')
    try {
      const receipt = await remit(request.current).unwrap()
      toast.success(`Đã nhận ${formatVnd(receipt.amount)} · Phiếu ${receipt.remittanceId}`)
      onClose()
    } catch (err) {
      setError(normalizeApiError(err).message)
      if (!isUncertainCodError(err)) { request.current = null; setLocked(false); setStale(true) }
    } finally { busy.current = false }
  }
  return <ManagementDialog title="Xác nhận tiền COD thực nhận" onClose={onClose} closeDisabled={locked}>
    <ManagementForm onSubmit={submit} onClose={onClose} closeDisabled={locked} submitDisabled={state.isLoading || stale} submitLabel={state.isLoading ? 'Đang ghi nhận...' : locked ? 'Gửi lại cùng phiếu' : 'Xác nhận đã nhận tiền'}>
      <p className="break-all text-sm text-slate-600">Shipper: {items[0]?.shipperId}. Chỉ xác nhận số tiền đã trực tiếp kiểm đếm; phần chưa nộp vẫn thuộc shipper.</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {stale && <p className="text-sm text-amber-800">Đóng hộp thoại, tải lại danh sách và kiểm tra số dư trước khi lập phiếu mới.</p>}
      {locked && !state.isLoading && <p role="status" className="text-sm text-amber-800">Chưa xác định kết quả. Giữ màn hình mở và gửi lại cùng phiếu để tránh nhận trùng.</p>}
      <fieldset disabled={locked || stale} className="space-y-4">
        {items.map((item, i) => <ManagementFormField key={item.collectionId} id={`cod-remit-${i}`} label={`${item.deliveryCode || item.deliveryId} · Còn giữ ${formatVnd(item.heldAmount)}`}>
          <input id={`cod-remit-${i}`} type="number" min="1" max={item.heldAmount} step="1" required value={amounts[i]} onChange={(e) => setAmounts((old) => old.map((x, j) => j === i ? e.target.value : x))} className={managementFieldClass} />
        </ManagementFormField>)}
        <ManagementFormField id="cod-remit-note" label="Ghi chú / lý do nộp thiếu"><textarea id="cod-remit-note" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={managementFieldClass} /></ManagementFormField>
      </fieldset>
      <p className="text-sm font-semibold">Tổng thực nhận: {formatVnd(amounts.reduce((sum, x) => sum + (Number(x) || 0), 0))}</p>
    </ManagementForm>
  </ManagementDialog>
}
