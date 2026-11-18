import { useState } from 'react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useGetDeliveryCandidatesQuery, useGetDeliveryInvoicesQuery } from '../api/deliveryIssueApi'
import type { DeliveryDetail } from '../types/delivery.types'
import { CreateDeliveryForm } from './CreateDeliveryDialog'
import { deliveryButton } from './deliveryPresentation'

export function EditDeliveryDialog({ detail, onClose }: { detail: DeliveryDetail; onClose: () => void }) {
  // Keep the original draft snapshot during invalidation/refetch and uncertain retries.
  const [original] = useState(detail)
  const [blocked, setBlocked] = useState(false)
  const source = original.delivery
  const invoices = useGetDeliveryInvoicesQuery(source.orderId, { skip: !!source.salesInvoiceId, refetchOnMountOrArgChange: true })
  const legacyInvoices = invoices.currentData?.filter(invoice => invoice.orderId === source.orderId && invoice.status === 'ISSUED') ?? []
  const invoiceId = source.salesInvoiceId || (legacyInvoices.length === 1 ? legacyInvoices[0].invoiceId : '')
  const candidates = useGetDeliveryCandidatesQuery(invoiceId, { skip: !invoiceId, refetchOnMountOrArgChange: true })
  const matches = candidates.currentData?.salesInvoiceId === invoiceId && candidates.currentData?.orderId === source.orderId
  return <ManagementDialog title="Sửa đợt giao nháp" size="wide" onClose={onClose} closeDisabled={blocked}>
    {!invoiceId && !invoices.isFetching && <p role="alert" className="p-5 text-sm text-amber-900">Chưa xác định được duy nhất một hóa đơn nguồn. Cần đối chiếu nguồn hóa đơn trước khi sửa.</p>}
    {(invoices.isFetching || (candidates.isFetching && !candidates.currentData)) && <p role="status" className="p-5 text-sm text-slate-500">Đang tải dữ liệu chỉnh sửa…</p>}
    {invoices.error && <div className="p-5 text-sm text-rose-700"><p role="alert">{normalizeApiError(invoices.error).message}</p><button className={deliveryButton} onClick={() => void invoices.refetch()}>Tải lại hóa đơn nguồn</button></div>}
    {source.warehouseCode !== 'WH_MAIN' && <p role="alert" className="p-5 text-sm text-amber-900">Chưa hỗ trợ chỉnh sửa phiếu thuộc kho này.</p>}
    {candidates.error && <div className="space-y-2 p-5 text-sm text-rose-700"><p role="alert">{normalizeApiError(candidates.error).message}</p><button className={deliveryButton} disabled={blocked} onClick={() => void candidates.refetch()}>Thử lại</button></div>}
    {candidates.currentData && !matches && <p role="alert" className="p-5 text-sm text-rose-700">Hóa đơn nguồn không khớp phiếu giao. Không thể sửa.</p>}
    {candidates.currentData && matches && source.warehouseCode === 'WH_MAIN' && <CreateDeliveryForm candidates={candidates.currentData} draft={original} stale={candidates.isFetching || candidates.isError} onClose={onClose} onBlocked={setBlocked} />}
  </ManagementDialog>
}
