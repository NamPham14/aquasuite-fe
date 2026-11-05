import { useState } from 'react'
import { ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { demoSkus, money, orderStatus, primaryButton, secondaryButton, totals } from '../lib/deposit'
import type { DepositOrder, DepositPayment, DepositRepository } from '../types/deposit.types'

export function DepositDetails({ order, busy, run }: { order: DepositOrder; busy: boolean; run: (action: (port: DepositRepository) => Promise<unknown>) => Promise<boolean> }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<DepositPayment['method']>('CASH')
  const [reference, setReference] = useState('')
  const [validation, setValidation] = useState('')
  const t = totals(order)
  return <div className="space-y-5 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{order.customer}</h3><p className="text-sm text-slate-500">{order.warehouse} · {order.deliveryDate ? `Giao dự kiến ${order.deliveryDate.split('-').reverse().join('/')}` : 'Chưa hẹn ngày giao'}</p></div><span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">{orderStatus(order)}</span></div>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Tổng đơn', t.total], ['Giá trị yêu cầu giữ', t.requested], ['Cọc tối thiểu · 20%', t.required], ['Tiền đã xác minh', t.verified], ['Tiền chờ xác minh', t.pending], ['Còn phải thu toàn đơn', t.outstanding]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold tabular-nums">{money(Number(value))}</dd></div>)}</dl>
    <section aria-labelledby="deposit-lines"><h3 id="deposit-lines" className="mb-3 font-semibold">Hàng yêu cầu giữ</h3><ManagementTable rows={order.lines} rowKey={(line) => line.skuId} labelledBy="deposit-lines" emptyMessage="Chưa có dòng hàng." columns={[
      { key: 'sku', header: 'Sản phẩm', cell: (line) => demoSkus.find((sku) => sku.id === line.skuId)!.name },
      { key: 'buy', header: 'Mua', cell: (line) => line.quantity, align: 'right' },
      { key: 'requested', header: 'Yêu cầu giữ', cell: (line) => line.requested, align: 'right' },
      { key: 'held', header: 'Đang giữ', cell: (line) => line.held, align: 'right' },
      { key: 'waiting', header: 'Chờ bổ sung', cell: (line) => line.requested - line.held, align: 'right' },
    ]} /><p className="mt-2 text-xs text-slate-500">Đang giữ là lượng đã phân bổ. Giữ hàng không phải xác nhận được phép xuất kho.</p><button type="button" className={`${secondaryButton} mt-3`} disabled={busy || t.verified < t.required} onClick={() => void run((port) => port.synchronize(order.id))}>Đồng bộ giữ hàng demo</button></section>
    <section aria-labelledby="deposit-payments"><h3 id="deposit-payments" className="mb-3 font-semibold">Khoản cọc</h3>{!order.payments.length && <p className="text-sm text-slate-500">Chưa có khoản cọc. Đơn mới chưa thanh toán.</p>}<ul className="space-y-3">{order.payments.map((payment) => <li key={payment.id} className="rounded-lg border border-slate-200 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{money(payment.amount)}</strong><span>{payment.status === 'PENDING' ? 'Chờ xác minh' : payment.status === 'VERIFIED' ? 'Đã xác minh' : 'Đã từ chối'}</span></div><p className="mt-1 break-all text-xs text-slate-500">{payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}{payment.reference && ` · ${payment.reference}`}</p>{payment.status === 'PENDING' && <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={secondaryButton} disabled={busy} onClick={() => void run((port) => port.verify(order.id, payment.id, 'VERIFIED'))}>Mô phỏng xác minh</button><button type="button" className={secondaryButton} disabled={busy} onClick={() => void run((port) => port.verify(order.id, payment.id, 'REJECTED'))}>Mô phỏng từ chối</button></div>}</li>)}</ul></section>
    <form noValidate className="space-y-3 border-t border-slate-100 pt-4" onSubmit={(event) => {
      event.preventDefault()
      const value = Number(amount)
      if (!Number.isSafeInteger(value) || value <= 0 || value > t.total - t.verified - t.pending || (method === 'BANK_TRANSFER' && !reference.trim())) { setValidation('Nhập số tiền nguyên dương không vượt phần có thể thu và mã tham chiếu khi chuyển khoản.'); return }
      setValidation(''); void run((port) => port.pay(order.id, { amount: value, method, reference })).then((ok) => { if (ok) { setAmount(''); setReference('') } })
    }}><h3 className="font-semibold">Ghi nhận cọc demo</h3><p className="text-xs text-slate-500">Có thể thu thêm tối đa {money(Math.max(0, t.total - t.verified - t.pending))}. Tiền mới luôn chờ xác minh, chưa tự giữ hàng.</p><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-3"><ManagementFormField id="payment-amount" label="Số tiền (VND) *"><input id="payment-amount" className={managementFieldClass} type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} /></ManagementFormField><ManagementFormField id="payment-method" label="Hình thức *"><select id="payment-method" className={managementFieldClass} value={method} onChange={(event) => setMethod(event.target.value as DepositPayment['method'])}><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option></select></ManagementFormField><ManagementFormField id="payment-reference" label={method === 'BANK_TRANSFER' ? 'Mã tham chiếu *' : 'Mã tham chiếu'}><input id="payment-reference" className={managementFieldClass} maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} /></ManagementFormField></fieldset>{validation && <p role="alert" className="text-sm text-red-700">{validation}</p>}<button type="submit" className={primaryButton} disabled={busy || t.total - t.verified - t.pending <= 0}>{busy ? 'Đang xử lý...' : 'Ghi nhận cọc demo'}</button></form>
    {order.note && <p className="break-words text-sm text-slate-600">Ghi chú: {order.note}</p>}
    <section aria-labelledby="deposit-history"><h3 id="deposit-history" className="mb-2 font-semibold">Lịch sử xử lý demo</h3><ol className="space-y-2 border-l-2 border-slate-200 pl-4 text-sm text-slate-600">{order.history.map((entry, index) => <li key={index}>{entry}</li>)}</ol></section>
    <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">Nút mô phỏng xác minh dành riêng bản demo FE. Khi nối API, xác minh thuộc quy trình kế toán, không phải quyền thu cọc của nhân viên bán hàng.</p>
  </div>
}
