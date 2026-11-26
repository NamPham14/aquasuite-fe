import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, Eye, FileText, Mail, Plus, ReceiptText, Search, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../shared/api/apiError.ts'
import { ManagementDialog, managementFieldClass } from '../../shared/ui/ManagementDialog.tsx'
import { ManagementPageHeader, ManagementPageShell, ManagementPanel, ManagementStatCard, filterControlClass } from '../../shared/ui/ManagementPage.tsx'
import { CodeChip, StatusBadge } from '../../shared/ui/Badge.tsx'
import { SakugaActionButton } from '../../shared/ui/Button.tsx'
import { ActivityLogPanel } from '../../features/audit'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import {
  useApproveOrderModificationRequestMutation,
  useCreateOrderModificationRequestMutation,
  useGetOrderModificationRequestQuery,
  useGetOrderModificationRequestsQuery,
  useRecordOrderModificationTaxResultMutation,
  useRejectOrderModificationRequestMutation,
  useSendOrderModificationResultEmailMutation,
} from '../../features/sales/api/orderModificationRequestApi.ts'
import {
  useGetOrderInvoicesQuery,
  useGetOrderPaymentSummaryQuery,
  useGetSalesOrderByIdQuery,
  useGetSalesOrdersQuery,
} from '../../features/sales/api/salesOrderApi.ts'
import { useGetDeliveriesQuery } from '../../features/fulfillment/api/deliveryApi.ts'
import { deliveryStatuses } from '../../features/fulfillment/types/delivery.types.ts'
import type {
  CreateOrderModificationItemPayload,
  CreateOrderModificationRequestPayload,
  OrderModificationRequestResponse,
  OrderModificationRequestStatus,
  OrderModificationRequestType,
} from '../../features/sales/types/orderModificationRequest.types.ts'

const primaryButton = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex h-10 items-center justify-center gap-1.5 rounded-control border border-aqs-border bg-aqs-surface px-3.5 text-sm font-medium text-aqs-ink transition-colors hover:border-slate-300 hover:bg-aqs-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:cursor-not-allowed disabled:opacity-50'

const TYPE_LABEL: Record<OrderModificationRequestType, string> = {
  FULL_CANCELLATION: 'Hủy toàn bộ đơn',
  ADDRESS_CHANGE: 'Đổi địa chỉ giao hàng',
  ITEM_CHANGE: 'Đổi hàng / giảm dòng',
}

const STATUS_LABEL: Record<OrderModificationRequestStatus, string> = {
  PENDING_REVIEW: 'Chờ xử lý',
  PENDING_CANCEL: 'Chờ hóa đơn / hoàn tiền',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
}

function statusTone(status: OrderModificationRequestStatus) {
  if (status === 'APPROVED') return 'positive' as const
  if (status === 'REJECTED') return 'danger' as const
  return 'warning' as const
}

function statusClass(status: OrderModificationRequestStatus) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-700 ring-rose-200'
  if (status === 'PENDING_CANCEL') return 'bg-orange-50 text-orange-700 ring-orange-200'
  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

function money(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value ?? 0))
}

function dateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN')
}

function shortId(value?: string | null) {
  return value ? `${value.slice(0, 8)}…` : '—'
}

export function OrderModificationRequestsPage() {
  const { requestId } = useParams()
  return requestId ? <OrderModificationRequestDetail requestId={requestId} /> : <OrderModificationRequestList />
}

