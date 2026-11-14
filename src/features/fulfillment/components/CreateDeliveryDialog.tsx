import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useCreateDeliveryMutation, useGetDeliveryCandidatesQuery, useGetDeliveryInvoicesQuery } from '../api/deliveryIssueApi'
import type { CreateDeliveryRequest, DeliveryCandidates } from '../types/deliveryIssue.types'
import { deliveryButton } from './deliveryPresentation'
import { isUncertainDeliveryError, validateDeliveryLines } from './deliveryIssueForm'
import { useGetSalesOrderByIdQuery } from '../../sales'

export function CreateDeliveryDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [invoiceId, setInvoiceId] = useState('')
  const [blocked, setBlocked] = useState(false)
  const order = useGetSalesOrderByIdQuery(orderId)
  const invoices = useGetDeliveryInvoicesQuery(orderId, { refetchOnMountOrArgChange: true })
  const options = (invoices.currentData ?? []).filter((invoice) => invoice.orderId === orderId && invoice.status === 'ISSUED')
  const selectedAvailable = options.some((invoice) => invoice.invoiceId === invoiceId)
  const candidates = useGetDeliveryCandidatesQuery(invoiceId, { skip: !invoiceId || (!selectedAvailable && !blocked), refetchOnMountOrArgChange: true })
  const sourceMatches = candidates.currentData?.orderId === orderId && candidates.currentData.salesInvoiceId === invoiceId
  return <ManagementDialog title="Tạo đợt giao nháp" size="wide" onClose={onClose} closeDisabled={blocked}>
    <div className="space-y-2 border-b border-slate-200 p-5"><label htmlFor="issue-invoice" className="text-sm font-medium text-slate-700">Hóa đơn đã phát hành của đơn hàng *</label><select id="issue-invoice" className={managementFieldClass} value={invoiceId} disabled={blocked || invoices.isFetching || invoices.isError || !options.length} onChange={(e) => setInvoiceId(e.target.value)}><option value="">Chọn hóa đơn nguồn</option>{options.map((invoice) => <option key={invoice.invoiceId} value={invoice.invoiceId}>{invoice.invoiceCode}</option>)}</select>
      {invoices.isFetching && <p role="status" className="text-sm text-slate-500">Đang tải hóa đơn đã phát hành…</p>}
      {invoices.error && <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{normalizeApiError(invoices.error).message}</p><button type="button" className={deliveryButton} disabled={blocked || invoices.isFetching} onClick={() => void invoices.refetch()}>Thử tải lại hóa đơn</button></div>}
      {!invoices.isFetching && !invoices.isError && !options.length && <p className="text-sm text-slate-500">Đơn chưa có hóa đơn đã phát hành (ISSUED). Cần phát hành hóa đơn ở phần Đơn hàng trước khi tạo đợt giao.</p>}
      {invoiceId && !selectedAvailable && !invoices.isFetching && !invoices.isError && <p role="alert" className="text-sm text-amber-900">Hóa đơn đã chọn không còn trong danh sách có thể giao. Hãy chọn lại hóa đơn.</p>}
    </div>
    {candidates.currentData && !sourceMatches && <p role="alert" className="p-5 text-sm text-rose-700">Hóa đơn trả về không khớp với đơn hàng hoặc hóa đơn đã chọn. Không thể tạo đợt giao.</p>}
    {order.error && <div className="space-y-2 p-5 text-sm text-amber-900"><p>Không tải được thông tin khách hàng của đơn. Bạn có thể nhập người nhận và số điện thoại trực tiếp.</p><button type="button" className={deliveryButton} disabled={blocked || order.isFetching} onClick={() => void order.refetch()}>Tải lại thông tin khách hàng</button></div>}
    {candidates.currentData && sourceMatches && (!order.isLoading || order.currentData) ? <CreateDeliveryForm key={invoiceId} candidates={candidates.currentData} recipient={order.currentData?.orderId === orderId ? { name: order.currentData.customerName ?? '', phone: order.currentData.customerPhone ?? '', address: order.currentData.deliveryAddress ?? '' } : undefined} stale={candidates.isFetching || candidates.isError || invoices.isFetching || invoices.isError || !selectedAvailable} onClose={onClose} onBlocked={setBlocked} /> : candidates.isFetching || (invoiceId && order.isLoading) ? <p role="status" className="p-6 text-sm text-slate-500">Đang tải thông tin giao hàng và các dòng hàng có thể giao…</p> : null}
    {candidates.error && <div className="p-6 text-sm text-rose-700"><p role="alert">{normalizeApiError(candidates.error).message}</p><button type="button" className={`${deliveryButton} mt-3`} disabled={blocked} onClick={() => void candidates.refetch()}>Thử tải lại hàng có thể xuất</button></div>}
  </ManagementDialog>
}

