import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react'
import { useGetMyWarrantyRecordsQuery } from '../../servicedesk/api/warrantyApi.ts'
import { useGetMyWarrantyTicketsQuery } from '../../servicedesk/api/warrantyTicketApi.ts'

/**
 * Tab Bảo hành điện tử & Yêu cầu hỗ trợ kỹ thuật tích hợp trong trang Hồ sơ Khách hàng.
 */
export function ProfileWarrantySection() {
  const { data: warrantyPage, isLoading: isLoadingWarranties } = useGetMyWarrantyRecordsQuery({
    page: 1,
    size: 5,
  })
  const { data: ticketPage, isLoading: isLoadingTickets } = useGetMyWarrantyTicketsQuery({
    page: 1,
    size: 5,
  })

  const warranties = warrantyPage?.items ?? []
  const tickets = ticketPage?.items ?? []

  return (
    <div className="space-y-6">
      {/* Khối 1: Hồ sơ Bảo hành điện tử */}
      <section className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
                Chứng nhận chính hãng
              </p>
              <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
                Bảo hành điện tử của tôi ({warrantyPage?.totalElements ?? warranties.length})
              </h2>
              <p className="text-xs text-[#6B6760] mt-1">
                Tra cứu thời hạn bảo hành theo mã Serial và gửi yêu cầu kỹ thuật trực tuyến.
              </p>
            </div>
          </div>

          <Link
            to="/profile/warranties"
            className="inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors"
          >
            <span>Mở danh sách đầy đủ</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
          </Link>
        </div>

        {isLoadingWarranties ? (
          <p className="py-6 text-center text-xs text-[#78736A]">Đang tải hồ sơ bảo hành...</p>
        ) : warranties.length === 0 ? (
          <div className="border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-8 text-center text-xs text-[#6B6760]">
            Chưa có sản phẩm nào được kích hoạt bảo hành điện tử trên tài khoản này.
          </div>
        ) : (
          <div className="divide-y divide-[#E6E2DA] border border-[#E6E2DA]">
            {warranties.map((w) => (
              <Link
                key={w.warrantyRecordId}
                to={`/profile/warranties/${w.warrantyRecordId}`}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-[#FAF9F6] transition-colors text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-[#171614] bg-[#FAF9F6] border border-[#E6E2DA] px-2 py-0.5 shrink-0">
                      {w.warrantyCode}
                    </span>
                    {w.orderCode && (
                      <span className="border border-[#D6D1C7] bg-white px-2 py-0.5 text-[10px] font-medium text-[#57534E] shrink-0">
                        {w.orderCode}
                      </span>
                    )}
                    <span className="font-semibold text-[#171614] break-words">
                      {w.productName || w.sku || 'Thiết bị AquaSuite'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78736A]">
                    Serial: <strong className="font-mono text-[#171614]">{w.serialNumber || '—'}</strong> &middot; Hạn tới{' '}
                    <strong className="text-[#171614]">{w.endDate}</strong>
                  </p>
                </div>

                <span className="border border-[#C6DDD0] bg-[#EEF5F1] px-3 py-1 text-[11px] font-medium text-[#245C42] shrink-0 tabular-nums">
                  Còn {Math.max(0, w.remainingDays)} ngày
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Khối 2: Yêu cầu Bảo hành & Kỹ thuật */}
      <section className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]">
              <ClipboardList className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
                Chăm sóc hậu mãi
              </p>
              <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
                Yêu cầu bảo hành &amp; Hỗ trợ ({ticketPage?.totalElements ?? tickets.length})
              </h2>
              <p className="text-xs text-[#6B6760] mt-1">
                Theo dõi tiến độ tiếp nhận và xử lý yêu cầu bảo hành của Showroom.
              </p>
            </div>
          </div>

          <Link
            to="/profile/warranty-tickets"
            className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] transition-colors"
          >
            <span>Quản lý yêu cầu</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isLoadingTickets ? (
          <p className="py-6 text-center text-xs text-[#78736A]">Đang tải yêu cầu bảo hành...</p>
        ) : tickets.length === 0 ? (
          <div className="border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-8 text-center text-xs text-[#6B6760]">
            Bạn chưa gửi yêu cầu bảo hành nào.
          </div>
        ) : (
          <div className="divide-y divide-[#E6E2DA] border border-[#E6E2DA]">
            {tickets.map((t) => (
              <div
                key={t.ticketId}
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-[#171614] bg-[#FAF9F6] border border-[#E6E2DA] px-2 py-0.5">
                      {t.ticketCode}
                    </span>
                    <span className="font-semibold text-[#171614] truncate">
                      {t.productName || t.warrantyCode || 'Phiếu hỗ trợ kỹ thuật'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B6760] line-clamp-1">{t.issueDescription}</p>
                </div>

                <span className="border border-[#E6E2DA] bg-[#FAF9F6] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-semibold text-[#57534E] shrink-0">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
