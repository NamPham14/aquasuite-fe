import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Check,
  ChevronRight,
  Eye,
  FileText,
  Layers,
  Minus,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatVnd } from '../../shared/lib/money.ts'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { useGetSalesCatalogItemsQuery } from '../../features/sales/api/salesCatalogApi.ts'
import type { CatalogItemOption } from '../../features/sales/types/salesCatalog.types.ts'
import { useCustomerCart } from '../../features/sales/hooks/useCustomerCart.ts'
import { StorefrontProductCard } from '../../features/sales/components/StorefrontProductCard.tsx'
import { ComboComponentDetailModal } from '../../features/sales/components/ComboConfigurationModals.tsx'
import {
  isSafeHttpUrl,
  parseComboComponents,
  SPEC_LABELS,
} from '../../features/sales/lib/comboComponents.ts'

/**
 * Trang Chi tiết Sản phẩm (/products/:variantId) theo phong cách Quiet-Luxury Showroom.
 * Tải 100% dữ liệu trực tiếp từ API Backend (sản phẩm, giá niêm yết, tồn kho thực tế, thông số kỹ thuật).
 */
export function ProductDetailPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [selectedQty, setSelectedQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({})
  const [activeComponentIdx, setActiveComponentIdx] = useState<number | null>(null)
  const [trackedVariantId, setTrackedVariantId] = useState(variantId)

  if (trackedVariantId !== variantId) {
    setTrackedVariantId(variantId)
    setSelectedQty(1)
    setJustAdded(false)
    setActiveComponentIdx(null)
  }

  const {
    data: apiCatalogItems = [],
    isLoading: isLoadingCatalog,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useGetSalesCatalogItemsQuery()

  const { items: cartItems, pendingVariantIds, handleAddItem } =
    useCustomerCart(isAuthenticated)

  const allCatalogItems: CatalogItemOption[] = apiCatalogItems

  const product = useMemo(() => {
    if (!variantId) return undefined
    const decoded = decodeURIComponent(variantId)
    return (
      allCatalogItems.find((item) => item.variantId === decoded) ??
      allCatalogItems.find(
        (item) => item.sku.toLowerCase() === decoded.toLowerCase(),
      )
    )
  }, [allCatalogItems, variantId])

  const parsedComponents = useMemo(
    () => parseComboComponents(product?.components, allCatalogItems),
    [allCatalogItems, product?.components],
  )

  const quantitiesByVariant = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of cartItems) {
      map[item.variantId] = item.quantity
    }
    return map
  }, [cartItems])

  const relatedProducts = useMemo(() => {
    if (!product) return []
    const others = allCatalogItems.filter(
      (item) => item.variantId !== product.variantId && !item.isCombo,
    )
    const sameCategory = others.filter((item) => item.category === product.category)
    const sameBrand = others.filter(
      (item) => item.category !== product.category && item.brand === product.brand,
    )
    const fallback = others.filter(
      (item) => item.category !== product.category && item.brand !== product.brand,
    )
    return [...sameCategory, ...sameBrand, ...fallback].slice(0, 4)
  }, [allCatalogItems, product])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [variantId])

  const handleAddProductToCart = async (
    targetVariantId: string,
    quantity: number,
    options?: { isCombo?: boolean },
  ): Promise<boolean> => {
    return handleAddItem(targetVariantId, quantity, options)
  }

  const handleBuyNow = async () => {
    if (!product) return
    const ok = await handleAddProductToCart(product.variantId, selectedQty, {
      isCombo: product.isCombo,
    })
    if (!ok) return
    if (!isAuthenticated) {
      toast.info(
        'Sản phẩm đã được lưu vào giỏ hàng tạm. Vui lòng đăng nhập để thanh toán.',
      )
      navigate('/login')
      return
    }
    navigate('/checkout')
  }

  if (isLoadingCatalog && !product) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-4 w-56 bg-[#ECE8E0]" />
        <div className="border border-[#E6E2DA] bg-white p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 aspect-[4/3.6] bg-[#ECE8E0]" />
          <div className="lg:col-span-6 space-y-5">
            <div className="h-3 w-1/3 bg-[#ECE8E0]" />
            <div className="h-10 w-5/6 bg-[#ECE8E0]" />
            <div className="h-20 w-full bg-[#ECE8E0]" />
            <div className="h-12 w-full bg-[#ECE8E0]" />
          </div>
        </div>
      </div>
    )
  }

  if (isCatalogError && !product) {
    return (
      <div className="border border-[#E6E2DA] bg-white px-8 py-14 text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#991B1B]">
          Kết nối dữ liệu tạm gián đoạn
        </p>
        <h1 className="font-editorial text-2xl sm:text-3xl text-[#171614]">
          Không thể tải chi tiết sản phẩm từ máy chủ
        </h1>
        <p className="text-xs sm:text-sm text-[#6B6760] max-w-md mx-auto">
          Vui lòng thử đồng bộ lại để tải thông tin giá bán và tồn kho mới nhất.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetchCatalog()}
            className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Thử lại</span>
          </button>
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-2 border border-[#D6D1C7] bg-white px-5 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#171614] hover:border-[#171614] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Quay lại Showroom</span>
          </Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="border border-[#E6E2DA] bg-white px-8 py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#6B6760]">
          <Package className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C6D46]">
          Không tìm thấy mã thiết bị
        </p>
        <h1 className="font-editorial text-2xl sm:text-3xl text-[#171614]">
          Sản phẩm hiện không tồn tại trên hệ thống
        </h1>
        <p className="text-xs sm:text-sm text-[#6B6760] max-w-md mx-auto leading-relaxed">
          Thiết bị có thể đã ngừng kinh doanh hoặc đường dẫn không hợp lệ. Vui lòng quay lại danh mục Showroom để xem các sản phẩm hiện có.
        </p>
        <Link
          to="/storefront#catalog"
          className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-3 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Quay lại danh mục Showroom</span>
        </Link>
      </div>
    )
  }

  const inStock = product.availableStock > 0
  const maxQty = inStock ? Math.max(1, Math.floor(product.availableStock)) : 1
  const isCurrentPending = Boolean(pendingVariantIds[product.variantId])
  const quantityInCart = quantitiesByVariant[product.variantId] ?? 0
  const imgFailed = Boolean(failedImageIds[product.variantId])
  const specEntries = product.specifications ? Object.entries(product.specifications) : []

  return (
    <div className="space-y-12 sm:space-y-14">
      {/* Thanh Breadcrumb kiến trúc */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E6E2DA]">
        <nav
          aria-label="Đường dẫn sản phẩm"
          className="flex items-center gap-2 text-xs text-[#78736A] flex-wrap"
        >
          <Link to="/storefront" className="hover:text-[#171614] transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[#B5AFA5]" aria-hidden="true" />
          <Link to="/storefront#catalog" className="hover:text-[#171614] transition-colors">
            {product.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-[#B5AFA5]" aria-hidden="true" />
          <span className="font-medium text-[#171614] truncate max-w-xs sm:max-w-md">
            {product.name}
          </span>
        </nav>

        <Link
          to="/storefront#catalog"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] font-medium text-[#171614] border-b border-[#D6D1C7] pb-0.5 hover:border-[#171614] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Bộ sưu tập sản phẩm</span>
        </Link>
      </div>

      {/* Khối Chi tiết Chính 2 Cột */}
      <section className="border border-[#E6E2DA] bg-white p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Cột Trái: Khung ảnh Lookbook & Dải tiêu chuẩn */}
          <div className="lg:col-span-6 space-y-5">
            <div className="group relative aspect-[4/3.6] w-full bg-[#EFECE6] overflow-hidden flex items-center justify-center">
              {product.imageUrl && !imgFailed ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  onError={() =>
                    setFailedImageIds((prev) => ({
                      ...prev,
                      [product.variantId]: true,
                    }))
                  }
                  className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                />
              ) : (
                <div className="h-full w-full bg-[#EFECE6] flex flex-col items-center justify-center p-8 text-center">
                  <span className="font-editorial text-4xl tracking-[0.06em] text-[#57534E]">
                    {product.brand}
                  </span>
                  <span className="mt-3 border-t border-[#D6D1C7] pt-3 text-xs font-mono tracking-[0.18em] text-[#78736A]">
                    {product.sku}
                  </span>
                </div>
              )}

              {/* Nhãn tối giản trên ảnh */}
              <div className="absolute top-4 left-4">
                <span className="inline-block bg-[#FAF9F6]/95 border border-[#E6E2DA] px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-semibold text-[#171614]">
                  {product.isCombo ? 'Combo đồng bộ' : product.brand}
                </span>
              </div>

              <div className="absolute top-4 right-4">
                {inStock ? (
                  <span className="inline-block bg-[#FAF9F6]/95 border border-[#C6DDD0] px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[#245C42] tabular-nums">
                    Sẵn kho &middot; {product.availableStock} {product.unit}
                  </span>
                ) : (
                  <span className="inline-block bg-[#171614]/88 px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-medium text-[#FAF9F6]">
                    Tạm hết hàng
                  </span>
                )}
              </div>
            </div>

            {/* 3 chuẩn mực showroom */}
            <div className="grid grid-cols-3 border border-[#E6E2DA] divide-x divide-[#E6E2DA] bg-[#FAF9F6]">
              <div className="p-3.5 text-center space-y-1">
                <Award className="h-4 w-4 text-[#8C6D46] mx-auto" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-[#171614]">Chính hãng 100%</p>
                <p className="text-[10px] text-[#78736A]">Đầy đủ CO / CQ</p>
              </div>
              <div className="p-3.5 text-center space-y-1">
                <QrCode className="h-4 w-4 text-[#8C6D46] mx-auto" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-[#171614]">VietQR PayOS</p>
                <p className="text-[10px] text-[#78736A]">Hoặc COD tận nơi</p>
              </div>
              <div className="p-3.5 text-center space-y-1">
                <Truck className="h-4 w-4 text-[#8C6D46] mx-auto" aria-hidden="true" />
                <p className="text-[11px] font-semibold text-[#171614]">Giao công trình</p>
                <p className="text-[10px] text-[#78736A]">Hỗ trợ kỹ thuật</p>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thông tin Mua hàng & Mô tả */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-[#78736A]">
                <span className="font-semibold text-[#8C6D46]">{product.brand}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{product.category}</span>
                <span aria-hidden="true">&middot;</span>
                <span className="font-mono text-[#171614]">SKU: {product.sku}</span>
              </div>

              <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#171614] leading-[1.16] tracking-[-0.01em]">
                {product.name}
              </h1>

              {quantityInCart > 0 && (
                <div className="inline-flex items-center gap-2 border-l-2 border-[#8C6D46] bg-[#FAF9F6] px-3 py-1.5 text-xs text-[#171614]">
                  <ShoppingBag className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                  <span>
                    Đang có <strong className="tabular-nums">{quantityInCart}</strong> {product.unit} trong giỏ hàng
                  </span>
                </div>
              )}
            </div>

            {/* Khung Giá bán đường mảnh */}
            <div className="border-y border-[#E6E2DA] py-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#78736A] block">
                  Giá niêm yết tại Showroom
                </span>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-3xl font-semibold text-[#171614] tracking-tight tabular-nums">
                    {formatVnd(product.sellingPrice)}
                  </span>
                  <span className="text-xs uppercase tracking-[0.12em] text-[#78736A]">
                    / {product.unit}
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 border border-[#C6DDD0] bg-[#EEF5F1] px-3 py-1 text-[11px] font-medium text-[#245C42]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Bảo hành điện tử chính hãng</span>
              </span>
            </div>

            {product.description && (
              <div className="space-y-2">
                <h2 className="text-[10px] uppercase tracking-[0.2em] text-[#78736A] font-semibold">
                  Giới thiệu thiết bị
                </h2>
                <p className="text-sm text-[#57534E] leading-relaxed font-light">
                  {product.description}
                </p>
              </div>
            )}

            {/* Danh sách thiết bị trong Combo (nếu là gói Combo) */}
            {parsedComponents.length > 0 && (
              <div className="border border-[#E6E2DA] bg-[#FAF9F6] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171614] flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#8C6D46]" aria-hidden="true" />
                    <span>Cấu hình trọn bộ ({parsedComponents.length} thiết bị)</span>
                  </h2>
                  <span className="text-[11px] text-[#78736A]">
                    Nhấn vào thiết bị để xem chi tiết
                  </span>
                </div>
                <ul className="divide-y divide-[#E6E2DA]">
                  {parsedComponents.map((comp) => {
                    const compItem = comp.catalogItem
                    const compInStock = Boolean(compItem && compItem.availableStock > 0)
                    return (
                      <li key={`${comp.raw}-${comp.index}`}>
                        <button
                          type="button"
                          onClick={() => setActiveComponentIdx(comp.index)}
                          className="w-full flex items-center justify-between gap-3 py-2.5 px-2 -mx-2 text-left text-xs text-[#171614] hover:bg-white transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-editorial text-sm text-[#8C6D46] w-6 shrink-0">
                              {String(comp.index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0 space-y-0.5">
                              <p className="truncate font-medium group-hover:underline underline-offset-4 decoration-[#8C6D46]">
                                {comp.displayName}
                                {comp.sku ? ` (${comp.sku})` : ''} x{comp.quantity}
                              </p>
                              {compItem && (
                                <p className="text-[11px] text-[#78736A] flex flex-wrap items-center gap-2">
                                  <span className="tabular-nums font-medium text-[#171614]">
                                    {formatVnd(compItem.sellingPrice)} / {compItem.unit}
                                  </span>
                                  <span aria-hidden="true">&middot;</span>
                                  <span className={compInStock ? 'text-[#245C42]' : 'text-[#78736A]'}>
                                    {compInStock
                                      ? `Sẵn kho ${compItem.availableStock}`
                                      : 'Tạm hết hàng'}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 shrink-0 border border-[#D6D1C7] bg-white px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-[#171614] group-hover:border-[#171614] transition-colors">
                            <Eye className="h-3 w-3 text-[#8C6D46]" aria-hidden="true" />
                            <span>Chi tiết</span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {/* Bộ chọn số lượng & CTA mua hàng (dùng chung cho cả sản phẩm lẻ và gói Combo) */}
            <div className="pt-2 space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#57534E]">
                  {product.isCombo ? 'Số gói Combo' : 'Số lượng đặt mua'}
                </span>
                <div className="inline-flex items-center border border-[#D6D1C7] bg-[#FAF9F6] h-11">
                  <button
                    type="button"
                    disabled={!inStock || selectedQty <= 1 || isCurrentPending}
                    onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                    aria-label="Giảm số lượng"
                    className="px-3.5 h-full text-[#57534E] hover:text-[#171614] disabled:opacity-35 cursor-pointer transition-colors"
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-[#171614] tabular-nums border-x border-[#E6E2DA] h-full flex items-center justify-center bg-white">
                    {selectedQty}
                  </span>
                  <button
                    type="button"
                    disabled={!inStock || selectedQty >= maxQty || isCurrentPending}
                    onClick={() => setSelectedQty((q) => Math.min(maxQty, q + 1))}
                    aria-label="Tăng số lượng"
                    className="px-3.5 h-full text-[#57534E] hover:text-[#171614] disabled:opacity-35 cursor-pointer transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
                <span className="text-xs text-[#78736A] tabular-nums">
                  {inStock ? (
                    <>
                      Còn <strong className="text-[#171614]">{product.availableStock}</strong>{' '}
                      {product.unit} sẵn kho
                    </>
                  ) : product.isCombo ? (
                    'Combo tạm hết hàng theo cấu hình trọn bộ'
                  ) : (
                    <>
                      Còn <strong className="text-[#171614]">0</strong> {product.unit} sẵn kho
                    </>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  disabled={!inStock || isCurrentPending}
                  onClick={() => {
                    void handleAddProductToCart(product.variantId, selectedQty, {
                      isCombo: product.isCombo,
                    }).then((ok) => {
                      if (ok) {
                        setJustAdded(true)
                        window.setTimeout(() => setJustAdded(false), 1800)
                      }
                    })
                  }}
                  className={`h-12 inline-flex items-center justify-center gap-2 border px-5 text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    justAdded
                      ? 'border-[#245C42] bg-[#245C42] text-white'
                      : 'border-[#171614] bg-white text-[#171614] hover:bg-[#F2EFE9]'
                  }`}
                >
                  {justAdded ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>Đã thêm vào giỏ</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {product.isCombo ? 'Thêm combo vào giỏ' : 'Thêm vào giỏ hàng'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!inStock || isCurrentPending}
                  onClick={() => void handleBuyNow()}
                  className="h-12 inline-flex items-center justify-center gap-2 border border-[#171614] bg-[#171614] px-5 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <span>Mua ngay &amp; Thanh toán</span>
                  <ArrowUpRight className="h-4 w-4 text-[#C5B091]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bảng Thông số Kỹ thuật & Tài liệu */}
      {specEntries.length > 0 && (
        <section
          aria-label="Thông số kỹ thuật chi tiết"
          className="border border-[#E6E2DA] bg-white p-6 sm:p-10 space-y-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#E6E2DA]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
                Hồ sơ kỹ thuật
              </p>
              <h2 className="font-editorial text-2xl font-normal text-[#171614] mt-1">
                Thông số kỹ thuật &amp; Bảo hành
              </h2>
            </div>
            <span className="text-xs text-[#78736A]">
              Chuẩn kích thước lắp đặt công trình từ nhà sản xuất
            </span>
          </div>

          <div className="border border-[#E6E2DA] overflow-hidden">
            <table className="w-full text-xs sm:text-sm text-left">
              <tbody className="divide-y divide-[#E6E2DA]">
                {specEntries.map(([key, rawVal], idx) => {
                  const label = SPEC_LABELS[key] ?? key
                  const values = Array.isArray(rawVal) ? rawVal.map(String) : [String(rawVal)]
                  return (
                    <tr
                      key={key}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F6]'}
                    >
                      <td className="py-3.5 px-5 w-2/5 sm:w-1/3 text-[11px] uppercase tracking-[0.12em] font-medium text-[#78736A] border-r border-[#E6E2DA]">
                        {label}
                      </td>
                      <td className="py-3.5 px-5 font-medium text-[#171614] break-words">
                        <div className="flex flex-wrap gap-2.5">
                          {values.map((val) =>
                            isSafeHttpUrl(val) ? (
                              <a
                                key={val}
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3 py-1 text-xs font-medium text-[#171614] hover:border-[#171614] transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                                <span>Xem tài liệu kỹ thuật</span>
                              </a>
                            ) : (
                              <span key={val}>{val}</span>
                            ),
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Sản phẩm tương tự */}
      {relatedProducts.length > 0 && (
        <section aria-label="Sản phẩm gợi ý liên quan" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-3 border-b border-[#E6E2DA]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
                Đồng bộ không gian
              </p>
              <h2 className="font-editorial text-2xl font-normal text-[#171614] mt-1">
                Sản phẩm tương tự tại Showroom
              </h2>
            </div>
            <Link
              to="/storefront#catalog"
              className="text-[11px] uppercase tracking-[0.15em] font-medium text-[#171614] border-b border-[#D6D1C7] pb-0.5 hover:border-[#171614] transition-colors"
            >
              Xem toàn bộ &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {relatedProducts.map((rel, idx) => (
              <StorefrontProductCard
                key={rel.variantId}
                item={rel}
                quantityInCart={quantitiesByVariant[rel.variantId] ?? 0}
                isAdding={Boolean(pendingVariantIds[rel.variantId])}
                animationIndex={idx}
                onAddToCart={handleAddProductToCart}
              />
            ))}
          </div>
        </section>
      )}
      {/* Pop-up Chi tiết từng thiết bị trong cấu hình Combo */}
      {(product.isCombo || parsedComponents.length > 0) && (
        <ComboComponentDetailModal
          key={`detail-${product.variantId}-${activeComponentIdx ?? 'none'}`}
          comboName={product.name}
          components={parsedComponents}
          activeIndex={activeComponentIdx}
          quantitiesInCart={quantitiesByVariant}
          pendingVariantIds={pendingVariantIds}
          onSelectIndex={setActiveComponentIdx}
          onAddToCart={handleAddProductToCart}
        />
      )}
    </div>
  )
}
