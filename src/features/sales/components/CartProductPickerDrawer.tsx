import { useState, useMemo } from 'react'
import { X, Search, Plus, Check, RefreshCw } from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useGetSalesCatalogItemsQuery } from '../api/salesCatalogApi.ts'
import type { CatalogItemOption } from '../types/salesCatalog.types.ts'

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

  const {
    data: apiCatalogItems = [],
    isLoading,
    isError,
    refetch,
  } = useGetSalesCatalogItemsQuery(undefined, {
    skip: !isOpen,
  })

  const catalogItems: CatalogItemOption[] = useMemo(() => {
    return apiCatalogItems.filter((item) => !item.isCombo)
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
      className="fixed inset-0 z-50 flex justify-end bg-[#171614]/45 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Chọn sản phẩm thêm vào giỏ hàng"
    >
      <div className="w-full max-w-2xl bg-[#FAF9F6] h-full flex flex-col border-l border-[#E6E2DA] shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E6E2DA] flex items-center justify-between bg-white">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C6D46]">
              Danh mục Showroom
            </p>
            <h3 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
              Chọn thiết bị thêm vào giỏ hàng
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh mục"
            className="p-2 border border-transparent text-[#6B6760] hover:text-[#171614] hover:border-[#E6E2DA] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-5 border-b border-[#E6E2DA] space-y-3.5 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8C867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên sản phẩm, mã SKU (VD: TOTO, INAX, sen cây...)"
              className="w-full pl-10 pr-4 h-10 text-xs bg-[#FAF9F6] border border-[#D6D1C7] text-[#171614] placeholder:text-[#8C867C] focus:outline-none focus:border-[#171614]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {brands.map((brand) => (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`px-3 py-1 text-[11px] uppercase tracking-[0.12em] font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                  selectedBrand === brand
                    ? 'border-[#171614] bg-[#171614] text-[#FAF9F6]'
                    : 'border-[#E6E2DA] bg-[#FAF9F6] text-[#57534E] hover:border-[#171614]'
                }`}
              >
                {brand === 'ALL' ? 'Tất cả thương hiệu' : brand}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-2 divide-y divide-[#E6E2DA]">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-[#78736A]">
              Đang tải danh mục thiết bị từ hệ thống...
            </div>
          ) : isError ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-xs text-[#991B1B]">
                Không thể tải danh sách sản phẩm từ máy chủ.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#78736A]">
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
                  className="py-4 flex items-center justify-between gap-4 hover:bg-white/80 px-2 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em]">
                      <span className="font-mono font-medium text-[#78736A]">
                        {item.sku}
                      </span>
                      <span className="text-[#B5AFA5]" aria-hidden="true">&middot;</span>
                      <span className="font-semibold text-[#8C6D46]">
                        {item.brand}
                      </span>
                      {inCartQty > 0 && (
                        <span className="inline-flex items-center gap-1 bg-[#EEF5F1] border border-[#C6DDD0] px-2 py-0.5 text-[10px] font-medium text-[#245C42] normal-case tracking-normal">
                          <Check className="w-3 h-3" />
                          Trong giỏ: {inCartQty}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#171614] truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs tabular-nums">
                      <span className="font-semibold text-[#171614]">
                        {formatVnd(item.sellingPrice)}
                      </span>
                      <span className="text-[#C5BEB2]" aria-hidden="true">&middot;</span>
                      <span
                        className={
                          outOfStock ? 'text-[#991B1B] font-medium' : 'text-[#6B6760]'
                        }
                      >
                        Tồn kho: {item.availableStock} {item.unit}
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
                      className="w-14 h-9 text-center text-xs font-semibold bg-white border border-[#D6D1C7] text-[#171614] focus:outline-none focus:border-[#171614] tabular-nums"
                    />
                    <button
                      type="button"
                      disabled={outOfStock || isAdding}
                      onClick={() => void onAddVariant(item.variantId, qty)}
                      className="h-9 inline-flex items-center gap-1.5 px-3.5 border border-[#171614] bg-[#171614] hover:bg-[#2A2825] disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] text-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors cursor-pointer"
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
        <div className="px-6 py-4 border-t border-[#E6E2DA] bg-white flex items-center justify-between">
          <span className="text-xs text-[#78736A] tabular-nums">
            Hiển thị <strong className="text-[#171614]">{filteredItems.length}</strong> biến thể sản phẩm
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-[#D6D1C7] bg-white hover:border-[#171614] text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
