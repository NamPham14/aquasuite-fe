import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useAssignDeliveriesMutation } from '../api/deliveryApi'
import { useGetDeliveryShippersQuery } from '../api/shipperApi'
import { deliveryButton } from './deliveryPresentation'
import type { UserAccount } from '../../iam'

export function AssignmentDialog({ deliveryIds, onClose, onDone }: { deliveryIds: string[]; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<UserAccount | null>(null)
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const shippers = useGetDeliveryShippersQuery({ keyword: search, page, size: 20 }, { refetchOnMountOrArgChange: true })
  const [assign, { isLoading }] = useAssignDeliveriesMutation()
  const selectionActive = !!selected && shippers.currentData?.content.some(shipper => shipper.id === selected.id && shipper.status === 'ACTIVE')
  const find = () => { if (!isLoading) { setSearch(keyword.trim()); setPage(0) } }
  return <ManagementDialog title="Phân công shipper" onClose={onClose} closeDisabled={isLoading}>
    <ManagementForm onClose={onClose} submitLabel={isLoading ? 'Đang phân công…' : 'Xác nhận phân công'} submitDisabled={isLoading || !selectionActive || shippers.isFetching || shippers.isError} closeDisabled={isLoading} onSubmit={async (e) => {
      e.preventDefault()
      if (lock.current || isLoading || shippers.isFetching || shippers.isError) return
      if (!selected || !selectionActive) { setError('Shipper không còn đủ điều kiện phân công. Vui lòng chọn lại shipper đang hoạt động.'); return }
      lock.current = true
      const fresh = await shippers.refetch()
      if (fresh.error || !fresh.data?.content.some(shipper => shipper.id === selected.id && shipper.status === 'ACTIVE')) { lock.current = false; setSelected(null); setError('Không xác minh được shipper đang hoạt động. Vui lòng chọn lại.'); return }
      lock.current = true; setError('')
      try { await assign({ shipperId: selected.id, deliveryIds }).unwrap(); toast.success('Đã phân công shipper.'); onDone() }
      catch (err) { const failure = normalizeApiError(err); setError(failure.message); if (failure.code === 'FUL_002') { setSelected(null); void shippers.refetch() } }
      finally { lock.current = false }
    }}>
      <p className="text-sm text-slate-600">Phân công {deliveryIds.length} phiếu chưa nhận hàng hoặc đang hẹn giao lại. Với phiếu hẹn lại, cần bàn giao hàng thực tế cho shipper mới; hệ thống không xuất kho thêm. Toàn bộ lựa chọn được xử lý cùng lúc.</p>
      <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><label htmlFor="assignment-search" className="text-sm font-medium text-slate-700">Tìm shipper</label><input id="assignment-search" type="search" value={keyword} maxLength={100} disabled={isLoading} className={managementFieldClass} placeholder="Tên tài khoản, email hoặc điện thoại" onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); find() } }} /></div><button type="button" className={deliveryButton} disabled={isLoading} onClick={find}>Tìm kiếm</button></div>
      <fieldset disabled={isLoading} className="min-w-0"><legend className="mb-2 text-sm font-medium text-slate-700">Chọn shipper đang hoạt động *</legend>
        {shippers.isFetching ? <p role="status" className="animate-pulse p-4 text-sm text-slate-500">Đang tải danh sách shipper…</p> : shippers.error ? <div role="alert" className="space-y-2 p-3 text-sm text-rose-700"><p>{normalizeApiError(shippers.error).message}</p><button type="button" className={deliveryButton} onClick={() => void shippers.refetch()}>Thử lại</button></div> : shippers.currentData?.content.length ? <div className="max-h-72 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200">{shippers.currentData.content.map((shipper) => <label key={shipper.id} className={`flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-slate-50 ${selected?.id === shipper.id ? 'bg-sky-50' : ''}`}><input type="radio" disabled={shipper.status !== 'ACTIVE'} name="assignment-shipper" value={shipper.id} checked={selected?.id === shipper.id} onChange={() => { setSelected(shipper); setError('') }} className="mt-1 shrink-0" /><span className="min-w-0"><strong className="block break-words text-slate-900">{shipper.username}</strong><span className="block break-all text-xs text-slate-500">{[shipper.phone, shipper.email].filter(Boolean).join(' · ') || 'Chưa có thông tin liên hệ'}</span></span></label>)}</div> : <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Không có shipper đang hoạt động phù hợp.</p>}
      </fieldset>
      {shippers.currentData && !shippers.isError && <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>{shippers.currentData.totalElements} shipper · Trang {page + 1}/{Math.max(1, shippers.currentData.totalPages)}</span><div className="flex gap-2"><button type="button" className={deliveryButton} disabled={isLoading || shippers.isFetching || page === 0} onClick={() => setPage(page - 1)}>Trước</button><button type="button" className={deliveryButton} disabled={isLoading || shippers.isFetching || page + 1 >= shippers.currentData.totalPages} onClick={() => setPage(page + 1)}>Sau</button></div></div>}
      {selected && <p role="status" className="rounded-md bg-sky-50 p-3 text-sm text-sky-900">Đã chọn: <strong>{selected.username}</strong>{selected.phone && ` · ${selected.phone}`}</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </ManagementForm>
  </ManagementDialog>
}
