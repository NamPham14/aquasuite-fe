import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  LogIn,
  MapPin,
  QrCode,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { formatVnd } from '../../shared/lib/money.ts'
import {
  useOnlineCheckout,
  type OnlinePaymentMethod,
  type PlaceOnlineOrderRequest,
} from '../../features/sales'

/**
 * Trang Đặt hàng & Chọn phương thức thanh toán trực tuyến (UC-18) theo phong cách Quiet-Luxury Showroom.
 */
export function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const {
    preview,
    isLoadingPreview,
    previewError,
    refetchPreview,
    isPlacingOrder,
    handlePlaceOrder,
  } = useOnlineCheckout(isAuthenticated)

  const [addressModeOverride, setAddressModeOverride] = useState<'saved' | 'manual' | null>(null)
  const [selectedAddressIdOverride, setSelectedAddressIdOverride] = useState<string>('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliverySchedule, setDeliverySchedule] = useState('')
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<OnlinePaymentMethod>('BANK_TRANSFER')

  const hasSavedAddresses = Boolean(preview && preview.savedAddresses.length > 0)
  const addressMode: 'saved' | 'manual' =
    addressModeOverride ?? (hasSavedAddresses ? 'saved' : 'manual')
  const selectedAddressId =
    selectedAddressIdOverride ||
    preview?.defaultAddress?.addressId ||
    preview?.savedAddresses[0]?.addressId ||
    ''

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload: PlaceOnlineOrderRequest =
      addressMode === 'saved' && selectedAddressId
        ? {
            addressId: selectedAddressId,
            deliverySchedule: deliverySchedule.trim() || undefined,
            note: note.trim() || undefined,
            paymentMethod,
          }
        : {
            recipientName: recipientName.trim() || undefined,
            recipientPhone: recipientPhone.trim() || undefined,
            deliveryAddress: deliveryAddress.trim(),
            deliverySchedule: deliverySchedule.trim() || undefined,
            note: note.trim() || undefined,
            paymentMethod,
          }

    const created = await handlePlaceOrder(payload)
    if (created) {
      navigate(`/checkout/result?orderId=${created.orderId}`, {
        state: { initialOrder: created },
      })
    }
  }

  if (isBootstrapping) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center space-y-3">
        <div className="w-7 h-7 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#6B6760]">Đang kiểm tra phiên đăng nhập khách hàng...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-12 border border-[#E6E2DA] bg-white px-8 py-14 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]">
          <LogIn className="h-5 w-5" />
        </div>
        <h1 className="font-editorial text-2xl font-normal text-[#171614]">
          Đăng nhập để đặt hàng trực tuyến
        </h1>
        <p className="text-xs text-[#6B6760] leading-relaxed">
          Vui lòng đăng nhập tài khoản khách hàng để sử dụng sổ địa chỉ và cổng thanh toán PayOS.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Đăng nhập khách hàng</span>
        </Link>
      </div>
    )
  }

  if (isLoadingPreview) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center space-y-3">
        <div className="w-7 h-7 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#6B6760]">
          Đang tải thông tin giỏ hàng và địa chỉ giao hàng...
        </p>
      </div>
    )
  }

  if (previewError && !preview) {
    return (
      <div className="max-w-lg mx-auto my-12 border border-[#E5B8B8] bg-white px-8 py-12 text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#991B1B]">
          Không thể tải phiên đặt hàng
        </p>
        <h1 className="font-editorial text-2xl font-normal text-[#171614]">
          Không thể tải dữ liệu đặt hàng
        </h1>
        <p className="text-xs text-[#6B6760]">
          Vui lòng thử tải lại hoặc quay về giỏ hàng để kiểm tra kết nối máy chủ.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void refetchPreview()}
            className="border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] cursor-pointer"
          >
            Thử lại
          </button>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 border border-[#D6D1C7] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại giỏ hàng</span>
          </Link>
        </div>
      </div>
    )
  }

  const cartItems = preview?.cart.items ?? []
  if (cartItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto my-12 border border-[#E6E2DA] bg-white px-8 py-14 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <h1 className="font-editorial text-2xl font-normal text-[#171614]">
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="text-xs text-[#6B6760]">
          Hãy thêm thiết bị vệ sinh vào giỏ hàng trước khi tiến hành đặt hàng trực tuyến.
        </p>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại giỏ hàng</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Tiến trình */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E6E2DA]">
        <div className="space-y-1.5">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại giỏ hàng</span>
          </Link>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#171614] tracking-[-0.01em]">
            Xác nhận đặt hàng &amp; Thanh toán
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6760]">
            Hoàn tất thông tin giao nhận công trình và chọn thanh toán VietQR PayOS hoặc tiền mặt (COD).
          </p>
        </div>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[#78736A]">
          <span>01 Giỏ hàng</span>
          <span aria-hidden="true">&rarr;</span>
          <span className="font-semibold text-[#171614] border-b border-[#171614] pb-0.5">
            02 Thanh toán
          </span>
        </div>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Thông tin giao hàng */}
          <section className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#8C6D46]" />
                <h2 className="font-editorial text-lg font-normal text-[#171614]">
                  Thông tin giao nhận
                </h2>
              </div>

              {preview && preview.savedAddresses.length > 0 && (
                <div className="inline-flex border border-[#D6D1C7] bg-[#FAF9F6] p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAddressModeOverride('saved')}
                    className={`px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      addressMode === 'saved'
                        ? 'bg-[#171614] text-[#FAF9F6]'
                        : 'text-[#6B6760] hover:text-[#171614]'
                    }`}
                  >
                    Địa chỉ đã lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressModeOverride('manual')}
                    className={`px-3.5 py-1.5 font-medium transition-colors cursor-pointer ${
                      addressMode === 'manual'
                        ? 'bg-[#171614] text-[#FAF9F6]'
                        : 'text-[#6B6760] hover:text-[#171614]'
                    }`}
                  >
                    Nhập địa chỉ mới
                  </button>
                </div>
              )}
            </div>

            {addressMode === 'saved' && preview && preview.savedAddresses.length > 0 ? (
              <div className="space-y-3">
                {preview.savedAddresses.map((addr) => {
                  const selected = selectedAddressId === addr.addressId
                  return (
                    <label
                      key={addr.addressId}
                      className={`block cursor-pointer border p-4 transition-colors ${
                        selected
                          ? 'border-[#171614] bg-[#FAF9F6]'
                          : 'border-[#E6E2DA] bg-white hover:border-[#B5AFA5]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="savedAddress"
                          value={addr.addressId}
                          checked={selected}
                          onChange={() => setSelectedAddressIdOverride(addr.addressId)}
                          className="mt-1 accent-[#171614]"
                        />
                        <div className="flex-1 text-xs space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#171614]">{addr.recipientName}</span>
                            <span className="text-[#78736A] tabular-nums">{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="border border-[#171614] bg-[#171614] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-medium text-[#FAF9F6]">
                                Mặc định
                              </span>
                            )}
                            {addr.label && (
                              <span className="border border-[#E6E2DA] bg-white px-2 py-0.5 text-[10px] text-[#6B6760]">
                                {addr.label}
                              </span>
                            )}
                          </div>
                          <p className="text-[#57534E] leading-relaxed">{addr.addressText}</p>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                    Người nhận hàng
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Bá Lâm"
                    className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                    Địa chỉ giao hàng chi tiết <span className="text-[#991B1B]">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                    className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E6E2DA] text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#8C6D46]" />
                  <span>Lịch giao hàng mong muốn</span>
                </label>
                <input
                  type="text"
                  value={deliverySchedule}
                  onChange={(e) => setDeliverySchedule(e.target.value)}
                  placeholder="Ví dụ: Sáng mai 9h - 11h"
                  className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                  Ghi chú đơn hàng
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Gọi điện trước khi giao..."
                  className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Phương thức thanh toán */}
          <section className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-5">
            <div className="pb-4 border-b border-[#E6E2DA]">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
                Hình thức thanh toán
              </p>
              <h2 className="font-editorial text-lg font-normal text-[#171614] mt-0.5">
                Phương thức thanh toán trực tuyến
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label
                className={`cursor-pointer border p-5 transition-colors ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-[#171614] bg-[#FAF9F6]'
                    : 'border-[#E6E2DA] bg-white hover:border-[#B5AFA5]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'BANK_TRANSFER'}
                    onChange={() => setPaymentMethod('BANK_TRANSFER')}
                    className="mt-1 accent-[#171614]"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#171614]">
                      <QrCode className="h-4 w-4 text-[#8C6D46]" />
                      <span>Chuyển khoản VietQR PayOS</span>
                    </div>
                    <p className="text-[11px] text-[#6B6760] leading-relaxed">
                      Quét mã QR Napas 24/7 và tự động xác nhận thanh toán ngay lập tức.
                    </p>
                    <span
                      className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] font-medium ${
                        preview?.payosConfigured
                          ? 'border-[#C6DDD0] bg-[#EEF5F1] text-[#245C42]'
                          : 'border-[#E6D3B3] bg-[#FAF5EB] text-[#854D0E]'
                      }`}
                    >
                      {preview?.payosConfigured ? 'PayOS sẵn sàng' : 'Chưa cấu hình PayOS'}
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer border p-5 transition-colors ${
                  paymentMethod === 'CASH'
                    ? 'border-[#171614] bg-[#FAF9F6]'
                    : 'border-[#E6E2DA] bg-white hover:border-[#B5AFA5]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="mt-1 accent-[#171614]"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-[#171614]">
                      <Banknote className="h-4 w-4 text-[#245C42]" />
                      <span>Thanh toán khi nhận hàng (COD)</span>
                    </div>
                    <p className="text-[11px] text-[#6B6760] leading-relaxed">
                      Thanh toán trực tiếp bằng tiền mặt cho nhân viên giao vận khi nhận sản phẩm.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <p className="text-[11px] text-[#78736A] pt-1">
              Lưu ý: Đơn hàng đặt trực tuyến khởi tạo ở trạng thái Chờ xác nhận (PENDING_CONFIRMATION) và không áp dụng công nợ (CREDIT).
            </p>
          </section>
        </div>

        {/* Cột phải: Tóm tắt đơn hàng */}
        <aside className="lg:col-span-5 border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-5 lg:sticky lg:top-24">
          <div className="pb-4 border-b border-[#E6E2DA]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
              Đơn hàng Showroom
            </p>
            <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
              Tóm tắt đơn hàng ({cartItems.length} sản phẩm)
            </h2>
          </div>

          <div className="divide-y divide-[#E6E2DA] max-h-80 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="py-3.5 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-medium text-[#171614]">{item.productName}</p>
                  <p className="text-[11px] text-[#78736A]">
                    {item.variantName} &middot; <span className="font-mono">{item.sku}</span> &middot; SL: {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="font-semibold text-[#171614] whitespace-nowrap tabular-nums">
                  {formatVnd(item.lineTotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-[#E6E2DA] pt-4 space-y-2.5 text-xs">
            <div className="flex justify-between text-[#57534E]">
              <span>Tạm tính</span>
              <span className="tabular-nums font-medium text-[#171614]">
                {formatVnd(preview?.cart.subtotal ?? 0)}
              </span>
            </div>
            <div className="flex justify-between text-[#57534E]">
              <span>Phí vận chuyển</span>
              <span className="tabular-nums font-medium text-[#171614]">
                {formatVnd(preview?.shippingFee ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-[#E6E2DA]">
              <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#171614]">
                Tổng thanh toán
              </span>
              <span className="text-2xl font-semibold text-[#171614] tabular-nums tracking-tight">
                {formatVnd(preview?.grandTotal ?? 0)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPlacingOrder || Boolean(preview?.cart.hasInvalidItems)}
            className="w-full h-12 px-5 border border-[#171614] bg-[#171614] hover:bg-[#2A2825] disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <span>
              {isPlacingOrder
                ? 'Đang tạo đơn hàng...'
                : paymentMethod === 'BANK_TRANSFER'
                  ? 'Đặt hàng & Mở mã QR PayOS'
                  : 'Xác nhận đặt hàng COD'}
            </span>
            <ArrowRight className="h-4 w-4 text-[#C5B091]" />
          </button>
        </aside>
      </form>
    </div>
  )
}
