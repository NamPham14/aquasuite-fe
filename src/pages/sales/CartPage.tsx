import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  LogIn,
  AlertCircle,
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
 * Chỉ tổ chức bố cục màn hình và điều phối các thành phần từ features/sales.
 */
export function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isBootstrapping } = useAuth()
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  const {
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

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white border border-slate-200 rounded-xl p-8 text-center shadow-2xs">
        <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">
          Đăng nhập để quản lý giỏ hàng
        </h1>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Giỏ hàng được đồng bộ trực tiếp với tài khoản khách hàng của bạn để bảo đảm tồn kho và đơn giá chính xác.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/login-customer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập khách hàng</span>
          </Link>
          <Link
            to="/register-customer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <span>Đăng ký tài khoản</span>
          </Link>
        </div>
      </div>
    )
  }

  const handleProceedCheckout = () => {
    if (totalItems === 0 || hasInvalidItems) return
    toast.info('Đang chuyển sang bước Đặt hàng trực tuyến (UC-18)')
    navigate('/checkout')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-sky-600" />
            <span>Giỏ hàng của tôi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kiểm tra danh sách thiết bị vệ sinh, điều chỉnh số lượng trước khi đặt hàng trực tuyến.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-50 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-sky-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chọn thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {isError && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 text-rose-800 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error.message}</span>
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-3 py-1.5 rounded-md bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
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

