import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  LogIn,
  MapPin,
  QrCode,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import {
  useOnlineCheckout,
  type OnlinePaymentMethod,
  type PlaceOnlineOrderRequest,
} from '../../features/sales'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value)
}

/**
 * Trang Đặt hàng & Chọn phương thức thanh toán trực tuyến (UC-18).
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
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        Đang kiểm tra phiên đăng nhập khách hàng...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-600">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Đăng nhập để đặt hàng trực tuyến</h1>
        <p className="text-xs text-slate-500">
          Vui lòng đăng nhập tài khoản khách hàng để sử dụng sổ địa chỉ và cổng thanh toán PayOS.
        </p>
        <Link
          to="/login-customer"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <LogIn className="h-4 w-4" />
          Đăng nhập khách hàng
        </Link>
      </div>
    )
  }

  if (isLoadingPreview) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        Đang tải thông tin giỏ hàng và địa chỉ giao hàng...
      </div>
    )
  }

  if (previewError && !preview) {
    return (
      <div className="max-w-lg mx-auto my-12 rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm space-y-4">
        <h1 className="text-lg font-bold text-slate-900">Không thể tải dữ liệu đặt hàng</h1>
        <p className="text-xs text-slate-500">
          Vui lòng thử tải lại hoặc quay về giỏ hàng để kiểm tra kết nối Backend.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetchPreview()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer"
          >
            Thử lại
          </button>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại giỏ hàng
          </Link>
        </div>
      </div>
    )
  }

  const cartItems = preview?.cart.items ?? []
  if (cartItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto my-12 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Giỏ hàng của bạn đang trống</h1>
        <p className="text-xs text-slate-500">
          Hãy thêm thiết bị vệ sinh vào giỏ hàng trước khi tiến hành đặt hàng trực tuyến.
        </p>
        <Link
          to="/cart"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại giỏ hàng
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại giỏ hàng
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Đặt hàng & Thanh toán trực tuyến</h1>
          <p className="text-xs text-slate-500">
            Xác nhận địa chỉ giao hàng và chọn thanh toán chuyển khoản VietQR PayOS hoặc COD.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-600" />
                Thông tin giao hàng
              </h2>
              {preview && preview.savedAddresses.length > 0 && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setAddressModeOverride('saved')}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      addressMode === 'saved'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Địa chỉ đã lưu
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddressModeOverride('manual')}
                    className={`rounded-md px-3 py-1 font-semibold transition ${
                      addressMode === 'manual'
                        ? 'bg-white text-sky-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nhập địa chỉ mới
                  </button>
                </div>
              )}
            </div>

            {addressMode === 'saved' && preview && preview.savedAddresses.length > 0 ? (
              <div className="space-y-2.5">
                {preview.savedAddresses.map((addr) => {
                  const selected = selectedAddressId === addr.addressId
                  return (
                    <label
                      key={addr.addressId}
                      className={`block cursor-pointer rounded-xl border p-3.5 transition ${
                        selected
                          ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="savedAddress"
                          value={addr.addressId}
                          checked={selected}
                          onChange={() => setSelectedAddressIdOverride(addr.addressId)}
                          className="mt-1 accent-sky-600"
                        />
                        <div className="flex-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{addr.recipientName}</span>
                            <span className="text-slate-500">{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                Mặc định
                              </span>
                            )}
                            {addr.label && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {addr.label}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-slate-600">{addr.addressText}</p>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người nhận hàng</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Bá Lâm"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Địa chỉ giao hàng chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-slate-400" />
                  Lịch giao hàng mong muốn
                </label>
                <input
                  type="text"
                  value={deliverySchedule}
                  onChange={(e) => setDeliverySchedule(e.target.value)}
                  placeholder="Ví dụ: Sáng mai 9h - 11h"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú đơn hàng</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Gọi điện trước khi giao..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-sky-600" />
              Phương thức thanh toán trực tuyến
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'BANK_TRANSFER'}
                    onChange={() => setPaymentMethod('BANK_TRANSFER')}
                    className="mt-1 accent-sky-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <QrCode className="h-4 w-4 text-sky-600" />
                      Chuyển khoản VietQR PayOS
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Quét mã QR Napas 24/7 (tài khoản OCB) và tự động xác nhận thanh toán.
                    </p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        preview?.payosConfigured
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {preview?.payosConfigured ? 'PayOS đã cấu hình' : 'Chưa cấu hình key PayOS'}
                    </span>
                  </div>
                </div>
              </label>

              <label
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  paymentMethod === 'CASH'
                    ? 'border-sky-500 bg-sky-50/60 ring-1 ring-sky-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="mt-1 accent-sky-600"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      Thanh toán khi nhận hàng (COD)
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Thanh toán trực tiếp bằng tiền mặt cho nhân viên giao vận khi nhận sản phẩm.
                    </p>
                  </div>
                </div>
              </label>
            </div>

            <p className="text-[11px] text-slate-500">
              Lưu ý: Kênh đặt hàng Online bắt đầu ở trạng thái Chờ xác nhận (PENDING_CONFIRMATION) và không áp dụng hình thức công nợ (CREDIT).
            </p>
          </section>
        </div>

        <aside className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Tóm tắt đơn hàng ({cartItems.length} sản phẩm)</h2>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {cartItems.map((item) => (
              <div key={item.cartItemId} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{item.productName}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.variantName} • SKU: {item.sku} • SL: {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="font-semibold text-slate-900 whitespace-nowrap">
                  {formatCurrency(item.lineTotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Tạm tính</span>
              <span>{formatCurrency(preview?.cart.subtotal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phí vận chuyển</span>
              <span>{formatCurrency(preview?.shippingFee ?? 0)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
              <span>Tổng cộng</span>
              <span className="text-sky-700">{formatCurrency(preview?.grandTotal ?? 0)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPlacingOrder || Boolean(preview?.cart.hasInvalidItems)}
            className="w-full rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
          >
            {isPlacingOrder
              ? 'Đang tạo đơn hàng...'
              : paymentMethod === 'BANK_TRANSFER'
                ? 'Đặt hàng & Mở mã QR PayOS'
                : 'Xác nhận đặt hàng COD'}
          </button>
        </aside>
      </form>
    </div>
  )
}
