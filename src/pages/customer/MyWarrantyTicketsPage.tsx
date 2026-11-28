import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Eye,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { normalizeApiError } from '../../shared/api/apiError'
import { useGetMyWarrantyTicketsQuery } from '../../features/servicedesk/api/warrantyTicketApi'
import { TicketStatusBadge } from '../../features/servicedesk/components/TicketStatusBadge'
import { TicketDetailModal } from '../../features/servicedesk/components/TicketDetailModal'
import { CancelTicketModal } from '../../features/servicedesk/components/CancelTicketModal'
import type {
  PreferredSlot,
  WarrantyTicketStatus,
} from '../../features/servicedesk/types/warrantyTicket.types'

function formatSlot(slot?: PreferredSlot | null): string {
  if (!slot) return 'Linh hoạt'
  switch (slot) {
    case 'MORNING':
      return 'Sáng'
    case 'AFTERNOON':
      return 'Chiều'
    case 'EVENING':
      return 'Tối'
    default:
      return slot
  }
}

export function MyWarrantyTicketsPage() {
  const [status, setStatus] = useState<WarrantyTicketStatus | ''>('')
  const [page, setPage] = useState(1)

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [cancelTicketData, setCancelTicketData] = useState<{ id: string; code: string } | null>(null)

  const { data: pageData, isLoading, error, refetch } = useGetMyWarrantyTicketsQuery({
    status: status || undefined,
    page,
    size: 20,
  })

  const items = pageData?.items ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  const fetchError = error ? normalizeApiError(error).message : null

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Showroom */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E6E2DA]">
        <div className="space-y-1.5">
          <Link
            to="/profile?tab=warranty"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Hồ sơ tài khoản</span>
          </Link>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#171614] tracking-[-0.01em]">
            Yêu cầu bảo hành của tôi
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6760]">
            Theo dõi tiến độ tiếp nhận, lịch hẹn kỹ thuật và lịch sử xử lý yêu cầu bảo hành của bạn.
          </p>
        </div>

        <Link
          to="/profile/warranties"
          className="h-10 inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
          <span>Danh sách thẻ bảo hành</span>
        </Link>
      </div>

      {/* Filter strip */}
      <div className="border border-[#E6E2DA] bg-white p-5 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full sm:w-72">
          <label
            htmlFor="ticket-status-filter"
            className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
          >
            Trạng thái yêu cầu
          </label>
          <select
            id="ticket-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as WarrantyTicketStatus | '')
              setPage(1)
            }}
            className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="NEW">Đã gửi (Chờ tiếp nhận)</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="DONE">Hoàn tất</option>
            <option value="REJECTED">Từ chối</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        {Boolean(status) && (
          <button
            type="button"
            onClick={() => {
              setStatus('')
              setPage(1)
            }}
            className="inline-flex h-10 items-center gap-1.5 border border-[#D6D1C7] bg-white px-4 text-[11px] uppercase tracking-[0.14em] font-medium text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {fetchError && (
        <div role="alert" className="border border-[#E5B8B8] bg-[#FEF2F2] px-5 py-3.5 text-xs text-[#991B1B]">
          {fetchError}
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="overflow-hidden border border-[#E6E2DA] bg-white">
        <div className="border-b border-[#E6E2DA] bg-[#FAF9F6] px-6 py-4 flex items-center justify-between">
          <h2 id="ticket-table-heading" className="font-editorial text-lg font-normal text-[#171614]">
            Danh sách yêu cầu ({totalElements})
          </h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-xs text-[#78736A]">
            Đang tải danh sách yêu cầu...
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center text-xs text-[#78736A]">
            Bạn chưa gửi yêu cầu bảo hành nào.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table aria-labelledby="ticket-table-heading" className="min-w-full border-collapse text-xs text-[#171614]">
              <thead className="bg-white text-[#78736A] text-[10px] uppercase tracking-[0.16em] border-b border-[#E6E2DA] font-medium">
                <tr>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Mã yêu cầu</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Thiết bị &amp; Mã thẻ</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Mô tả sự cố</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Lịch hẹn mong muốn</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Đính kèm</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-3 text-left whitespace-nowrap">Ngày gửi</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E2DA]">
                {items.map((row) => (
                  <tr key={row.ticketId} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-semibold text-[#171614]">{row.ticketCode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5 min-w-[180px] max-w-[260px]">
                        <div className="font-medium text-[#171614] whitespace-normal break-words">
                          {row.productName || '—'}
                        </div>
                        <div className="font-mono text-[11px] text-[#78736A]">
                          {row.warrantyCode || '—'} {row.serialNumber ? `· SN: ${row.serialNumber}` : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-xs truncate text-xs text-[#57534E]" title={row.issueDescription}>
                        {row.issueDescription}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#57534E]">
                      {row.preferredDate ? (
                        <div className="flex items-center gap-1.5 tabular-nums">
                          <Calendar className="h-3.5 w-3.5 text-[#8C6D46]" />
                          <span>{row.preferredDate}</span>
                          <span className="text-[#78736A]">({formatSlot(row.preferredSlot)})</span>
                        </div>
                      ) : (
                        <span className="text-[#78736A]">Linh hoạt</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#57534E]">
                      {row.mediaCount > 0 ? `${row.mediaCount} file` : 'Không có'}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <TicketStatusBadge status={row.status} tone="editorial" />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-[#78736A] tabular-nums">
                      {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicketId(row.ticketId)}
                          className="inline-flex items-center gap-1 border border-[#D6D1C7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] cursor-pointer transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Chi tiết</span>
                        </button>

                        {row.canCancel && (
                          <button
                            type="button"
                            onClick={() => setCancelTicketData({ id: row.ticketId, code: row.ticketCode })}
                            className="inline-flex items-center gap-1 border border-[#E5B8B8] bg-[#FEF2F2] px-2.5 py-1.5 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B] cursor-pointer transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Hủy</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-[#6B6760]">
          <div>
            Hiển thị <strong className="font-semibold text-[#171614] tabular-nums">{items.length}</strong> /{' '}
            <strong className="font-semibold text-[#171614] tabular-nums">{totalElements}</strong> yêu cầu
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border border-[#D6D1C7] bg-white px-3 py-1.5 text-xs font-medium text-[#171614] hover:border-[#171614] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Trang trước
            </button>
            <span className="px-2 py-1.5 text-xs font-medium text-[#171614] tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border border-[#D6D1C7] bg-white px-3 py-1.5 text-xs font-medium text-[#171614] hover:border-[#171614] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          isOpen={Boolean(selectedTicketId)}
          onClose={() => setSelectedTicketId(null)}
          onCancelled={() => {
            refetch()
          }}
        />
      )}

      {cancelTicketData && (
        <CancelTicketModal
          ticketId={cancelTicketData.id}
          ticketCode={cancelTicketData.code}
          isOpen={Boolean(cancelTicketData)}
          onClose={() => setCancelTicketData(null)}
          onSuccess={() => {
            refetch()
          }}
        />
      )}
    </div>
  )
}
