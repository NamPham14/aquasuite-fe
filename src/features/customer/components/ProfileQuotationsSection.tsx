import { useState } from 'react'
import { ExternalLink, FileCheck2, RefreshCw } from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'
import { isSafeHttpUrl } from '../../sales/lib/comboComponents.ts'
import type { QuotationStatus } from '../../sales/types/quotation.types.ts'
import { CustomerEditorialModal } from '../../servicedesk/components/CustomerEditorialModal.tsx'
import {
  useGetMyQuotationDetailQuery,
  useGetMyQuotationsQuery,
} from '../api/customerTrackingApi.ts'

const QUOTATION_STATUS_META: Record<
  QuotationStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: 'Bản nháp',
    className: 'bg-[#FAF9F6] text-[#78736A] border-[#D6D1C7]',
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    className: 'bg-[#FAF9F6] text-[#8C6D46] border-[#C5B091]',
  },
  APPROVED: {
    label: 'Đã duyệt hiệu lực',
    className: 'bg-[#FAF9F6] text-[#171614] border-[#171614]/35',
  },
  SENT: {
    label: 'Đã gửi khách hàng',
    className: 'bg-[#171614] text-[#FAF9F6] border-[#171614]',
  },
  ACCEPTED: {
    label: 'Đã chốt dự án',
    className: 'bg-[#F3F8F5] text-[#14532D] border-[#14532D]/35',
  },
  SUPERSEDED: {
    label: 'Đã thay bằng bản mới',
    className: 'bg-[#F5F2EC] text-[#78736A] border-[#D6D1C7]',
  },
  LOST: {
    label: 'Ngừng theo đuổi',
    className: 'bg-[#FEF2F2] text-[#991B1B] border-[#991B1B]/30',
  },
  REJECTED: {
    label: 'Không được duyệt',
    className: 'bg-[#FEF2F2] text-[#991B1B] border-[#991B1B]/30',
  },
}

/**
 * Tab Báo giá dự án / công trình dành cho Khách hàng (/profile?tab=quotations).
 */
