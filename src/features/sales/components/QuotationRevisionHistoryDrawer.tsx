import { X, GitCommit, ArrowRight, Loader2, Calendar, FileText, CheckCircle2 } from 'lucide-react'
import { useGetRevisionHistoryQuery } from '../api/quotationApi'
import { QuotationStatusBadge } from './QuotationStatusBadge'
import type { QuotationListItemResponse } from '../types/quotation.types'

interface QuotationRevisionHistoryDrawerProps {
  quotationCode: string
  currentRevisionNo?: number
  isOpen: boolean
  onClose: () => void
  onSelectRevision: (quotationId: string) => void
}

export function QuotationRevisionHistoryDrawer({
  quotationCode,
  currentRevisionNo,
  isOpen,
  onClose,
  onSelectRevision,
}: QuotationRevisionHistoryDrawerProps) {
  const { data: revisions, isLoading, isError, error } = useGetRevisionHistoryQuery(quotationCode, {
    skip: !isOpen || !quotationCode,
  })

  if (!isOpen) return null

  const formatMoney = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const items: QuotationListItemResponse[] = Array.isArray(revisions)
    ? revisions
    : (revisions as any)?.data ?? []

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Lịch sử Phiên bản</h3>
                <p className="text-xs text-slate-500 font-medium">Mã báo giá: {quotationCode}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
              aria-label="Đóng ngăn kéo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Timeline */}
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="w-7 h-7 text-sky-600 animate-spin" />
                <p className="text-xs font-medium text-slate-500">Đang tải các phiên bản đàm phán...</p>
              </div>
            ) : isError ? (
              <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-center">
                <p className="text-xs text-rose-700 font-medium">
                  {(error as any)?.data?.message || 'Không thể tải lịch sử phiên bản đàm phán.'}
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Chưa có phiên bản nào được ghi nhận.</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {items.map((item) => {
                  const isCurrent = currentRevisionNo !== undefined && item.revisionNo === currentRevisionNo
                  const isAccepted = item.status === 'ACCEPTED'
                  const isSuperseded = item.status === 'SUPERSEDED'

                  return (
                    <div key={item.quotationId} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition ${
                          isAccepted
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : isCurrent
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : isSuperseded
                            ? 'border-slate-300 bg-slate-100'
                            : 'border-slate-400'
                        }`}
                      >
                        {isAccepted && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                      </div>

                      {/* Card */}
                      <div
                        onClick={() => onSelectRevision(item.quotationId)}
                        className={`cursor-pointer rounded-xl border p-4 transition shadow-2xs hover:shadow-md ${
                          isCurrent
                            ? 'bg-sky-50/50 border-sky-300 ring-1 ring-sky-200'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-800 text-white">
                              rev.{item.revisionNo}
                            </span>
                            {isCurrent && (
                              <span className="text-2xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                                Đang xem
                              </span>
                            )}
                          </div>
                          <QuotationStatusBadge status={item.status} />
                        </div>

                        <div className="text-sm font-bold text-slate-900 mb-1">
                          {formatMoney(item.totalAmount)}
                        </div>

                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Ngày lập: {item.quotationDate}</span>
                          </div>
                          {item.createdByName && (
                            <div className="text-2xs text-slate-400">Người lập: {item.createdByName}</div>
                          )}
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-sky-700 font-semibold group-hover:text-sky-800">
                          <span>Xem chi tiết bản này</span>
                          <ArrowRight className="w-3.5 h-3.5 transition transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

