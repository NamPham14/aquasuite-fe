import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  LogIn,
  AlertCircle,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import {
  useCustomerCart,
  CustomerCartTable,
  CustomerCartSummary,
  CartProductPickerDrawer,
} from '../../features/sales'

/**
 * Trang Quản lý Giỏ hàng dành cho khách hàng (UC-17).
 * Hỗ trợ đầy đủ cả giỏ hàng đồng bộ tài khoản lẫn giỏ hàng tạm của khách vãng lai.
 */
export function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const {
    isGuestCart,
    items,
    totalItems,
    totalQuantity,
    subtotal,
    hasInvalidItems,
    isLoading,
    isFetching,
    isError,
    error,
    isAdding,
    isClearing,
    pendingItemIds,
    refetch,
    handleAddItem,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCustomerCart(isAuthenticated)

  const existingQuantitiesByVariant = useMemo(() => {
    const map: Record<string, number> = {}
    items.forEach((item) => {
      map[item.variantId] = item.quantity
    })
    return map
  }, [items])

  if (isBootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="py-20 flex flex-col items-center justify-center text-center"
      >
        <div className="w-9 h-9 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-600">
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    )
  }

  if (isGuestCart && totalItems === 0) {
    return (
      <div className="max-w-lg mx-auto my-10 bg-white/95 border border-sky-200/80 rounded-3xl p-8 text-center shadow-md shadow-sky-950/5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-extrabold text-slate-900">
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Bạn có thể thêm sản phẩm trực tiếp từ Showroom hoặc đăng nhập tài khoản khách hàng để đồng bộ giỏ hàng hiện có.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/storefront#catalog"
            className="aqua-shine-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold transition shadow-md shadow-sky-500/20"
          >
            <span>Khám phá sản phẩm</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-slate-700 text-xs font-semibold transition"
          >
            <LogIn className="w-4 h-4 text-sky-600" />
            <span>Đăng nhập khách hàng</span>
          </Link>
        </div>
      </div>
    )
  }

  const handleProceedCheckout = () => {
    if (totalItems === 0 || hasInvalidItems) return
    if (isGuestCart) {
      toast.info('Vui lòng đăng nhập để đồng bộ giỏ hàng và tiến hành thanh toán')
      navigate('/login')
      return
    }
    toast.info('Đang chuyển sang bước Đặt hàng trực tuyến (UC-18)')
    navigate('/checkout')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-sky-600" />
            <span>Giỏ hàng của tôi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm tra danh sách thiết bị vệ sinh, điều chỉnh số lượng trước khi đặt hàng trực tuyến.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!isGuestCart && (
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-sky-600' : ''}`} />
              <span>Làm mới</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="aqua-shine-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-bold transition shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chọn thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Guest Cart Info Banner */}
      {isGuestCart && (
        <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200 flex flex-wrap items-center justify-between gap-3 text-sky-900 text-xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              Giỏ hàng đang được lưu tạm trên trình duyệt. Đăng nhập để giữ đồng bộ với tài khoản và thanh toán qua <strong>VietQR PayOS / COD</strong>.
            </span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập ngay</span>
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {isError && error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 text-rose-800 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error.message}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600">
            Đang tải dữ liệu giỏ hàng...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <CustomerCartTable
              items={items}
              pendingItemIds={pendingItemIds}
              isClearing={isClearing}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onOpenProductPicker={() => setIsPickerOpen(true)}
            />
          </div>

          <div className="lg:col-span-4">
            <CustomerCartSummary
              totalItems={totalItems}
              totalQuantity={totalQuantity}
              subtotal={subtotal}
              hasInvalidItems={hasInvalidItems}
              isLoading={isLoading || isFetching}
              isGuestCart={isGuestCart}
              onProceedCheckout={handleProceedCheckout}
            />
          </div>
        </div>
      )}

      <CartProductPickerDrawer
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddVariant={handleAddItem}
        existingQuantitiesByVariant={existingQuantitiesByVariant}
        isAdding={isAdding}
      />
    </div>
  )
}
