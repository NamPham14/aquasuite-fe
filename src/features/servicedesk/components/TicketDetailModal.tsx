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
import { CustomerEditorialModal } from './CustomerEditorialModal'
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
      <CustomerEditorialModal
        eyebrow="Hồ sơ yêu cầu hỗ trợ"
        title={ticket ? `Chi tiết yêu cầu ${ticket.ticketCode}` : 'Chi tiết yêu cầu bảo hành'}
        onClose={onClose}
      >
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#78736A]">Đang tải dữ liệu yêu cầu...</div>
        ) : !ticket ? (
          <div className="p-6 space-y-4">
            <div className="border border-[#E5B8B8] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
              Không tìm thấy thông tin yêu cầu bảo hành.
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="border border-[#D6D1C7] px-4 py-2 text-xs font-medium text-[#171614] hover:border-[#171614] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-6 text-xs">
            {/* Header meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 border border-[#E6E2DA] bg-[#FAF9F6] p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-base font-semibold text-[#171614]">{ticket.ticketCode}</span>
                  <TicketStatusBadge status={ticket.status} tone="editorial" />
                </div>
                <div className="text-[11px] text-[#78736A] tabular-nums">
                  Gửi lúc: {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                </div>
              </div>

              {ticket.canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="border border-[#E5B8B8] bg-[#FEF2F2] px-3.5 py-1.5 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B] cursor-pointer transition-colors"
                >
                  Hủy yêu cầu này
                </button>
              )}
            </div>

            {ticket.result && (
              <div className="border border-[#C6DDD0] bg-[#EEF5F1] p-4 text-[#1E4734]">
                <span className="font-semibold">Kết quả xử lý từ cửa hàng:</span>
                <p className="mt-1 whitespace-pre-line">{ticket.result}</p>
                {ticket.completedAt && (
                  <span className="mt-1.5 block text-[11px] text-[#245C42] tabular-nums">
                    Hoàn tất lúc: {new Date(ticket.completedAt).toLocaleString('vi-VN')}
                  </span>
                )}
              </div>
            )}

            {ticket.rejectionReason && (
              <div className="border border-[#E5B8B8] bg-[#FEF2F2] p-4 text-[#991B1B]">
                <span className="font-semibold">Lý do từ chối hỗ trợ:</span>
                <p className="mt-1 whitespace-pre-line">{ticket.rejectionReason}</p>
              </div>
            )}

            {ticket.cancelReason && (
              <div className="border border-[#D6D1C7] bg-[#F2EFE9] p-4 text-[#57534E]">
                <span className="font-semibold text-[#171614]">Lý do hủy yêu cầu:</span>
                <p className="mt-1 whitespace-pre-line">{ticket.cancelReason}</p>
              </div>
            )}

            {/* Thiết bị liên quan */}
            <div className="space-y-3 border border-[#E6E2DA] bg-white p-4">
              <div className="flex items-center gap-1.5 font-semibold text-[#171614] border-b border-[#E6E2DA] pb-2">
                <ShieldCheck className="h-4 w-4 text-[#8C6D46]" />
                <span>Thiết bị bảo hành</span>
              </div>
              <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Tên sản phẩm</dt>
                  <dd className="mt-0.5 font-medium text-[#171614]">{ticket.productName || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Mã thẻ bảo hành</dt>
                  <dd className="mt-0.5 font-mono font-semibold text-[#171614]">{ticket.warrantyCode || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Biến thể / SKU</dt>
                  <dd className="mt-0.5 font-medium text-[#171614]">
                    {ticket.variantName || '—'} {ticket.sku ? `(${ticket.sku})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Số Serial</dt>
                  <dd className="mt-0.5 font-mono font-medium text-[#171614]">{ticket.serialNumber || 'Không có serial'}</dd>
                </div>
              </dl>
            </div>

            {/* Sự cố & Địa chỉ */}
            <div className="space-y-3 border border-[#E6E2DA] bg-white p-4">
              <div className="flex items-center gap-1.5 font-semibold text-[#171614] border-b border-[#E6E2DA] pb-2">
                <FileText className="h-4 w-4 text-[#8C6D46]" />
                <span>Nội dung yêu cầu</span>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Mô tả sự cố</dt>
                <dd className="mt-1 whitespace-pre-line border border-[#E6E2DA] bg-[#FAF9F6] p-3 font-medium text-[#171614]">
                  {ticket.issueDescription}
                </dd>
              </div>

              <dl className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[#78736A]">
                    <Calendar className="h-3.5 w-3.5 text-[#8C6D46]" />
                    <span>Ngày hẹn mong muốn</span>
                  </dt>
                  <dd className="mt-0.5 font-medium text-[#171614] tabular-nums">{ticket.preferredDate || 'Linh hoạt'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[#78736A]">
                    <Clock className="h-3.5 w-3.5 text-[#8C6D46]" />
                    <span>Khung giờ mong muốn</span>
                  </dt>
                  <dd className="mt-0.5 font-medium text-[#171614]">{formatSlot(ticket.preferredSlot)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-[#78736A]">
                    <MapPin className="h-3.5 w-3.5 text-[#8C6D46]" />
                    <span>Địa chỉ tiếp nhận</span>
                  </dt>
                  <dd className="mt-0.5 font-medium text-[#171614]">{ticket.siteAddress}</dd>
                </div>
              </dl>
            </div>

            {ticket.media && ticket.media.length > 0 && (
              <div className="space-y-3 border border-[#E6E2DA] bg-white p-4">
                <div className="flex items-center gap-1.5 font-semibold text-[#171614]">
                  <ImageIcon className="h-4 w-4 text-[#8C6D46]" />
                  <span>Hình ảnh / Video đính kèm ({ticket.media.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {ticket.media.map((m, idx) => (
                    <a
                      key={m.publicId || idx}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative flex flex-col items-center overflow-hidden border border-[#E6E2DA] bg-[#FAF9F6] p-1.5 hover:border-[#171614] transition-colors"
                    >
                      {m.type === 'IMAGE' ? (
                        <div className="relative h-20 w-full overflow-hidden bg-[#EFECE6]">
                          <img
                            src={m.url}
                            alt="Ảnh đính kèm"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-full flex-col items-center justify-center bg-[#EFECE6] text-[#171614]">
                          <Video className="h-6 w-6 text-[#8C6D46]" />
                          <span className="mt-1 text-[10px]">Xem video</span>
                        </div>
                      )}
                      <span className="mt-1 flex items-center gap-0.5 text-[10px] text-[#78736A] group-hover:text-[#171614]">
                        Mở file <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-[#E6E2DA] pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border border-[#D6D1C7] bg-white px-5 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </CustomerEditorialModal>

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
