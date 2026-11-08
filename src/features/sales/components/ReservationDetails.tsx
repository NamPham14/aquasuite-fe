import { useRef, useState } from 'react'
import { ManagementDialog, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useReservationOrderQuery, useReservationQuery, useReservationReceiptsQuery, useSubmitReservationMutation, useRetryReservationMutation } from '../api/reservationApi'
import type { ReservationRequest } from '../types/reservation.types'
import { money, primaryButton, secondaryButton } from '../lib/deposit'

function uncertain(error: unknown) {
  const status = normalizeApiError(error).status
  return typeof status !== 'number' || status >= 500 || status === 408
}

export function ReservationDetails({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const order = useReservationOrderQuery(orderId, { refetchOnMountOrArgChange: true })
  const reservation = useReservationQuery(orderId, { refetchOnMountOrArgChange: true })
  const receipts = useReservationReceiptsQuery(orderId, { refetchOnMountOrArgChange: true })
  const [submit, submitting] = useSubmitReservationMutation()
  const [retry, retrying] = useRetryReservationMutation()
  const [warehouse, setWarehouse] = useState('')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingReservation, setPendingReservation] = useState<{ action: 'requests' | 'synchronize'; body: ReservationRequest } | null>(null)
  const lock = useRef(false)
  const view = reservation.currentData
  const detail = order.currentData
  const busy = submitting.isLoading || retrying.isLoading
  const blocked = busy || pendingReservation !== null
  const eligible = detail && ['CONFIRMED', 'PROCESSING'].includes(detail.orderStatus) && detail.items.length > 0 && detail.items.every((item) => item.variantId)
  const refresh = () => { void reservation.refetch(); void receipts.refetch() }

  async function reserve(action: 'requests' | 'synchronize') {
    if (lock.current || !detail || !view || (!eligible && !pendingReservation)) return
    const lines = view.reservationRequested ? view.lines : detail.items.filter((item) => Number(quantities[item.orderItemId]) > 0).map((item) => ({ orderItemId: item.orderItemId, quantity: Number(quantities[item.orderItemId]) }))
    const warehouseCode = view.warehouseCode || warehouse.trim()
    if (!pendingReservation && (!/^[A-Z0-9_-]{1,50}$/.test(warehouseCode) || !lines.length || lines.length > 200 || lines.some((line) => !Number.isFinite(line.quantity) || line.quantity < 0.01 || line.quantity > 9999999999.99 || Math.abs(line.quantity * 100 - Math.round(line.quantity * 100)) > 0.0001 || line.quantity > (detail.items.find((item) => item.orderItemId === line.orderItemId)?.quantity ?? 0)))) {
      setError('Nhập mã kho hợp lệ và chọn ít nhất một dòng, số giữ từ 0,01 đến số lượng mua, tối đa 2 chữ số thập phân.'); return
    }
    const request = pendingReservation ?? { action, body: { requestId: crypto.randomUUID(), warehouseCode, lines } }
    lock.current = true; setError(''); setNotice(''); setPendingReservation(request)
    try {
      await submit({ orderId, ...request }).unwrap()
      setPendingReservation(null); setNotice('Đã cập nhật yêu cầu giữ hàng.'); refresh()
    } catch (failure) {
      if (!uncertain(failure)) setPendingReservation(null)
      setError(normalizeApiError(failure).message)
    } finally { lock.current = false }
  }
  async function retryAllocation() {
    if (lock.current || !view?.allocationId || blocked) return
    lock.current = true; setError(''); setNotice('')
    try { await retry({ orderId, allocationId: view.allocationId }).unwrap(); setNotice('Đã thử lại phân bổ.'); refresh() }
    catch (failure) { setError(normalizeApiError(failure).message) }
    finally { lock.current = false }
  }
  const loadError = order.error || reservation.error
  return <ManagementDialog title={`Đặt cọc & Giữ hàng · ${detail?.orderCode ?? orderId}`} size="wide" closeDisabled={blocked} onClose={() => { if (!blocked) onClose() }}>
    <div className="space-y-5 p-5 sm:p-6">
      <button type="button" className={secondaryButton} disabled={busy} onClick={() => { void order.refetch(); refresh() }}>Tải lại từ máy chủ</button>
      {(order.isFetching || reservation.isFetching) && <p role="status">Đang tải thông tin...</p>}
      {loadError && <p role="alert" className="text-sm text-rose-800">{normalizeApiError(loadError).message}</p>}
      {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}
      {pendingReservation && !busy && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Chưa xác định kết quả. Giữ nguyên yêu cầu và mã chống trùng; bấm gửi lại bên dưới để xác nhận trước khi đóng. Không tải lại trang.</p>}
      {detail && view && !loadError && <>
        <p className="text-sm">{detail.customerName} · Trạng thái đơn: {detail.orderStatus}</p>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[
          ['Tổng đơn', view.payment.totalAmount], ['Giá trị yêu cầu giữ', view.reservationValue], ['Cọc thỏa thuận', view.payment.depositRequired],
          ['Đã xác minh', view.payment.verifiedPaid], ['Chờ xác minh', view.payment.pendingAmount], ['Còn phải thu toàn đơn', view.payment.remaining],
        ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-200 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold tabular-nums">{money(Number(value))}</dd></div>)}</dl>
        <p className="rounded-md bg-sky-50 p-3 text-sm text-sky-900">{view.payment.depositSatisfied ? 'Đã đủ cọc. Hệ thống tự phân bổ phần hàng đã chốt theo tồn kho.' : view.payment.depositRequired === 0 ? 'Chưa có mức cọc thỏa thuận. Chưa đủ điều kiện giữ hàng.' : `Chưa đủ cọc. Còn thiếu ${money(Math.max(0, view.payment.depositRequired - view.payment.verifiedPaid))}.`} Tiền chờ xác minh chưa được tính đã thu hoặc trừ khỏi số còn phải thu.</p>
        <p className="text-sm">Giữ hàng: <strong>{view.status}</strong> · Cọc: {view.depositStatus} · Phân bổ: {view.allocationStatus ?? '—'}{view.allocationErrorCode && ` · Lỗi: ${view.allocationErrorCode}`}</p>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void reserve(view.reservationRequested ? 'synchronize' : 'requests') }}>
          <ManagementFormField id="reservation-warehouse" label="Mã kho giữ hàng" hint="Mã kho thực tế, gồm chữ in hoa, số, dấu gạch ngang hoặc gạch dưới."><input id="reservation-warehouse" aria-describedby="reservation-warehouse-hint" className={managementFieldClass} required maxLength={50} pattern="[A-Z0-9_-]{1,50}" disabled={blocked || !eligible || (!!view.warehouseCode && view.reservationRequested)} value={view.warehouseCode || warehouse} onChange={(event) => setWarehouse(event.target.value)} /></ManagementFormField>
          <h3 id="reservation-lines" className="font-semibold">Phần hàng yêu cầu giữ</h3>
          <ManagementTable rows={detail.items} rowKey={(item) => item.orderItemId} labelledBy="reservation-lines" emptyMessage="Đơn chưa có dòng hàng." columns={[
            { key: 'product', header: 'Sản phẩm', cell: (item) => <span>{item.productName} · {item.variantName}<span className="block text-xs text-slate-500">{item.sku}</span></span> },
            { key: 'quantity', header: 'Mua', align: 'right', cell: (item) => item.quantity },
            { key: 'request', header: 'Yêu cầu giữ', cell: (item) => view.reservationRequested ? view.lines.find((line) => line.orderItemId === item.orderItemId)?.quantity ?? 0 : <input aria-label={`Số lượng giữ ${item.sku || item.productName}`} className={`${managementFieldClass} min-w-24`} type="number" min="0" max={item.quantity} step="0.01" disabled={blocked || !eligible || !item.variantId} value={quantities[item.orderItemId] ?? '0'} onChange={(event) => setQuantities({ ...quantities, [item.orderItemId]: event.target.value })} /> },
            { key: 'held', header: 'Đang giữ', align: 'right', cell: (item) => view.lineStatuses.find((line) => line.orderItemId === item.orderItemId)?.heldQty ?? 0 },
            { key: 'waiting', header: 'Chờ bổ sung', align: 'right', cell: (item) => view.lineStatuses.find((line) => line.orderItemId === item.orderItemId)?.waitingQty ?? 0 },
          ]} />
          <p className="text-xs text-slate-500">Phạm vi đã chốt không thể đổi tại đây. Giữ hàng không phải quyền xuất kho. Đơn có dòng thiếu SKU biến thể chưa hỗ trợ giữ hàng.</p>
          <button type="submit" className={primaryButton} disabled={busy || (!eligible && !pendingReservation) || reservation.isFetching || (view.reservationRequested && !view.payment.depositSatisfied && !pendingReservation)}>{pendingReservation ? 'Gửi lại yêu cầu giữ hàng' : view.reservationRequested ? 'Đồng bộ bổ sung hàng giữ' : 'Chốt yêu cầu giữ hàng'}</button>
          {view.allocationStatus === 'FAILED' && view.allocationId && <button type="button" className={`${secondaryButton} ml-2`} disabled={blocked || !eligible} onClick={() => void retryAllocation()}>Thử lại tác vụ phân bổ</button>}
          {!eligible && <p className="text-sm text-amber-900">Đơn phải ở trạng thái CONFIRMED/PROCESSING và mọi dòng phải có SKU biến thể hợp lệ để giữ hàng.</p>}
        </form>
        <section aria-labelledby="receipt-history"><h3 id="receipt-history" className="mb-3 font-semibold">Khoản thu của đơn</h3>
          {receipts.isFetching && <p role="status">Đang tải khoản thu...</p>}
          {receipts.error ? <p role="alert" className="text-sm text-rose-800">{normalizeApiError(receipts.error).message}</p> : <ul className="space-y-2">{receipts.currentData?.map((receipt) => <li key={receipt.transactionId} className="rounded-md border border-slate-200 p-3 text-sm"><strong>{money(receipt.amount)}</strong> · {receipt.transactionCode} · {receipt.paymentMethod} · {receipt.status}{receipt.referenceNo && <p className="break-all">Tham chiếu: {receipt.referenceNo}</p>}{receipt.rejectReason && <p>Lý do từ chối: {receipt.rejectReason}</p>}</li>)}</ul>}
          {receipts.currentData?.length === 0 && <p className="text-sm text-slate-500">Chưa có khoản thu.</p>}
        </section>
        <a className={secondaryButton} aria-disabled={blocked} href={blocked ? undefined : `/app/orders/${encodeURIComponent(orderId)}`}>
          Đến thanh toán đơn hàng
        </a>
      </>}
    </div>
  </ManagementDialog>
}
