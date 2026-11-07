import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CreditCard, Plus, Paperclip, Eye, Wallet, Clock, CheckCircle2, Info } from 'lucide-react'
import { formatVnd, formatDateTime } from '../../../shared/lib/money.ts'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import {
  useGetOrderMilestoneProgressQuery,
  useGetOrderPaymentsQuery,
  useUploadOrderPaymentProofMutation,
  useLazyGetOrderPaymentProofQuery,
} from '../api/orderPaymentApi.ts'
import type { OrderPaymentResponse } from '../types/orderPayment.types.ts'
import { RecordPaymentDialog } from './RecordPaymentDialog.tsx'

interface OrderPaymentPanelProps {
  orderId: string
  /** Người dùng có quyền ghi nhận thanh toán tại quầy (SALES_STAFF/SHOP_OWNER). */
  canRecord: boolean
  /** Đơn có đang ở trạng thái hợp lệ để nhận thanh toán không (ví dụ chưa hủy). */
  payable?: boolean
}

/**
 * Panel UC-23 — theo dõi & ghi nhận thanh toán của một đơn hàng.
 *
 * Gồm: tổng quan (đã xác minh / đang chờ / còn phải trả), tiến độ theo từng mốc
 * (chỉ tiền đã xác minh được phân bổ tuần tự vào mốc; PENDING hiển thị riêng),
 * lịch sử giao dịch và nút ghi nhận thanh toán. Thiết kế tách rời khỏi màn đơn
 * (UC-21) để tái sử dụng ở nơi khác chỉ với orderId.
 */
