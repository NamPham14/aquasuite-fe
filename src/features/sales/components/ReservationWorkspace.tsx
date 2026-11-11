import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { useAuth } from '../../iam'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useReservationOrderQuery, useReservationQuery, useReservationReceiptsQuery, useSubmitReservationMutation, useRetryReservationMutation } from '../api/reservationApi'
import { useReservationHistoryQuery } from '../api/reservationManagementApi'
import type { ReservationOrder, ReservationRequest } from '../types/reservation.types'
import { money, primaryButton, secondaryButton } from '../lib/deposit'
import { reservationLabel, reservationProduct } from '../lib/reservationPresentation'
import { ReservationHistoryContent } from './ReservationHistoryPanel'

function uncertain(error: unknown) {
  const status = normalizeApiError(error).status
  return typeof status !== 'number' || status >= 500 || status === 408
}

export function ReservationWorkspace({ orderId, embedded = false, initialOrder, onBlockedChange }: {
  orderId: string; embedded?: boolean; initialOrder?: ReservationOrder; onBlockedChange?: (blocked: boolean) => void
}) {
  const { user } = useAuth()
  const allowed = (user?.roles ?? []).some((role) => ['SALES_STAFF', 'SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(role))
  const order = useReservationOrderQuery(orderId, { skip: !allowed || !!initialOrder, refetchOnMountOrArgChange: true })
  const canReadReservation = allowed && (user?.roles ?? []).some((role) => ['SALES_STAFF', 'SHOP_OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) && (!initialOrder || ['CONFIRMED', 'PROCESSING'].includes(initialOrder.orderStatus))
  const reservation = useReservationQuery(orderId, { skip: !canReadReservation, refetchOnMountOrArgChange: true })
  const history = useReservationHistoryQuery(orderId, { skip: !allowed, refetchOnMountOrArgChange: true })
  const [showMoney, setShowMoney] = useState(false)
  const receipts = useReservationReceiptsQuery(orderId, { skip: !allowed || embedded || !showMoney, refetchOnMountOrArgChange: true })
  const [submit, submitting] = useSubmitReservationMutation()
  const [retry, retrying] = useRetryReservationMutation()
  const [tab, setTab] = useState<'stock' | 'history'>('stock')
  const [selecting, setSelecting] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [releaseBusy, setReleaseBusy] = useState(false)
  const [pendingReservation, setPendingReservation] = useState<{ action: 'requests' | 'synchronize'; body: ReservationRequest } | null>(null)
  const lock = useRef(false)
  const id = useId()
  const stockTab = useRef<HTMLButtonElement>(null)
  const historyTab = useRef<HTMLButtonElement>(null)
  const view = canReadReservation ? reservation.currentData : undefined
  const detail = initialOrder ?? order.currentData
  const busy = submitting.isLoading || retrying.isLoading
  const blocked = busy || releaseBusy || pendingReservation !== null
  const eligible = !!detail && ['CONFIRMED', 'PROCESSING'].includes(detail.orderStatus) && detail.items.length > 0 && detail.items.every((item) => item.variantId)
  const decisions = history.currentData?.decisions ?? []
  const pendingCount = decisions.filter((decision) => decision.releaseStatus === 'PENDING_RELEASE').length
  const changedOrder = decisions.some((decision) => ['FULL_CANCELLATION', 'ITEM_CHANGE'].includes(decision.type) && ['APPROVED', 'PENDING_CANCEL'].includes(decision.status))
  const refresh = () => {
    if (canReadReservation) void reservation.refetch()
    void history.refetch()
    if (!initialOrder) void order.refetch()
    if (!embedded && showMoney) void receipts.refetch()
  }

  function changeTab(next: 'stock' | 'history', focus = false) {
    if (blocked) return
    setTab(next)
    if (focus) (next === 'stock' ? stockTab : historyTab).current?.focus()
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    changeTab(event.key === 'Home' ? 'stock' : event.key === 'End' ? 'history' : tab === 'stock' ? 'history' : 'stock', true)
  }
  async function reserve(action: 'requests' | 'synchronize') {
    if (lock.current || releaseBusy || !detail || !view || (!pendingReservation && (!eligible || changedOrder || history.isFetching || history.isError || reservation.isFetching || (view.reservationRequested && !view.payment.depositSatisfied)))) return
    const lines = view.reservationRequested ? view.lines : detail.items.filter((item) => Number(quantities[item.orderItemId]) > 0).map((item) => ({ orderItemId: item.orderItemId, quantity: Number(quantities[item.orderItemId]) }))
    const warehouseCode = view.warehouseCode || 'WH_MAIN'
    if (!pendingReservation && (!/^[A-Z0-9_-]{1,50}$/.test(warehouseCode) || !lines.length || lines.length > 200 || lines.some((line) => !Number.isFinite(line.quantity) || line.quantity < 0.01 || line.quantity > 9999999999.99 || Math.abs(line.quantity * 100 - Math.round(line.quantity * 100)) > 0.0001 || line.quantity > (detail.items.find((item) => item.orderItemId === line.orderItemId)?.quantity ?? 0)))) {
      setError('Nhập mã kho hợp lệ và chọn ít nhất một dòng, số giữ từ 0,01 đến số lượng mua, tối đa 2 chữ số thập phân.'); return
    }
    const request = pendingReservation ?? { action, body: { requestId: crypto.randomUUID(), warehouseCode, lines } }
    lock.current = true; setError(''); setNotice(''); setPendingReservation(request); onBlockedChange?.(true)
    try {
      await submit({ orderId, ...request }).unwrap()
      setPendingReservation(null); onBlockedChange?.(false); setNotice('Đã cập nhật yêu cầu giữ hàng.'); refresh()
    } catch (failure) {
      if (!uncertain(failure)) { setPendingReservation(null); onBlockedChange?.(false) }
      setError(normalizeApiError(failure).message)
    } finally { lock.current = false }
  }
  async function retryAllocation() {
    if (lock.current || !view?.allocationId || blocked || !eligible || changedOrder || history.isFetching || history.isError) return
    lock.current = true; setError(''); setNotice(''); onBlockedChange?.(true)
    try { await retry({ orderId, allocationId: view.allocationId }).unwrap(); setNotice('Đã thử lại phân bổ.'); refresh() }
    catch (failure) { setError(normalizeApiError(failure).message) }
    finally { lock.current = false; onBlockedChange?.(false) }
  }
  if (!allowed) return null
  const loadError = (!initialOrder && order.error) || (canReadReservation && reservation.error)
  const stocks = history.currentData?.reservations ?? []
  const commandDisabled = busy || releaseBusy || (!pendingReservation && (!eligible || changedOrder || reservation.isFetching || history.isFetching || history.isError || !!loadError || (view?.reservationRequested && !view.payment.depositSatisfied)))
  return <section aria-label="Cọc và hàng giữ" className="overflow-hidden rounded-lg border border-slate-200 bg-white text-sm leading-relaxed text-slate-900">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
      <div><h2 className="font-semibold">{embedded ? 'Hàng giữ của đơn' : `Cọc & hàng giữ · ${detail?.orderCode ?? orderId}`}</h2>
        {!embedded && <p className="mt-1 text-slate-600">{detail?.customerName || 'Đang tải khách hàng...'} · Kho: {view?.warehouseCode || 'Chưa chốt'}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{view && <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${view.payment.depositSatisfied ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{view.payment.depositSatisfied ? 'Đã đủ cọc' : 'Chưa đủ cọc'}</span>}
        <button type="button" className={secondaryButton} disabled={blocked} onClick={refresh}>Tải lại</button>
      </div>
    </div>
    {(order.isFetching || reservation.isFetching) && <p role="status" className="px-4 py-3 text-slate-600">Đang cập nhật thông tin...</p>}
    {loadError && <p role="alert" className="p-4 text-rose-800">{normalizeApiError(loadError).message}</p>}
    {!embedded && view && !loadError && <div className="space-y-3 p-4 sm:p-5">
      <dl className="grid gap-3 sm:grid-cols-3 sm:gap-4">{[['Cọc thỏa thuận', view.payment.depositRequired], ['Đã xác minh cho đơn', view.payment.verifiedPaid], ['Còn thiếu cọc', Math.max(0, view.payment.depositRequired - view.payment.verifiedPaid)]].map(([label, amount]) => <div key={label} className="flex min-w-0 items-baseline justify-between gap-3 border-l-2 border-slate-200 pl-3 sm:block"><dt className="text-slate-600">{label}</dt><dd className="mt-0 shrink-0 break-words font-semibold tabular-nums sm:mt-1">{money(Number(amount))}</dd></div>)}</dl>
      {view.payment.pendingAmount > 0 && <p className="text-amber-900">{money(view.payment.pendingAmount)} đang chờ xác minh, chưa tính vào số đã xác minh.</p>}
      <details onToggle={(event) => setShowMoney(event.currentTarget.open)}>
        <summary className="cursor-pointer font-medium text-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600">Chi tiết tiền cọc</summary>
        <div className="mt-3 space-y-3"><dl className="grid gap-3 sm:grid-cols-3">{[['Tổng đơn', view.payment.totalAmount], ['Còn phải thu toàn đơn', view.payment.remaining], ['Giá trị phần hàng yêu cầu giữ (tham khảo)', view.reservationValue]].map(([label, amount]) => <div key={label}><dt className="text-slate-600">{label}</dt><dd className="mt-1 font-semibold">{money(Number(amount))}</dd></div>)}</dl>
          <p className="text-slate-600">Giá trị phần hàng yêu cầu giữ không phải tiền cọc hay tiền đã thu.</p>
          <h3 className="font-semibold">Khoản thu của đơn</h3>
          {receipts.isFetching ? <p role="status">Đang tải khoản thu...</p> : receipts.error ? <p role="alert" className="text-rose-800">{normalizeApiError(receipts.error).message} <button type="button" className={secondaryButton} onClick={() => void receipts.refetch()}>Thử lại</button></p> : <ul className="divide-y divide-slate-200">{receipts.currentData?.map((receipt) => <li key={receipt.transactionId} className="py-3"><p className="font-medium">{money(receipt.amount)} · {receipt.transactionCode}</p><p className="text-slate-600">{reservationLabel(receipt.paymentMethod)} · {receipt.status === 'PENDING' ? 'Chờ xác minh' : reservationLabel(receipt.status)}</p>{receipt.referenceNo && <p className="break-words [overflow-wrap:anywhere]">Tham chiếu: {receipt.referenceNo}</p>}{receipt.rejectReason && <p className="text-rose-800">{receipt.rejectReason}</p>}</li>)}</ul>}
          {receipts.currentData?.length === 0 && <p className="text-slate-600">Chưa có khoản thu.</p>}
        </div>
      </details>
    </div>}
    <div role="tablist" aria-label="Nội dung hàng giữ" className="flex gap-5 overflow-x-auto border-y border-slate-200 px-4 sm:px-5">
      {(['stock', 'history'] as const).map((name) => <button key={name} ref={name === 'stock' ? stockTab : historyTab} id={`${id}-${name}-tab`} role="tab" type="button" aria-selected={tab === name} aria-controls={`${id}-${name}-panel`} tabIndex={tab === name ? 0 : -1} disabled={blocked} onKeyDown={tabKey} onClick={() => changeTab(name)} className={`min-h-12 shrink-0 border-b-2 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50 ${tab === name ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-600'}`}>{name === 'stock' ? 'Hàng giữ' : 'Lịch sử & giải phóng'}{name === 'history' && pendingCount > 0 && <span className="mt-1 block rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-900 sm:ml-2 sm:mt-0 sm:inline-block">{pendingCount} chờ giải phóng</span>}</button>)}
    </div>
    <div id={`${id}-stock-panel`} role="tabpanel" aria-labelledby={`${id}-stock-tab`} hidden={tab !== 'stock'} className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id={`${id}-stocks`} className="font-semibold">Hàng đang được giữ cho đơn</h3><p className="mt-1 text-slate-600">Số còn giữ, đã xuất và đã giải phóng của từng sản phẩm.</p></div>{history.currentData && !history.isError && <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{stocks.filter((row) => row.heldQty > 0).length} dòng còn giữ</span>}</div>
      {!canReadReservation && <p className="text-slate-600">Bạn có thể xem hàng giữ và lịch sử tại đây. Việc tạo hoặc bổ sung yêu cầu giữ hàng không áp dụng cho vai trò hoặc trạng thái đơn hiện tại.</p>}
      {history.isFetching ? <p role="status">Đang tải hàng giữ...</p> : history.error ? <p role="alert" className="text-rose-800">{normalizeApiError(history.error).message} <button type="button" className={secondaryButton} onClick={() => void history.refetch()}>Thử lại</button></p> : <ManagementTable rows={stocks} rowKey={(row) => row.reservationId} labelledBy={`${id}-stocks`} emptyMessage={view?.reservationRequested ? 'Chưa có hàng được phân bổ cho yêu cầu này.' : 'Đơn chưa có hàng giữ.'} columns={[
        { key: 'product', header: 'Sản phẩm / SKU', cell: (row) => { const product = reservationProduct(detail?.items ?? [], row.orderItemId, row.variantId); return <div className="w-48 whitespace-normal break-words"><p className="font-semibold text-slate-900">{product?.productName ?? 'Dòng hàng không còn trong đơn'}</p><p className="mt-1 text-slate-600">{product ? `${product.sku || 'Chưa có SKU'}${product.variantName ? ` · ${product.variantName}` : ''}` : 'Xem mã tham chiếu trong phạm vi ban đầu'}</p></div> } },
        { key: 'warehouse', header: 'Kho', cell: (row) => row.warehouseCode },
        { key: 'requested', header: 'Yêu cầu ban đầu', align: 'right', cell: (row) => row.requestedQty },
        { key: 'held', header: 'Còn giữ', align: 'right', cellClassName: 'font-semibold tabular-nums text-slate-950', cell: (row) => row.heldQty },
        { key: 'consumed', header: 'Đã xuất', align: 'right', cell: (row) => row.consumedQty },
        { key: 'released', header: 'Đã giải phóng', align: 'right', cell: (row) => row.releasedQty },
      ]} />}
      {pendingCount > 0 && <div className="space-y-2 border-l-2 border-amber-500 bg-amber-50 p-3 text-amber-950"><p className="font-medium">Có {pendingCount} quyết định đang chờ giải phóng.</p><button type="button" className={secondaryButton} disabled={blocked} onClick={() => changeTab('history', true)}>Xem quyết định cần xử lý</button></div>}
      {error && <p role="alert" className="text-rose-800">{error}</p>}
      {notice && <p role="status" className="text-emerald-800">{notice}</p>}
      {pendingReservation && !busy && <p role="alert" className="rounded-md bg-amber-50 p-3 text-amber-900">Chưa xác định kết quả. Giữ nguyên yêu cầu và mã chống trùng; bấm gửi lại trước khi đóng. Không tải lại trang.</p>}
      {view && detail && !loadError && <>
        {!view.payment.depositSatisfied && <p className="text-amber-900">{view.payment.depositRequired === 0 ? 'Chưa có mức cọc thỏa thuận.' : 'Chưa đủ cọc đã xác minh.'} Chưa đủ điều kiện phân bổ hàng giữ.</p>}
        {changedOrder && <p className="text-amber-900">Đơn có thay đổi hủy/giảm đã duyệt hoặc đang chờ hoàn tất. Cần đối chiếu phạm vi giữ trước khi giữ thêm hàng theo yêu cầu cũ.</p>}
        {!view.reservationRequested && !selecting && <div className="space-y-3"><p className="text-slate-600">Đơn chưa có yêu cầu giữ hàng.</p><button type="button" className={primaryButton} disabled={!eligible || blocked || changedOrder || history.isFetching || history.isError} onClick={() => setSelecting(true)}>Chọn hàng cần giữ</button></div>}
        {(view.reservationRequested || selecting) && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void reserve(view.reservationRequested ? 'synchronize' : 'requests') }}>
          {!view.reservationRequested && <>
            <h3 id={`${id}-selection`} className="font-semibold">Chọn phần hàng cần giữ</h3>
            <ManagementTable rows={detail.items} rowKey={(item) => item.orderItemId} labelledBy={`${id}-selection`} emptyMessage="Đơn chưa có dòng hàng." columns={[
              { key: 'product', header: 'Sản phẩm / SKU', cell: (item) => <div className="w-48 whitespace-normal break-words"><p className="font-semibold">{item.productName}</p><p>{item.sku} · {item.variantName}</p></div> },
              { key: 'quantity', header: 'Số lượng mua', align: 'right', cell: (item) => item.quantity },
              { key: 'request', header: 'Số lượng yêu cầu giữ', cell: (item) => <input aria-label={`Số lượng giữ ${item.sku || item.productName}`} className={`${managementFieldClass} min-w-24`} type="number" min="0" max={item.quantity} step="0.01" disabled={blocked || !eligible || !item.variantId} value={quantities[item.orderItemId] ?? '0'} onChange={(event) => setQuantities({ ...quantities, [item.orderItemId]: event.target.value })} /> },
            ]} />
          </>}
          <div className="flex flex-wrap gap-2"><button type="submit" className={primaryButton} disabled={commandDisabled}>{pendingReservation ? 'Gửi lại yêu cầu giữ hàng' : view.reservationRequested ? 'Kiểm tra và giữ thêm hàng' : 'Chốt yêu cầu giữ hàng'}</button>
            {!view.reservationRequested && <button type="button" className={secondaryButton} disabled={blocked} onClick={() => setSelecting(false)}>Hủy chọn hàng</button>}
          </div>
        </form>}
        {view.allocationStatus === 'FAILED' && view.allocationId && <div className="space-y-2 rounded-md bg-rose-50 p-3 text-rose-900"><p>Phân bổ hàng chưa thành công{view.allocationErrorCode ? ` (${view.allocationErrorCode})` : ''}.</p><button type="button" className={secondaryButton} disabled={blocked || !eligible || changedOrder || history.isFetching || history.isError} onClick={() => void retryAllocation()}>Thử lại tác vụ phân bổ</button></div>}
        {!eligible && <p className="text-amber-900">Đơn phải đã xác nhận/đang xử lý và mọi dòng phải có SKU biến thể hợp lệ để tạo hoặc bổ sung hàng giữ.</p>}
        <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer font-medium text-sky-800">Phạm vi yêu cầu ban đầu và mã tham chiếu</summary><div className="mt-3 space-y-3"><p className="text-slate-600">Yêu cầu và chờ hàng ban đầu là thông tin lịch sử, không xác định số thiếu hiện tại sau hủy/giảm. Giữ hàng không phải quyền xuất kho.</p><p>Kho: <strong>{view.warehouseCode || 'Chưa chốt'}</strong> · Phân bổ: <strong>{reservationLabel(view.allocationStatus)}</strong></p>
          <ul className="space-y-2 text-xs">{stocks.map((row) => <li key={row.reservationId} className="break-words [overflow-wrap:anywhere]">Dòng đơn: {row.orderItemId} · Biến thể: {row.variantId} · Yêu cầu ban đầu: {row.requestedQty} · Chờ hàng ban đầu: {row.waitingQty}</li>)}</ul>
          {stocks.length === 0 && <ul className="space-y-2 text-xs">{view.lines.map((line) => <li key={line.orderItemId} className="break-words [overflow-wrap:anywhere]">{detail.items.find((item) => item.orderItemId === line.orderItemId)?.productName || line.orderItemId}: {line.quantity}</li>)}</ul>}
        </div></details>
        {!embedded && <a className={secondaryButton} aria-disabled={blocked} href={blocked ? undefined : `/app/orders/${encodeURIComponent(orderId)}`}>Đến thanh toán đơn hàng</a>}
      </>}
    </div>
    <div id={`${id}-history-panel`} role="tabpanel" aria-labelledby={`${id}-history-tab`} hidden={tab !== 'history'} className="p-4 sm:p-5">
      <ReservationHistoryContent orderId={orderId} view={history.currentData} loading={history.isFetching} loadError={history.error} items={detail?.items ?? []} onReload={() => void history.refetch()} onReleased={refresh} disabled={busy || pendingReservation !== null} onBusyChange={(value) => { setReleaseBusy(value); onBlockedChange?.(value) }} />
    </div>
  </section>
}
