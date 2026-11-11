import { useState } from 'react'
import { ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { demoCustomers, demoSkus, localToday, money } from '../lib/deposit'
import type { NewDepositOrder } from '../types/deposit.types'

export function DepositOrderForm({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (input: NewDepositOrder) => Promise<void> }) {
  const [depositRequired, setDepositRequired] = useState('')
  const [customer, setCustomer] = useState('')
  const [warehouse, setWarehouse] = useState('Kho chính')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState(demoSkus.map((sku) => ({ skuId: sku.id, selected: false, quantity: 1, requested: 1, held: 0 })))
  const [error, setError] = useState('')
  const selected = lines.filter((line) => line.selected)
  const value = selected.reduce((sum, line) => sum + line.quantity * demoSkus.find((sku) => sku.id === line.skuId)!.price, 0)
  function update(index: number, patch: Partial<(typeof lines)[number]>) { setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line)) }
  return <ManagementForm onClose={onClose} closeDisabled={busy} submitDisabled={busy} submitLabel={busy ? 'Đang tạo...' : 'Tạo đơn & yêu cầu giữ'} onSubmit={(event) => {
    event.preventDefault()
    if (!Number.isSafeInteger(Number(depositRequired)) || Number(depositRequired) < 0 || Number(depositRequired) > value || !customer || !selected.length || !selected.some((line) => line.requested > 0) || selected.some((line) => !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 9999 || !Number.isSafeInteger(line.requested) || line.requested < 0 || line.requested > line.quantity) || (deliveryDate && deliveryDate < localToday())) { setError('Chọn khách, ít nhất một sản phẩm cần giữ và nhập số lượng hợp lệ. Ngày giao không được ở quá khứ.'); return }
    setError(''); void onSave({ depositRequired: Number(depositRequired), customer, warehouse, deliveryDate, note: note.trim(), lines: selected.map(({ skuId, quantity, requested, held }) => ({ skuId, quantity, requested, held })) })
  }}>
    <p className="text-sm text-slate-600">Tạo đơn demo chưa thanh toán. Mức cọc theo thỏa thuận trên đơn, không tính theo phần hàng yêu cầu giữ.</p>
    <ManagementFormField id="deposit-agreed" label="Cọc thỏa thuận trên đơn demo (VND)" hint="Để trống hoặc 0: chưa có mức cọc, không đủ điều kiện giữ hàng."><input id="deposit-agreed" aria-describedby="deposit-agreed-hint" disabled={busy} className={managementFieldClass} type="number" min="0" max={value} step="1" value={depositRequired} onChange={(event) => setDepositRequired(event.target.value)} /></ManagementFormField>
    <fieldset disabled={busy} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField id="deposit-customer" label="Khách hàng *"><select id="deposit-customer" required className={managementFieldClass} value={customer} onChange={(event) => setCustomer(event.target.value)}><option value="">Chọn khách hàng demo</option>{demoCustomers.map((name) => <option key={name}>{name}</option>)}</select></ManagementFormField>
        <ManagementFormField id="deposit-warehouse" label="Kho giữ hàng *"><select id="deposit-warehouse" className={managementFieldClass} value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option>Kho chính</option><option>Kho phụ</option></select></ManagementFormField>
      </div>
      <div className="space-y-3"><h3 className="font-semibold text-slate-900">Sản phẩm & phạm vi yêu cầu giữ</h3>{demoSkus.map((sku, index) => <div key={sku.id} className="rounded-lg border border-slate-200 p-3">
        <label className="flex items-start gap-3 text-sm font-medium"><input type="checkbox" className="mt-1 h-4 w-4 accent-sky-700" checked={lines[index].selected} onChange={(event) => update(index, { selected: event.target.checked })} /><span>{sku.name}<span className="mt-1 block text-xs font-normal text-slate-500">{sku.code} · {money(sku.price)}</span></span></label>
        {lines[index].selected && <div className="mt-3 grid gap-3 sm:grid-cols-2"><ManagementFormField id={`buy-${sku.id}`} label="Số lượng mua *"><input id={`buy-${sku.id}`} className={managementFieldClass} type="number" min="1" max="9999" step="1" value={lines[index].quantity} onChange={(event) => update(index, { quantity: event.target.valueAsNumber })} /></ManagementFormField><ManagementFormField id={`hold-${sku.id}`} label="Số lượng yêu cầu giữ *"><input id={`hold-${sku.id}`} className={managementFieldClass} type="number" min="0" max={lines[index].quantity} step="1" value={lines[index].requested} onChange={(event) => update(index, { requested: event.target.valueAsNumber })} /></ManagementFormField></div>}
      </div>)}</div>
      <div className="grid gap-4 sm:grid-cols-2"><ManagementFormField id="deposit-delivery" label="Ngày giao dự kiến" hint="Ngày dự kiến không làm hết hạn giữ có cọc."><input id="deposit-delivery" aria-describedby="deposit-delivery-hint" className={managementFieldClass} type="date" min={localToday()} value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></ManagementFormField><ManagementFormField id="deposit-note" label="Ghi chú"><textarea id="deposit-note" className={managementFieldClass} rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></ManagementFormField></div>
    </fieldset>
    <div className="rounded-lg bg-sky-50 p-4 text-sm text-sky-900"><p>Tổng đơn demo: <strong>{money(Number.isFinite(value) ? value : 0)}</strong></p><p className="mt-2 text-xs">Mức cọc phải từ 0 đến tổng đơn. Khi dùng API thật, mức cọc và tình trạng đủ cọc được đọc từ payment do Finance trả về.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </ManagementForm>
}
