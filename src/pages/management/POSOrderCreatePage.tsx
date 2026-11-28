import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ShoppingCart,
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Truck,
  Store,
  Tag,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { usePOSCart } from '../../features/sales/hooks/usePOSCart'
import { useCreateSalesOrderMutation } from '../../features/sales/api/salesOrderApi'
import { POSCartTable } from '../../features/sales/components/POSCartTable'
import { POSCustomerSection } from '../../features/sales/components/POSCustomerSection'
import { POSPaymentMethodCard } from '../../features/sales/components/POSPaymentMethodCard'
import { POSOrderSuccessModal } from '../../features/sales/components/POSOrderSuccessModal'
import { ProductSelectionDrawer } from '../../features/sales/components/ProductSelectionDrawer'
import { CreditProfileRequestForm } from '../../features/finance/components/CreditProfileRequestForm'
import { ManagementDialog } from '../../shared/ui/ManagementDialog'
import { ManagementPageHeader, ManagementPageShell } from '../../shared/ui/ManagementPage'
import { Button } from '../../shared/ui/Button'
import type { SalesOrderDetailResponse } from '../../features/sales/types/salesOrder.types'
import type { CatalogItemOption } from '../../features/sales/data/catalogProducts.data'

export function POSOrderCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  // RBAC Guard kiểm tra quyền SALES_STAFF hoặc SHOP_OWNER
  const canManageOrders = user?.roles.some((r) =>
    ['SALES_STAFF', 'SHOP_OWNER'].includes(r),
  )

  const cart = usePOSCart()
  const [createOrder, { isLoading: isSubmitting }] = useCreateSalesOrderMutation()

  // State điều khiển drawer và modal thành công
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<SalesOrderDetailResponse | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isCreditProfileOpen, setIsCreditProfileOpen] = useState(false)

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  // Xử lý khi chọn sản phẩm từ ProductSelectionDrawer
  const handleSelectProduct = (item: CatalogItemOption) => {
    if (item.isCombo) {
      cart.addCombo({
        id: item.variantId,
        name: item.name,
        sellingPrice: item.sellingPrice,
      })
      toast.success(`Đã thêm combo "${item.name}" vào giỏ hàng`)
    } else {
      cart.addItem({
        id: item.variantId,
        sku: item.sku,
        name: item.name,
        sellingPrice: item.sellingPrice,
        availableStock: item.availableStock,
      })
      toast.success(`Đã thêm sản phẩm "${item.name}" vào giỏ hàng`)
    }
  }

  // Submit tạo đơn hàng POS
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (cart.items.length === 0 && cart.combos.length === 0) {
      toast.error('Đơn hàng phải có ít nhất một sản phẩm hoặc combo.')
      return
    }

    if (cart.fulfillmentMethod === 'SCHEDULED_DELIVERY' && !cart.deliveryAddress.trim() && !cart.selectedCustomer?.address) {
      toast.error('Vui lòng nhập địa chỉ nhận hàng khi chọn giao hàng tận nơi.')
      return
    }

    try {
      const payload = cart.buildPayload()
      const response = await createOrder(payload).unwrap()

      setCreatedOrder(response)
      setIsSuccessModalOpen(true)
      toast.success(`Tạo đơn hàng ${response.orderCode} thành công!`)
    } catch (err: any) {
      const errorCode = err?.data?.code
      const errorMessage = err?.data?.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.'

      if (errorCode === 'SALES_002' || errorCode === 'CREDIT_LIMIT_EXCEEDED') {
        setSubmitError(
          'TỪ CHỐI MUA NỢ: Khách hàng không đủ hạn mức tín dụng hoặc đang có nợ quá hạn trên hệ thống Kiểm soát Tín dụng.',
        )
      } else if (errorCode === 'INSUFFICIENT_STOCK') {
        setSubmitError(`LỖI TỒN KHO: ${errorMessage}`)
      } else if (errorCode === 'UNSUPPORTED_PAYMENT_METHOD') {
        setSubmitError('Phương thức thanh toán bằng thẻ (CARD) không được hỗ trợ.')
      } else {
        setSubmitError(errorMessage)
      }
    }
  }

  const handleCloseAndCreateNew = () => {
    setIsSuccessModalOpen(false)
    setCreatedOrder(null)
    setSubmitError(null)
    cart.clearCart()
  }

  // Nếu không có quyền, hiển thị cảnh báo RBAC
  if (!canManageOrders) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-card border border-aqs-border bg-aqs-surface p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-aqs-danger-soft text-aqs-danger">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-aqs-ink">Không có quyền truy cập</h3>
        <p className="mt-1 text-xs text-aqs-ink-muted">
          Chỉ nhân viên bán hàng (SALES_STAFF) và chủ cửa hàng (SHOP_OWNER) mới có quyền tạo đơn hàng bán lẻ tại quầy POS.
        </p>
        <Link
          to="/app/orders"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-aqs-accent hover:text-aqs-accent-hover"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Quay lại danh sách đơn hàng</span>
        </Link>
      </div>
    )
  }

  return (
    <ManagementPageShell>
      {/* Header thanh điều hướng */}
      <ManagementPageHeader
        group="Bán hàng & Đơn hàng"
        breadcrumb="Tạo đơn hàng POS"
        title="Tạo đơn hàng tại quầy (POS)"
        description="Lập đơn bán lẻ trực tiếp tại quầy showroom cho khách mua tại chỗ hoặc giao hàng."
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/orders')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Danh sách đơn hàng
            </Button>
            <Button variant="secondary" onClick={() => cart.clearCart()}>
              Xóa giỏ hàng
            </Button>
          </div>
        }
      />

      {/* Thông báo lỗi nếu có */}
      {submitError && (
        <div className="flex items-start gap-2.5 rounded-card border border-aqs-danger-border bg-aqs-danger-soft p-3.5 text-xs text-aqs-danger-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-aqs-danger" />
          <div>
            <div className="font-semibold">Không thể tạo đơn hàng</div>
            <div className="mt-0.5">{submitError}</div>
          </div>
        </div>
      )}

      {/* Giao diện chính 2 cột: Cột trái (Giỏ hàng) - Cột phải (Khách hàng & Thanh toán) */}
      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CỘT TRÁI (7 CỘT): GIỎ HÀNG */}
        <div className="lg:col-span-7 space-y-4">
          <POSCartTable
            items={cart.items}
            combos={cart.combos}
            onUpdateItemQuantity={cart.updateItemQuantity}
            onRemoveItem={cart.removeItem}
            onUpdateComboQuantity={cart.updateComboQuantity}
            onRemoveCombo={cart.removeCombo}
            onOpenCatalog={() => setIsCatalogOpen(true)}
          />

          {/* Ghi chú đơn hàng */}
          <div className="rounded-card border border-aqs-border bg-aqs-surface p-3.5">
            <label htmlFor="pos-order-note" className="mb-1 block text-xs font-semibold text-aqs-ink">
              Ghi chú đơn hàng:
            </label>
            <textarea
              id="pos-order-note"
              rows={2}
              placeholder="Nhập ghi chú xuất hàng, dặn dò giao hàng (nếu có)..."
              value={cart.note}
              onChange={(e) => cart.setNote(e.target.value)}
              className="w-full rounded-control border border-aqs-border-strong p-2 text-xs text-aqs-ink focus:border-aqs-focus focus:outline-none"
            />
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): KHÁCH HÀNG & THANH TOÁN */}
        <div className="lg:col-span-5 space-y-4">
          {/* Khối Khách hàng (NÚT 1: TRA CỨU CÔNG NỢ) */}
          <POSCustomerSection
            selectedCustomer={cart.selectedCustomer}
            onSelectCustomer={cart.setSelectedCustomer}
            walkInName={cart.walkInName}
            onChangeWalkInName={cart.setWalkInName}
            walkInPhone={cart.walkInPhone}
            onChangeWalkInPhone={cart.setWalkInPhone}
            deliveryAddress={cart.deliveryAddress}
            onChangeDeliveryAddress={cart.setDeliveryAddress}
            isDelivery={cart.fulfillmentMethod === 'SCHEDULED_DELIVERY'}
            onRequestCreditProfile={() => setIsCreditProfileOpen(true)}
          />

          {/* Phương thức nhận hàng */}
          <div className="space-y-2 rounded-card border border-aqs-border bg-aqs-surface p-3.5">
            <label className="block text-xs font-semibold text-aqs-ink">
              Phương thức nhận hàng:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-control border p-2.5 transition ${
                  cart.fulfillmentMethod === 'IN_STORE_PICKUP'
                    ? 'border-aqs-accent bg-aqs-accent-soft/60 font-semibold text-aqs-accent-ink'
                    : 'border-aqs-border text-aqs-ink-muted hover:border-aqs-border-strong'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillmentMethod"
                  checked={cart.fulfillmentMethod === 'IN_STORE_PICKUP'}
                  onChange={() => cart.setFulfillmentMethod('IN_STORE_PICKUP')}
                  className="sr-only"
                />
                <Store className="h-4 w-4 text-aqs-accent" />
                <span>Nhận tại quầy</span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-2 rounded-control border p-2.5 transition ${
                  cart.fulfillmentMethod === 'SCHEDULED_DELIVERY'
                    ? 'border-aqs-accent bg-aqs-accent-soft/60 font-semibold text-aqs-accent-ink'
                    : 'border-aqs-border text-aqs-ink-muted hover:border-aqs-border-strong'
                }`}
              >
                <input
                  type="radio"
                  name="fulfillmentMethod"
                  checked={cart.fulfillmentMethod === 'SCHEDULED_DELIVERY'}
                  onChange={() => cart.setFulfillmentMethod('SCHEDULED_DELIVERY')}
                  className="sr-only"
                />
                <Truck className="h-4 w-4 text-aqs-accent" />
                <span>Giao hàng tận nơi</span>
              </label>
            </div>
          </div>

          {/* Khối Thanh toán (NÚT 2: KIỂM TRA HẠN MỨC) */}
          <POSPaymentMethodCard
            paymentMethod={cart.paymentMethod}
            onChangePaymentMethod={cart.setPaymentMethod}
            customerId={cart.selectedCustomer?.customerId}
            orderAmount={cart.finalTotal}
          />

          {/* Tóm tắt tài chính & Chiết khấu */}
          <div className="space-y-2.5 rounded-card border border-aqs-border bg-aqs-surface p-4 text-xs">
            <div className="flex items-center justify-between text-aqs-ink-muted">
              <span>Tạm tính tiền hàng:</span>
              <span className="font-semibold tabular-nums text-aqs-ink">{formatMoney(cart.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 text-aqs-ink-muted">
              <label htmlFor="pos-order-discount" className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-aqs-ink-faint" />
                <span>Chiết khấu đơn:</span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="pos-order-discount"
                  type="number"
                  min="0"
                  step="any"
                  value={cart.orderDiscount || ''}
                  placeholder="0"
                  onChange={(e) => cart.setOrderDiscount(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 rounded-control border border-aqs-border-strong px-2 py-0.5 text-right text-xs font-semibold tabular-nums text-aqs-ink focus:border-aqs-focus focus:outline-none"
                />
                <span className="text-[11px] text-aqs-ink-faint">đ</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-aqs-border pt-2.5">
              <span className="text-sm font-bold text-aqs-ink">Tổng thanh toán:</span>
              <span className="text-base font-bold tabular-nums text-aqs-positive">
                {formatMoney(cart.finalTotal)}
              </span>
            </div>

            {/* Nút chính Tạo đơn hàng */}
            <button
              type="submit"
              disabled={isSubmitting || (cart.items.length === 0 && cart.combos.length === 0)}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý tạo đơn...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận tạo đơn hàng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Drawer chọn sản phẩm / combo (Tái sử dụng 100% ProductSelectionDrawer của dự án) */}
      <ProductSelectionDrawer
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectProduct={handleSelectProduct}
        selectedVariantCounts={cart.selectedVariantCounts}
        initialTab="product"
      />

      {/* Modal Thành công (TÍCH HỢP NAM - NÚT 3: GHI NHẬN THANH TOÁN) */}
      <POSOrderSuccessModal
        order={createdOrder}
        isOpen={isSuccessModalOpen}
        onCloseAndCreateNew={handleCloseAndCreateNew}
      />

      {isCreditProfileOpen && cart.selectedCustomer && (
        <ManagementDialog title={`Hồ sơ tín dụng · ${cart.selectedCustomer.customerName}`} onClose={() => setIsCreditProfileOpen(false)}>
          <div className="p-5 sm:p-6">
            <CreditProfileRequestForm
              customer={cart.selectedCustomer}
              onDone={() => setIsCreditProfileOpen(false)}
              onCancel={() => setIsCreditProfileOpen(false)}
            />
          </div>
        </ManagementDialog>
      )}
    </ManagementPageShell>
  )
}
