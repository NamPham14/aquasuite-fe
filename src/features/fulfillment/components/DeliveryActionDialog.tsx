import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError'
import { ManagementDialog, ManagementForm, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { useDeliveryActionMutation } from '../api/deliveryApi'
import { deliveryButton } from './deliveryPresentation'

function PhotoPreview({ file, index }: { file: File; index: number }) {
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (image.current) image.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={image} alt={`Ảnh bằng chứng ${index + 1}`} className="h-32 w-full rounded-md object-contain bg-slate-50" />
}

export function DeliveryActionDialog({ id, action, resuming = false, onClose }: { id: string; action: 'start' | 'complete' | 'fail' | 'assignment' | 'reschedule'; resuming?: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [cancellationConfirmed, setCancellationConfirmed] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
  const [send, { isLoading }] = useDeliveryActionMutation()
  const submitting = useRef(false)
  const title = { start: resuming ? 'Tiếp tục giao hàng' : 'Nhận hàng đi giao', complete: 'Xác nhận giao thành công', fail: 'Giao thất bại', assignment: 'Thu hồi phân công', reschedule: 'Chờ giao lại' }[action]
  function choose(incoming: FileList | null) {
    const selected = Array.from(incoming ?? []).map((file) => {
      if (file.type) return file
      const mime = ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as Record<string, string>)[file.name.split('.').pop()?.toLowerCase() ?? '']
      return mime ? new File([file], file.name, { type: mime, lastModified: file.lastModified }) : file
    })
    const next = [...files, ...selected]
    if (next.length > 5 || next.some((f) => !['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size === 0 || f.size > 5 * 1024 * 1024) || next.reduce((n, f) => n + f.size, 0) > 6.5 * 1024 * 1024) {
      setError('Chọn tối đa 5 ảnh JPEG/PNG/WebP, mỗi ảnh tối đa 5 MiB; tổng ảnh tối đa 6,5 MiB.'); return
    }
    setFiles(next); setError('')
  }
  return <ManagementDialog title={title} onClose={onClose} closeDisabled={isLoading}>
    <ManagementForm onClose={onClose} submitDisabled={isLoading || (action === 'complete' && !files.length) || (action === 'fail' && !cancellationConfirmed)} closeDisabled={isLoading} submitLabel={isLoading ? 'Đang gửi…' : title} onSubmit={async (e) => {
      e.preventDefault(); if (isLoading || submitting.current) return
      if (action === 'fail' && (!reason.trim() || reason.trim().length > 1000)) { setError('Nhập lý do từ 1 đến 1.000 ký tự.'); return }
      if (action === 'fail' && !cancellationConfirmed) { setError('Chỉ kết thúc giao khi khách đã xác nhận hủy hoặc không nhận hàng. Trở ngại tạm thời dùng Chờ giao lại.'); return }
      const nextDate = scheduledDate ? `${scheduledDate}:00+07:00` : ''
      if (action === 'reschedule' && (!reason.trim() || reason.length > 1000 || (nextDate && (!Number.isFinite(Date.parse(nextDate)) || Date.parse(nextDate) <= Date.now())))) { setError('Nhập lý do; nếu có lịch mới, chọn ngày giờ trong tương lai (giờ Việt Nam).'); return }
      if (action === 'complete' && !files.length) { setError('Cần ít nhất một ảnh bằng chứng.'); return }
      const body = action === 'complete' ? new FormData() : action === 'reschedule' ? { reason: reason.trim(), scheduledDate: nextDate || null } : action === 'fail' ? { reason: reason.trim(), customerCancellationConfirmed: cancellationConfirmed } : undefined
      if (body instanceof FormData) files.forEach((file) => body.append('photos', file))
      submitting.current = true
      try { await send({ id, action, body }).unwrap(); toast.success('Đã cập nhật giao hàng.'); onClose() }
      catch (err) { const failure = normalizeApiError(err); setError(failure.code === 'FUL_004' ? 'Chưa thể lưu ảnh. Dịch vụ lưu trữ chưa sẵn sàng; phiếu chưa được xác nhận đã giao.' : failure.message) }
      finally { submitting.current = false }
    }}>
      {action === 'start' && <p className="text-sm text-slate-600">{resuming ? 'Tiếp tục giao theo lịch hẹn trên phiếu cũ. Không tạo phiếu hay trừ tồn thêm.' : 'Xác nhận bạn đã nhận đủ hàng của đợt giao. Phiếu sẽ chuyển sang Đang giao.'}</p>}
      {action === 'reschedule' && <div className="space-y-4"><p className="text-sm text-slate-600">Dùng khi khách hẹn lại, chưa liên hệ được, khách vắng hoặc có trở ngại tạm thời. Giữ nguyên phiếu và hàng đã xuất; kế toán có thể đổi shipper.</p><label className="block text-sm font-medium" htmlFor="delivery-next-date">Ngày giờ giao lại (giờ Việt Nam, nếu đã chốt)<input id="delivery-next-date" type="datetime-local" value={scheduledDate} disabled={isLoading} onChange={(e) => setScheduledDate(e.target.value)} className={managementFieldClass} /></label><label className="block text-sm font-medium" htmlFor="delivery-reschedule-reason">Lý do chờ giao lại *<textarea id="delivery-reschedule-reason" required maxLength={1000} rows={3} value={reason} disabled={isLoading} onChange={(e) => setReason(e.target.value)} className={managementFieldClass} /></label></div>}
      {action === 'fail' && <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={cancellationConfirmed} disabled={isLoading} onChange={(e) => setCancellationConfirmed(e.target.checked)} className="mt-1" /><span>Khách đã xác nhận hủy hoặc không nhận hàng. Đây là kết thúc giao, không phải trở ngại tạm thời.</span></label>}
      {action === 'assignment' && <p className="text-sm text-slate-600">Thu hồi shipper và đưa phiếu về Chờ phân công. Chỉ thực hiện được trước khi shipper nhận hàng.</p>}
      {action === 'fail' && <div className="space-y-3"><label htmlFor="delivery-failure-preset" className="block text-sm font-medium">Lý do thường gặp<select id="delivery-failure-preset" defaultValue="" disabled={isLoading} onChange={(e) => { if (e.target.value) setReason(e.target.value) }} className={managementFieldClass}><option value="">Chọn lý do hoặc nhập bên dưới</option>{['Khách từ chối nhận hàng', 'Khách từ chối do hàng hỏng'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label htmlFor="delivery-reason" className="text-sm font-medium">Lý do thất bại *</label><textarea id="delivery-reason" rows={4} maxLength={1000} value={reason} disabled={isLoading} onChange={(e) => setReason(e.target.value)} className={managementFieldClass} aria-describedby="delivery-reason-hint" /><p id="delivery-reason-hint" className="mt-1 text-xs text-slate-500">{reason.length}/1.000 ký tự. Hàng phải được bàn giao về kho để kiểm tra; thao tác này không nhập lại kho hoặc hoàn tiền.</p></div>}
      {action === 'complete' && <div className="space-y-4">
        <p className="text-sm text-slate-600">Xác nhận đã bàn giao đủ hàng. Cần ít nhất một ảnh bằng chứng; không có bước duyệt ảnh.</p>
        <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">Bạn có thể chọn và xem trước ảnh. Gửi ảnh và hoàn thành giao hàng cần dịch vụ lưu trữ sẵn sàng.</p>
        <label className="block text-sm font-medium">Chọn ảnh *<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple disabled={isLoading} className={managementFieldClass} onChange={(e) => { choose(e.target.files); e.target.value = '' }} /></label>
        <label className="block text-sm font-medium">Chụp ảnh<input type="file" accept="image/*" capture="environment" disabled={isLoading} className={managementFieldClass} onChange={(e) => { choose(e.target.files); e.target.value = '' }} /></label>
        <p className="text-xs text-slate-500">Tối đa 5 ảnh, 5 MiB/ảnh; tổng tối đa 6,5 MiB. JPEG/PNG được hỗ trợ; WebP tùy bộ giải mã máy chủ.</p>
        <div className="grid grid-cols-2 gap-3">{files.map((f, i) => <div key={`${f.name}-${i}`} className="min-w-0"><PhotoPreview file={f} index={i} /><p className="truncate text-xs">{f.name}</p><button type="button" className={deliveryButton} disabled={isLoading} onClick={() => setFiles(files.filter((_, index) => index !== i))}>Bỏ ảnh {i + 1}</button></div>)}</div>
      </div>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </ManagementForm>
  </ManagementDialog>
}
