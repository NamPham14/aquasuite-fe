import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Search, X, Check, PackagePlus, AlertCircle } from 'lucide-react'
import { useGetSupplierItemsQuery } from '../api/purchaseOrderApi'
import type { SupplierItemOptionResponse } from '../types/purchaseOrder.types'

interface ProductSelectDrawerProps {
  isOpen: boolean
  supplierId: string
  supplierName?: string
  selectedVariantIds: string[]
  onClose: () => void
  onSelectItem: (item: SupplierItemOptionResponse) => void
}

export function ProductSelectDrawer({
  isOpen,
  supplierId,
  supplierName,
  selectedVariantIds,
  onClose,
  onSelectItem,
}: ProductSelectDrawerProps) {
  const [showAll, setShowAll] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Khóa cuộn trang nền khi mở drawer
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const { data: items = [], isLoading, error } = useGetSupplierItemsQuery(
    { supplierId, all: showAll },
    { skip: !isOpen || !supplierId }
  )

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const lower = searchTerm.toLowerCase().trim()
    return items.filter(
      (it) =>
        it.sku.toLowerCase().includes(lower) ||
        it.productName.toLowerCase().includes(lower) ||
        it.unit.toLowerCase().includes(lower)
    )
  }, [items, searchTerm])

  if (!isOpen) return null

  const formatPrice = (val?: number | null) => {
    if (val === undefined || val === null) return 'Chưa có'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-sky-600" />
              Chọn sản phẩm vào đơn mua
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {supplierName ? `Nhà cung cấp: ${supplierName}` : 'Chọn SKU từ danh mục'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã SKU, tên sản phẩm..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-400"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 border-slate-300 focus:ring-sky-500 cursor-pointer"
              />
              <span>Hiển thị toàn bộ sản phẩm trong kho (không chỉ riêng NCC này)</span>
            </label>
            <span className="text-xs text-slate-500">
              {filteredItems.length} sản phẩm
            </span>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mb-2"></div>
              <p>Đang tải danh sách sản phẩm...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center text-rose-600 text-sm">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
              <p>Không thể tải danh sách sản phẩm.</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p>Không tìm thấy sản phẩm phù hợp.</p>
              {!showAll && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-2 text-xs text-sky-600 hover:underline cursor-pointer"
                >
                  Bật "Hiển thị toàn bộ sản phẩm" để xem tất cả
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedVariantIds.includes(item.variantId)
              return (
                <div
                  key={item.variantId}
                  className={`p-4 flex items-center justify-between hover:bg-sky-50/50 transition-colors ${
                    isSelected ? 'bg-sky-50/30' : ''
                  }`}
                >
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                        {item.sku}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">({item.unit})</span>
                      {item.suppliedBySupplier && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">
                          NCC cung cấp
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-1 line-clamp-1">
                      {item.productName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Giá nhập gần nhất:{' '}
                      <span className="font-medium text-slate-700">
                        {formatPrice(item.lastSupplyPrice)}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectItem(item)}
                    disabled={isSelected}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm cursor-pointer'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Đã chọn
                      </>
                    ) : (
                      <>
                        <PackagePlus className="w-3.5 h-3.5" />
                        Thêm
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
