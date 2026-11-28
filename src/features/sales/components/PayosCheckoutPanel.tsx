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
import { formatVnd } from '../../../shared/lib/money.ts'
import type { OnlineOrderCheckoutResponse } from '../types/onlineCheckout.types.ts'

interface PayosCheckoutPanelProps {
  order: OnlineOrderCheckoutResponse
  isVerifying: boolean
  isRefreshing: boolean
  onVerify: (silent?: boolean) => Promise<unknown>
  onRefreshLink: () => Promise<unknown>
}

const PAYOS_EMBEDDED_CONTAINER_ID = 'aquasuite-payos-embedded'

/**
 * Panel hiển thị & nhúng cổng thanh toán PayOS (Napas 24/7 VietQR) dùng SDK @payos/payos-checkout.
 * Phong cách Quiet-Luxury Showroom: khung đường mảnh, tông đá ấm và xác nhận đối soát tức thì.
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
      <div className="border border-[#E6D3B3] bg-[#FAF5EB] p-6 text-sm text-[#854D0E] space-y-4">
        <p className="font-semibold">Đơn hàng chưa có thông tin link thanh toán PayOS.</p>
        <button
          type="button"
          onClick={() => void onRefreshLink()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Tạo mã thanh toán PayOS ngay</span>
        </button>
      </div>
    )
  }

  if (isPaid) {
    return (
      <div className="border border-[#C6DDD0] bg-[#EEF5F1] p-6 sm:p-8 space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#B7D5C5] bg-white text-[#245C42]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-editorial text-xl font-normal text-[#1E4734]">
              Thanh toán PayOS thành công
            </h3>
            <p className="text-xs text-[#245C42]">
              Mã giao dịch PayOS <strong className="font-mono">#{payos.payosOrderCode}</strong> đã được xác nhận thanh toán đủ.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#1E4734]">
          <div className="bg-white p-4 border border-[#C6DDD0]">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#245C42] block">
              Số tiền đã nhận
            </span>
            <strong className="text-lg font-semibold tabular-nums mt-1 block">
              {formatVnd(payos.amountPaid || payos.amount)}
            </strong>
          </div>
          <div className="bg-white p-4 border border-[#C6DDD0]">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#245C42] block">
              Tài khoản thụ hưởng
            </span>
            <strong className="font-semibold mt-1 block">
              {payos.accountName ?? 'OCB'} ({payos.accountNumber ?? '---'})
            </strong>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#E6E2DA] bg-white overflow-hidden">
      <div className="border-b border-[#E6E2DA] bg-[#FAF9F6] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center border border-[#171614] bg-[#171614] text-[#FAF9F6]">
            <QrCode className="h-5 w-5 text-[#C5B091]" />
          </div>
          <div>
            <h3 className="font-editorial text-lg font-normal text-[#171614]">
              Cổng thanh toán VietQR Napas 24/7 &mdash; PayOS
            </h3>
            <p className="text-xs text-[#6B6760]">
              Mã giao dịch PayOS:{' '}
              <span className="font-mono font-semibold text-[#171614]">{payos.payosOrderCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 border border-[#C6DDD0] bg-[#EEF5F1] px-3 py-1 text-[11px] font-medium text-[#245C42]">
            Tự đồng bộ mỗi 5s
          </span>
          <span className="inline-flex items-center gap-1.5 border border-[#E6D3B3] bg-[#FAF5EB] px-3 py-1 text-[11px] font-semibold text-[#854D0E]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{payos.status}</span>
          </span>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái: Khung PayOS Embedded hiển thị trọn vẹn mã QR */}
        <div className="lg:col-span-7">
          {showEmbedded ? (
            <div className="border border-[#E6E2DA] bg-white overflow-hidden">
              <div
                id={PAYOS_EMBEDDED_CONTAINER_ID}
                className="h-[620px] w-full bg-white"
              />
            </div>
          ) : (
            <div className="h-[380px] border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center border border-[#E6E2DA] bg-white text-[#8C6D46]">
                <QrCode className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <p className="font-editorial text-xl text-[#171614]">
                  {isExpiredOrCancelled
                    ? 'Mã QR thanh toán đã hết hạn hoặc bị hủy'
                    : 'Khung QR PayOS đang được thu gọn'}
                </p>
                <p className="text-xs text-[#6B6760] max-w-sm leading-relaxed">
                  {isExpiredOrCancelled
                    ? 'Bấm tạo lại link PayOS mới để nhận mã VietQR còn hiệu lực.'
                    : 'Bấm nút bên dưới để mở lại mã QR ngay tại trang hoặc mở cổng PayOS trong tab mới.'}
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
                  className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Tạo lại link PayOS</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEmbeddedClosed(false)}
                  className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] cursor-pointer"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>Hiển thị lại mã QR PayOS</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cột phải: Thông tin chuyển khoản & đối soát */}
        <div className="lg:col-span-5 space-y-5">
          <div className="border border-[#171614] bg-[#FAF9F6] p-5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#78736A] block">
                Số tiền thanh toán qua PayOS
              </span>
              <span className="text-2xl font-semibold text-[#171614] tabular-nums mt-1 block">
                {formatVnd(payos.amount)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('số tiền', String(payos.amount))}
              className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] hover:border-[#171614] cursor-pointer transition-colors"
              title="Sao chép số tiền"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </button>
          </div>

          <div className="border border-[#E6E2DA] bg-[#FAF9F6] divide-y divide-[#E6E2DA] text-xs">
            <div className="p-4 flex items-center justify-between gap-2">
              <div>
                <div className="text-[#78736A] flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]">
                  <Landmark className="h-3.5 w-3.5 text-[#8C6D46]" />
                  <span>Chủ tài khoản nhận</span>
                </div>
                <div className="mt-1.5 font-semibold text-[#171614]">
                  {payos.accountName ?? 'NGUYEN BA LAM'}
                </div>
                <div className="text-[11px] text-[#78736A] mt-0.5">
                  Ngân hàng OCB &middot; BIN: {payos.bin ?? '970448'}
                </div>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#78736A]">
                  Số tài khoản nhận (VA PayOS)
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-[#171614] truncate">
                  {payos.accountNumber ?? '---'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('số tài khoản', payos.accountNumber)}
                className="shrink-0 border border-[#D6D1C7] bg-white p-2 text-[#57534E] hover:border-[#171614] hover:text-[#171614] cursor-pointer transition-colors"
                title="Sao chép số tài khoản"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.12em] text-[#78736A]">
                  Nội dung chuyển khoản
                </div>
                <div className="mt-1 font-mono text-xs font-semibold text-[#171614] break-all">
                  {payos.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('nội dung chuyển khoản', payos.description)}
                className="shrink-0 border border-[#D6D1C7] bg-white p-2 text-[#57534E] hover:border-[#171614] hover:text-[#171614] cursor-pointer transition-colors"
                title="Sao chép nội dung"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void onVerify(false)}
              disabled={isVerifying}
              className="w-full h-12 inline-flex items-center justify-center gap-2 border border-[#245C42] bg-[#245C42] px-4 text-[11px] uppercase tracking-[0.14em] font-semibold text-white hover:bg-[#1E4734] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Tôi đã chuyển khoản — Kiểm tra ngay</span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 inline-flex items-center justify-center gap-1.5 border border-[#D6D1C7] bg-white px-3 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] hover:border-[#171614] transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Mở tab PayOS mới</span>
                </a>
              )}

              {showEmbedded && (
                <button
                  type="button"
                  onClick={() => setEmbeddedClosed(true)}
                  className="h-10 inline-flex items-center justify-center gap-1.5 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-[11px] uppercase tracking-[0.12em] font-medium text-[#57534E] hover:border-[#171614] hover:text-[#171614] cursor-pointer transition-colors"
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
                className="w-full h-10 inline-flex items-center justify-center gap-2 border border-[#171614] bg-[#171614] px-4 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Tạo lại link PayOS mới</span>
              </button>
            )}
          </div>

          <div className="border-l-2 border-[#8C6D46] bg-[#FAF9F6] px-4 py-3 flex items-start gap-2.5 text-[11px] text-[#57534E] leading-relaxed">
            <Smartphone className="h-4 w-4 text-[#8C6D46] shrink-0 mt-0.5" />
            <span>
              Mở app ngân hàng bất kỳ hỗ trợ VietQR quét mã bên cạnh. Sau khi chuyển xong, hệ thống tự xác nhận <strong>PAID</strong> trong 2–5 giây.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
