import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react'
import { useGetWarrantyRecordsQuery } from '../../servicedesk/api/warrantyApi.ts'
import { useGetMyWarrantyTicketsQuery } from '../../servicedesk/api/warrantyTicketApi.ts'

/**
 * Tab Bảo hành điện tử & Yêu cầu hỗ trợ kỹ thuật tích hợp trong trang Hồ sơ Khách hàng.
 */
export function ProfileWarrantySection() {
  const { data: warrantyPage, isLoading: isLoadingWarranties } = useGetWarrantyRecordsQuery({
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
    <div className="space-y-5">
      {/* Khối 1: Hồ sơ Bảo hành điện tử */}
      <section className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Bảo hành điện tử của tôi ({warrantyPage?.totalElements ?? warranties.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tra cứu thời hạn bảo hành theo mã Serial và gửi yêu cầu kỹ thuật trực tuyến.
              </p>
            </div>
          </div>

          <Link
            to="/profile/warranties"
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            <span>Mở danh sách đầy đủ</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isLoadingWarranties ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải hồ sơ bảo hành...</p>
        ) : warranties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            Chưa có sản phẩm nào được kích hoạt bảo hành điện tử trên tài khoản này.
          </div>
        ) : (
          <div className="space-y-2.5">
            {warranties.map((w) => (
              <Link
                key={w.warrantyRecordId}
                to={`/profile/warranties/${w.warrantyRecordId}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3.5 hover:border-indigo-300 hover:bg-indigo-50/25 transition text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {w.warrantyCode}
                    </span>
                    <span className="font-bold text-slate-900 truncate">
                      {w.productName || w.sku || 'Thiết bị AquaSuite'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Serial: <strong className="font-mono">{w.serialNumber || '—'}</strong> • Hạn tới{' '}
                    <strong>{w.endDate}</strong>
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                  Còn {Math.max(0, w.remainingDays)} ngày
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Khối 2: Yêu cầu Bảo hành & Kỹ thuật */}
      <section className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <ClipboardList className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Yêu cầu bảo hành &amp; Hỗ trợ ({ticketPage?.totalElements ?? tickets.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi tiến độ xử lý của kỹ thuật viên và lịch hẹn tại công trình.
              </p>
            </div>
          </div>

          <Link
            to="/profile/warranty-tickets"
            className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition"
          >
            <span>Quản lý yêu cầu</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isLoadingTickets ? (
          <p className="py-6 text-center text-xs text-slate-500">Đang tải yêu cầu bảo hành...</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
            Bạn chưa gửi yêu cầu bảo hành nào.
          </div>
        ) : (
          <div className="space-y-2.5">
            {tickets.map((t) => (
              <div
                key={t.ticketId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-3.5 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {t.ticketCode}
                    </span>
                    <span className="font-bold text-slate-800 truncate">
                      {t.productName || t.warrantyCode || 'Phiếu hỗ trợ kỹ thuật'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{t.issueDescription}</p>
                </div>

                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shrink-0">
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

