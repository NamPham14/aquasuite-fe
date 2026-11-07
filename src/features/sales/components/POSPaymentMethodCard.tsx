import { useState } from 'react'
import {
  Banknote,
  QrCode,
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import type { AllowedPosPaymentMethod, CreditCheckResponse } from '../types/salesOrder.types'
import { useCheckCustomerCreditMutation } from '../api/salesOrderApi'

interface POSPaymentMethodCardProps {
  paymentMethod: AllowedPosPaymentMethod
  onChangePaymentMethod: (method: AllowedPosPaymentMethod) => void
  customerId?: string
  orderAmount: number
}

export function POSPaymentMethodCard({
  paymentMethod,
  onChangePaymentMethod,
  customerId,
  orderAmount,
}: POSPaymentMethodCardProps) {
  const [checkCredit, { isLoading: isCheckingCredit }] = useCheckCustomerCreditMutation()
  const [creditResult, setCreditResult] = useState<CreditCheckResponse | null>(null)
  const [creditError, setCreditError] = useState<string | null>(null)

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const handlePreCheckCredit = async () => {
    if (!customerId) {
      setCreditError('Vui lòng chọn khách hàng cụ thể từ CRM trước khi kiểm tra hạn mức mua nợ.')
      return
    }
    setCreditError(null)
    setCreditResult(null)

    try {
      const res = await checkCredit({
        customerId,
        body: {
          orderChannel: 'COUNTER',
          newOrderAmount: Math.max(0.01, orderAmount),
        },
      }).unwrap()
      setCreditResult(res)
    } catch (err: any) {
      setCreditError(err?.data?.message || 'Không thể kiểm tra hạn mức từ phân hệ Credit Control.')
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Banknote className="w-4 h-4 text-sky-600" />
          <span>Phương thức thanh toán</span>
        </h4>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* TIỀN MẶT */}
        <button
          type="button"
          onClick={() => {
            onChangePaymentMethod('CASH')
            setCreditResult(null)
            setCreditError(null)
          }}
          className={`p-3 rounded-lg border text-left transition flex flex-col items-start gap-1.5 ${
            paymentMethod === 'CASH'
              ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500 text-sky-900'
              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
          }`}
        >
          <div className="p-1 rounded bg-emerald-50 text-emerald-600">
            <Banknote className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">Tiền mặt</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Thu tiền tại quầy</div>
          </div>
        </button>

        {/* CHUYỂN KHOẢN */}
        <button
          type="button"
          onClick={() => {
            onChangePaymentMethod('BANK_TRANSFER')
            setCreditResult(null)
            setCreditError(null)
          }}
          className={`p-3 rounded-lg border text-left transition flex flex-col items-start gap-1.5 ${
            paymentMethod === 'BANK_TRANSFER'
              ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500 text-sky-900'
              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
          }`}
        >
          <div className="p-1 rounded bg-sky-50 text-sky-600">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">Chuyển khoản</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Quét mã QR / Banking</div>
          </div>
        </button>

        {/* CÔNG NỢ */}
        <button
          type="button"
          onClick={() => onChangePaymentMethod('CREDIT')}
          className={`p-3 rounded-lg border text-left transition flex flex-col items-start gap-1.5 ${
            paymentMethod === 'CREDIT'
              ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500 text-indigo-900'
              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
          }`}
        >
          <div className="p-1 rounded bg-indigo-50 text-indigo-600">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold">Mua nợ (Credit)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Đối tác / Thầu thợ</div>
          </div>
        </button>
      </div>

      {/* LỰA CHỌN CREDIT & NÚT KIỂM TRA HẠN MỨC (TÍCH HỢP HÀO) */}
      {paymentMethod === 'CREDIT' && (
        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg space-y-2 text-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-indigo-950">
                Thanh toán bằng Công nợ (Credit Control)
              </p>
              <p className="text-[11px] text-indigo-700/80 mt-0.5">
                Khi tạo đơn, Backend sẽ tự động thẩm định hạn mức nợ qua hệ thống của Hào. Nếu vượt hạn mức hoặc có nợ xấu, đơn sẽ bị từ chối.
              </p>
            </div>

            {/* NÚT 2: KIỂM TRA HẠN MỨC TÍN DỤNG (TÍCH HỢP HÀO - CREDIT CONTROL) */}
            <button
              type="button"
              disabled={isCheckingCredit}
              onClick={handlePreCheckCredit}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-2xs"
            >
              {isCheckingCredit ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang kiểm tra...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Kiểm tra hạn mức</span>
                </>
              )}
            </button>
          </div>

          {/* KẾT QUẢ PRE-CHECK CÔNG NỢ */}
          {creditResult && (
            <div
              className={`p-2.5 rounded border text-[11px] mt-2 flex items-start gap-2 ${
                creditResult.approved
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {creditResult.approved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  {creditResult.approved
                    ? 'Đủ điều kiện mua nợ!'
                    : `Không đủ điều kiện mua nợ (${creditResult.reasonCode || 'Vượt hạn mức/Nợ xấu'})`}
                </div>
                <div className="mt-0.5 text-[10.5px] space-x-2">
                  <span>Hạn mức: {formatMoney(creditResult.creditLimit || 0)}</span>
                  <span>•</span>
                  <span>Khả dụng: {formatMoney(creditResult.availableCredit || 0)}</span>
                  {creditResult.overdueBalance > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-rose-600">
                        Nợ quá hạn: {formatMoney(creditResult.overdueBalance)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {creditError && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{creditError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
