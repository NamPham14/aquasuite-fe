import { useState } from 'react'
import {
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'
import type { DebtStatus } from '../../finance/types/customerDebt.types.ts'
import { useGetMyDebtDetailQuery } from '../api/customerTrackingApi.ts'

const DEBT_STATUS_META: Record<
  DebtStatus,
  { label: string; className: string }
> = {
  WITHIN_TERM: {
    label: 'Trong hạn thanh toán',
    className: 'border-[#14532D]/40 bg-[#F3F8F5] text-[#14532D]',
  },
  OVERDUE: {
    label: 'Có khoản quá hạn',
    className: 'border-[#991B1B]/40 bg-[#FEF2F2] text-[#991B1B]',
  },
  CREDIT_BLOCKED: {
    label: 'Vượt hạn mức công nợ',
    className: 'border-[#991B1B]/40 bg-[#FEF2F2] text-[#991B1B]',
  },
  BLACKLISTED: {
    label: 'Quá hạn trên 60 ngày',
    className: 'border-[#991B1B]/40 bg-[#FEF2F2] text-[#991B1B]',
  },
  BLOCKED: {
    label: 'Tài khoản công nợ đang khóa',
    className: 'border-[#991B1B]/40 bg-[#FEF2F2] text-[#991B1B]',
  },
  NO_CREDIT: {
    label: 'Thanh toán ngay · Không cấp hạn mức',
    className: 'border-[#D6D1C7] bg-[#FAF9F6] text-[#57534E]',
  },
  COD_REVIEW: {
    label: 'Đang đối soát COD',
    className: 'border-[#C5B091]/70 bg-[#FAF9F6] text-[#8C6D46]',
  },
}

type DebtLedgerTab = 'invoices' | 'orders' | 'receipts'

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

/**
 * Tab Theo dõi Công nợ, Hạn mức tín dụng, Hóa đơn & Biên lai thanh toán (/profile?tab=debt).
 */
export function ProfileDebtSection() {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetMyDebtDetailQuery()
  const [ledgerTab, setLedgerTab] = useState<DebtLedgerTab>('invoices')

  const errorStatus = getHttpStatus(error)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-[#E6E2DA] bg-white p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Credit &amp; Receivables
          </p>
          <h2 className="font-editorial text-2xl font-normal text-[#171614] mt-1">
            Công nợ, Hạn mức &amp; Hóa đơn
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Theo dõi dư nợ thực tế, hạn mức tín dụng khả dụng, hóa đơn điện tử đã phát hành và lịch sử phiếu thu đối soát.
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
          <div className="h-24 bg-[#171614]/10" />
          <div className="h-36 bg-[#FAF9F6]" />
        </div>
      ) : isError ? (
        <div className="border border-[#E6E2DA] bg-white p-10 text-center space-y-3">
          <Wallet className="h-9 w-9 mx-auto text-[#8C6D46] stroke-[1.3]" aria-hidden="true" />
          {errorStatus === 404 ? (
            <>
              <p className="font-editorial text-xl text-[#171614]">
                Chưa phát sinh hồ sơ công nợ khách hàng
              </p>
              <p className="text-xs text-[#78736A] max-w-md mx-auto leading-relaxed">
                Hồ sơ công nợ và hạn mức tín dụng được kích hoạt tự động khi bạn phát sinh đơn hàng hoặc ký hợp đồng dự án với AquaSuite.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-[#991B1B]">
                Không thể tải dữ liệu công nợ lúc này. Vui lòng thử lại.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="h-9 px-4 border border-[#171614] bg-[#171614] text-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold cursor-pointer"
              >
                Tải lại
              </button>
            </>
          )}
        </div>
      ) : data ? (
        <>
          {/* Obsidian KPI Summary Strip */}
          <div className="bg-[#171614] text-[#FAF9F6] border border-[#171614] p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5B091]">
                  Hồ sơ tín dụng · {data.customer.customerCode}
                </p>
                <p className="font-editorial text-xl text-white mt-0.5">
                  {data.customer.companyName || data.customer.customerName}
                </p>
              </div>
              <span
                className={`px-3 py-1 border text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  DEBT_STATUS_META[data.summary.debtStatus]?.className ??
                  'border-[#D6D1C7] bg-white text-[#171614]'
                }`}
              >
                {DEBT_STATUS_META[data.summary.debtStatus]?.label ?? data.summary.debtStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#A8A298]">
                  Tổng dư nợ hiện tại
                </p>
                <p className="font-editorial text-2xl text-white mt-1 tabular-nums">
                  {formatVnd(data.summary.outstandingBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#C5B091]">
                  Dư nợ quá hạn
                </p>
                <p
                  className={`font-editorial text-2xl mt-1 tabular-nums ${
                    data.summary.overdueBalance > 0 ? 'text-[#FCA5A5]' : 'text-white'
                  }`}
                >
                  {formatVnd(data.summary.overdueBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#A8A298]">
                  Hạn mức tín dụng
                </p>
                <p className="font-editorial text-2xl text-white mt-1 tabular-nums">
                  {formatVnd(data.summary.creditLimit)}
                </p>
                <p className="text-[11px] text-[#A8A298] mt-0.5">
                  {data.customer.creditTermDays
                    ? `Kỳ hạn ${data.customer.creditTermDays} ngày`
                    : 'Chưa cấp kỳ hạn'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#A8A298]">
                  Hạn mức khả dụng
                </p>
                <p className="font-editorial text-2xl text-[#C5B091] mt-1 tabular-nums">
                  {formatVnd(data.summary.availableCredit)}
                </p>
                {data.summary.nearestDueDate && (
                  <p className="text-[11px] text-[#A8A298] mt-0.5">
                    Đáo hạn gần nhất: {data.summary.nearestDueDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 pt-4 text-xs">
              <div>
                <span className="text-[#A8A298]">Đơn hàng chưa xuất hóa đơn: </span>
                <span className="text-white font-semibold tabular-nums">
                  {formatVnd(data.summary.unbilledCommitment)}
                </span>
              </div>
              <div>
                <span className="text-[#A8A298]">Dư hóa đơn điện tử: </span>
                <span className="text-white font-semibold tabular-nums">
                  {formatVnd(data.summary.issuedInvoiceReceivable)}
                </span>
              </div>
              <div>
                <span className="text-[#A8A298]">Khoản thu chưa đối trừ HĐ: </span>
                <span className="text-[#C5B091] font-semibold tabular-nums">
                  {formatVnd(data.summary.unallocatedAdvanceAmount)}
                </span>
              </div>
            </div>
          </div>

          {data.summary.overdueBalance > 0 && (
            <div className="border border-[#991B1B]/30 bg-[#FEF2F2] px-5 py-3.5 flex items-start gap-2.5 text-xs text-[#991B1B]">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                Bạn hiện có khoản công nợ quá hạn{' '}
                <strong className="tabular-nums">{formatVnd(data.summary.overdueBalance)}</strong>.
                Vui lòng đối soát thanh toán để đảm bảo tiến độ xuất hàng cho các đơn công trình tiếp theo.
              </p>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="border border-[#E6E2DA] bg-white">
            <div className="flex flex-wrap border-b border-[#E6E2DA] bg-[#FAF9F6]">
              {(
                [
                  {
                    key: 'invoices',
                    label: `Hóa đơn công nợ (${data.invoices.length})`,
                    icon: FileSpreadsheet,
                  },
                  {
                    key: 'orders',
                    label: `Đơn hàng ghi nợ (${data.orders.length})`,
                    icon: Wallet,
                  },
                  {
                    key: 'receipts',
                    label: `Biên lai thanh toán (${data.verifiedReceipts.length})`,
                    icon: Receipt,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon
                const active = ledgerTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLedgerTab(tab.key)}
                    className={`px-5 py-3.5 inline-flex items-center gap-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-[#171614] bg-white text-[#171614]'
                        : 'border-transparent text-[#6B6760] hover:text-[#171614]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {ledgerTab === 'invoices' && (
              <div className="overflow-x-auto">
                {data.invoices.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#78736A]">
                    Chưa có hóa đơn điện tử phát sinh công nợ.
                  </p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A] border-b border-[#E6E2DA]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Số hóa đơn</th>
                        <th className="py-3 px-4 font-semibold">Ngày phát hành</th>
                        <th className="py-3 px-4 font-semibold">Hạn thanh toán</th>
                        <th className="py-3 px-4 font-semibold text-right">Tổng tiền</th>
                        <th className="py-3 px-4 font-semibold text-right">Đã trả</th>
                        <th className="py-3 px-4 font-semibold text-right">Còn nợ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {data.invoices.map((inv) => (
                        <tr key={inv.invoiceId}>
                          <td className="py-3 px-4 font-mono font-semibold text-[#171614]">
                            {inv.invoiceCode}
                            {inv.invoiceSymbol ? (
                              <span className="block text-[10px] font-normal text-[#78736A]">
                                Ký hiệu: {inv.invoiceSymbol}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 text-[#57534E]">
                            {formatDateTime(inv.issueDate)}
                          </td>
                          <td className="py-3 px-4 text-[#171614] font-medium">
                            {inv.dueDate}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {formatVnd(inv.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#14532D] tabular-nums">
                            {formatVnd(inv.verifiedPaidAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#171614] tabular-nums">
                            {formatVnd(inv.outstandingAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {ledgerTab === 'orders' && (
              <div className="overflow-x-auto">
                {data.orders.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#78736A]">
                    Chưa có đơn hàng nào trong bảng công nợ.
                  </p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A] border-b border-[#E6E2DA]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Mã đơn</th>
                        <th className="py-3 px-4 font-semibold">Trạng thái</th>
                        <th className="py-3 px-4 font-semibold">Hạn thanh toán</th>
                        <th className="py-3 px-4 font-semibold text-right">Giá trị đơn</th>
                        <th className="py-3 px-4 font-semibold text-right">Đã thu</th>
                        <th className="py-3 px-4 font-semibold text-right">Còn lại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {data.orders.map((ord) => (
                        <tr key={ord.orderId}>
                          <td className="py-3 px-4 font-mono font-semibold text-[#171614]">
                            {ord.orderCode}
                          </td>
                          <td className="py-3 px-4 text-[#57534E]">
                            {ord.orderStatus} &middot; {ord.paymentStatus}
                          </td>
                          <td className="py-3 px-4 text-[#57534E]">{ord.dueDate ?? '—'}</td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            {formatVnd(ord.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right text-[#14532D] tabular-nums">
                            {formatVnd(ord.verifiedPaidAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#171614] tabular-nums">
                            {formatVnd(ord.outstandingAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {ledgerTab === 'receipts' && (
              <div className="overflow-x-auto">
                {data.verifiedReceipts.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#78736A]">
                    Chưa có biên lai thanh toán nào được kế toán xác nhận.
                  </p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A] border-b border-[#E6E2DA]">
                      <tr>
                        <th className="py-3 px-4 font-semibold">Mã giao dịch</th>
                        <th className="py-3 px-4 font-semibold">Thời gian thu</th>
                        <th className="py-3 px-4 font-semibold">Hình thức</th>
                        <th className="py-3 px-4 font-semibold">Trạng thái</th>
                        <th className="py-3 px-4 font-semibold text-right">Số tiền đã thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {data.verifiedReceipts.map((rcp) => (
                        <tr key={rcp.transactionId}>
                          <td className="py-3 px-4 font-mono font-semibold text-[#171614]">
                            {rcp.transactionCode}
                          </td>
                          <td className="py-3 px-4 text-[#57534E]">
                            {formatDateTime(rcp.transactionDate)}
                          </td>
                          <td className="py-3 px-4 text-[#57534E]">
                            {rcp.paymentMethod || 'Chuyển khoản / Tiền mặt'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[#14532D] font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Đã xác nhận
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#171614] tabular-nums">
                            {formatVnd(rcp.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
