import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  LogIn,
  AlertCircle,
  Info,
  ArrowLeft,
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
 * Trang Quản lý Giỏ hàng dành cho khách hàng (UC-17) theo thẩm mỹ Quiet-Luxury Showroom.
 * Hỗ trợ đầy đủ cả giỏ hàng đồng bộ DB lẫn giỏ hàng tạm tải dữ liệu live từ catalog API.
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
        className="py-24 flex flex-col items-center justify-center text-center space-y-3"
      >
        <div className="w-7 h-7 border-2 border-[#171614] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#6B6760] tracking-wide">
          Đang kiểm tra phiên đăng nhập...
        </p>
      </div>
    )
  }

  if (isGuestCart && totalItems === 0) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white border border-[#E6E2DA] px-8 py-14 text-center space-y-5">
        <div className="w-14 h-14 border border-[#E6E2DA] bg-[#FAF9F6] text-[#78736A] flex items-center justify-center mx-auto">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C6D46]">
            Showroom Thám Vân
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl font-normal text-[#171614]">
            Giỏ hàng của bạn đang trống
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6760] leading-relaxed">
            Bạn có thể chọn sản phẩm trực tiếp từ Showroom hoặc đăng nhập tài khoản để đồng bộ giỏ hàng hiện có.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#171614] bg-[#171614] hover:bg-transparent hover:text-[#171614] text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors"
          >
            <span>Khám phá sản phẩm</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-3 border border-[#D6D1C7] bg-white hover:border-[#171614] text-[#171614] text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-[#8C6D46]" />
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E6E2DA]">
        <div className="space-y-1.5">
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tiếp tục xem sản phẩm</span>
          </Link>
          <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#171614] tracking-[-0.01em]">
            Giỏ hàng của tôi
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6760]">
            Rà soát cấu hình thiết bị, kiểm tra tồn kho khả dụng trước khi xác nhận đơn hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isGuestCart && (
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className="h-10 inline-flex items-center gap-1.5 px-4 border border-[#D6D1C7] bg-white hover:border-[#171614] text-[11px] uppercase tracking-[0.14em] font-medium text-[#171614] disabled:opacity-45 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="h-10 inline-flex items-center gap-2 px-5 border border-[#171614] bg-[#171614] hover:bg-[#2A2825] text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#C5B091]" />
            <span>Chọn thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Guest Cart Info Banner */}
      {isGuestCart && (
        <div className="border-l-2 border-[#8C6D46] bg-[#F2EFE9] px-5 py-4 flex flex-wrap items-center justify-between gap-4 text-[#171614] text-xs">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-[#8C6D46] shrink-0" />
            <span>
              Giỏ hàng đang lưu tạm trên trình duyệt với giá và tồn kho trực tiếp từ Showroom. Đăng nhập để giữ đồng bộ tài khoản và thanh toán qua <strong>VietQR PayOS / COD</strong>.
            </span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#171614] bg-[#171614] text-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold hover:bg-[#2A2825] transition-colors shrink-0"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập ngay</span>
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {isError && error && (
        <div className="p-4 border border-[#E5B8B8] bg-[#FEF2F2] flex items-center justify-between gap-4 text-[#991B1B] text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error.message}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-4 py-1.5 bg-white border border-[#E5B8B8] text-[#991B1B] text-[11px] uppercase tracking-[0.12em] font-semibold hover:border-[#991B1B] transition-colors cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-white border border-[#E6E2DA] p-14 text-center space-y-3">
          <div className="w-7 h-7 border-2 border-[#171614] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#6B6760]">
            Đang tải dữ liệu giỏ hàng...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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