export function OrderPaymentPanel({ orderId, canRecord, payable = true }: OrderPaymentPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data: progress, isLoading: progressLoading, error: progressError } =
    useGetOrderMilestoneProgressQuery(orderId, { skip: !orderId })
  const { data: payments, isLoading: paymentsLoading } = useGetOrderPaymentsQuery(orderId, {
    skip: !orderId,
  })

  const remaining = progress?.remaining ?? 0
  const canOpenDialog = canRecord && payable && remaining > 0

  if (progressLoading) {
    return (
      <SectionCard>
        <div className="flex items-center gap-2 py-6 text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
          Đang tải thông tin thanh toán...
        </div>
      </SectionCard>
    )
  }

  if (progressError || !progress) {
    return (
      <SectionCard>
        <p className="py-4 text-slate-500">Không tải được thông tin thanh toán của đơn.</p>
      </SectionCard>
    )
  }

  return (
    <SectionCard>
      {/* Header + nút ghi nhận */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
          <span>Thanh toán theo tiến độ (UC-23)</span>
        </h4>
        {canRecord && (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!canOpenDialog}
            title={
              remaining <= 0
                ? 'Đơn đã thanh toán đủ'
                : !payable
                  ? 'Đơn không ở trạng thái nhận thanh toán'
                  : 'Ghi nhận khoản thanh toán'
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Ghi nhận thanh toán
          </button>
        )}
      </div>

      {/* Tổng quan ba chỉ số */}
      <div className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-3">
        <StatTile
          label="Đã xác minh"
          value={formatVnd(progress.verifiedPaid)}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          valueClass="text-emerald-700"
        />
        <StatTile
          label="Đang chờ xác minh"
          value={formatVnd(progress.pendingAmount)}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          valueClass="text-amber-600"
        />
        <StatTile
          label="Còn phải trả"
          value={formatVnd(progress.remaining)}
          icon={<Wallet className="h-4 w-4 text-rose-500" />}
          valueClass="text-rose-600"
        />
      </div>

      {/* Tiến độ theo mốc */}
      <div className="px-4 py-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Tiến độ theo mốc
        </div>
        {progress.hasMilestones ? (
          <ul className="space-y-2.5">
            {progress.milestones.map((m, idx) => {
              const pct = m.agreedAmount > 0 ? Math.min(100, (m.paidAmount / m.agreedAmount) * 100) : 0
              const done = m.remainingAmount <= 0
              return (
                <li key={m.milestoneId} className="rounded-md border border-slate-200 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      {idx + 1}. {m.stageName}
                    </span>
                    <span className="text-slate-500">{formatVnd(m.agreedAmount)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px]">
                    <span className="text-emerald-700">Đã trả: {formatVnd(m.paidAmount)}</span>
                    <span className={done ? 'text-emerald-600' : 'text-rose-600'}>
                      {done ? 'Hoàn tất' : `Còn ${formatVnd(m.remainingAmount)}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">
            Đơn không có mốc thanh toán theo thỏa thuận. Theo dõi theo tổng đơn ở trên.
          </p>
        )}
      </div>

      {/* Lịch sử giao dịch */}
      <div className="border-t border-slate-200 px-4 py-3">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Lịch sử thanh toán {payments ? `(${payments.length})` : ''}
        </div>
        {paymentsLoading ? (
          <p className="py-2 text-slate-400">Đang tải lịch sử...</p>
        ) : !payments || payments.length === 0 ? (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">Chưa có giao dịch nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3">Mã GD</th>
                  <th className="py-2 pr-3">Phương thức</th>
                  <th className="py-2 pr-3 text-right">Số tiền</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2 pr-3">Thời điểm</th>
                  <th className="py-2">Chứng từ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((txn) => (
                  <PaymentRow key={txn.transactionId} orderId={orderId} txn={txn} canUpload={canRecord} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialogOpen && (
        <RecordPaymentDialog orderId={orderId} remaining={remaining} onClose={() => setDialogOpen(false)} />
      )}
    </SectionCard>
  )
}

/** Khung thẻ dùng chung cho panel. */
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white text-xs shadow-2xs">
      {children}
    </div>
  )
}

/** Ô chỉ số tổng quan. */
function StatTile({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string
  value: string
  icon: React.ReactNode
  valueClass: string
}) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-0.5 text-sm font-bold ${valueClass}`}>{value}</div>
    </div>
  )
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  CREDIT: 'Công nợ',
}

const TXN_STATUS: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: 'Đã xác minh', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'Chờ xác minh', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  REJECTED: { label: 'Bị từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

/** Một dòng giao dịch; cho phép đính kèm chứng từ với chuyển khoản đang chờ. */
function PaymentRow({
  orderId,
  txn,
  canUpload,
}: {
  orderId: string
  txn: OrderPaymentResponse
  canUpload: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [upload, { isLoading }] = useUploadOrderPaymentProofMutation()
  const [fetchProof, { isFetching: isViewing }] = useLazyGetOrderPaymentProofQuery()
  const status = TXN_STATUS[txn.status] ?? { label: txn.status, className: 'bg-slate-50 text-slate-700 border-slate-200' }
  const isTransfer = txn.paymentMethod === 'BANK_TRANSFER'
  const isPendingTransfer = txn.status === 'PENDING' && isTransfer

  const handleFile = async (file?: File) => {
    if (!file) return
    try {
      await upload({ orderId, paymentId: txn.transactionId, file }).unwrap()
      toast.success('Đã tải lên chứng từ.')
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Lấy chứng từ (ảnh/PDF) rồi mở ở tab mới; nếu chưa có thì báo nhẹ nhàng.
  const handleView = async () => {
    try {
      const blob = await fetchProof({ orderId, paymentId: txn.transactionId }).unwrap()
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank', 'noopener,noreferrer')
      if (!win) {
        // Trình duyệt chặn popup: tải xuống thay vì mở tab.
        const a = document.createElement('a')
        a.href = url
        a.download = `chung-tu-${txn.transactionCode}`
        a.click()
      }
      // Thu hồi URL sau một lúc để tab kịp đọc.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error('Chưa có chứng từ cho giao dịch này hoặc không xem được.')
    }
  }

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="py-2 pr-3 font-mono text-[11px] text-slate-500">{txn.transactionCode}</td>
      <td className="py-2 pr-3">{METHOD_LABEL[txn.paymentMethod] ?? txn.paymentMethod}</td>
      <td className="py-2 pr-3 text-right font-semibold text-slate-900">{formatVnd(txn.amount)}</td>
      <td className="py-2 pr-3">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.className}`}>
          {status.label}
        </span>
        {txn.status === 'REJECTED' && txn.rejectReason && (
          <div
            className="mt-1 flex max-w-[220px] items-start gap-1 text-[10px] leading-snug text-slate-400"
            title={txn.rejectReason}
          >
            <Info className="mt-px h-2.5 w-2.5 shrink-0" />
            <span className="truncate italic">{txn.rejectReason}</span>
          </div>
        )}
      </td>
      <td className="py-2 pr-3 text-slate-500">{formatDateTime(txn.transactionDate)}</td>
      <td className="py-2">
        {isTransfer ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {isPendingTransfer && canUpload && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Paperclip className="h-3 w-3" />
                {isLoading ? 'Đang tải...' : 'Tải lên'}
              </button>
            )}
            <button
              type="button"
              onClick={handleView}
              disabled={isViewing}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="h-3 w-3" />
              {isViewing ? 'Đang mở...' : 'Xem'}
            </button>
          </div>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
    </tr>
  )
}