function CreateDeliveryForm({ candidates, recipient, stale, onClose, onBlocked }: { candidates: DeliveryCandidates; recipient?: { name: string; phone: string; address: string }; stale: boolean; onClose: () => void; onBlocked: (blocked: boolean) => void }) {
  const navigate = useNavigate()
  const [deliveryId] = useState(() => crypto.randomUUID())
  const [fields, setFields] = useState(() => ({ recipientName: ['Walk-in Retail Customer', 'Khách lẻ tại quầy', 'Khách vãng lai tại quầy'].includes(recipient?.name.trim() ?? '') ? '' : recipient?.name ?? '', recipientPhone: recipient?.phone === '0000000000' ? '' : recipient?.phone ?? '', deliveryAddress: candidates.deliveryAddress?.trim() ? candidates.deliveryAddress : recipient?.address ?? '', scheduledDate: '', codAmount: '0', note: '' }))
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [pending, setPending] = useState<CreateDeliveryRequest | null>(null)
  const [send, { isLoading }] = useCreateDeliveryMutation()
  const lock = useRef(false)
  const blocked = isLoading || !!pending
  const unavailable = !candidates.eligible || !candidates.items.some((line) => !line.serialTracking && Number(line.remainingQty) > 0)
  function change(key: keyof typeof fields, value: string) { setFields({ ...fields, [key]: value }); setErrors({ ...errors, [key]: '' }) }
  async function submit() {
    if (lock.current || (!pending && (stale || unavailable))) return
    const validation: Record<string, string> = {}
    if (!fields.recipientName.trim() || fields.recipientName.trim().length > 255) validation.recipientName = 'Nhập tên người nhận, tối đa 255 ký tự.'
    if (!fields.recipientPhone.trim() || fields.recipientPhone.trim().length > 32) validation.recipientPhone = 'Nhập số điện thoại, tối đa 32 ký tự.'
    if (!fields.deliveryAddress.trim() || fields.deliveryAddress.trim().length > 2000) validation.deliveryAddress = 'Nhập địa chỉ, tối đa 2.000 ký tự.'
    if (!/^\d{1,13}$/.test(fields.codAmount)) validation.codAmount = 'COD phải là số nguyên VND từ 0 đến 9.999.999.999.999.'
    if (fields.note.length > 1000) validation.note = 'Ghi chú tối đa 1.000 ký tự.'
    const scheduledDate = fields.scheduledDate ? `${fields.scheduledDate}:00+07:00` : null
    if (scheduledDate && !Number.isFinite(Date.parse(scheduledDate))) validation.scheduledDate = 'Ngày giờ hẹn giao không hợp lệ.'
    const linesError = validateDeliveryLines(candidates, quantities)
    if (!pending && (Object.keys(validation).length || linesError)) { setErrors(validation); setError(linesError); return }
    const request: CreateDeliveryRequest = pending ?? {
      deliveryId, warehouseCode: 'WH_MAIN', recipientName: fields.recipientName.trim(), recipientPhone: fields.recipientPhone.trim(),
      deliveryAddress: fields.deliveryAddress.trim(), scheduledDate, codAmount: Number(fields.codAmount), note: fields.note.trim() || null,
      items: candidates.items.filter((line) => Number(quantities[line.orderItemId]) > 0).map((line) => ({ orderItemId: line.orderItemId, quantity: Number(quantities[line.orderItemId]) })),
    }
    lock.current = true; onBlocked(true); setPending(request); setError(''); setErrors({})
    try {
      const result = await send({ invoiceId: candidates.salesInvoiceId, body: request }).unwrap()
      setPending(null); onBlocked(false); toast.success('Đã tạo đợt giao nháp. Chưa trừ tồn kho.'); onClose()
      void navigate(`/app/deliveries/${result.deliveryId}`)
    } catch (failure) {
      if (!isUncertainDeliveryError(failure)) { setPending(null); onBlocked(false) }
      setError(normalizeApiError(failure).message)
    } finally { lock.current = false }
  }
  return <ManagementForm onSubmit={(e) => { e.preventDefault(); void submit() }} onClose={onClose} closeDisabled={blocked} submitDisabled={isLoading || (!pending && (stale || unavailable))} submitLabel={isLoading ? 'Đang tạo…' : pending ? 'Gửi lại cùng đợt giao' : 'Tạo nháp'}>
    <p className="text-sm text-slate-600"><strong className="text-slate-900">{candidates.orderCode}</strong> · Hóa đơn <strong>{candidates.invoiceCode}</strong> · Kho WH_MAIN. Tạo nháp chưa trừ tồn hoặc giữ thêm hàng. Sau khi tạo, mở chi tiết để xác nhận xuất kho.</p>
    {unavailable && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Đơn chưa đủ điều kiện xuất hoặc không còn lượng để xuất. Chỉ áp dụng đơn Đang xử lý, không có thay đổi chưa giải quyết và dữ liệu đợt giao cũ phải được đối chiếu.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <p className="text-xs text-slate-500 sm:col-span-2">Thông tin được điền sẵn từ đơn hàng nếu có. Bạn có thể sửa người nhận, điện thoại và địa chỉ riêng cho đợt giao này.</p>
      <ManagementFormField id="issue-recipient" label="Người nhận *" error={errors.recipientName}><input id="issue-recipient" maxLength={255} value={fields.recipientName} disabled={blocked} aria-invalid={!!errors.recipientName} aria-describedby={errors.recipientName ? 'issue-recipient-error' : undefined} onChange={(e) => change('recipientName', e.target.value)} className={managementFieldClass} autoComplete="name" /></ManagementFormField>
      <ManagementFormField id="issue-phone" label="Điện thoại *" error={errors.recipientPhone}><input id="issue-phone" type="tel" maxLength={32} value={fields.recipientPhone} disabled={blocked} aria-invalid={!!errors.recipientPhone} aria-describedby={errors.recipientPhone ? 'issue-phone-error' : undefined} onChange={(e) => change('recipientPhone', e.target.value)} className={managementFieldClass} autoComplete="tel" /></ManagementFormField>
      <ManagementFormField id="issue-date" label="Hẹn giao (giờ Việt Nam)" error={errors.scheduledDate}><input id="issue-date" type="datetime-local" value={fields.scheduledDate} disabled={blocked} aria-invalid={!!errors.scheduledDate} aria-describedby={errors.scheduledDate ? 'issue-date-error' : undefined} onChange={(e) => change('scheduledDate', e.target.value)} className={managementFieldClass} /></ManagementFormField>
      <ManagementFormField id="issue-cod" label="COD (VND) *" error={errors.codAmount} hint="Nhập 0 nếu không thu COD. Hệ thống kiểm tra mức được thu khi xác nhận xuất kho."><input id="issue-cod" inputMode="numeric" value={fields.codAmount} disabled={blocked} aria-invalid={!!errors.codAmount} aria-describedby={errors.codAmount ? 'issue-cod-error' : 'issue-cod-hint'} onChange={(e) => change('codAmount', e.target.value)} className={managementFieldClass} /></ManagementFormField>
    </div>
    <ManagementFormField id="issue-address" label="Địa chỉ nhận hàng *" error={errors.deliveryAddress}><textarea id="issue-address" rows={2} maxLength={2000} value={fields.deliveryAddress} disabled={blocked} aria-invalid={!!errors.deliveryAddress} aria-describedby={errors.deliveryAddress ? 'issue-address-error' : undefined} onChange={(e) => change('deliveryAddress', e.target.value)} className={managementFieldClass} /></ManagementFormField>
    <section className="overflow-hidden rounded-lg border border-slate-200"><h3 id="issue-items" className="p-3 text-sm font-semibold">Chọn hàng của đợt giao</h3><ManagementTable rows={candidates.items} rowKey={(line) => line.orderItemId} labelledBy="issue-items" emptyMessage="Đơn không có dòng hàng." columns={[
      { key: 'product', header: 'Sản phẩm / SKU', cellClassName: '!whitespace-normal min-w-40', cell: (line) => <><strong>{line.productName}</strong><p className="font-mono text-xs text-slate-500">{line.sku}</p></> },
      { key: 'ordered', header: 'Đã đặt', align: 'right', cell: (line) => line.orderedQty },
      { key: 'issued', header: 'Đã xuất', align: 'right', cell: (line) => line.issuedQty },
      { key: 'remaining', header: 'Còn được giao theo hóa đơn', align: 'right', cellClassName: 'font-bold text-slate-900', cell: (line) => line.remainingQty },
      { key: 'held', header: 'Hàng giữ của dòng', align: 'right', cell: (line) => line.heldQty },
      { key: 'free', header: 'Tồn khả dụng', align: 'right', cell: (line) => line.availableQty },
      { key: 'quantity', header: 'Lượng giao', cell: (line) => line.serialTracking ? <p className="min-w-32 text-xs font-medium text-amber-800">Hàng quản lý serial — chưa hỗ trợ xuất giao</p> : <input type="number" inputMode="decimal" min="0" max={line.remainingQty} step="0.01" aria-label={`Lượng giao ${line.sku || line.productName}`} value={quantities[line.orderItemId] ?? '0'} disabled={blocked || Number(line.remainingQty) <= 0} onChange={(e) => setQuantities({ ...quantities, [line.orderItemId]: e.target.value })} className={`${managementFieldClass} min-w-24`} /> },
    ]} /></section>
    <p className="text-xs text-slate-500">Nhập 0 để bỏ qua dòng. Lượng còn được xuất khác tồn khả dụng. Tồn và hàng giữ được kiểm tra lại lúc xác nhận; hàng quản lý serial hiện chưa được hỗ trợ.</p>
    <ManagementFormField id="issue-note" label="Ghi chú" error={errors.note}><textarea id="issue-note" rows={2} maxLength={1000} value={fields.note} disabled={blocked} onChange={(e) => change('note', e.target.value)} className={managementFieldClass} /></ManagementFormField>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {pending && !isLoading && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Chưa xác định kết quả tạo nháp. Giữ tab mở, không tải lại trang. Gửi lại sẽ dùng đúng mã đợt giao và nội dung đã gửi, không tạo đợt khác.</p>}
  </ManagementForm>
}
