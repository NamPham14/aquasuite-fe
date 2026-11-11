import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useClaimCodMutation } from '../api/codApi.ts'
import { isUuid, isVndAmount, isUncertainCodError } from '../lib/cod.ts'
import type { CodClaim } from '../types/cod.types.ts'

export function CodClaimDialog({ onClose }: { onClose: () => void }) {
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
      const deliveryId = String(form.get('deliveryId')).trim()
      const amount = Number(form.get('amount'))
      const collectedAt = new Date(String(form.get('collectedAt')))
      if (!isUuid(deliveryId) || !isVndAmount(amount) || !Number.isFinite(collectedAt.getTime())) { setError('Nhập ID đợt giao hợp lệ, số tiền nguyên dương và thời điểm thu.'); return }
      request.current = { deliveryId, amount, collectedAt: collectedAt.toISOString(), note: String(form.get('note')).trim(), idempotencyKey: crypto.randomUUID() }
    }
    busy.current = true; setLocked(true); setError('')
    try {
      await claim(request.current).unwrap()
      toast.success('Đã khai thu COD, chờ kế toán xác nhận khai thu.')
      onClose()
    } catch (err) {
      setError(normalizeApiError(err).message)
      if (!isUncertainCodError(err)) { request.current = null; setLocked(false) }
    } finally { busy.current = false }
  }
  return <ManagementDialog title="Khai thu COD tiền mặt" onClose={onClose} closeDisabled={locked}>
    <ManagementForm onSubmit={submit} onClose={onClose} closeDisabled={locked} submitDisabled={state.isLoading} submitLabel={state.isLoading ? 'Đang gửi...' : locked ? 'Gửi lại cùng khoản khai' : 'Gửi khai thu'}>
      <p className="text-sm text-slate-600">Dùng ID đợt giao thật đã giao thành công, có COD và được phân cho bạn. Hiện chưa có danh sách đợt giao UC41.</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {locked && !state.isLoading && <p role="status" className="text-sm text-amber-800">Chưa xác định kết quả. Gửi lại giữ nguyên thông tin để tránh thu trùng; giữ màn hình này mở.</p>}
      <fieldset disabled={locked} className="space-y-4">
        <ManagementFormField id="cod-delivery" label="ID đợt giao"><input id="cod-delivery" name="deliveryId" required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-amount" label="Tiền mặt đã thu (VND)"><input id="cod-amount" name="amount" type="number" min="1" max="9999999999999" step="1" required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-time" label="Thời điểm thu"><input id="cod-time" name="collectedAt" type="datetime-local" required className={managementFieldClass} /></ManagementFormField>
        <ManagementFormField id="cod-note" label="Ghi chú"><textarea id="cod-note" name="note" maxLength={1000} className={managementFieldClass} /></ManagementFormField>
      </fieldset>
    </ManagementForm>
  </ManagementDialog>
}
