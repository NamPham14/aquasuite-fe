import { useState } from 'react'
import { Check, Eye, ShieldCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { type CreditProfileRequest, type CreditProfileRequestDetail, type CreditProfileRequestStatus, useApproveCreditProfileRequestMutation, useGetCreditProfileRequestsQuery, useLazyGetCreditProfileRequestDetailQuery, useRejectCreditProfileRequestMutation } from '../../features/finance'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { normalizeApiError } from '../../shared/api/apiError.ts'
import { ManagementDialog, managementFieldClass } from '../../shared/ui/ManagementDialog.tsx'
import { ManagementPageHeader } from '../../shared/ui/ManagementPage.tsx'

const secondaryButton = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
const primaryButton = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-sky-700 px-3 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50'
const money = (value: number) => `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} ₫`
const time = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
const label = (status: CreditProfileRequestStatus) => ({ PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' } as const)[status]
const color = (status: CreditProfileRequestStatus) => status === 'PENDING' ? 'bg-amber-50 text-amber-900' : status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'

/** Owner-only UI; the CRM API remains the authorization authority. */
export function CreditProfileApprovalsPage() {
  const { user } = useAuth()
  const isOwner = user?.roles.some((role) => ['SHOP_OWNER', 'ROLE_SHOP_OWNER'].includes(role.toUpperCase())) ?? false
  const [status, setStatus] = useState<CreditProfileRequestStatus>('PENDING')
  const [selected, setSelected] = useState<CreditProfileRequestDetail | null>(null)
  const list = useGetCreditProfileRequestsQuery({ status, page: 0, size: 50 }, { skip: !isOwner })
  const [loadDetail, detailState] = useLazyGetCreditProfileRequestDetailQuery()
  const [approve, approveState] = useApproveCreditProfileRequestMutation()
  const [reject, rejectState] = useRejectCreditProfileRequestMutation()

  if (!isOwner) return <div className="mx-auto max-w-lg rounded-lg border border-rose-200 bg-rose-50 p-6 text-center"><h1 className="font-semibold text-rose-900">Không có quyền truy cập</h1><p className="mt-1 text-sm text-rose-800">Chỉ Chủ cửa hàng được duyệt hạn mức tín dụng.</p><Link to="/app/customer-debts" className={`${secondaryButton} mt-4`}>Quay lại công nợ</Link></div>

  async function view(row: CreditProfileRequest) { try { setSelected(await loadDetail(row.requestId).unwrap()) } catch (error) { toast.error(normalizeApiError(error).message) } }
  async function decide(decision: 'approve' | 'reject', reviewNote: string) {
    if (!selected) return
    if (decision === 'reject' && !reviewNote.trim()) { toast.error('Cần nhập lý do từ chối.'); return }
    try {
      if (decision === 'approve') await approve({ requestId: selected.requestId, reviewNote: reviewNote.trim() || undefined }).unwrap()
      else await reject({ requestId: selected.requestId, reviewNote: reviewNote.trim() }).unwrap()
      toast.success(decision === 'approve' ? 'Đã duyệt hạn mức tín dụng.' : 'Đã từ chối yêu cầu hạn mức.')
      setSelected(null)
    } catch (error) { toast.error(normalizeApiError(error).message) }
  }

  return <div className="space-y-5"><ManagementPageHeader title="Duyệt hạn mức tín dụng" description="Yêu cầu hồ sơ tín dụng do Sales gửi; chỉ Chủ cửa hàng có thể phê duyệt." breadcrumb="Duyệt hạn mức" group="Bán hàng & Đơn hàng" icon={<ShieldCheck className="h-6 w-6" />} /><section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">{(['PENDING', 'APPROVED', 'REJECTED'] as const).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={status === item ? primaryButton : secondaryButton}>{label(item)}</button>)}</div>{list.isError ? <p className="m-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">Không tải được hàng chờ: {normalizeApiError(list.error).message}</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600"><tr><th className="px-4 py-3">Khách hàng</th><th className="px-4 py-3">Hạn mức</th><th className="px-4 py-3">Kỳ hạn</th><th className="px-4 py-3">Lịch sử hợp lệ</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{(list.data?.items ?? []).map((row) => <tr key={row.requestId} className="border-t border-slate-100"><td className="px-4 py-3"><Link className="font-medium text-sky-800 hover:underline" to={`/app/customer-debts`}>Hồ sơ khách</Link><p className="font-mono text-xs text-slate-500">{row.customerId.slice(0, 8)}…</p></td><td className="px-4 py-3 font-semibold">{money(row.requestedCreditLimit)}</td><td className="px-4 py-3">{row.requestedCreditTermDays} ngày</td><td className="px-4 py-3">{row.qualifiedOrderCount} đơn</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${color(row.status)}`}>{label(row.status)}</span></td><td className="px-4 py-3 text-right"><button type="button" className={secondaryButton} disabled={detailState.isFetching} onClick={() => void view(row)}><Eye className="h-4 w-4" />Xem</button></td></tr>)}</tbody></table>{!list.isLoading && !list.data?.items.length && <p className="p-10 text-center text-sm text-slate-500">Không có yêu cầu {label(status).toLowerCase()}.</p>}</div>}</section>{selected && <ReviewDialog detail={selected} pending={approveState.isLoading || rejectState.isLoading} onClose={() => setSelected(null)} onDecide={decide} />}</div>
}

function ReviewDialog({ detail, pending, onClose, onDecide }: { detail: CreditProfileRequestDetail; pending: boolean; onClose: () => void; onDecide: (decision: 'approve' | 'reject', note: string) => Promise<void> }) {
  const [note, setNote] = useState(detail.reviewNote ?? '')
  const pendingRequest = detail.status === 'PENDING'
  return <ManagementDialog title="Xem xét hạn mức tín dụng" onClose={onClose} closeDisabled={pending}><div className="space-y-4 p-5"><dl className="grid gap-3 sm:grid-cols-2"><Info label="Hạn mức" value={money(detail.requestedCreditLimit)} /><Info label="Kỳ hạn" value={`${detail.requestedCreditTermDays} ngày`} /><Info label="Đơn hoàn tất" value={`${detail.qualifiedOrderCount} đơn`} /><Info label="Gửi lúc" value={time(detail.createdAt)} /><Info label="Lý do" value={detail.reason} /><Info label="CCCD / CMND" value={detail.identityDocumentNumber || 'Chưa cung cấp'} /><Info label="Địa chỉ nhà riêng" value={detail.residentialAddress || 'Chưa cung cấp'} /><Info label="Địa chỉ công trình" value={detail.worksiteAddress || 'Chưa cung cấp'} /></dl>{pendingRequest && <><label className="block text-sm font-medium text-slate-700">Ghi chú duyệt / lý do từ chối<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className={`${managementFieldClass} min-h-24`} /></label><div className="flex justify-end gap-2"><button type="button" className={secondaryButton} onClick={onClose}>Hủy</button><button type="button" disabled={pending || !note.trim()} className="inline-flex min-h-9 items-center gap-1 rounded-md bg-rose-700 px-3 text-sm font-semibold text-white disabled:opacity-50" onClick={() => void onDecide('reject', note)}><X className="h-4 w-4" />Từ chối</button><button type="button" disabled={pending} className={primaryButton} onClick={() => void onDecide('approve', note)}><Check className="h-4 w-4" />Duyệt</button></div></>}</div></ManagementDialog>
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900">{value}</dd></div> }
