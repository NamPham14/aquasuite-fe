import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  Check,
  ChevronRight,
  Droplets,
  FileText,
  Layers,
  Minus,
  Package,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatVnd } from '../../shared/lib/money.ts'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { useGetSalesCatalogItemsQuery } from '../../features/sales/api/salesCatalogApi.ts'
import {
  CATALOG_PRODUCTS,
  type CatalogItemOption,
} from '../../features/sales/data/catalogProducts.data.ts'
import { useCustomerCart } from '../../features/sales/hooks/useCustomerCart.ts'
import { StorefrontProductCard } from '../../features/sales/components/StorefrontProductCard.tsx'

const SPEC_LABELS: Record<string, string> = {
  flushingType: 'Hệ thống xả',
  roughInDimension: 'Tâm xả tiêu chuẩn',
  glazeTechnology: 'Công nghệ men sứ',
  warrantyTerms: 'Chính sách bảo hành',
  installationManualPdf: 'Hướng dẫn lắp đặt',
  cadBlueprints: 'Bản vẽ kỹ thuật CAD',
  material: 'Chất liệu',
  standardDiameter: 'Đường kính ren',
  application: 'Ứng dụng thực tế',
  maxPressure: 'Áp lực tối đa',
  dimension: 'Kích thước',
  capacity: 'Dung tích',
  type: 'Kiểu lắp đặt',
  technology: 'Công nghệ tích hợp',
  showerHeadSize: 'Kích thước bát sen',
  pressureRange: 'Áp lực nước',
  height: 'Chiều cao',
  glassThickness: 'Độ dày kính',
  protection: 'Chuẩn chống nước',
  hoseLength: 'Chiều dài dây',
  standardPipe: 'Đường kính ống thoát',
  length: 'Chiều dài',
  connector: 'Đầu nối tiêu chuẩn',
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Trang Chi tiết Sản phẩm (Product Detail Page — /products/:variantId).
 * Hiển thị đầy đủ hình ảnh, biến thể liên quan, giá niêm yết, tồn kho thực tế, thông số kỹ thuật và các sản phẩm tương tự.
 */
export function ProductDetailPage() {
  const { variantId } = useParams<{ variantId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [selectedQty, setSelectedQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>({})

  const { data: apiCatalogItems, isLoading: isLoadingCatalog } =
    useGetSalesCatalogItemsQuery(undefined, {
      skip: !isAuthenticated,
    })

  const {
    items: cartItems,
    pendingVariantIds,
    handleAddItem,
  } = useCustomerCart(isAuthenticated)

  const allCatalogItems: CatalogItemOption[] = useMemo(() => {
    const apiList = apiCatalogItems ?? []
    if (apiList.length === 0) return CATALOG_PRODUCTS

    // Kết hợp thêm các gói Combo tĩnh nếu backend chưa trả về bundle
    const hasCombos = apiList.some((it) => it.isCombo)
    return hasCombos
      ? apiList
      : [...apiList, ...CATALOG_PRODUCTS.filter((it) => it.isCombo)]
  }, [apiCatalogItems])

  const product = useMemo(() => {
    if (!variantId) return undefined
    const decoded = decodeURIComponent(variantId)
    return (
      allCatalogItems.find((item) => item.variantId === decoded) ??
      allCatalogItems.find((item) => item.sku.toLowerCase() === decoded.toLowerCase())
    )
  }, [allCatalogItems, variantId])

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
  ): Promise<boolean> => {
    return handleAddItem(targetVariantId, quantity)
  }

  const handleBuyNow = async () => {
    if (!product) return
    const ok = await handleAddProductToCart(product.variantId, selectedQty)
    if (!ok) return
    if (!isAuthenticated) {
      toast.info('Sản phẩm đã được lưu vào giỏ hàng tạm. Vui lòng đăng nhập để thanh toán.')
      navigate('/login')
      return
    }
    navigate('/checkout')
  }

  if (isAuthenticated && isLoadingCatalog && !product) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-64 rounded-lg bg-slate-200/80" />
        <div className="rounded-3xl border border-slate-200 bg-white p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 aspect-4/3 rounded-2xl bg-slate-100" />
          <div className="lg:col-span-6 space-y-4">
            <div className="h-6 w-1/3 rounded bg-slate-100" />
            <div className="h-9 w-full rounded bg-slate-100" />
            <div className="h-24 w-full rounded-2xl bg-slate-100" />
            <div className="h-12 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="rounded-3xl border border-sky-200/80 bg-white p-12 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
          <Package className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">
          Không tìm thấy sản phẩm yêu cầu
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Sản phẩm này có thể đã ngừng kinh doanh hoặc đường dẫn không hợp lệ. Vui lòng quay lại trang Showroom để xem toàn bộ thiết bị sẵn có.
        </p>
        <Link
          to="/storefront#catalog"
          className="aqua-shine-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/25"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
    <div className="space-y-8">
      {/* Thanh Breadcrumb & Quay lại */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Đường dẫn sản phẩm" className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
          <Link to="/storefront" className="font-semibold hover:text-sky-700 transition">
            Trang chủ
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <Link to="/storefront#catalog" className="font-semibold hover:text-sky-700 transition">
            {product.category}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
            {product.name}
          </span>
        </nav>

        <Link
          to="/storefront#catalog"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700 transition shadow-2xs"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Quay lại sản phẩm</span>
        </Link>
      </div>

      {/* Khối Chi tiết Chính 2 Cột */}
      <section className="rounded-3xl border border-sky-200/80 bg-white/95 backdrop-blur-md p-5 sm:p-8 shadow-xl shadow-sky-950/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-start">
          {/* Cột Trái: Hình ảnh Showroom + Cam kết */}
          <div className="lg:col-span-6 space-y-4">
            <div className="group relative aspect-4/3 w-full rounded-3xl border border-slate-200 bg-slate-100 overflow-hidden shadow-md flex items-center justify-center">
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
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="relative h-full w-full bg-gradient-to-br from-slate-900 via-sky-950 to-cyan-950 flex flex-col items-center justify-center p-6 text-center">
                  <div aria-hidden="true" className="absolute inset-0 aqua-hero-grid opacity-45" />
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/20 border border-cyan-300/35 text-cyan-200 mb-3">
                    <Droplets className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <span className="relative z-10 text-sm font-bold text-white">{product.brand}</span>
                  <span className="relative z-10 text-xs font-mono text-cyan-200/80 mt-1">
                    {product.sku}
                  </span>
                </div>
              )}

              {/* Badges nổi trên ảnh */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                {product.isCombo ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow-md">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    GÓI COMBO ĐỒNG BỘ
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-900/80 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-bold text-white">
                    {product.brand}
                  </span>
                )}
              </div>

              <div className="absolute top-3.5 right-3.5">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/95 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800 tabular-nums shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                    Sẵn kho: {product.availableStock} {product.unit}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50/95 border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-800 shadow-sm">
                    Tạm hết hàng
                  </span>
                )}
              </div>
            </div>

            {/* 3 ô cam kết dưới ảnh */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 space-y-1">
                <Award className="h-4 w-4 text-sky-600 mx-auto" aria-hidden="true" />
                <p className="text-[11px] font-bold text-slate-800">Chính hãng 100%</p>
                <p className="text-[10px] text-slate-500">Đầy đủ CO / CQ</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 space-y-1">
                <QrCode className="h-4 w-4 text-emerald-600 mx-auto" aria-hidden="true" />
                <p className="text-[11px] font-bold text-slate-800">VietQR PayOS</p>
                <p className="text-[10px] text-slate-500">Hoặc COD tận nơi</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 space-y-1">
                <Truck className="h-4 w-4 text-amber-600 mx-auto" aria-hidden="true" />
                <p className="text-[11px] font-bold text-slate-800">Giao công trình</p>
                <p className="text-[10px] text-slate-500">Hỗ trợ lắp đặt</p>
              </div>
            </div>
          </div>

          {/* Cột Phải: Thông tin Mua hàng & Mô tả */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 border border-sky-200 px-3 py-0.5 text-[11px] font-bold text-sky-700">
                  {product.brand}
                </span>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-3 py-0.5 text-[11px] font-semibold text-slate-700">
                  {product.category}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-0.5 text-[11px] font-mono font-semibold text-white">
                  SKU: {product.sku}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                {product.name}
              </h1>

              {quantityInCart > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                  <ShoppingCart className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                  Đang có {quantityInCart} {product.unit} trong giỏ hàng của bạn
                </div>
              )}
            </div>

            {/* Khung Giá bán */}
            <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/80 via-white to-cyan-50/60 p-4 sm:p-5 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Giá bán niêm yết tại Showroom
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent tabular-nums">
                      {formatVnd(product.sellingPrice)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      / {product.unit}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Bảo hành điện tử chính hãng
                </span>
              </div>
            </div>

            {product.description && (
              <div className="space-y-1.5">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Mô tả thiết bị
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Danh sách thiết bị trong Combo (nếu là gói Combo) */}
            {product.components && product.components.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2.5">
                <h2 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <span>Cấu hình trọn bộ gồm {product.components.length} thiết bị:</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {product.components.map((comp, idx) => (
                    <li
                      key={comp}
                      className="flex items-center gap-2 rounded-xl bg-white border border-amber-200/80 px-3 py-2 text-xs font-medium text-slate-800 shadow-2xs"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <span className="truncate">{comp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bộ chọn số lượng & Nút Thêm vào giỏ / Mua ngay */}
            {!product.isCombo ? (
              <div className="pt-2 space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700">Số lượng đặt mua:</span>
                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 h-10 shadow-2xs">
                    <button
                      type="button"
                      disabled={!inStock || selectedQty <= 1 || isCurrentPending}
                      onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                      aria-label="Giảm số lượng"
                      className="px-3 h-full text-slate-600 hover:text-sky-700 disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-10 text-center text-sm font-extrabold text-slate-900 tabular-nums">
                      {selectedQty}
                    </span>
                    <button
                      type="button"
                      disabled={!inStock || selectedQty >= maxQty || isCurrentPending}
                      onClick={() => setSelectedQty((q) => Math.min(maxQty, q + 1))}
                      aria-label="Tăng số lượng"
                      className="px-3 h-full text-slate-600 hover:text-sky-700 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums">
                    ({product.availableStock} {product.unit} có sẵn)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={!inStock || isCurrentPending}
                    onClick={() => {
                      void handleAddProductToCart(product.variantId, selectedQty).then((ok) => {
                        if (ok) {
                          setJustAdded(true)
                          window.setTimeout(() => setJustAdded(false), 1800)
                        }
                      })
                    }}
                    className={`aqua-shine-btn h-12 inline-flex items-center justify-center gap-2 rounded-2xl px-5 text-sm font-bold text-white transition-all duration-300 cursor-pointer disabled:opacity-50 ${
                      justAdded
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-lg shadow-sky-500/25'
                    }`}
                  >
                    {justAdded ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        <span>Đã thêm vào giỏ</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                        <span>Thêm vào giỏ hàng</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!inStock || isCurrentPending}
                    onClick={() => void handleBuyNow()}
                    className="aqua-shine-btn h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-900 bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 transition shadow-lg shadow-slate-950/15 cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4 text-amber-300" aria-hidden="true" />
                    <span>Mua ngay &amp; Thanh toán</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/storefront#catalog"
                  className="aqua-shine-btn inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-xs font-extrabold text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition"
                >
                  <span>Chọn từng thiết bị trong gói</span>
                </Link>
                <Link
                  to="/cart"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  <span>Xem giỏ hàng của tôi</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bảng Thông số Kỹ thuật & Tài liệu */}
      {specEntries.length > 0 && (
        <section
          aria-label="Thông số kỹ thuật chi tiết"
          className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Thông số kỹ thuật &amp; Bảo hành
              </h2>
              <p className="text-xs text-slate-500">
                Thông tin kích thước lắp đặt chuẩn từ nhà sản xuất
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs sm:text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                {specEntries.map(([key, rawVal], idx) => {
                  const label = SPEC_LABELS[key] ?? key
                  const values = Array.isArray(rawVal) ? rawVal.map(String) : [String(rawVal)]
                  return (
                    <tr
                      key={key}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/35'}
                    >
                      <td className="py-3 px-4 w-2/5 sm:w-1/3 font-semibold text-slate-600 border-r border-slate-100">
                        {label}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 break-words">
                        <div className="flex flex-wrap gap-2">
                          {values.map((val) =>
                            isSafeHttpUrl(val) ? (
                              <a
                                key={val}
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-50 border border-sky-200 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                              >
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                Xem tài liệu kỹ thuật
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

      {/* Sản phẩm tương tự / Cùng danh mục */}
      {relatedProducts.length > 0 && (
        <section aria-label="Sản phẩm gợi ý liên quan" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Sản phẩm tương tự tại Showroom
              </h2>
              <p className="text-xs text-slate-500">
                Các thiết bị đồng bộ thường được chọn cùng công trình
              </p>
            </div>
            <Link
              to="/storefront#catalog"
              className="text-xs font-bold text-sky-700 hover:text-sky-800 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
    </div>
  )
}

