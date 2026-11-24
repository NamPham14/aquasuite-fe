import { useState } from 'react'
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
  Video,
} from 'lucide-react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { useGetMyWarrantyTicketDetailQuery } from '../api/warrantyTicketApi'
import { TicketStatusBadge } from './TicketStatusBadge'
import { CancelTicketModal } from './CancelTicketModal'
import type { PreferredSlot } from '../types/warrantyTicket.types'

interface TicketDetailModalProps {
  ticketId: string
  isOpen: boolean
  onClose: () => void
  onCancelled?: () => void
}

function formatSlot(slot?: PreferredSlot | null): string {
  if (!slot) return 'Linh hoạt'
  switch (slot) {
    case 'MORNING':
      return 'Buổi sáng (08:00 - 12:00)'
    case 'AFTERNOON':
      return 'Buổi chiều (13:00 - 17:00)'
    case 'EVENING':
      return 'Buổi tối (17:00 - 20:00)'
    default:
      return slot
  }
}

export function TicketDetailModal({
  ticketId,
  isOpen,
  onClose,
  onCancelled,
}: TicketDetailModalProps) {
  const { data: ticket, isLoading } = useGetMyWarrantyTicketDetailQuery(ticketId, {
    skip: !isOpen || !ticketId,
  })
  const [showCancelModal, setShowCancelModal] = useState(false)

  if (!isOpen) return null

  return (
    <>
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
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-5 text-xs sm:p-6">
            {/* Header meta */}
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

              {ticket.canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Hủy yêu cầu này
                </button>
              )}
            </div>

            {/* Thông báo kết quả / Lý do hủy / Lý do từ chối nếu có */}
            {ticket.result && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-800">
                <span className="font-semibold">Kết quả xử lý từ cửa hàng:</span>
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
                <span className="font-semibold">Lý do từ chối hỗ trợ:</span>
                <p className="mt-1 whitespace-pre-line text-rose-700">{ticket.rejectionReason}</p>
              </div>
            )}

            {ticket.cancelReason && (
              <div className="rounded-xl border border-slate-200 bg-slate-100 p-3.5 text-slate-800">
                <span className="font-semibold">Lý do hủy yêu cầu:</span>
                <p className="mt-1 whitespace-pre-line text-slate-600">{ticket.cancelReason}</p>
              </div>
            )}

            {/* Thiết bị liên quan */}
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

            {/* Sự cố & Địa chỉ */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-sky-600" />
                <span>Nội dung yêu cầu</span>
              </div>
              <div>
                <dt className="text-slate-500">Mô tả sự cố</dt>
                <dd className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2.5 font-medium text-slate-800">
                  {ticket.issueDescription}
                </dd>
              </div>

              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Ngày hẹn mong muốn
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{ticket.preferredDate || 'Linh hoạt'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Khung giờ mong muốn
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{formatSlot(ticket.preferredSlot)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    Địa chỉ tiếp nhận
                  </dt>
                  <dd className="mt-0.5 font-medium text-slate-800">{ticket.siteAddress}</dd>
                </div>
              </dl>
            </div>

            {/* Media đính kèm */}
            {ticket.media && ticket.media.length > 0 && (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <ImageIcon className="h-4 w-4 text-sky-600" />
                  <span>Hình ảnh / Video đính kèm ({ticket.media.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ticket.media.map((m, idx) => (
                    <a
                      key={m.publicId || idx}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex flex-col items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1.5 hover:border-sky-400"
                    >
                      {m.type === 'IMAGE' ? (
                        <div className="relative h-20 w-full overflow-hidden rounded bg-slate-100">
                          <img
                            src={m.url}
                            alt="Ảnh đính kèm"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-full flex-col items-center justify-center rounded bg-slate-100 text-sky-700">
                          <Video className="h-6 w-6" />
                          <span className="mt-1 text-[10px]">Xem video</span>
                        </div>
                      )}
                      <span className="mt-1 flex items-center gap-0.5 text-[10px] text-slate-500 group-hover:text-sky-700">
                        Mở file <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

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

      {ticket && (
        <CancelTicketModal
          ticketId={ticket.ticketId}
          ticketCode={ticket.ticketCode}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => {
            setShowCancelModal(false)
            onCancelled?.()
            onClose()
          }}
        />
      )}
    </>
  )
}
