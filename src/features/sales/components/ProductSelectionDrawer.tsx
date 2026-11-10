import { useState, useMemo, useRef, useEffect } from 'react'
import {
  X,
  Search,
  Plus,
  Check,
  Package,
  Layers,
  Sparkles,
  ChevronDown,
  Eye,
} from 'lucide-react'
import type { CatalogItemOption } from '../data/catalogProducts.data'
import { useGetSalesCatalogItemsQuery } from '../api/salesCatalogApi'
import { ProductDetailModal } from './ProductDetailModal'

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

interface ProductSelectionDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectProduct: (item: CatalogItemOption) => void
  selectedVariantCounts: Record<string, number>
  initialTab?: 'product' | 'combo'
}

export function ProductSelectionDrawer({
  isOpen,
  onClose,
  onSelectProduct,
  selectedVariantCounts,
  initialTab = 'product',
}: ProductSelectionDrawerProps) {
  const [activeTab, setActiveTab] = useState<'product' | 'combo'>(initialTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('Tất cả')

  // State cho Searchable Brand Dropdown
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false)
  const [brandSearchTerm, setBrandSearchTerm] = useState('')
  const brandDropdownRef = useRef<HTMLDivElement>(null)

  // State xem chi tiết sản phẩm / SKU
  const [detailProduct, setDetailProduct] = useState<CatalogItemOption | null>(null)

  // Đóng dropdown hãng khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target as Node)
      ) {
        setBrandDropdownOpen(false)
      }
    }
    if (brandDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [brandDropdownOpen])

  // Đóng Drawer khi bấm phím Escape (khi không mở modal chi tiết sản phẩm)
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !detailProduct) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, detailProduct, onClose])

  // Danh sách hãng lọc theo ô tìm kiếm trong dropdown
  // const filteredBrands = useMemo(() => {
  //   const list = ALL_BRANDS.filter((b) => (activeTab === 'product' ? b !== 'AQUA-COMBO' : true))
  //   if (!brandSearchTerm.trim()) return list
  //   return list.filter((b) => b.toLowerCase().includes(brandSearchTerm.toLowerCase().trim()))
  // }, [activeTab, brandSearchTerm])

  // Định dạng tiền tệ
  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const { data: apiCatalogItems, isLoading } = useGetSalesCatalogItemsQuery(undefined, {
    skip: !isOpen,
  })

  // Toàn bộ dữ liệu sản phẩm & combo lấy 100% từ Database API
  const catalogSource = useMemo<CatalogItemOption[]>(() => {
    const list = Array.isArray(apiCatalogItems) ? apiCatalogItems : (apiCatalogItems as any)?.data
    if (list && Array.isArray(list)) {
      return list
    }
    return []
  }, [apiCatalogItems])

  // Trích xuất danh sách hãng động từ dữ liệu thực tế trong Database
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>()
    catalogSource.forEach((item) => {
      if (item.brand && item.brand.trim()) {
        brandsSet.add(item.brand.trim())
      }
    })
    return ['Tất cả', ...Array.from(brandsSet).sort()]
  }, [catalogSource])

  // Danh sách hãng lọc theo ô tìm kiếm trong dropdown
  const filteredBrands = useMemo(() => {
    if (!brandSearchTerm.trim()) return availableBrands
    const term = removeVietnameseTones(brandSearchTerm.trim())
    return availableBrands.filter((b) => removeVietnameseTones(b).includes(term))
  }, [availableBrands, brandSearchTerm])

  // Lọc sản phẩm & combo theo tab, hãng và từ khóa không dấu
  const filteredList = useMemo(() => {
    return catalogSource.filter((item) => {
      if (activeTab === 'product' && item.isCombo) return false
      if (activeTab === 'combo' && !item.isCombo) return false

      if (selectedBrand !== 'Tất cả') {
        const itemBrand = removeVietnameseTones(item.brand || '')
        const targetBrand = removeVietnameseTones(selectedBrand)
        if (itemBrand !== targetBrand && !itemBrand.includes(targetBrand) && !targetBrand.includes(itemBrand)) {
          return false
        }
      }

      if (searchTerm.trim()) {
        const query = removeVietnameseTones(searchTerm.trim())
        const target = removeVietnameseTones(
          `${item.name} ${item.sku} ${item.brand || ''} ${item.category || ''} ${item.description || ''} ${(item.components || []).join(' ')}`
        )
        if (!target.includes(query)) return false
      }

      return true
    })
  }, [catalogSource, activeTab, selectedBrand, searchTerm])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-[1px] transition-opacity cursor-pointer"
        onClick={onClose}
      >
        <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 h-full">
          <div
            className="w-screen max-w-md bg-white shadow-xl flex flex-col border-l border-slate-200 cursor-default h-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gọn gàng */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
                  Danh mục sản phẩm & Combo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bấm vào tên để xem ảnh & chi tiết; bấm Chọn để thêm vào báo giá
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Control Tabs */}
            <div className="px-4 pt-2.5 pb-2 border-b border-slate-100 bg-white">
              <div className="grid grid-cols-2 p-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('product')
                    if (selectedBrand === 'AQUA-COMBO') setSelectedBrand('Tất cả')
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded transition text-xs ${
                    activeTab === 'product'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Sản phẩm lẻ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('combo')
                    setSelectedBrand('Tất cả')
                  }}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded transition text-xs ${
                    activeTab === 'combo'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Combo dự án</span>
                </button>
              </div>
            </div>

            {/* Search & Searchable Brand Dropdown Bar */}
            <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
              {/* Ô tìm kiếm từ khóa SKU / Tên */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'product'
                      ? 'Tìm theo mã SKU, tên thiết bị...'
                      : 'Tìm gói combo dự án...'
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-slate-400 transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* DROPDOWN HÃNG SẢN XUẤT CÓ Ô TÌM KIẾM TRỰC TIẾP BÊN TRONG */}
              <div className="relative" ref={brandDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setBrandDropdownOpen((prev) => !prev)
                    setBrandSearchTerm('')
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition text-left"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[11px] text-slate-500">Hãng sản xuất:</span>
                    <span className="font-semibold text-slate-800 truncate">
                      {selectedBrand}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>

                {/* Popover xổ xuống tìm kiếm hãng */}
                {brandDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded border border-slate-200 shadow-lg p-2 space-y-1.5 animate-in fade-in duration-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Gõ tìm tên hãng..."
                        value={brandSearchTerm}
                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                        autoFocus
                        className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-slate-200 focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-0.5 text-xs pt-1">
                      {filteredBrands.length === 0 ? (
                        <div className="py-2 text-center text-[11px] text-slate-400">
                          Không có hãng phù hợp
                        </div>
                      ) : (
                        filteredBrands.map((brand) => (
                          <button
                            key={brand}
                            type="button"
                            onClick={() => {
                              setSelectedBrand(brand)
                              setBrandDropdownOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-xs transition ${
                              selectedBrand === brand
                                ? 'bg-slate-900 text-white font-medium'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>{brand}</span>
                            {selectedBrand === brand && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/40">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Đang tải danh mục từ hệ thống...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-700">
                    Không tìm thấy {activeTab === 'product' ? 'sản phẩm' : 'combo'} phù hợp
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Thử tìm với từ khóa hoặc đổi hãng khác
                  </p>
                </div>
              ) : (
                filteredList.map((item) => {
                  const countInQuotation = selectedVariantCounts[item.variantId] || 0
                  const isSelected = countInQuotation > 0

                  return (
                    <div
                      key={item.variantId}
                      className={`rounded border bg-white p-2.5 transition text-xs ${
                        isSelected
                          ? 'border-slate-300 bg-slate-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1 min-w-0">
                          {/* Tags */}
                          <div className="flex items-center gap-1 mb-1 flex-wrap">
                            <span className="inline-block px-1 py-0.2 rounded font-mono text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.sku}
                            </span>
                            <span className="inline-block px-1 py-0.2 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              {item.brand}
                            </span>
                            {item.isCombo && (
                              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                <Sparkles className="w-2.5 h-2.5" />
                                COMBO
                              </span>
                            )}
                          </div>

                          {/* Title - Click mở Popup xem chi tiết & hình ảnh */}
                          <button
                            type="button"
                            onClick={() => setDetailProduct(item)}
                            className="text-left text-xs font-medium text-slate-900 leading-snug line-clamp-2 hover:text-sky-800 hover:underline transition group flex items-start gap-1"
                            title="Bấm để xem chi tiết thông số & hình ảnh"
                          >
                            <span>{item.name}</span>
                            <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition" />
                          </button>

                          {/* Tồn kho & Đơn vị tính */}
                          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                            <span className="text-slate-400">
                              ĐVT: <strong className="text-slate-600 font-medium">{item.unit}</strong>
                            </span>
                            <span className="text-slate-300">•</span>
                            {item.availableStock > 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                Sẵn {item.availableStock} {item.unit}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                Đặt trước
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Giá & Button thêm */}
                        <div className="flex flex-col items-end justify-between shrink-0 self-stretch">
                          <span className="text-xs font-semibold text-slate-900 tabular-nums">
                            {formatMoney(item.sellingPrice)}
                          </span>

                          <div className="mt-auto pt-2 flex items-center gap-1">
                            {isSelected && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                <Check className="w-2.5 h-2.5 text-emerald-600" /> x{countInQuotation}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => onSelectProduct(item)}
                              className={`inline-flex items-center gap-0.5 rounded px-2 py-1 text-[11px] font-medium transition ${
                                isSelected
                                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
                                  : 'bg-slate-800 text-white hover:bg-slate-900 shadow-2xs'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isSelected ? 'Thêm' : 'Chọn'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                {filteredList.length} sản phẩm khả dụng
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium text-xs transition"
              >
                Đóng danh mục
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP XEM HÌNH ẢNH & CHI TIẾT SẢN PHẨM / SKU */}
      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAdd={(prod) => {
          onSelectProduct(prod)
          setDetailProduct(null)
        }}
        countInQuotation={detailProduct ? selectedVariantCounts[detailProduct.variantId] || 0 : 0}
      />
    </>
  )
}
