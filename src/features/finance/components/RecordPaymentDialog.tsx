import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Banknote, Landmark, AlertTriangle, ArrowLeft } from 'lucide-react'
import {
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useRecordOrderPaymentMutation } from '../api/orderPaymentApi.ts'
import type { RecordablePaymentMethod } from '../types/orderPayment.types.ts'

interface RecordPaymentDialogProps {
  orderId: string
  /** Số tiền còn phải trả của đơn (để chặn ghi vượt nghĩa vụ ngay tại FE). */
  remaining: number
  onClose: () => void
  /** Gọi sau khi ghi nhận thành công (ví dụ để đóng dialog / toast). */
  onRecorded?: () => void
}

/**
 * Dialog ghi nhận một khoản thanh toán cho đơn (UC-23).
 *
 * Tiền mặt sẽ được backend ghi VERIFIED ngay; chuyển khoản ghi PENDING chờ xác minh (UC-70).
 * FE chặn trước số tiền <= 0 và > số còn phải trả; backend vẫn là nơi thực thi cuối cùng.
 * Mỗi lần mở dialog sinh một idempotencyKey để chống ghi trùng khi bấm gửi nhiều lần.
 *
 * Vì tiền mặt được ghi VERIFIED ngay và không có luồng xóa/đảo bút toán trong UC-23,
 * dialog dùng quy trình hai bước (nhập -> xác nhận lại số tiền đã định dạng) để giảm rủi ro
 * gõ nhầm; có cảnh báo mềm khi số tiền nhỏ bất thường.
 */
