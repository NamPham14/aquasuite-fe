import { useState, useMemo } from 'react'
import { X, Search, Plus, Package, Check } from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useGetSalesCatalogItemsQuery } from '../api/salesCatalogApi.ts'
import { CATALOG_PRODUCTS, type CatalogItemOption } from '../data/catalogProducts.data.ts'

interface CartProductPickerDrawerProps {
  isOpen: boolean
  onClose: () => void
  onAddVariant: (variantId: string, quantity: number) => Promise<boolean>
  existingQuantitiesByVariant: Record<string, number>
  isAdding: boolean
}

export function CartProductPickerDrawer({
  isOpen,
  onClose,
  onAddVariant,
  existingQuantitiesByVariant,
  isAdding,
}: CartProductPickerDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('ALL')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const { data: apiCatalogItems, isLoading } = useGetSalesCatalogItemsQuery(undefined, {
    skip: !isOpen,
  })

  const catalogItems: CatalogItemOption[] = useMemo(() => {
    const source = apiCatalogItems && apiCatalogItems.length > 0 ? apiCatalogItems : CATALOG_PRODUCTS
    return source.filter((item) => !item.isCombo)
  }, [apiCatalogItems])

  const brands = useMemo(() => {
    const set = new Set<string>()
    catalogItems.forEach((item) => {
      if (item.brand) set.add(item.brand)
    })
    return ['ALL', ...Array.from(set)]
  }, [catalogItems])

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return catalogItems.filter((item) => {
      if (selectedBrand !== 'ALL' && item.brand !== selectedBrand) return false
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      )
    })
  }, [catalogItems, searchTerm, selectedBrand])

  if (!isOpen) return null

  const getQty = (variantId: string) => quantities[variantId] ?? 1

  const setQty = (variantId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [variantId]: Math.max(1, value),
    }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Chọn sản phẩm thêm vào giỏ hàng"
    >
      <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Chọn thiết bị thêm vào giỏ hàng
              </h3>
              <p className="text-[11px] text-slate-500">
                Tìm theo tên sản phẩm, mã SKU hoặc lọc theo thương hiệu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh mục"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên sản phẩm, mã SKU (VD: TOTO, INAX, sen cây...)"
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {brands.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedBrand === brand
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {brand === 'ALL' ? 'Tất cả thương hiệu' : brand}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Đang tải danh mục thiết bị...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Không tìm thấy sản phẩm phù hợp với từ khóa.
            </div>
          ) : (
            filteredItems.map((item) => {
              const inCartQty = existingQuantitiesByVariant[item.variantId] ?? 0
              const qty = getQty(item.variantId)
              const outOfStock = item.availableStock <= 0

              return (
                <div
                  key={item.variantId}
                  className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-lg transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold">
                        {item.sku}
                      </span>
                      <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                        {item.brand}
                      </span>
                      {inCartQty > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <Check className="w-3 h-3" />
                          Đã có {inCartQty} trong giỏ
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 mt-1 truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className="font-bold text-sky-700">
                        {formatVnd(item.sellingPrice)}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span
                        className={
                          outOfStock ? 'text-rose-600 font-medium' : 'text-slate-500'
                        }
                      >
                        Tồn khả dụng: {item.availableStock} {item.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      max={item.availableStock > 0 ? item.availableStock : 1}
                      disabled={outOfStock || isAdding}
                      value={qty}
                      onChange={(e) =>
                        setQty(item.variantId, Number.parseInt(e.target.value, 10) || 1)
                      }
                      aria-label={`Số lượng thêm ${item.name}`}
                      className="w-14 h-8 text-center text-xs font-semibold border border-slate-200 rounded-md focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      disabled={outOfStock || isAdding}
                      onClick={() => void onAddVariant(item.variantId, qty)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Hiển thị {filteredItems.length} biến thể sản phẩm
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

