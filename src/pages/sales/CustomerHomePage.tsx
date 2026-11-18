import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  Filter,
  Layers,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { formatVnd } from '../../shared/lib/money.ts'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { useGetSalesCatalogItemsQuery } from '../../features/sales/api/salesCatalogApi.ts'
import {
  CATALOG_PRODUCTS,
  type CatalogItemOption,
} from '../../features/sales/data/catalogProducts.data.ts'
import { useCustomerCart } from '../../features/sales/hooks/useCustomerCart.ts'
import { StorefrontHeroBanner } from '../../features/sales/components/StorefrontHeroBanner.tsx'
import { StorefrontQuickAccessStrip } from '../../features/sales/components/StorefrontQuickAccessStrip.tsx'
import { StorefrontProductCard } from '../../features/sales/components/StorefrontProductCard.tsx'

type PriceRangeFilter = 'ALL' | 'UNDER_1M' | 'FROM_1M_TO_10M' | 'OVER_10M'
type StorefrontSortOption = 'RECOMMENDED' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC'

/**
 * Trang chủ Showroom dành cho Khách hàng (Customer Storefront Homepage — /storefront).
 * Trưng bày thiết bị vệ sinh chính hãng, hiệu ứng showroom kính mờ, lọc đa tiêu chí và đặt hàng trực tuyến.
 */
