import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ManagementDialog, ManagementForm } from '../../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useIssueDeliveryMutation } from '../api/deliveryIssueApi'
import { deliveryErrorText, isUncertainDeliveryError } from './deliveryIssueForm'

export function DeliveryIssueDialog({ id, action, onClose }: { id: string; action: 'confirm-issue' | 'cancel-draft'; onClose: () => void }) {
  const [send, { isLoading }] = useIssueDeliveryMutation()
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const [reviewReservation, setReviewReservation] = useState(false)
  const lock = useRef(false)
  const confirm = action === 'confirm-issue'
  const title = confirm ? 'Xác nhận xuất kho' : 'Hủy đợt giao nháp'
  return <ManagementDialog title={title} onClose={onClose} closeDisabled={isLoading || uncertain}>
    <ManagementForm onClose={onClose} closeDisabled={isLoading || uncertain} submitDisabled={isLoading} submitLabel={isLoading ? 'Đang xử lý…' : uncertain ? 'Gửi lại cùng thao tác' : title} onSubmit={async (e) => {
      e.preventDefault(); if (lock.current) return
      lock.current = true; setError('')
      setReviewReservation(false)
      try { await send({ id, action }).unwrap(); toast.success(confirm ? 'Đã xác nhận xuất kho.' : 'Đã hủy đợt giao nháp.'); onClose() }
      catch (failure) { setUncertain(isUncertainDeliveryError(failure)); setError(deliveryErrorText(failure)); setReviewReservation(['FUL_006', 'INV_DISPATCH_004'].includes(normalizeApiError(failure).code ?? '')) }
      finally { lock.current = false }
    }}>
      <p className="text-sm text-slate-700">{confirm ? 'Xác nhận sẽ trừ tồn và tiêu thụ hàng giữ cho toàn bộ đợt giao. Khi thành công, phiếu chuyển sang Chờ phân công và không thể hủy nháp. Hệ thống kiểm tra lại số lượng, tồn kho và COD tại thời điểm xác nhận.' : 'Chỉ hủy phiếu còn ở trạng thái Nháp. Không trừ tồn hoặc giải phóng hàng giữ của đơn.'}</p>
      {error && <p role="alert" className="whitespace-pre-line text-sm text-rose-700">{error}</p>}
      {reviewReservation && confirm && <p className="text-sm text-slate-700"><a href="/app/deposits" target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-700 underline">Mở Cọc &amp; hàng giữ</a> ở tab mới, tìm đúng đơn và kiểm tra hàng giữ. Nếu chỉ có quyền xem, nhờ Sales/chủ cửa hàng xử lý. Sau đó quay lại phiếu này để xác nhận xuất kho; không cần tạo lại Delivery.</p>}
      {uncertain && <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Chưa xác định kết quả. Giữ tab mở và gửi lại cùng thao tác, không tải lại trang hoặc đổi tài khoản.</p>}
    </ManagementForm>
  </ManagementDialog>
}
