import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, ArrowUp, RefreshCw, X } from 'lucide-react'
import { formatVnd } from '../../shared/lib/money.ts'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { useGetSalesCatalogItemsQuery } from '../../features/sales/api/salesCatalogApi.ts'
import type { CatalogItemOption } from '../../features/sales/types/salesCatalog.types.ts'
import { useCustomerCart } from '../../features/sales/hooks/useCustomerCart.ts'
import { StorefrontHeroBanner } from '../../features/sales/components/StorefrontHeroBanner.tsx'
import { StorefrontQuickAccessStrip } from '../../features/sales/components/StorefrontQuickAccessStrip.tsx'
import { StorefrontProductCard } from '../../features/sales/components/StorefrontProductCard.tsx'

type PriceRangeFilter = 'ALL' | 'UNDER_1M' | 'FROM_1M_TO_10M' | 'OVER_10M'
type StorefrontSortOption = 'RECOMMENDED' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC'

/**
 * Trang chủ Showroom dành cho Khách hàng (/storefront).
 * Trình bày theo bố cục tạp chí kiến trúc: Full-bleed Hero -> Phân khu Tuyển chọn -> Danh mục Lọc tinh giản -> Gói Combo -> Cam kết dịch vụ.
 */
export function CustomerHomePage() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuth()

  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedBrand, setSelectedBrand] = useState('ALL')
  const [priceFilter, setPriceFilter] = useState<PriceRangeFilter>('ALL')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<StorefrontSortOption>('RECOMMENDED')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [failedComboImages, setFailedComboImages] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 480)
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
    data: apiCatalogItems = [],
    isLoading: isLoadingCatalog,
    isFetching: isFetchingCatalog,
    isError: isCatalogError,
    refetch: refetchCatalog,
  } = useGetSalesCatalogItemsQuery()

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

  // Danh sách sản phẩm đơn lẻ (100% dữ liệu live từ API Backend)
  const regularProducts: CatalogItemOption[] = useMemo(() => {
    return apiCatalogItems.filter((item) => !item.isCombo)
  }, [apiCatalogItems])

  // Sản phẩm tiêu điểm hiển thị trên Hero Banner
  const featuredSpotlightProducts = useMemo(() => {
    const inStock = regularProducts.filter((item) => item.availableStock > 0)
    return (inStock.length > 0 ? inStock : regularProducts).slice(0, 4)
  }, [regularProducts])

  // Danh sách các gói Combo giải pháp phòng tắm (100% từ API Backend)
  const comboPackages: CatalogItemOption[] = useMemo(() => {
    return apiCatalogItems.filter((item) => item.isCombo)
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
    const query = deferredSearchTerm.trim().toLowerCase()

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
  }, [
    regularProducts,
    deferredSearchTerm,
    selectedCategory,
    selectedBrand,
    inStockOnly,
    priceFilter,
    sortBy,
  ])

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

  const handleSelectCollectionCategory = (category: string) => {
    const matched = categories.find((c) =>
      c.name.toLowerCase().includes(category.toLowerCase()),
    )
    setSelectedCategory(matched ? matched.name : 'ALL')
  }

  const handleAddVariantToCart = async (
    variantId: string,
    quantity: number,
  ): Promise<boolean> => {
    return handleAddItem(variantId, quantity)
  }

  return (
    <div>
      {/* Tầng 1: Full-Bleed Architectural Hero */}
      <StorefrontHeroBanner
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectQuickKeyword={(kw) => setSearchTerm(kw)}
        totalCatalogCount={regularProducts.length}
        featuredItems={featuredSpotlightProducts}
      />

      {/* Tầng 2: Không gian tuyển chọn (3 khối Lookbook) & Tiện ích */}
      <StorefrontQuickAccessStrip
        isAuthenticated={isAuthenticated}
        username={user?.username}
        totalCartItems={totalCartItems}
        cartSubtotal={cartSubtotal}
        totalCatalogCount={regularProducts.length}
        comboCount={comboPackages.length}
        onSelectCollectionCategory={handleSelectCollectionCategory}
      />

      {/* Tầng 3: Bộ sưu tập & Lưới sản phẩm Lookbook */}
      <section
        id="catalog"
        aria-label="Danh mục thiết bị vệ sinh"
        className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 space-y-8 scroll-mt-20"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#78736A]">
              Danh mục Showroom
            </p>
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#171614] mt-1.5 tracking-[-0.01em]">
              Bộ sưu tập Thiết bị Vệ sinh
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#6B6760]">
            <span className="tabular-nums">
              Hiển thị <strong className="text-[#171614]">{filteredProducts.length}</strong> /{' '}
              {regularProducts.length} sản phẩm
            </span>
            <button
              type="button"
              onClick={() => void refetchCatalog()}
              disabled={isFetchingCatalog}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#171614] border-b border-[#D6D2C9] pb-0.5 hover:border-[#171614] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isFetchingCatalog ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Đồng bộ kho</span>
            </button>
          </div>
        </div>

        {/* Thanh lọc đường mảnh (Editorial Hairline Filter Strip) */}
        <div className="border-y border-[#E6E2DA] py-3.5 space-y-3.5">
          <div
            role="tablist"
            aria-label="Lọc theo danh mục thiết bị"
            className="flex items-center gap-6 overflow-x-auto pb-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'ALL'}
              onClick={() => setSelectedCategory('ALL')}
              className={`pb-1.5 text-xs tracking-[0.04em] whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'border-[#171614] text-[#171614] font-semibold'
                  : 'border-transparent text-[#78736A] hover:text-[#171614]'
              }`}
            >
              Tất cả ({regularProducts.length})
            </button>
          </div>

          <div className="pt-3 border-t border-[#F0EDE6] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <label className="inline-flex items-center gap-2 text-[#78736A]">
                <span className="text-[11px] uppercase tracking-[0.12em]">Thương hiệu</span>
                <select
                  aria-label="Lọc theo thương hiệu"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-transparent border-b border-[#D6D2C9] py-1 pr-2 text-xs font-medium text-[#171614] focus:border-[#171614] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-2 text-[#78736A]">
                <span className="text-[11px] uppercase tracking-[0.12em]">Mức giá</span>
                <select
                  aria-label="Lọc theo mức giá"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceRangeFilter)}
                  className="bg-transparent border-b border-[#D6D2C9] py-1 pr-2 text-xs font-medium text-[#171614] focus:border-[#171614] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Mọi mức giá</option>
                  <option value="UNDER_1M">Dưới 1.000.000 ₫</option>
                  <option value="FROM_1M_TO_10M">1 – 10 triệu ₫</option>
                  <option value="OVER_10M">Trên 10.000.000 ₫</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[#57534E] hover:text-[#171614]">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-[#171614]"
                />
                <span>Chỉ hiện sẵn hàng</span>
              </label>

              {searchTerm.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center gap-1 bg-[#F0EDE6] px-2.5 py-1 text-[11px] font-medium text-[#171614] hover:bg-[#E6E2DA] cursor-pointer transition-colors"
                >
                  <span>Tìm: &ldquo;{searchTerm.trim()}&rdquo;</span>
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#8C6D46] hover:text-[#171614] border-b border-current pb-0.5 cursor-pointer transition-colors"
                >
                  Đặt lại bộ lọc
                </button>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-[#78736A]">
              <span className="text-[11px] uppercase tracking-[0.12em]">Sắp xếp</span>
              <select
                aria-label="Sắp xếp sản phẩm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as StorefrontSortOption)}
                className="bg-transparent border-b border-[#D6D2C9] py-1 pr-2 text-xs font-medium text-[#171614] focus:border-[#171614] focus:outline-none cursor-pointer"
              >
                <option value="RECOMMENDED">Đề xuất</option>
                <option value="PRICE_ASC">Giá tăng dần</option>
                <option value="PRICE_DESC">Giá giảm dần</option>
                <option value="NAME_ASC">Tên A → Z</option>
              </select>
            </label>
          </div>
        </div>

        {/* Loading Skeleton / Error State */}
        {isLoadingCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="space-y-3 animate-pulse">
                <div className="aspect-[4/4.3] bg-[#ECE8E0]" />
                <div className="h-3 w-1/2 bg-[#ECE8E0]" />
                <div className="h-4 w-full bg-[#ECE8E0]" />
                <div className="h-4 w-1/3 bg-[#ECE8E0]" />
              </div>
            ))}
          </div>
        ) : isCatalogError ? (
          <div className="py-16 text-center border border-[#E6E2DA] bg-white px-6 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#991B1B]">
              Kết nối danh mục tạm gián đoạn
            </p>
            <h3 className="font-editorial text-2xl text-[#171614]">
              Không thể tải danh mục sản phẩm từ máy chủ
            </h3>
            <p className="text-xs text-[#6B6760] max-w-md mx-auto leading-relaxed">
              Vui lòng thử đồng bộ lại để lấy dữ liệu sản phẩm và tồn kho trực tiếp từ hệ thống.
            </p>
            <button
              type="button"
              onClick={() => void refetchCatalog()}
              className="mt-2 inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tải lại danh mục</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State tối giản */
          <div className="py-16 text-center border-b border-[#E6E2DA] space-y-3">
            <h3 className="font-editorial text-2xl text-[#171614]">
              Không tìm thấy thiết bị phù hợp
            </h3>
            <p className="text-xs text-[#6B6760] max-w-md mx-auto leading-relaxed">
              Thử từ khóa khác hoặc đặt lại bộ lọc để xem lại toàn bộ danh mục showroom.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="mt-2 inline-block border border-[#171614] bg-[#171614] px-6 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors cursor-pointer"
            >
              Xem toàn bộ bộ sưu tập
            </button>
          </div>
        ) : (
          /* Lookbook 4-Column Product Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
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

      {/* Tầng 4: Giải pháp Gói Combo Phòng tắm (Nền Obsidian Sang Trọng Full-Bleed) */}
      {comboPackages.length > 0 && (
        <section
          id="combos"
          aria-label="Gói Combo phòng tắm đồng bộ"
          className="scroll-mt-20 bg-[#171614] text-[#F5F2EC] py-16 sm:py-20"
        >
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/12">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#C5B091]">
                  Giải pháp đồng bộ công trình
                </p>
                <h2 className="font-editorial text-3xl sm:text-4xl font-normal text-white mt-2 tracking-[-0.015em]">
                  Gói Combo Thiết Bị Phòng Tắm Trọn Bộ
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-[#A8A39A] max-w-2xl font-light">
                  Cấu hình tương thích kỹ thuật từ các thương hiệu hàng đầu, tối ưu chi phí cho biệt thự, khách sạn và căn hộ.
                </p>
              </div>
              <Link
                to="/cart"
                className="inline-flex items-center gap-2 border border-white/30 px-5 py-2.5 text-[11px] uppercase tracking-[0.15em] font-semibold text-white hover:bg-white hover:text-[#171614] transition-colors shrink-0"
              >
                <span>Tới giỏ hàng ({totalCartItems})</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {comboPackages.map((combo) => (
                <article key={combo.variantId} className="group flex flex-col">
                  <Link
                    to={`/products/${encodeURIComponent(combo.variantId)}`}
                    className="block aspect-[16/10] w-full bg-[#24221F] overflow-hidden"
                  >
                    {combo.imageUrl && !failedComboImages[combo.variantId] ? (
                      <img
                        src={combo.imageUrl}
                        alt={combo.name}
                        loading="lazy"
                        onError={() =>
                          setFailedComboImages((prev) => ({
                            ...prev,
                            [combo.variantId]: true,
                          }))
                        }
                        className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#A8A39A] font-editorial text-xl">
                        {combo.sku}
                      </div>
                    )}
                  </Link>

                  <div className="pt-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-[#C5B091]">
                        <span>{combo.components?.length ?? 0} thiết bị đồng bộ</span>
                        <span className="font-mono text-[#8A857C]">{combo.sku}</span>
                      </div>
                      <h3 className="font-editorial text-xl font-normal text-white leading-snug">
                        <Link
                          to={`/products/${encodeURIComponent(combo.variantId)}`}
                          className="hover:underline underline-offset-4 decoration-[#78736A]"
                        >
                          {combo.name}
                        </Link>
                      </h3>
                      {combo.description && (
                        <p className="text-xs text-[#A8A39A] line-clamp-2 leading-relaxed font-light">
                          {combo.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/12 flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-[10px] uppercase tracking-[0.14em] text-[#8A857C]">
                          Trọn gói
                        </span>
                        <span className="text-lg font-semibold text-[#E5D3B3] tabular-nums">
                          {formatVnd(combo.sellingPrice)}
                        </span>
                      </div>
                      <Link
                        to={`/products/${encodeURIComponent(combo.variantId)}`}
                        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors"
                      >
                        <span>Xem cấu hình</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tầng 5: Dải Provenance & Chuẩn mực dịch vụ */}
      <section
        aria-label="Tiêu chuẩn dịch vụ Thám Vân Home"
        className="bg-[#F2EFE9] border-t border-[#E6E2DA] py-12 sm:py-14"
      >
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:divide-x md:divide-[#DFDAD0]">
          <div className="space-y-1.5 md:pr-6">
            <span className="font-editorial text-2xl text-[#8C6D46]">01</span>
            <h3 className="text-sm font-semibold text-[#171614]">
              Xuất xứ chính hãng 100%
            </h3>
            <p className="text-xs text-[#6B6760] leading-relaxed">
              Phân phối trực tiếp thiết bị TOTO, INAX, KOHLER, GROHE và vật tư ống nước tiêu chuẩn.
            </p>
          </div>
          <div className="space-y-1.5 md:px-8">
            <span className="font-editorial text-2xl text-[#8C6D46]">02</span>
            <h3 className="text-sm font-semibold text-[#171614]">
              Thanh toán linh hoạt &amp; Minh bạch
            </h3>
            <p className="text-xs text-[#6B6760] leading-relaxed">
              Hỗ trợ VietQR PayOS xác nhận tự động 24/7, thanh toán khi nhận hàng và theo dõi tiến độ giao công trình.
            </p>
          </div>
          <div className="space-y-1.5 md:pl-8">
            <span className="font-editorial text-2xl text-[#8C6D46]">03</span>
            <h3 className="text-sm font-semibold text-[#171614]">
              Bảo hành điện tử theo Serial
            </h3>
            <p className="text-xs text-[#6B6760] leading-relaxed">
              Tự động kích hoạt bảo hành khi hoàn tất đơn hàng và tiếp nhận yêu cầu kỹ thuật trực tuyến.
            </p>
          </div>
        </div>
      </section>

      {/* Nút cuộn lên đầu trang sắc nét */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Cuộn lên đầu trang"
          className="fixed bottom-6 right-6 z-40 h-10 w-10 flex items-center justify-center border border-[#171614] bg-[#FAF9F6]/95 text-[#171614] shadow-sm hover:bg-[#171614] hover:text-[#FAF9F6] transition-colors cursor-pointer"
        >
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