export function ProfileQuotationsSection() {
  const {
    data: quotations = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetMyQuotationsQuery()

  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null)

  const {
    data: detail,
    isFetching: isLoadingDetail,
    isError: isDetailError,
  } = useGetMyQuotationDetailQuery(selectedQuotationId ?? '', {
    skip: !selectedQuotationId,
  })

  return (
    <div className="space-y-6">
      <div className="border border-[#E6E2DA] bg-white p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Project Quotations
          </p>
          <h2 className="font-editorial text-2xl font-normal text-[#171614] mt-1">
            Báo giá dự án &amp; Công trình ({quotations.length})
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Tra cứu các bảng chào giá chính thức, lộ trình thanh toán theo mốc và đơn hàng công trình đã chuyển đổi.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="h-9 px-3.5 inline-flex items-center gap-2 border border-[#D6D1C7] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Làm mới</span>
        </button>
      </div>

      {isLoading ? (
        <div className="border border-[#E6E2DA] bg-white p-8 space-y-3 animate-pulse">
          <div className="h-5 w-44 bg-[#EFECE6]" />
          <div className="h-24 bg-[#FAF9F6]" />
        </div>
      ) : isError ? (
        <div className="border border-[#991B1B]/30 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-[#991B1B]">
            Không tải được danh sách báo giá. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-9 px-4 border border-[#171614] bg-[#171614] text-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold cursor-pointer"
          >
            Tải lại
          </button>
        </div>
      ) : quotations.length === 0 ? (
        <div className="border border-[#E6E2DA] bg-white p-12 text-center space-y-3">
          <FileCheck2 className="h-9 w-9 mx-auto text-[#8C6D46] stroke-[1.3]" aria-hidden="true" />
          <p className="font-editorial text-xl text-[#171614]">
            Chưa có báo giá công trình nào được gửi
          </p>
          <p className="text-xs text-[#78736A] max-w-md mx-auto leading-relaxed">
            Các bảng báo giá chính thức từ đội ngũ kinh doanh AquaSuite dành cho biệt thự hoặc công trình của bạn sẽ tự động hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotations.map((q) => {
            const meta = QUOTATION_STATUS_META[q.status] ?? QUOTATION_STATUS_META.SENT
            return (
              <article
                key={q.quotationId}
                className="border border-[#E6E2DA] bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-[#171614]">
                      {q.quotationCode} · Rev.{q.revisionNo}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 border text-[10px] font-semibold uppercase tracking-[0.12em] ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                    {q.orderCode && (
                      <span className="border border-[#14532D]/30 bg-[#F3F8F5] text-[#14532D] px-2.5 py-0.5 font-mono text-[10px] font-semibold">
                        Đơn hàng: {q.orderCode}
                      </span>
                    )}
                  </div>
                  <h3 className="font-editorial text-lg text-[#171614] truncate">
                    {q.projectName}
                  </h3>
                  <p className="text-xs text-[#78736A]">
                    Ngày lập: {q.quotationDate} &middot; Hiệu lực đến:{' '}
                    <span className="text-[#171614] font-medium">{q.validUntil}</span>
                    {q.createdByName ? ` · Phụ trách: ${q.createdByName}` : ''}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">
                      Tổng giá trị báo giá
                    </p>
                    <p className="font-editorial text-xl text-[#171614] tabular-nums">
                      {formatVnd(q.totalAmount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedQuotationId(q.quotationId)}
                    className="h-9 px-4 border border-[#171614] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:bg-[#171614] hover:text-[#FAF9F6] transition-colors cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {selectedQuotationId && (
        <CustomerEditorialModal
          eyebrow="Hồ sơ báo giá chính thức"
          title={
            detail
              ? `${detail.quotationCode} (Rev.${detail.revisionNo}) · ${detail.projectName}`
              : 'Đang tải chi tiết báo giá...'
          }
          onClose={() => setSelectedQuotationId(null)}
          maxWidthClass="w-[min(95vw,860px)]"
        >
          <div className="p-6 space-y-6">
            {isLoadingDetail ? (
              <div className="py-10 text-center text-xs text-[#78736A]">
                Đang tải hạng mục báo giá...
              </div>
            ) : isDetailError || !detail ? (
              <div className="py-8 text-center text-xs text-[#991B1B]">
                Không tải được chi tiết báo giá. Vui lòng đóng và thử lại.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[#E6E2DA] bg-[#FAF9F6] p-4 text-xs">
                  <div className="space-y-1">
                    <p>
                      <span className="text-[#78736A]">Ngày lập:</span>{' '}
                      <span className="font-medium text-[#171614]">{detail.quotationDate}</span>
                    </p>
                    <p>
                      <span className="text-[#78736A]">Hiệu lực đến:</span>{' '}
                      <span className="font-medium text-[#171614]">{detail.validUntil}</span>
                    </p>
                    {detail.deliverySchedule && (
                      <p>
                        <span className="text-[#78736A]">Lịch giao dự kiến:</span>{' '}
                        <span className="font-medium text-[#171614]">
                          {detail.deliverySchedule}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {detail.deliveryAddress && (
                      <p>
                        <span className="text-[#78736A]">Công trình:</span>{' '}
                        <span className="font-medium text-[#171614]">
                          {detail.deliveryAddress}
                        </span>
                      </p>
                    )}
                    {detail.orderCode && (
                      <p>
                        <span className="text-[#78736A]">Đã chuyển thành đơn:</span>{' '}
                        <span className="font-mono font-semibold text-[#14532D]">
                          {detail.orderCode}
                        </span>
                      </p>
                    )}
                    {detail.acceptedAt && (
                      <p>
                        <span className="text-[#78736A]">Ngày chốt:</span>{' '}
                        <span className="font-medium text-[#171614]">
                          {formatDateTime(detail.acceptedAt)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Hạng mục */}
                <div className="border border-[#E6E2DA] overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A] border-b border-[#E6E2DA]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">SKU &amp; Thiết bị</th>
                        <th className="py-2.5 px-3 font-semibold text-right">SL</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {detail.items.map((item) => (
                        <tr key={item.quotationItemId}>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-[#171614]">
                              {item.variantName || item.sku}
                            </p>
                            <p className="font-mono text-[10px] text-[#78736A]">{item.sku}</p>
                            {item.isBackorder && (
                              <p className="text-[11px] text-[#8C6D46] mt-0.5">
                                Đặt hàng thêm: {item.backorderQty ?? 0} {item.unit}
                                {item.leadTimeDays
                                  ? ` · Giao trong ~${item.leadTimeDays} ngày`
                                  : ''}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {formatVnd(item.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                            {formatVnd(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mốc thanh toán & điều kiện đặt cọc */}
                {(detail.milestones.length > 0 || detail.depositAmount != null) && (
                  <div className="border border-[#E6E2DA] bg-[#FAF9F6] p-4 space-y-2.5 text-xs">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A] font-semibold">
                      Điều khoản thanh toán &amp; Đặt cọc
                    </p>
                    <div className="flex flex-wrap gap-4 text-[#171614]">
                      {detail.depositAmount != null && (
                        <span>
                          Đặt cọc:{' '}
                          <strong className="tabular-nums">
                            {formatVnd(detail.depositAmount)}
                          </strong>
                          {detail.depositPercent != null ? ` (${detail.depositPercent}%)` : ''}
                        </span>
                      )}
                      {detail.creditTermDays != null && (
                        <span>Công nợ còn lại trong {detail.creditTermDays} ngày</span>
                      )}
                    </div>
                    {detail.milestones.length > 0 && (
                      <ul className="divide-y divide-[#E6E2DA] border border-[#E6E2DA] bg-white">
                        {detail.milestones.map((m, idx) => (
                          <li
                            key={m.milestoneId ?? `${m.stageName}-${idx}`}
                            className="px-3 py-2 flex items-center justify-between"
                          >
                            <span>{m.stageName}</span>
                            <span className="font-semibold tabular-nums">{m.percent}%</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Tổng hợp tài chính */}
                {detail.summary && (
                  <div className="border-t border-[#E6E2DA] pt-4 flex flex-col items-end space-y-1.5 text-xs">
                    <div className="w-full sm:w-80 flex justify-between text-[#57534E]">
                      <span>Tổng giá niêm yết</span>
                      <span className="tabular-nums">
                        {formatVnd(detail.summary.listPriceTotal)}
                      </span>
                    </div>
                    {detail.summary.totalDiscount > 0 && (
                      <div className="w-full sm:w-80 flex justify-between text-[#8C6D46]">
                        <span>Chiết khấu dự án</span>
                        <span className="tabular-nums">
                          -{formatVnd(detail.summary.totalDiscount)}
                        </span>
                      </div>
                    )}
                    <div className="w-full sm:w-80 flex justify-between text-[#57534E]">
                      <span>Thuế VAT ({detail.summary.vatRate}%)</span>
                      <span className="tabular-nums">{formatVnd(detail.summary.vatAmount)}</span>
                    </div>
                    {detail.summary.shippingFee > 0 && (
                      <div className="w-full sm:w-80 flex justify-between text-[#57534E]">
                        <span>Phí vận chuyển</span>
                        <span className="tabular-nums">
                          {formatVnd(detail.summary.shippingFee)}
                        </span>
                      </div>
                    )}
                    <div className="w-full sm:w-80 flex justify-between pt-2 border-t border-[#E6E2DA] text-sm font-semibold text-[#171614]">
                      <span>Tổng thanh toán</span>
                      <span className="tabular-nums">
                        {formatVnd(detail.summary.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tài liệu đính kèm nếu có URL hợp lệ */}
                {(Boolean(detail.pdfUrl && isSafeHttpUrl(detail.pdfUrl)) ||
                  Boolean(detail.signedFileUrl && isSafeHttpUrl(detail.signedFileUrl))) && (
                  <div className="flex flex-wrap gap-3 pt-2 border-t border-[#E6E2DA]">
                    {detail.pdfUrl && isSafeHttpUrl(detail.pdfUrl) && (
                      <a
                        href={detail.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3.5 inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614]"
                      >
                        <span>Bản PDF báo giá</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                    {detail.signedFileUrl && isSafeHttpUrl(detail.signedFileUrl) && (
                      <a
                        href={detail.signedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-3.5 inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614]"
                      >
                        <span>Hồ sơ đã ký</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CustomerEditorialModal>
      )}
    </div>
  )
}
