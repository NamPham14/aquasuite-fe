import { AlertTriangle, FileText, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { useGetManagedWarrantyTicketDetailQuery } from '../api/warrantyTicketApi'
import { TicketStatusBadge } from './TicketStatusBadge'
import type { PreferredSlot } from '../types/warrantyTicket.types'

function formatSlot(slot?: PreferredSlot | null): string {
  switch (slot) {
    case 'MORNING':
      return 'Buổi sáng (08:00 - 12:00)'
    case 'AFTERNOON':
      return 'Buổi chiều (13:00 - 17:00)'
    case 'EVENING':
      return 'Buổi tối (17:00 - 20:00)'
    default:
      return 'Linh hoạt'
  }
}

/**
 * Chi tiết yêu cầu bảo hành phía nội bộ (Chủ cửa hàng) — chỉ xem.
 * Hiển thị thêm thông tin liên hệ khách, cảnh báo thẻ hết hạn + đã xác nhận, kết quả xử lý hoặc lý do từ chối.
 */
export function WarrantyTicketManageDetailModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { data: ticket, isLoading } = useGetManagedWarrantyTicketDetailQuery(ticketId)

  return (
    <ManagementDialog
      onClose={onClose}
      title={ticket ? `Chi tiết yêu cầu ${ticket.ticketCode}` : 'Chi tiết yêu cầu bảo hành'}
    >
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-500">Đang tải dữ liệu yêu cầu...</div>
      ) : !ticket ? (
        <div className="p-6">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            Không tìm thấy thông tin yêu cầu bảo hành.
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-5 text-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold text-slate-900">{ticket.ticketCode}</span>
                <TicketStatusBadge status={ticket.status} />
              </div>
              <div className="text-[11px] text-slate-500">
                Gửi lúc: {new Date(ticket.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Cảnh báo thẻ hết hạn */}
          {ticket.warrantyExpired && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">Thẻ bảo hành đã hết hạn{ticket.warrantyEndDate ? ` (${ticket.warrantyEndDate})` : ''}</span>
                <p className="mt-0.5 text-amber-700">
                  {ticket.expiredAcknowledged
                    ? 'Khách đã xác nhận vẫn muốn gửi dù hết hạn (có thể phát sinh chi phí).'
                    : 'Lưu ý khi xử lý: sửa chữa có thể phát sinh chi phí ngoài bảo hành.'}
                </p>
              </div>
            </div>
          )}

          {/* Kết quả / lý do */}
          {ticket.result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800">
              <span className="font-semibold">Kết quả xử lý:</span>
              <p className="mt-1 whitespace-pre-line text-emerald-700">{ticket.result}</p>
              {ticket.completedAt && (
                <span className="mt-1 block text-[11px] text-emerald-600">
                  Hoàn tất lúc: {new Date(ticket.completedAt).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          )}
          {ticket.rejectionReason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-800">
              <span className="font-semibold">Lý do từ chối:</span>
              <p className="mt-1 whitespace-pre-line text-rose-700">{ticket.rejectionReason}</p>
            </div>
          )}
          {ticket.cancelReason && (
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3.5 text-slate-800">
              <span className="font-semibold">Lý do khách hủy:</span>
              <p className="mt-1 whitespace-pre-line text-slate-600">{ticket.cancelReason}</p>
            </div>
          )}

          {/* Thiết bị */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>Thiết bị bảo hành</span>
            </div>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Tên sản phẩm</dt>
                <dd className="font-medium text-slate-900">{ticket.productName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Mã thẻ bảo hành</dt>
                <dd className="font-mono font-medium text-sky-700">{ticket.warrantyCode || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Biến thể / SKU</dt>
                <dd className="font-medium text-slate-800">
                  {ticket.variantName || '—'} {ticket.sku ? `(${ticket.sku})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Số Serial</dt>
                <dd className="font-mono font-medium text-slate-800">{ticket.serialNumber || 'Không có serial'}</dd>
              </div>
            </dl>
          </div>

          {/* Liên hệ khách */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Phone className="h-4 w-4 text-sky-600" />
              <span>Liên hệ khách hàng</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
              <span>Họ tên: <strong className="text-slate-800">{ticket.contactName}</strong></span>
              <span>SĐT: <strong className="text-slate-800">{ticket.contactPhone}</strong></span>
              {ticket.contactEmail && <span>Email: <strong className="text-slate-800">{ticket.contactEmail}</strong></span>}
            </div>
          </div>

          {/* Nội dung yêu cầu */}
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-sky-600" />
              <span>Nội dung yêu cầu</span>
            </div>
            <dd className="whitespace-pre-line rounded-lg bg-slate-50 p-2.5 font-medium text-slate-800">
              {ticket.issueDescription}
            </dd>
            <dl className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Ngày hẹn mong muốn</dt>
                <dd className="font-medium text-slate-800">{ticket.preferredDate || 'Linh hoạt'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Khung giờ mong muốn</dt>
                <dd className="font-medium text-slate-800">{formatSlot(ticket.preferredSlot)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" /> Địa chỉ tiếp nhận
                </dt>
                <dd className="font-medium text-slate-800">{ticket.siteAddress}</dd>
              </div>
            </dl>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </ManagementDialog>
  )
}