export function RecordPaymentDialog({ orderId, remaining, onClose, onRecorded }: RecordPaymentDialogProps) {
  // Khóa chống ghi trùng cố định theo vòng đời dialog: gửi lại cùng form không tạo giao dịch mới.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [])
  const [method, setMethod] = useState<RecordablePaymentMethod>('CASH')
  const [amountText, setAmountText] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [description, setDescription] = useState('')
  // Bước hiện tại: 'form' nhập liệu, 'confirm' xác nhận lại trước khi ghi.
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [record, { isLoading }] = useRecordOrderPaymentMutation()

  // amountText chỉ chứa chữ số (không dấu phân cách) để tính toán; hiển thị thì nhóm nghìn.
  const amount = amountText === '' ? NaN : Number(amountText)
  const amountInvalid = amountText === '' || Number.isNaN(amount) || amount <= 0
  // Số tiền đã định dạng dấu chấm để HIỂN THỊ dưới ô (không chèn vào ô nhập để tránh nhảy con trỏ).
  const amountGrouped = amountText === '' ? '' : amountText.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const exceeds = !amountInvalid && amount > remaining
  // Cảnh báo mềm (không chặn): số tiền nhỏ bất thường dễ là gõ nhầm.
  const suspiciouslySmall = !amountInvalid && amount < 1000
  const error = amountInvalid
    ? amountText.trim() === ''
      ? undefined
      : 'Số tiền phải lớn hơn 0.'
    : exceeds
      ? `Số tiền vượt số còn phải trả (${formatVnd(remaining)}).`
      : undefined

  const submit = async () => {
    try {
      const txn = await record({
        orderId,
        body: {
          idempotencyKey,
          amount,
          paymentMethod: method,
          referenceNo: referenceNo.trim() || undefined,
          description: description.trim() || undefined,
        },
      }).unwrap()
      toast.success(
        txn.status === 'VERIFIED'
          ? `Đã ghi nhận ${formatVnd(amount)} tiền mặt (đã xác minh).`
          : `Đã ghi nhận ${formatVnd(amount)} chuyển khoản, chờ kế toán xác minh.`,
      )
      onRecorded?.()
      onClose()
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (amountInvalid || exceeds || isLoading) return
    // Bước 1 chỉ chuyển sang xác nhận; chỉ bước 2 mới thực sự gọi API ghi nhận.
    if (step === 'form') {
      setStep('confirm')
      return
    }
    await submit()
  }

  const methodLabel = method === 'CASH' ? 'Tiền mặt (xác minh ngay)' : 'Chuyển khoản (chờ xác minh)'

  return (
    <ManagementDialog
      title={step === 'confirm' ? 'Xác nhận ghi nhận' : 'Ghi nhận thanh toán'}
      onClose={onClose}
      closeDisabled={isLoading}
    >
      <ManagementForm
        onSubmit={handleSubmit}
        onClose={onClose}
        submitLabel={step === 'confirm' ? 'Xác nhận ghi nhận' : 'Tiếp tục'}
        submitDisabled={amountInvalid || exceeds || isLoading}
        closeDisabled={isLoading}
      >
        {step === 'confirm' ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStep('form')}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-800 disabled:opacity-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại chỉnh sửa
            </button>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
              <div className="text-xs text-slate-500">Vui lòng xác nhận số tiền</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatVnd(amount)}</div>
              <div className="mt-1 text-xs text-slate-600">{methodLabel}</div>
            </div>
            {(referenceNo.trim() || description.trim()) && (
              <dl className="space-y-1 text-xs text-slate-600">
                {referenceNo.trim() && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Mã tham chiếu</dt>
                    <dd className="font-medium text-slate-800">{referenceNo.trim()}</dd>
                  </div>
                )}
                {description.trim() && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Ghi chú</dt>
                    <dd className="font-medium text-slate-800">{description.trim()}</dd>
                  </div>
                )}
              </dl>
            )}
            {suspiciouslySmall && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Số tiền nhỏ bất thường. Khoản tiền mặt được xác minh ngay và không thể tự hoàn/đảo trong màn này — hãy kiểm tra kỹ trước khi xác nhận.
              </p>
            )}
            {method === 'CASH' && (
              <p className="text-[11px] text-slate-500">
                Lưu ý: tiền mặt sẽ được ghi nhận ở trạng thái <strong>đã xác minh</strong> và cộng ngay vào số đã trả của đơn.
              </p>
            )}
          </div>
        ) : (
          <>
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Còn phải trả: <strong className="text-rose-600">{formatVnd(remaining)}</strong>
        </div>

        <ManagementFormField id="payment-method" label="Phương thức">
          <div className="mt-1 grid grid-cols-2 gap-2">
            <MethodOption
              active={method === 'CASH'}
              onClick={() => setMethod('CASH')}
              icon={<Banknote className="h-4 w-4" />}
              label="Tiền mặt"
              hint="Xác minh ngay"
            />
            <MethodOption
              active={method === 'BANK_TRANSFER'}
              onClick={() => setMethod('BANK_TRANSFER')}
              icon={<Landmark className="h-4 w-4" />}
              label="Chuyển khoản"
              hint="Chờ xác minh"
            />
          </div>
        </ManagementFormField>

        <ManagementFormField
          id="payment-amount"
          label="Số tiền (VND)"
          error={error}
          hint={amountGrouped ? `= ${amountGrouped} ₫` : 'Chỉ nhập số, ví dụ 30000000'}
        >
          <input
            id="payment-amount"
            type="text"
            inputMode="numeric"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value.replace(/\D/g, ''))}
            className={managementFieldClass}
            placeholder="0"
            autoFocus
            aria-invalid={Boolean(error)}
          />
        </ManagementFormField>

        {method === 'BANK_TRANSFER' && (
          <ManagementFormField id="payment-reference" label="Mã tham chiếu chuyển khoản" hint="Không bắt buộc">
            <input
              id="payment-reference"
              type="text"
              maxLength={255}
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              className={managementFieldClass}
              placeholder="VD: FT24xxxxxx"
            />
          </ManagementFormField>
        )}

        <ManagementFormField id="payment-description" label="Ghi chú" hint="Không bắt buộc">
          <input
            id="payment-description"
            type="text"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={managementFieldClass}
            placeholder="Ghi chú thanh toán"
          />
        </ManagementFormField>
          </>
        )}
      </ManagementForm>
    </ManagementDialog>
  )
}

/** Nút chọn phương thức thanh toán dạng thẻ, dùng lại trong dialog. */
function MethodOption({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline-2 focus-visible:outline-sky-600 ${
        active
          ? 'border-sky-500 bg-sky-50 text-sky-800'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      <span className={active ? 'text-sky-600' : 'text-slate-400'}>{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold leading-tight">{label}</span>
        <span className="block text-[11px] text-slate-500">{hint}</span>
      </span>
    </button>
  )
}