function OrderModificationRequestList() {
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<'' | OrderModificationRequestType>('')
  const [status, setStatus] = useState<'' | OrderModificationRequestStatus>('')
  const [showCreate, setShowCreate] = useState(false)
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const canCreate = roles.includes('SALES_STAFF') || roles.includes('SHOP_OWNER')
  const requestsQuery = useGetOrderModificationRequestsQuery({ page: 1, size: 100 })
  const ordersQuery = useGetSalesOrdersQuery({ page: 1, size: 100 })
  const orders = useMemo(() => new Map((ordersQuery.data?.items ?? []).map((order) => [order.orderId, order])), [ordersQuery.data])
  const visible = useMemo(() => (requestsQuery.data?.items ?? []).filter((request) => {
    const order = orders.get(request.orderId)
    const query = keyword.trim().toLocaleLowerCase()
    const matchesKeyword = !query || [request.id, request.orderId, order?.orderCode, order?.customerName, order?.customerPhone]
      .some((value) => value?.toLocaleLowerCase().includes(query))
    return matchesKeyword && (!type || request.requestType === type) && (!status || request.requestStatus === status)
  }), [keyword, orders, requestsQuery.data, status, type])
  const stats = useMemo(() => ({
    PENDING_REVIEW: (requestsQuery.data?.items ?? []).filter((request) => request.requestStatus === 'PENDING_REVIEW').length,
    PENDING_CANCEL: (requestsQuery.data?.items ?? []).filter((request) => request.requestStatus === 'PENDING_CANCEL').length,
    APPROVED: (requestsQuery.data?.items ?? []).filter((request) => request.requestStatus === 'APPROVED').length,
    REJECTED: (requestsQuery.data?.items ?? []).filter((request) => request.requestStatus === 'REJECTED').length,
  }), [requestsQuery.data])

  return <ManagementPageShell>
    <ManagementPageHeader
      group="Bán hàng"
      breadcrumb="Yêu cầu đổi / hủy đơn"
      title="Xử lý yêu cầu đổi / hủy đơn hàng"
      description="Duyệt hoặc từ chối yêu cầu thay đổi địa chỉ, đổi hàng và hủy đơn chưa hoàn tất giao hàng."
      actions={
        canCreate ? (
          <SakugaActionButton onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo yêu cầu đổi / hủy đơn
          </SakugaActionButton>
        ) : undefined
      }
    />

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ManagementStatCard label={STATUS_LABEL.PENDING_REVIEW} value={stats.PENDING_REVIEW} tone="warning" active={status === 'PENDING_REVIEW'} onClick={() => setStatus(status === 'PENDING_REVIEW' ? '' : 'PENDING_REVIEW')} />
      <ManagementStatCard label={STATUS_LABEL.PENDING_CANCEL} value={stats.PENDING_CANCEL} tone="accent" active={status === 'PENDING_CANCEL'} onClick={() => setStatus(status === 'PENDING_CANCEL' ? '' : 'PENDING_CANCEL')} />
      <ManagementStatCard label={STATUS_LABEL.APPROVED} value={stats.APPROVED} tone="positive" active={status === 'APPROVED'} onClick={() => setStatus(status === 'APPROVED' ? '' : 'APPROVED')} />
      <ManagementStatCard label={STATUS_LABEL.REJECTED} value={stats.REJECTED} tone="danger" active={status === 'REJECTED'} onClick={() => setStatus(status === 'REJECTED' ? '' : 'REJECTED')} />
    </section>

    <section className="rounded-card border border-aqs-border bg-aqs-surface p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_240px_auto]">
        <label className="relative block"><span className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">Tìm kiếm</span><Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-aqs-ink-faint" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} className={`${filterControlClass} pl-9`} placeholder="Mã yêu cầu, đơn, khách hàng, số điện thoại…" /></label>
        <label><span className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">Loại yêu cầu</span><select value={type} onChange={(event) => setType(event.target.value as typeof type)} className={filterControlClass}><option value="">Tất cả loại yêu cầu</option>{Object.entries(TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className={filterControlClass}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" onClick={() => { setKeyword(''); setType(''); setStatus('') }} className={`${secondaryButton} self-end`}>Đặt lại</button>
      </div>
    </section>

    <ManagementPanel
      headingId="omr-list-heading"
      title="Danh sách yêu cầu đổi / hủy đơn"
      description={`Hiển thị ${visible.length} / ${requestsQuery.data?.totalElements ?? 0} yêu cầu đã tải.`}
      busy={requestsQuery.isFetching}
    >
      {requestsQuery.isError ? <div className="p-5"><ErrorBox error={requestsQuery.error} /></div> : requestsQuery.isLoading ? <p className="p-8 text-center text-sm text-aqs-ink-muted">Đang tải yêu cầu…</p> : <div className="overflow-x-auto"><table className="min-w-[1080px] w-full text-sm"><thead className="border-b border-aqs-border bg-aqs-surface-subtle text-left text-xs font-semibold text-aqs-ink-muted"><tr><th className="px-4 py-3">Mã yêu cầu</th><th className="px-4 py-3">Đơn / khách</th><th className="px-4 py-3">Loại yêu cầu</th><th className="px-4 py-3">Lý do yêu cầu</th><th className="px-4 py-3 text-right">Giá trị đơn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Ngày gửi</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-aqs-border">{visible.map((request) => { const order = orders.get(request.orderId); return <tr key={request.id} className="align-top transition-colors hover:bg-aqs-surface-subtle/60"><td className="px-4 py-3"><CodeChip title={request.id}>{shortId(request.id)}</CodeChip></td><td className="px-4 py-3"><Link to={`/app/orders/${request.orderId}`} className="font-semibold text-aqs-accent hover:underline">{order?.orderCode ?? shortId(request.orderId)}</Link><p className="mt-1 text-xs text-aqs-ink-muted">{order?.customerName ?? shortId(request.customerId)}{order?.customerPhone ? ` · ${order.customerPhone}` : ''}</p>{order?.quotationId && <Link className="mt-1 inline-block text-xs text-aqs-ink-muted hover:text-aqs-accent hover:underline" to={`/app/quotations/${order.quotationId}`}>Từ báo giá {order.quotationCode ?? ''}</Link>}</td><td className="px-4 py-3 font-medium text-aqs-ink">{TYPE_LABEL[request.requestType]}</td><td className="max-w-[260px] px-4 py-3 text-xs leading-5 text-aqs-ink-muted"><span className="line-clamp-3">{request.customerReason}</span></td><td className="px-4 py-3 text-right font-semibold tabular-nums text-aqs-ink">{order ? money(order.totalAmount) : '—'}</td><td className="px-4 py-3"><StatusBadge tone={statusTone(request.requestStatus)}>{STATUS_LABEL[request.requestStatus]}</StatusBadge><p className="mt-1 text-xs text-aqs-ink-muted">Đơn: {order?.orderStatus ?? 'Tra cứu chi tiết'}</p></td><td className="px-4 py-3 text-xs tabular-nums text-aqs-ink-muted">{dateTime(request.createdAt)}</td><td className="px-4 py-3 text-right"><Link className={secondaryButton} to={`/app/order-modification-requests/${request.id}`}><Eye className="h-4 w-4" />Xem chi tiết</Link></td></tr>})}</tbody></table>{!visible.length && <p className="p-10 text-center text-sm text-aqs-ink-muted">Không có yêu cầu nào khớp bộ lọc hiện tại.</p>}</div>}
    </ManagementPanel>
    <ActivityLogPanel operational entityType="ORDER_MODIFICATION_REQUEST" title="Nhật ký hoạt động" description="Các quyết định duyệt, từ chối, ghi kết quả hóa đơn và email kết quả được lưu tự động." emptyMessage="Chưa có hoạt động xử lý yêu cầu đổi / hủy đơn nào được ghi nhận." />
    {showCreate && <CreateRequestDialog onClose={() => setShowCreate(false)} onSuccess={() => setShowCreate(false)} />}
  </ManagementPageShell>
}