export function CustomerHomePage() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedBrand, setSelectedBrand] = useState('ALL')
  const [priceFilter, setPriceFilter] = useState<PriceRangeFilter>('ALL')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<StorefrontSortOption>('RECOMMENDED')
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 420)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const hashId = location.hash.replace('#', '')
    if (!hashId) return
    const target = document.getElementById(hashId)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  const {
    data: apiCatalogItems,
    isLoading: isLoadingCatalog,
    isFetching: isFetchingCatalog,
    refetch: refetchCatalog,
  } = useGetSalesCatalogItemsQuery(undefined, {
    skip: !isAuthenticated,
  })

  const {
    items: cartItems,
    totalItems: totalCartItems,
    subtotal: cartSubtotal,
    pendingVariantIds,
    handleAddItem,
  } = useCustomerCart(isAuthenticated)

  const quantitiesByVariant = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of cartItems) {
      map[item.variantId] = item.quantity
    }
    return map
  }, [cartItems])

  // Danh sách sản phẩm đơn lẻ (ưu tiên dữ liệu live từ PostgreSQL khi đã đăng nhập)
  const regularProducts: CatalogItemOption[] = useMemo(() => {
    const source =
      apiCatalogItems && apiCatalogItems.length > 0 ? apiCatalogItems : CATALOG_PRODUCTS
    return source.filter((item) => !item.isCombo)
  }, [apiCatalogItems])

  // Sản phẩm tiêu điểm hiển thị trên Hero Banner
  const featuredSpotlightProducts = useMemo(() => {
    const inStock = regularProducts.filter((item) => item.availableStock > 0)
    return (inStock.length > 0 ? inStock : regularProducts).slice(0, 4)
  }, [regularProducts])

  // Danh sách các gói Combo giải pháp phòng tắm
  const comboPackages: CatalogItemOption[] = useMemo(() => {
    const apiCombos = (apiCatalogItems ?? []).filter((item) => item.isCombo)
    if (apiCombos.length > 0) return apiCombos
    return CATALOG_PRODUCTS.filter((item) => item.isCombo)
  }, [apiCatalogItems])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of regularProducts) {
      if (item.category) {
        counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
  }, [regularProducts])

  const brands = useMemo(() => {
    const set = new Set<string>()
    for (const item of regularProducts) {
      if (item.brand) set.add(item.brand)
    }
    return Array.from(set)
  }, [regularProducts])

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    const matches = regularProducts.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false
      }
      if (selectedBrand !== 'ALL' && item.brand !== selectedBrand) {
        return false
      }
      if (inStockOnly && item.availableStock <= 0) {
        return false
      }
      if (priceFilter === 'UNDER_1M' && item.sellingPrice >= 1_000_000) {
        return false
      }
      if (
        priceFilter === 'FROM_1M_TO_10M' &&
        (item.sellingPrice < 1_000_000 || item.sellingPrice > 10_000_000)
      ) {
        return false
      }
      if (priceFilter === 'OVER_10M' && item.sellingPrice <= 10_000_000) {
        return false
      }
      if (!query) return true

      const specText = item.specifications
        ? Object.values(item.specifications)
            .map((v) => String(v))
            .join(' ')
            .toLowerCase()
        : ''

      return (
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false) ||
        specText.includes(query)
      )
    })

    if (sortBy === 'PRICE_ASC') {
      return [...matches].sort((a, b) => a.sellingPrice - b.sellingPrice)
    }
    if (sortBy === 'PRICE_DESC') {
      return [...matches].sort((a, b) => b.sellingPrice - a.sellingPrice)
    }
    if (sortBy === 'NAME_ASC') {
      return [...matches].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    }
    return matches
  }, [regularProducts, searchTerm, selectedCategory, selectedBrand, inStockOnly, priceFilter, sortBy])

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedCategory !== 'ALL' ||
    selectedBrand !== 'ALL' ||
    priceFilter !== 'ALL' ||
    inStockOnly ||
    sortBy !== 'RECOMMENDED'

  const resetAllFilters = () => {
    setSearchTerm('')
    setSelectedCategory('ALL')
    setSelectedBrand('ALL')
    setPriceFilter('ALL')
    setInStockOnly(false)
    setSortBy('RECOMMENDED')
  }

  const handleAddVariantToCart = async (
    variantId: string,
    quantity: number,
  ): Promise<boolean> => {
    return handleAddItem(variantId, quantity)
  }

  return (
    <div className="space-y-7">
      {/* Tầng 1: Hero Banner & Tiêu điểm Showroom tương tác */}
      <StorefrontHeroBanner
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectQuickKeyword={(kw) => setSearchTerm(kw)}
        totalCatalogCount={regularProducts.length}
        featuredItems={featuredSpotlightProducts}
      />

      {/* Tầng 2: Lối tắt danh mục & dịch vụ */}
      <StorefrontQuickAccessStrip
        isAuthenticated={isAuthenticated}
        username={user?.username}
        totalCartItems={totalCartItems}
        cartSubtotal={cartSubtotal}
        totalCatalogCount={regularProducts.length}
        comboCount={comboPackages.length}
      />

      {/* Tầng 3: Khu vực Bộ lọc kính mờ & Lưới Sản phẩm */}
      <section
        id="catalog"
        aria-label="Danh mục thiết bị vệ sinh"
        className="space-y-5 scroll-mt-24"
      >
        <div className="rounded-2xl border border-sky-200/80 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-md shadow-sky-950/5 space-y-4">
          {/* Hàng 1: Tabs Danh mục */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div
              role="tablist"
              aria-label="Lọc theo danh mục thiết bị"
              className="flex items-center gap-2 overflow-x-auto pb-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'ALL'}
                onClick={() => setSelectedCategory('ALL')}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 text-white shadow-md shadow-sky-500/25'
                    : 'bg-slate-100/90 text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                Tất cả sản phẩm ({regularProducts.length})
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.name
                return (
                  <button
                    key={cat.name}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(active ? 'ALL' : cat.name)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 text-white shadow-md shadow-sky-500/25'
                        : 'bg-slate-100/90 text-slate-700 hover:bg-sky-50 hover:text-sky-700'
                    }`}
                  >
                    {cat.name} ({cat.count})
                  </button>
                )
              })}
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => void refetchCatalog()}
                disabled={isFetchingCatalog}
                title="Làm mới danh mục & tồn kho"
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50 cursor-pointer transition"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetchingCatalog ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Đồng bộ tồn kho</span>
              </button>
            )}
          </div>

          {/* Hàng 2: Bộ lọc chi tiết */}
          <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                <Filter className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                Bộ lọc:
              </span>

              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Thương hiệu</span>
                <select
                  aria-label="Lọc theo thương hiệu"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none transition"
                >
                  <option value="ALL">Tất cả thương hiệu</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Mức giá</span>
                <select
                  aria-label="Lọc theo mức giá"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceRangeFilter)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none transition"
                >
                  <option value="ALL">Mọi mức giá</option>
                  <option value="UNDER_1M">Dưới 1.000.000 ₫</option>
                  <option value="FROM_1M_TO_10M">Từ 1 – 10 triệu ₫</option>
                  <option value="OVER_10M">Trên 10.000.000 ₫</option>
                </select>
              </label>

              <label
                className={`inline-flex items-center gap-2 cursor-pointer select-none rounded-xl border px-3 h-9 font-semibold transition ${
                  inStockOnly
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded accent-emerald-600"
                />
                <span>Chỉ hiện còn hàng</span>
              </label>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50/70 px-3 h-9 text-xs font-bold text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200/80 px-3 py-1 text-[11px] font-semibold text-sky-800">
                Hiển thị <strong className="font-extrabold tabular-nums">{filteredProducts.length}</strong> sản phẩm
              </span>
              <select
                aria-label="Sắp xếp sản phẩm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as StorefrontSortOption)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 hover:border-sky-300 focus:border-sky-500 focus:outline-none transition"
              >
                <option value="RECOMMENDED">Sắp xếp: Đề xuất</option>
                <option value="PRICE_ASC">Giá: Thấp đến Cao</option>
                <option value="PRICE_DESC">Giá: Cao đến Thấp</option>
                <option value="NAME_ASC">Tên: A → Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 animate-pulse shadow-sm"
              >
                <div className="aspect-4/3 rounded-xl bg-gradient-to-br from-slate-100 to-sky-50" />
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="h-5 w-full rounded bg-slate-100" />
                <div className="h-9 w-full rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-sky-200/80 bg-white/95 p-12 text-center space-y-3 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-600 shadow-inner">
              <Package className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Không tìm thấy sản phẩm phù hợp
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Không có thiết bị vệ sinh nào khớp với bộ lọc hiện tại. Hãy thử từ khóa khác hoặc đặt lại bộ lọc để xem toàn bộ danh mục.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="aqua-shine-btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white hover:from-sky-500 hover:to-cyan-500 transition shadow-md shadow-sky-500/25 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          /* Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredProducts.map((item, idx) => (
              <StorefrontProductCard
                key={item.variantId}
                item={item}
                quantityInCart={quantitiesByVariant[item.variantId] ?? 0}
                isAdding={Boolean(pendingVariantIds[item.variantId])}
                animationIndex={idx}
                onAddToCart={handleAddVariantToCart}
              />
            ))}
          </div>
        )}
      </section>

      {/* Tầng 4: Sân khấu Gói Combo Phòng Tắm Cao Cấp */}
      {comboPackages.length > 0 && (
        <section
          id="combos"
          aria-label="Gói Combo phòng tắm đồng bộ"
          className="scroll-mt-24 relative rounded-3xl border border-amber-400/35 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-6 sm:p-8 text-white shadow-2xl shadow-slate-950/25 overflow-hidden space-y-6"
        >
          {/* Quầng sáng vàng hổ phách & xanh ngọc */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl animate-aqua-float"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl animate-aqua-float-reverse"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 aqua-hero-grid opacity-30"
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-300/40 px-3 py-1 text-[11px] font-bold text-amber-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                GIẢI PHÁP ĐỒNG BỘ TIẾT KIỆM
              </span>
              <h2 className="mt-2 text-xl sm:text-2xl font-black tracking-tight text-white">
                Gói Combo Thiết Bị Phòng Tắm Trọn Bộ
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-2xl">
                Cấu hình đồng bộ thương hiệu giúp tối ưu chi phí đầu tư và đảm bảo tương thích kỹ thuật lắp đặt.
              </p>
            </div>
            <Link
              to="/cart"
              className="aqua-shine-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:from-amber-300 hover:to-orange-300 transition shadow-lg shadow-amber-500/25"
            >
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              <span>Tới giỏ hàng ({totalCartItems})</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {comboPackages.map((combo) => (
              <div
                key={combo.variantId}
                className="group rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl p-5 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-amber-300/60 hover:bg-white/15 transition-all duration-300 shadow-lg shadow-black/20"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/35 px-2.5 py-0.5 text-[10px] font-bold text-amber-200">
                      <Layers className="h-3 w-3" aria-hidden="true" />
                      {combo.brand} • {combo.components?.length ?? 0} thiết bị
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                      {combo.sku}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white group-hover:text-amber-200 transition-colors leading-snug">
                    <Link
                      to={`/products/${encodeURIComponent(combo.variantId)}`}
                      className="hover:underline"
                    >
                      {combo.name}
                    </Link>
                  </h3>
                  {combo.description && (
                    <p className="text-xs text-slate-300/90 line-clamp-2 leading-relaxed">
                      {combo.description}
                    </p>
                  )}
                </div>

                <div className="pt-3.5 border-t border-white/15 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-amber-200/70 font-bold uppercase tracking-wider block">
                      Giá trọn gói
                    </span>
                    <span className="text-lg font-black text-amber-300 tabular-nums">
                      {formatVnd(combo.sellingPrice)}
                    </span>
                  </div>
                  <Link
                    to={`/products/${encodeURIComponent(combo.variantId)}`}
                    className="aqua-shine-btn rounded-xl border border-amber-300/40 bg-amber-400/15 px-3.5 py-2 text-xs font-bold text-amber-100 hover:bg-amber-400 hover:text-slate-950 transition cursor-pointer"
                  >
                    Xem cấu hình
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nút nổi cuộn lên đầu trang khi xem danh mục dài */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Cuộn lên đầu trang"
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl shadow-sky-600/30 hover:from-sky-500 hover:to-cyan-500 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Lên đầu trang</span>
        </button>
      )}

    </div>
  )
}
