import { DeliveryProgress } from './DeliveryProgress'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { useAuth, useGetUserAccountQuery } from '../../iam'
import { normalizeApiError } from '../../../shared/api/apiError'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { ManagementPageHeader, ManagementPageShell } from '../../../shared/ui/ManagementPage'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { useDownloadIssueNoteMutation, useGetDeliveryPhotoQuery, useGetDeliveryQuery } from '../api/deliveryApi'
import { canAssignDelivery } from '../types/delivery.types'
import { AssignmentDialog } from './AssignmentDialog'
import { DeliveryActionDialog } from './DeliveryActionDialog'
import { DeliveryBadge, DeliveryPanel } from './DeliveryUi'
import { deliveryButton, deliveryDate, deliveryMoney, deliveryPrimary } from './deliveryPresentation'
import { canManageDeliveries } from './deliveryIssueForm'
import { DeliveryIssueDialog } from './DeliveryIssueDialog'
import { EditDeliveryDialog } from './EditDeliveryDialog'

function AssignedShipperStatus({ id }: { id: string }) {
  const { user } = useAuth()
  const owner = user?.roles.includes('SHOP_OWNER') ?? false
  const account = useGetUserAccountQuery(id, { skip: !owner, refetchOnMountOrArgChange: true, refetchOnFocus: true, pollingInterval: 30000 })
  if (!owner) return <p className="text-xs text-slate-500">Chưa có dữ liệu trạng thái tài khoản shipper từ API giao hàng.</p>
  if (account.error) return <p role="alert" className="text-xs text-amber-800">Không tải được trạng thái tài khoản shipper. <button className={deliveryButton} onClick={() => void account.refetch()}>Thử lại</button></p>
  const status = account.currentData?.status
  return status && status !== 'ACTIVE' ? <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{status === 'LOCKED' ? 'Shipper đã bị khóa tài khoản.' : 'Shipper đang bị hạn chế hoạt động.'} Không thể phân công thêm; cần kiểm tra và đổi shipper nếu phiếu còn cho phép.</p> : null
}

function ProofPhoto({ id, photoId, index }: { id: string; photoId: string; index: number }) {
  const [open, setOpen] = useState(false)
  const { data: url, isLoading, error, refetch } = useGetDeliveryPhotoQuery({ id, photoId })
  if (isLoading) return <p role="status" className="p-4 text-xs text-slate-500">Đang tải ảnh {index + 1}…</p>
  if (error || !url) return <div className="p-3 text-xs text-rose-700"><p role="alert">Không tải được ảnh {index + 1}.</p><button className={deliveryButton} onClick={() => void refetch()}>Thử lại</button></div>
  return <><button className="rounded-md border border-slate-200 p-2 focus-visible:outline-2 focus-visible:outline-sky-600" onClick={() => setOpen(true)} aria-label={`Xem ảnh bằng chứng ${index + 1}`}><img src={url} alt={`Bằng chứng giao hàng ${index + 1}`} className="h-32 w-full object-contain" /></button>{open && <ManagementDialog title={`Ảnh bằng chứng ${index + 1}`} size="wide" onClose={() => setOpen(false)}><img src={url} alt={`Bằng chứng giao hàng ${index + 1} phóng lớn`} className="max-h-[75vh] w-full object-contain p-4" /></ManagementDialog>}</>
}