function OrderModificationRequestDetail({ requestId }: { requestId: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const requestQuery = useGetOrderModificationRequestQuery(requestId)
  const request = requestQuery.data
  const orderQuery = useGetSalesOrderByIdQuery(request?.orderId ?? '', { skip: !request })
  const invoicesQuery = useGetOrderInvoicesQuery(request?.orderId ?? '', { skip: !request })
  const replacementInvoicesQuery = useGetOrderInvoicesQuery(request?.replacementOrderId ?? '', { skip: !request?.replacementOrderId })
  const paymentsQuery = useGetOrderPaymentSummaryQuery(request?.orderId ?? '', { skip: !request })
  const deliveriesQuery = useGetDeliveriesQuery({ page: 0, size: 20, orderId: request?.orderId ?? '' }, { skip: !request })
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null)
  const [recordTax, setRecordTax] = useState(false)
  const [sendEmail, { isLoading: isSendingEmail }] = useSendOrderModificationResultEmailMutation()
  const roles = user?.roles ?? []
  const isAccountant = roles.includes('ACCOUNTANT')
  const canReview = roles.includes('SALES_STAFF') || roles.includes('SHOP_OWNER')
  const canApprove = roles.includes('SHOP_OWNER') || (roles.includes('SALES_STAFF') && request?.requestType === 'ADDRESS_CHANGE')
  const canEmail = canReview && Boolean(request && ['APPROVED', 'REJECTED'].includes(request.requestStatus))

  if (requestQuery.isLoading) return <main className="mx-auto max-w-[1260px] p-6 text-sm text-slate-500">Đang tải yêu cầu…</main>
  if (requestQuery.isError || !request) return <main className="mx-auto max-w-[1260px] space-y-3 p-6"><ErrorBox error={requestQuery.error} /><button type="button" className={secondaryButton} onClick={() => navigate('/app/order-modification-requests')}><ChevronLeft className="h-4 w-4" />Quay lại danh sách</button></main>
  const order = orderQuery.data
  const invoices = [...(invoicesQuery.data ?? []), ...(replacementInvoicesQuery.data ?? [])]
  const deliveries = deliveriesQuery.data?.content ?? []
  const pendingReview = request.requestStatus === 'PENDING_REVIEW'
  const pendingTax = request.requestStatus === 'PENDING_CANCEL'

  return <main className="mx-auto w-full max-w-[1260px] space-y-4 pb-12">
    <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><button type="button" className={`${secondaryButton} mb-3`} onClick={() => navigate('/app/order-modification-requests')}><ChevronLeft className="h-4 w-4" />Danh sách yêu cầu</button><div className="flex flex-wrap items-start justify-between gap-3"><div><nav className="mb-1 text-xs text-slate-500">Bán hàng <span className="mx-1 text-slate-300">/</span> Yêu cầu đổi / hủy đơn <span className="mx-1 text-slate-300">/</span><span className="font-semibold text-sky-700">Chi tiết</span></nav><h1 className="text-xl font-extrabold text-slate-900">Chi tiết yêu cầu {shortId(request.id)}</h1><p className="mt-1 text-sm text-slate-500">{TYPE_LABEL[request.requestType]} · gửi {dateTime(request.createdAt)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${statusClass(request.requestStatus)}`}>{STATUS_LABEL[request.requestStatus]}</span></div></header>

    <section className="grid gap-4 xl:grid-cols-2">
      <Panel title="Đơn hàng & khách hàng"><dl className="grid gap-3 sm:grid-cols-2"><Info label="Mã đơn" value={order?.orderCode ?? shortId(request.orderId)} link={`/app/orders/${request.orderId}`} /><Info label="Khách hàng" value={order?.customerName ?? shortId(request.customerId)} /><Info label="Trạng thái đơn" value={order?.orderStatus ?? 'Đang tải…'} /><Info label="Tình trạng thanh toán" value={paymentsQuery.data ? `${paymentsQuery.data.paymentStatus} · đã xác minh ${money(paymentsQuery.data.verifiedPaid)}` : 'Đang tải…'} /><Info label="Tổng giá trị đơn" value={order ? money(order.totalAmount) : 'Đang tải…'} /><Info label="Báo giá nguồn" value={order?.quotationCode ?? 'Không có'} link={order?.quotationId ? `/app/quotations/${order.quotationId}` : undefined} /><Info label="Địa chỉ giao hiện tại" value={order?.deliveryAddress ?? '—'} wide /></dl></Panel>
      <Panel title="Nội dung yêu cầu"><dl className="grid gap-3 sm:grid-cols-2"><Info label="Loại yêu cầu" value={TYPE_LABEL[request.requestType]} /><Info label="Người gửi" value={shortId(request.requestedBy)} /><Info label="Lý do" value={request.customerReason} wide /><Info label="Địa chỉ giao đề nghị" value={request.requestedDeliveryAddress ?? 'Không áp dụng / chưa được duyệt'} wide /><Info label="Ghi chú quyết định" value={request.decisionNote ?? 'Chưa có'} wide /><Info label="Chênh lệch sau xử lý" value={request.priceDifference == null ? 'Chưa tính' : money(request.priceDifference)} /><Info label="Đơn thay thế" value={shortId(request.replacementOrderId)} link={request.replacementOrderId ? `/app/orders/${request.replacementOrderId}` : undefined} /></dl>{request.items.length > 0 && <div className="mt-4 overflow-x-auto"><h3 className="mb-2 text-sm font-bold text-slate-800">Dòng hàng yêu cầu thay đổi</h3><table className="min-w-[600px] w-full text-xs"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-2">Thao tác</th><th className="p-2">Biến thể gốc</th><th className="p-2">Biến thể đề nghị</th><th className="p-2 text-right">SL gốc</th><th className="p-2 text-right">SL mới</th></tr></thead><tbody className="divide-y divide-slate-100">{request.items.map((item) => <tr key={item.id}><td className="p-2 font-semibold">{item.changeAction}</td><td className="p-2 font-mono">{shortId(item.originalVariantId)}</td><td className="p-2 font-mono">{shortId(item.requestedVariantId)}</td><td className="p-2 text-right">{item.originalQuantity}</td><td className="p-2 text-right">{item.requestedQuantity ?? '—'}</td></tr>)}</tbody></table></div>}</Panel>
      <Panel title="Hóa đơn cửa hàng"><p className="mb-3 text-xs text-slate-500">Yêu cầu đổi / hủy đơn chỉ khóa tạm thời hoặc chờ kết quả xử lý; việc lập và phát hành hóa đơn vẫn thực hiện tại mục Hóa đơn bán hàng.</p>{invoicesQuery.isLoading ? <p className="text-sm text-slate-500">Đang tải hóa đơn…</p> : invoices.length ? <div className="space-y-2">{invoices.map((invoice) => <div key={invoice.invoiceId} className={`rounded-lg border p-3 ${invoice.invoiceId === request.originalInvoiceId ? 'border-orange-300 bg-orange-50/40' : 'border-slate-200'}`}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-mono text-sm font-bold text-slate-800">{invoice.invoiceCode}</p><p className="mt-1 text-xs text-slate-500">Đợt {invoice.batchNo} · {invoice.status} · {money(invoice.totalAmount)}</p></div><span className="text-xs font-semibold text-slate-600">{invoice.lockedByModificationRequest ? 'Đang khóa chờ xử lý yêu cầu đổi / hủy' : invoice.editable ? 'Có thể chỉnh sửa' : 'Đã khóa'}</span></div></div>)}</div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Đơn chưa có hóa đơn cửa hàng.</p>}</Panel>
      <Panel title="Phiếu xuất kho & giao hàng"><p className="mb-3 text-xs text-slate-500">Danh sách tra cứu theo đơn hàng; luồng xử lý yêu cầu đổi / hủy không tự động hủy hay tạo phiếu giao mới.</p>{deliveriesQuery.isLoading ? <p className="text-sm text-slate-500">Đang tải phiếu giao…</p> : deliveries.length ? <div className="space-y-2">{deliveries.map((delivery) => <Link key={delivery.deliveryId} to={`/app/deliveries/${delivery.deliveryId}`} className="block rounded-lg border border-slate-200 p-3 hover:border-sky-300 hover:bg-sky-50"><div className="flex justify-between gap-3"><span className="font-mono font-bold text-sky-800">{delivery.deliveryCode}</span><span className="text-xs font-semibold text-slate-700">{deliveryStatuses[delivery.deliveryStatus]}</span></div><p className="mt-1 text-xs text-slate-500">Phiếu xuất theo hóa đơn {shortId(delivery.salesInvoiceId)} · {delivery.deliveryAddress}</p></Link>)}</div> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Chưa có phiếu xuất kho hoặc phiếu giao hàng cho đơn này.</p>}</Panel>
    </section>

    <section className="flex flex-wrap justify-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link to={`/app/orders/${request.orderId}`} className={secondaryButton}><ReceiptText className="h-4 w-4" />Mở đơn & hóa đơn</Link>
      {pendingReview && canReview && <><button type="button" onClick={() => setDecision('reject')} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50"><X className="h-4 w-4" />Từ chối</button>{canApprove ? <button type="button" onClick={() => setDecision('approve')} className={primaryButton}><Check className="h-4 w-4" />Duyệt yêu cầu</button> : <span className="self-center text-xs text-slate-500">Đổi hàng hoặc hủy đơn thuộc quyền duyệt của Chủ cửa hàng.</span>}</>}
      {pendingReview && !canReview && <p className="self-center text-xs text-slate-500">Kế toán chỉ ghi nhận kết quả hóa đơn/hoàn tiền sau khi yêu cầu đã được duyệt.</p>}
      {pendingTax && isAccountant && <button type="button" onClick={() => setRecordTax(true)} className={primaryButton}><FileText className="h-4 w-4" />Ghi kết quả hóa đơn</button>}
      {pendingTax && !isAccountant && <p className="self-center text-xs text-orange-700">Đang chờ Kế toán ghi kết quả hóa đơn điều chỉnh/thay thế và hoàn tiền (nếu có).</p>}
      {canEmail && <button type="button" disabled={isSendingEmail} onClick={async () => { try { await sendEmail(request.id).unwrap(); toast.success('Đã tiếp nhận yêu cầu gửi email kết quả.') } catch (error) { toast.error(normalizeApiError(error).message) } }} className={secondaryButton}><Mail className="h-4 w-4" />{isSendingEmail ? 'Đang gửi…' : 'Gửi email kết quả'}</button>}
    </section>
    <ActivityLogPanel entityType="ORDER_MODIFICATION_REQUEST" entityId={request.id} title="Nhật ký hoạt động" description="Lịch sử xử lý yêu cầu đổi / hủy đơn, được ghi nhận tự động sau khi giao dịch nghiệp vụ hoàn tất." />
    {decision && <DecisionDialog request={request} mode={decision} onClose={() => setDecision(null)} onSuccess={() => setDecision(null)} />}
    {recordTax && <TaxResultDialog request={request} invoices={invoices} onClose={() => setRecordTax(false)} onSuccess={() => setRecordTax(false)} />}
  </main>
}

function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2>{children}</section> }
function Info({ label, value, link, wide = false }: { label: string; value: string; link?: string; wide?: boolean }) { return <div className={wide ? 'sm:col-span-2' : ''}><dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-800">{link ? <Link className="font-semibold text-sky-800 hover:underline" to={link}>{value}</Link> : value}</dd></div> }
function ErrorBox({ error }: { error: unknown }) { return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">Không thể tải dữ liệu: {normalizeApiError(error).message}</p> }

function DecisionDialog({ request, mode, onClose, onSuccess }: { request: OrderModificationRequestResponse; mode: 'approve' | 'reject'; onClose: () => void; onSuccess: () => void }) {
  const [note, setNote] = useState('')
  const [address, setAddress] = useState(request.requestedDeliveryAddress ?? '')
  const [replacementOrderId, setReplacementOrderId] = useState(request.replacementOrderId ?? '')
  const [approve, approveState] = useApproveOrderModificationRequestMutation()
  const [reject, rejectState] = useRejectOrderModificationRequestMutation()
  const saving = approveState.isLoading || rejectState.isLoading
  const isApprove = mode === 'approve'
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim()) return
    try {
      if (isApprove) {
        await approve({
          requestId: request.id,
          body: {
            decisionNote: note.trim(),
            requestedDeliveryAddress: request.requestType === 'ADDRESS_CHANGE' ? address.trim() : undefined,
            replacementOrderId: replacementOrderId.trim() || undefined,
          },
        }).unwrap()
      } else {
        await reject({ requestId: request.id, body: { decisionNote: note.trim() } }).unwrap()
      }
      toast.success(isApprove ? 'Đã xử lý yêu cầu.' : 'Đã từ chối yêu cầu.')
      onSuccess()
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    }
  }
  return <ManagementDialog title={isApprove ? 'Duyệt yêu cầu đổi / hủy đơn' : 'Từ chối yêu cầu đổi / hủy đơn'} onClose={onClose} closeDisabled={saving}><form onSubmit={submit} className="space-y-4 p-5"><p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{isApprove ? 'Hệ thống sẽ kiểm tra lại trạng thái đơn, hóa đơn, khoản thu đã xác minh và quyền duyệt trước khi áp dụng.' : 'Đơn hàng không bị thay đổi. Lý do từ chối được lưu vào nhật ký và có thể gửi email cho khách sau đó.'}</p>{request.requestType === 'ADDRESS_CHANGE' && isApprove && <label className="block text-sm font-semibold text-slate-700">Địa chỉ giao hàng mới<textarea required value={address} onChange={(event) => setAddress(event.target.value)} className={managementFieldClass} rows={3} placeholder="Nhập địa chỉ giao hàng được duyệt" /></label>}{request.requestType === 'ITEM_CHANGE' && isApprove && <label className="block text-sm font-semibold text-slate-700">ID đơn thay thế <span className="font-normal text-slate-500">(nếu đã lập đơn bán hàng mới)</span><input value={replacementOrderId} onChange={(event) => setReplacementOrderId(event.target.value)} className={managementFieldClass} placeholder="UUID đơn mới (nếu có)" /></label>}<label className="block text-sm font-semibold text-slate-700">Ghi chú quyết định<textarea required value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} className={managementFieldClass} rows={4} placeholder="Nêu rõ quyết định và hướng xử lý tiếp theo" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondaryButton} onClick={onClose} disabled={saving}>Hủy</button><button type="submit" className={isApprove ? primaryButton : 'inline-flex min-h-9 items-center gap-1.5 rounded-md bg-rose-700 px-3 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-50'} disabled={saving || !note.trim()}>{saving ? 'Đang lưu…' : isApprove ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}</button></div></form></ManagementDialog>
}

function TaxResultDialog({ request, invoices, onClose, onSuccess }: { request: OrderModificationRequestResponse; invoices: { invoiceId: string; invoiceCode: string; status: string }[]; onClose: () => void; onSuccess: () => void }) {
  const [reference, setReference] = useState(request.taxResultReference ?? '')
  const [invoiceId, setInvoiceId] = useState(request.resultingInvoiceId ?? '')
  const [replacementOrderId, setReplacementOrderId] = useState(request.replacementOrderId ?? '')
  const [record, state] = useRecordOrderModificationTaxResultMutation()
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await record({ requestId: request.id, body: { taxResultReference: reference.trim(), resultingInvoiceId: invoiceId.trim(), replacementOrderId: replacementOrderId.trim() || undefined } }).unwrap(); toast.success('Đã ghi nhận kết quả hóa đơn.'); onSuccess() } catch (error) { toast.error(normalizeApiError(error).message) } }
  return <ManagementDialog title="Ghi kết quả hóa đơn điều chỉnh / thay thế" onClose={onClose} closeDisabled={state.isLoading}><form onSubmit={submit} className="space-y-4 p-5"><p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">Chỉ Kế toán thực hiện bước này sau khi thao tác hóa đơn thuế bên ngoài hoàn tất. Nếu hoàn tiền còn chờ xác minh, yêu cầu vẫn giữ trạng thái chờ.</p><label className="block text-sm font-semibold text-slate-700">Mã tra cứu kết quả thuế<input required value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} className={managementFieldClass} placeholder="Mã hóa đơn điều chỉnh/thay thế hoặc mã tra cứu" /></label><label className="block text-sm font-semibold text-slate-700">Hóa đơn cửa hàng kết quả<select value={invoiceId} onChange={(event) => setInvoiceId(event.target.value)} className={managementFieldClass} required><option value="">Chọn hóa đơn cửa hàng</option>{invoices.map((invoice) => <option key={invoice.invoiceId} value={invoice.invoiceId}>{invoice.invoiceCode} · {invoice.status}</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">Nếu hóa đơn thuộc đơn thay thế, nhập UUID ở trường bên dưới và dùng UUID hóa đơn kết quả đã được tạo.</span></label><label className="block text-sm font-semibold text-slate-700">ID đơn thay thế <span className="font-normal text-slate-500">(nếu áp dụng)</span><input value={replacementOrderId} onChange={(event) => setReplacementOrderId(event.target.value)} className={managementFieldClass} placeholder="UUID đơn mới" /></label><div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className={secondaryButton} onClick={onClose} disabled={state.isLoading}>Hủy</button><button type="submit" className={primaryButton} disabled={state.isLoading || !reference.trim() || !invoiceId.trim()}><Send className="h-4 w-4" />{state.isLoading ? 'Đang lưu…' : 'Ghi nhận kết quả'}</button></div></form></ManagementDialog>
}

function CreateRequestDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [orderId, setOrderId] = useState('')
  const [requestType, setRequestType] = useState<OrderModificationRequestType>('ADDRESS_CHANGE')
  const [customerReason, setCustomerReason] = useState('')
  const [requestedDeliveryAddress, setRequestedDeliveryAddress] = useState('')
  const [items, setItems] = useState<CreateOrderModificationItemPayload[]>([])
  const [create, createState] = useCreateOrderModificationRequestMutation()
  const ordersQuery = useGetSalesOrdersQuery({ page: 1, size: 100 })
  const processingOrders = useMemo(() => (ordersQuery.data?.items ?? []).filter((order) => order.orderStatus === 'PROCESSING'), [ordersQuery.data])
  const selectedOrderQuery = useGetSalesOrderByIdQuery(orderId, { skip: !orderId || requestType !== 'ITEM_CHANGE' })
  const orderItems = selectedOrderQuery.data?.items ?? []

  function addItem() { setItems((prev) => [...prev, { orderItemId: '', changeAction: 'REDUCE', requestedQuantity: undefined, requestedVariantId: undefined }]) }
  function removeItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)) }
  function updateItem(index: number, patch: Partial<CreateOrderModificationItemPayload>) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...patch } : item))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!orderId || !customerReason.trim()) return
    const payload: CreateOrderModificationRequestPayload = {
      orderId,
      requestType,
      customerReason: customerReason.trim(),
      requestedDeliveryAddress: requestType === 'ADDRESS_CHANGE' ? requestedDeliveryAddress.trim() || undefined : undefined,
      items: requestType === 'ITEM_CHANGE' ? items.filter((item) => item.orderItemId) : undefined,
    }
    try {
      await create(payload).unwrap()
      toast.success('Đã tạo yêu cầu đổi / hủy đơn.')
      onSuccess()
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    }
  }

  return <ManagementDialog title="Tạo yêu cầu đổi / hủy đơn" onClose={onClose} closeDisabled={createState.isLoading} size="wide">
    <form onSubmit={submit} className="space-y-4 p-5">
      <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">Tiếp nhận yêu cầu từ khách hoặc nhà thầu. Hệ thống sẽ chuyển phiếu cho quản lý duyệt.</p>
      <label className="block text-sm font-semibold text-slate-700">Đơn hàng (trạng thái PROCESSING) *
        <select required value={orderId} onChange={(event) => { setOrderId(event.target.value); setItems([]) }} className={managementFieldClass}>
          <option value="">Chọn đơn hàng đang xử lý…</option>
          {processingOrders.map((order) => <option key={order.orderId} value={order.orderId}>{order.orderCode} · {order.customerName}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold text-slate-700">Loại yêu cầu *
        <select value={requestType} onChange={(event) => { setRequestType(event.target.value as OrderModificationRequestType); setItems([]) }} className={managementFieldClass}>
          <option value="ADDRESS_CHANGE">Đổi địa chỉ giao hàng</option>
          <option value="FULL_CANCELLATION">Hủy toàn bộ đơn</option>
          <option value="ITEM_CHANGE">Đổi hàng / giảm dòng</option>
        </select>
      </label>
      {requestType === 'ADDRESS_CHANGE' && <label className="block text-sm font-semibold text-slate-700">Địa chỉ giao mới *
        <input required value={requestedDeliveryAddress} onChange={(event) => setRequestedDeliveryAddress(event.target.value)} className={managementFieldClass} placeholder="Địa chỉ giao hàng mới của khách" />
      </label>}
      {requestType === 'ITEM_CHANGE' && orderId && <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Dòng hàng thay đổi</span>
          <button type="button" className={secondaryButton} onClick={addItem}><Plus className="h-3 w-3" />Thêm dòng</button>
        </div>
        {items.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
          <label className="text-xs font-semibold text-slate-700">Dòng hàng *
            <select required value={item.orderItemId} onChange={(event) => updateItem(index, { orderItemId: event.target.value })} className={managementFieldClass}>
              <option value="">Chọn dòng hàng…</option>
              {orderItems.map((oi: { orderItemId: string; variantName?: string; variantCode?: string }) => <option key={oi.orderItemId} value={oi.orderItemId}>{oi.variantName ?? oi.variantCode ?? oi.orderItemId}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">Thao tác *
            <select value={item.changeAction} onChange={(event) => updateItem(index, { changeAction: event.target.value as 'REDUCE' | 'REMOVE' | 'SWAP' })} className={managementFieldClass}>
              <option value="REDUCE">Giảm số lượng</option>
              <option value="REMOVE">Bỏ dòng hàng</option>
              <option value="SWAP">Đổi sang SKU khác</option>
            </select>
          </label>
          {item.changeAction === 'REDUCE' && <label className="text-xs font-semibold text-slate-700">Số lượng mới
            <input type="number" min="0.001" step="0.001" value={item.requestedQuantity ?? ''} onChange={(event) => updateItem(index, { requestedQuantity: Number(event.target.value) || undefined })} className={managementFieldClass} placeholder="SL mới" />
          </label>}
          {item.changeAction === 'SWAP' && <label className="text-xs font-semibold text-slate-700">Mã biến thể thay thế
            <input value={item.requestedVariantId ?? ''} onChange={(event) => updateItem(index, { requestedVariantId: event.target.value || undefined })} className={managementFieldClass} placeholder="Mã UUID biến thể mới" />
          </label>}
          <div className="flex items-end"><button type="button" className="inline-flex h-9 items-center gap-1 rounded-md border border-rose-300 bg-white px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" onClick={() => removeItem(index)}><X className="h-3 w-3" />Xóa</button></div>
        </div>)}
      </div>}
      <label className="block text-sm font-semibold text-slate-700">Lý do từ khách hàng *
        <textarea required maxLength={2000} value={customerReason} onChange={(event) => setCustomerReason(event.target.value)} className={`${managementFieldClass} min-h-24`} placeholder="Ghi rõ lý do khách hoặc nhà thầu yêu cầu thay đổi" />
      </label>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={secondaryButton} onClick={onClose} disabled={createState.isLoading}>Hủy</button>
        <button type="submit" className={primaryButton} disabled={createState.isLoading || !orderId || !customerReason.trim()}>{createState.isLoading ? 'Đang tạo…' : 'Tạo yêu cầu'}</button>
      </div>
    </form>
  </ManagementDialog>
}
