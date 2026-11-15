import { useEffect, useRef, useState } from 'react'
import { usePayOS } from '@payos/payos-checkout'
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Landmark,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OnlineOrderCheckoutResponse } from '../types/onlineCheckout.types.ts'

interface PayosCheckoutPanelProps {
  order: OnlineOrderCheckoutResponse
  isVerifying: boolean
  isRefreshing: boolean
  onVerify: (silent?: boolean) => Promise<unknown>
  onRefreshLink: () => Promise<unknown>
}

const PAYOS_EMBEDDED_CONTAINER_ID = 'aquasuite-payos-embedded'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

/**
 * Panel hiển thị & nhúng cổng thanh toán PayOS (Napas 24/7 VietQR) dùng SDK @payos/payos-checkout.
 * Tự động mở khung PayOS với chiều cao chuẩn để hiển thị trọn vẹn mã QR không bị thanh cuộn.
 */
export function PayosCheckoutPanel({
  order,
  isVerifying,
  isRefreshing,
  onVerify,
  onRefreshLink,
}: PayosCheckoutPanelProps) {
  const [embeddedClosed, setEmbeddedClosed] = useState(false)
  const onVerifyRef = useRef(onVerify)

  const payos = order.payosPayment
  const isPaid = order.paymentStatus === 'PAID' || payos?.status === 'PAID'
  const isExpiredOrCancelled = payos?.status === 'EXPIRED' || payos?.status === 'CANCELLED'
  const checkoutUrl = payos?.checkoutUrl ?? ''
  const returnUrl = `${window.location.origin}/checkout/result?orderId=${order.orderId}`
  const showEmbedded = !embeddedClosed && !isPaid && !isExpiredOrCancelled && Boolean(checkoutUrl)

  const { open, exit } = usePayOS({
    RETURN_URL: returnUrl,
    ELEMENT_ID: PAYOS_EMBEDDED_CONTAINER_ID,
    CHECKOUT_URL: checkoutUrl,
    embedded: true,
    onSuccess: () => {
      setEmbeddedClosed(true)
      void onVerifyRef.current(false)
    },
    onCancel: () => {
      setEmbeddedClosed(true)
      toast.info('Bạn đã đóng cửa sổ thanh toán PayOS')
    },
    onExit: () => {
      setEmbeddedClosed(true)
    },
  })

  const payosControlsRef = useRef({ open, exit })

  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  useEffect(() => {
    payosControlsRef.current = { open, exit }
  }, [open, exit])

  // Tự động nhúng khung PayOS khi có checkoutUrl hợp lệ và dọn sạch khi unmount/đổi link
  useEffect(() => {
    if (!showEmbedded) {
      return
    }
    const container = document.getElementById(PAYOS_EMBEDDED_CONTAINER_ID)
    if (!container) {
      return
    }
    container.replaceChildren()
    const controls = payosControlsRef.current
    try {
      controls.open()
    } catch {
      // Fallback vẫn có nút mở tab PayOS mới bên phải
    }

    return () => {
      try {
        controls.exit()
      } catch {
        // Bỏ qua nếu iframe đã bị đóng trước đó
      }
      container.replaceChildren()
    }
  }, [showEmbedded, checkoutUrl, returnUrl])

  // Tự động kiểm tra trạng thái thanh toán từ Backend mỗi 5 giây khi đơn PayOS chưa thanh toán
  useEffect(() => {
    if (isPaid || !payos?.payosOrderCode) {
      return
    }
    const timer = window.setInterval(() => {
      void onVerifyRef.current(true)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [isPaid, payos?.payosOrderCode])

  const handleCopy = (label: string, value: string | null | undefined) => {
    if (!value) return
    void navigator.clipboard.writeText(value)
    toast.success(`Đã sao chép ${label}`)
  }

  if (!payos) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 space-y-3">
        <p className="font-semibold">Đơn hàng chưa có thông tin link thanh toán PayOS.</p>
        <button
          type="button"
          onClick={() => void onRefreshLink()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Tạo mã thanh toán PayOS ngay
        </button>
      </div>
    )
  }

  if (isPaid) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-900">
              Thanh toán PayOS thành công!
            </h3>
            <p className="text-xs text-emerald-700">
              Mã giao dịch PayOS #{payos.payosOrderCode} đã được xác nhận thanh toán đủ.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-emerald-900">
          <div className="rounded-lg bg-white/80 p-3 border border-emerald-100">
            <span className="text-emerald-600 block">Số tiền đã nhận</span>
            <strong className="text-sm font-bold">
              {formatCurrency(payos.amountPaid || payos.amount)}
            </strong>
          </div>
          <div className="rounded-lg bg-white/80 p-3 border border-emerald-100">
            <span className="text-emerald-600 block">Tài khoản thụ hưởng</span>
            <strong className="font-semibold">
              {payos.accountName ?? 'OCB'} ({payos.accountNumber ?? '---'})
            </strong>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-emerald-50/50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cổng thanh toán VietQR Napas 24/7 — PayOS
            </h3>
            <p className="text-xs text-slate-500">
              Mã giao dịch PayOS:{' '}
              <span className="font-mono font-semibold text-slate-700">{payos.payosOrderCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Tự đồng bộ mỗi 5s
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            {payos.status}
          </span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái: Khung PayOS Embedded hiển thị trọn vẹn mã QR */}
        <div className="lg:col-span-7">
          {showEmbedded ? (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div
                id={PAYOS_EMBEDDED_CONTAINER_ID}
                className="h-[620px] w-full bg-white"
              />
            </div>
          ) : (
            <div className="h-[360px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <QrCode className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  {isExpiredOrCancelled
                    ? 'Mã QR thanh toán đã hết hạn hoặc bị hủy'
                    : 'Khung QR PayOS đang được ẩn'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  {isExpiredOrCancelled
                    ? 'Bấm tạo lại link PayOS mới để nhận mã VietQR còn hiệu lực.'
                    : 'Bấm nút bên dưới để mở lại mã QR ngay tại trang hoặc mở trang PayOS trong tab mới.'}
                </p>
              </div>
              {isExpiredOrCancelled ? (
                <button
                  type="button"
                  onClick={() => {
                    setEmbeddedClosed(false)
                    void onRefreshLink()
                  }}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Tạo lại link PayOS
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmbeddedClosed(false)}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
                >
                  <QrCode className="h-4 w-4" />
                  Hiển thị lại mã QR PayOS
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cột phải: Thông tin chuyển khoản nhanh & nút đối soát */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-medium text-sky-700 block">
                Số tiền thanh toán qua PayOS
              </span>
              <span className="text-2xl font-extrabold text-sky-800">
                {formatCurrency(payos.amount)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('số tiền', String(payos.amount))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 cursor-pointer"
              title="Sao chép số tiền"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 divide-y divide-slate-200 text-xs">
            <div className="p-3.5 flex items-center justify-between gap-2">
              <div>
                <div className="text-slate-500 flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 text-slate-400" />
                  Chủ tài khoản nhận
                </div>
                <div className="mt-1 font-bold text-slate-900">
                  {payos.accountName ?? 'NGUYEN BA LAM'}
                </div>
                <div className="text-[11px] text-slate-500">
                  Ngân hàng OCB • BIN: {payos.bin ?? '970448'}
                </div>
              </div>
            </div>

            <div className="p-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-slate-500">Số tài khoản nhận (VA PayOS)</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-slate-900 truncate">
                  {payos.accountNumber ?? '---'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('số tài khoản', payos.accountNumber)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Sao chép số tài khoản"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-3.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-slate-500">Nội dung chuyển khoản</div>
                <div className="mt-0.5 font-mono text-xs font-bold text-slate-900 break-all">
                  {payos.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('nội dung chuyển khoản', payos.description)}
                className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="Sao chép nội dung"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => void onVerify(false)}
              disabled={isVerifying}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
              Tôi đã chuyển khoản — Kiểm tra ngay
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Mở tab PayOS mới
                </a>
              )}

              {showEmbedded && (
                <button
                  type="button"
                  onClick={() => setEmbeddedClosed(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Thu gọn khung QR
                </button>
              )}
            </div>

            {isExpiredOrCancelled && (
              <button
                type="button"
                onClick={() => {
                  setEmbeddedClosed(false)
                  void onRefreshLink()
                }}
                disabled={isRefreshing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Tạo lại link PayOS mới
              </button>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
            <Smartphone className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              Mở app ngân hàng bất kỳ (hoặc ví hỗ trợ VietQR) quét mã bên cạnh. Sau khi chuyển
              xong, hệ thống sẽ tự xác nhận <strong>PAID</strong> trong vòng 2–5 giây.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