export function DeliveryDetails({ id }: { id: string }) {
  const { user } = useAuth()
  const accountant = canManageDeliveries(user?.roles ?? [])
  const allowed = accountant || (user?.roles.includes('SHIPPER') ?? false)
  const { currentData: detail, isFetching, error, refetch } = useGetDeliveryQuery(id, { skip: !id || !allowed })
  const [action, setAction] = useState<'start' | 'complete' | 'fail' | 'assignment' | 'reschedule' | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [editing, setEditing] = useState(false)
  const [downloadPdf, { isLoading: downloading }] = useDownloadIssueNoteMutation()
  const [pdfError, setPdfError] = useState('')
  async function downloadIssueNote() {
    setPdfError('')
    try {
      const url = await downloadPdf(id).unwrap()
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `phieu-xuat-kho-${id}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setPdfError(normalizeApiError(error).message) }
  }
  const [issueAction, setIssueAction] = useState<'confirm-issue' | 'cancel-draft' | null>(null)
  const back = accountant ? '/app/deliveries' : '/app/my-deliveries'
  if (!allowed) return <p role="alert">Bạn không có quyền xem chi tiết giao hàng.</p>
  if (isFetching && !detail) return <p role="status" className="animate-pulse p-8 text-center text-sm text-slate-500">Đang tải chi tiết giao hàng…</p>
  if (!detail) return <div className="space-y-4 p-6"><p role="alert" className="text-sm text-rose-700">{error ? normalizeApiError(error).message : 'Không tìm thấy đợt giao.'}</p><button className={deliveryButton} onClick={() => void refetch()}>Thử lại</button> <Link className={deliveryButton} to={back}>Về danh sách</Link></div>
  const row = detail.delivery
  const own = user?.roles.includes('SHIPPER') && row.shipperId === user.id
  return <ManagementPageShell>
    {error && <div role="alert" className="rounded-control border border-aqs-danger-border bg-aqs-danger-soft p-3 text-sm text-aqs-danger">Chưa tải lại được trạng thái: {normalizeApiError(error).message} <button className={deliveryButton} onClick={() => void refetch()}>Thử lại</button></div>}
    <ManagementPageHeader title={row.deliveryCode} breadcrumb="Chi tiết giao hàng" group="Giao hàng" description={`Đợt ${row.batchNo ?? '—'} · Kho ${row.warehouseCode || '—'}`} icon={<Truck className="h-5 w-5" />} actions={<div className="flex flex-wrap items-center gap-2"><DeliveryBadge status={row.deliveryStatus} /><Link to={back} className={deliveryButton}>← Về danh sách giao hàng</Link></div>} />
    <div className="flex flex-wrap gap-2">
      {accountant && row.deliveryStatus === 'DRAFT' && !row.confirmedAt && <button className={deliveryButton} disabled={isFetching} onClick={() => setEditing(true)}>Sửa nháp</button>}
      {row.confirmedAt && !['DRAFT', 'CANCELLED'].includes(row.deliveryStatus) && <button className={deliveryButton} disabled={downloading} onClick={() => void downloadIssueNote()}>{downloading ? 'Đang tạo PDF…' : 'Tải phiếu xuất kho PDF'}</button>}
      {accountant && row.deliveryStatus === 'DRAFT' && <><button className={deliveryPrimary} disabled={isFetching} onClick={() => setIssueAction('confirm-issue')}>Xác nhận xuất kho</button><button className={deliveryButton} disabled={isFetching} onClick={() => setIssueAction('cancel-draft')}>Hủy nháp</button></>}
      {accountant && canAssignDelivery(row) && <button className={deliveryPrimary} onClick={() => setAssigning(true)}>{row.shipperId ? 'Đổi shipper' : 'Phân công shipper'}</button>}
      {accountant && canAssignDelivery(row) && row.deliveryStatus === 'ASSIGNED' && <button className={deliveryButton} onClick={() => setAction('assignment')}>Thu hồi phân công</button>}
      {own && row.deliveryStatus === 'ASSIGNED' && <button className={deliveryPrimary} onClick={() => setAction('start')}>Nhận hàng đi giao</button>}
      {own && ['ASSIGNED', 'IN_TRANSIT'].includes(row.deliveryStatus) && <button className={deliveryButton} onClick={() => setAction('reschedule')}>Chờ giao lại</button>}
      {own && row.deliveryStatus === 'RESCHEDULED' && <><button className={deliveryPrimary} onClick={() => setAction('start')}>Tiếp tục giao hàng</button><button className={`${deliveryButton} text-rose-700`} onClick={() => setAction('fail')}>Kết thúc giao thất bại</button></>}
      {own && row.deliveryStatus === 'RESCHEDULED' && !row.scheduledDate && <button className={deliveryButton} onClick={() => setAction('reschedule')}>Chốt lịch giao lại</button>}
      {own && row.deliveryStatus === 'IN_TRANSIT' && <><button className={deliveryPrimary} onClick={() => setAction('complete')}>Đã giao thành công</button><button className={`${deliveryButton} text-rose-700`} onClick={() => setAction('fail')}>Giao thất bại</button></>}
    </div>
    {pdfError && <p role="alert" className="text-sm text-rose-700">{pdfError}</p>}
    {row.deliveryStatus === 'DRAFT' && <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Phiếu nháp chưa trừ tồn và chưa thể phân công shipper. Xác nhận xuất kho để chuyển sang Chờ phân công.</p>}
    {row.deliveryStatus === 'RESCHEDULED' && <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Đang chờ giao lại. {row.scheduledDate ? `Lịch mới: ${deliveryDate(row.scheduledDate)}.` : 'Chưa chốt ngày giờ mới.'} Tiếp tục trên phiếu này; kế toán có thể đổi shipper. Hàng đã xuất được giữ nguyên, không tạo phiếu hay xuất kho lần nữa.</p>}
    {row.deliveryStatus === 'FAILED' && <section aria-label="Xử lý giao không thành công" className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-semibold">Giao không thành công — chờ xử lý hàng trả</h2><p>Bàn giao hàng về kho để kiểm tra thực tế. Kho xác nhận nhập lại hàng bán được hoặc cách ly hàng hỏng. Khách từ chối nhận cũng xử lý theo luồng này.</p><p>Phiếu này đã xuất kho; báo thất bại không tự tăng tồn, hủy đơn hoặc hoàn tiền.</p></section>}
    {row.deliveryStatus === 'DELIVERED' && row.codRequired && <p className="rounded-md border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">Giao hàng đã hoàn tất. Tiền COD cần được khai báo và bàn giao riêng ở phần Thu &amp; bàn giao COD.</p>}
    <div className="grid gap-4 md:grid-cols-2">
      <DeliveryPanel title="Thông tin người nhận"><dl className="space-y-2 text-sm"><dt className="text-xs text-slate-500">Người nhận</dt><dd className="font-semibold text-slate-900">{row.recipientName || '—'}</dd><dt className="text-xs text-slate-500">Điện thoại</dt><dd>{row.recipientPhone ? <a className="text-sky-700 underline" href={`tel:${row.recipientPhone}`}>{row.recipientPhone}</a> : '—'}</dd><dt className="text-xs text-slate-500">Địa chỉ</dt><dd className="break-words">{row.deliveryAddress || '—'}</dd><dt className="text-xs text-slate-500">COD</dt><dd className="font-semibold tabular-nums">{row.codRequired ? deliveryMoney(row.codAmount) : 'Không thu COD'}</dd></dl></DeliveryPanel>
      <DeliveryPanel title="Thông tin giao hàng"><dl className="space-y-2 text-sm"><dt className="text-xs text-slate-500">Đơn hàng (ID)</dt><dd className="break-all font-mono text-xs">{accountant ? <Link to={`/app/orders/${row.orderId}`} className="text-sky-700 underline">{row.orderId}</Link> : row.orderId}</dd><dt className="text-xs text-slate-500">Shipper</dt><dd>{detail.shipperName?.trim() || (row.shipperId ? 'Đã phân công — chưa có tên shipper' : null) || 'Chưa phân công'}{detail.shipperPhone && ` · ${detail.shipperPhone}`}{row.shipperId && <AssignedShipperStatus id={row.shipperId} />}</dd><dt className="text-xs text-slate-500">Hẹn giao</dt><dd>{deliveryDate(row.scheduledDate)}</dd></dl></DeliveryPanel>
    </div>
    <DeliveryProgress detail={detail} />
    <DeliveryPanel title="Hóa đơn nguồn"><p className="break-all text-sm text-slate-700">{row.salesInvoiceId ? <><span className="text-slate-500">ID hóa đơn: </span><span className="font-mono">{row.salesInvoiceId}</span></> : 'Chưa có thông tin hóa đơn nguồn cho phiếu này.'}</p></DeliveryPanel>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><h2 id="delivery-items-title" className="p-4 text-sm font-semibold">Danh sách hàng ({detail.items.length})</h2><ManagementTable rows={detail.items} rowKey={(r) => r.deliveryItemId} labelledBy="delivery-items-title" emptyMessage="Không có thông tin mặt hàng." columns={[
      { key: 'sku', header: 'SKU', cell: (r) => <span className="font-mono font-bold text-sky-700">{r.sku || '—'}</span> },
      { key: 'product', header: 'Sản phẩm / Biến thể', cellClassName: '!whitespace-normal', cell: (r) => <><strong>{r.productName || '—'}</strong><p>{r.variantName}</p></> },
      { key: 'quantity', header: 'Số lượng', align: 'right', cell: (r) => r.quantity },
      { key: 'serial', header: 'Số serial', cellClassName: '!whitespace-normal', cell: (r) => r.serialNumbers?.join(', ') || '—' },
    ]} /></section>
    <DeliveryPanel title="Ghi chú"><p className="whitespace-pre-wrap break-words text-sm text-slate-700">{row.note || 'Chưa có ghi chú.'}</p></DeliveryPanel>
    <DeliveryPanel title={`Ảnh bằng chứng (${detail.photos.length})`}>{detail.photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{detail.photos.map((p, i) => <ProofPhoto key={p.photoId} id={id} photoId={p.photoId} index={i} />)}</div> : <p className="text-sm text-slate-500">Chưa có ảnh bằng chứng.</p>}</DeliveryPanel>
    {assigning && <AssignmentDialog deliveryIds={[id]} onClose={() => setAssigning(false)} onDone={() => setAssigning(false)} />}
    {editing && <EditDeliveryDialog detail={detail} onClose={() => setEditing(false)} />}
    {action && <DeliveryActionDialog id={id} action={action} resuming={row.deliveryStatus === 'RESCHEDULED'} onClose={() => setAction(null)} />}
    {issueAction && <DeliveryIssueDialog id={id} action={issueAction} onClose={() => setIssueAction(null)} />}
  </ManagementPageShell>
}
