import { useState } from 'react'
import {
  X,
  Plus,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'
import type { CatalogItemOption } from '../data/catalogProducts.data'

interface ProductDetailModalProps {
  product: CatalogItemOption | null
  onClose: () => void
  onAdd: (product: CatalogItemOption) => void
  countInQuotation?: number
}

export function ProductDetailModal({
  product,
  onClose,
  onAdd,
  countInQuotation = 0,
}: ProductDetailModalProps) {
  const [imgError, setImgError] = useState(false)

  if (!product) return null

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-slate-200 text-slate-700">
              {product.isCombo ? (
                <Layers className="w-4 h-4 text-amber-700" />
              ) : (
                <Package className="w-4 h-4 text-slate-700" />
              )}
            </span>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider">
                Chi tiết sản phẩm / SKU
              </span>
              <h3 className="text-xs font-bold text-slate-900 font-mono">
                {product.sku}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Top section: Ảnh & Thông tin tổng quan */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            {/* Ảnh sản phẩm */}
            <div className="sm:col-span-5 aspect-4/3 rounded-md border border-slate-200 bg-slate-100 overflow-hidden relative flex items-center justify-center">
              {product.imageUrl && !imgError ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <Package className="w-10 h-10 mb-1 text-slate-300" />
                  <span className="text-[11px]">Hình ảnh sản phẩm</span>
                </div>
              )}
              {product.isCombo && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                  <Sparkles className="w-3 h-3" /> COMBO DỰ ÁN
                </span>
              )}
            </div>

            {/* Thông tin tên, hãng, giá, tồn kho */}
            <div className="sm:col-span-7 space-y-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {product.brand}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {product.category}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                  ĐVT: {product.unit}
                </span>
              </div>

              <h2 className="text-sm font-bold text-slate-900 leading-snug">
                {product.name}
              </h2>

              {/* Giá & Tồn kho */}
              <div className="p-2.5 rounded border border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">Giá bán niêm yết:</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums font-mono">
                    {formatMoney(product.sellingPrice)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-500 font-medium">Tồn kho khả dụng:</span>
                  {product.availableStock > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Sẵn sàng xuất kho ({product.availableStock} {product.unit})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Cần đặt hàng trước (Lead-time: 3-5 ngày)
                    </span>
                  )}
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {/* Nếu là Combo: Liệt kê chi tiết các thành phần thiết bị */}
          {product.components && product.components.length > 0 && (
            <div className="rounded border border-slate-200 p-3 bg-slate-50/50 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Chi tiết các thiết bị trong gói Combo ({product.components.length} món):</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {product.components.map((comp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-1.5 rounded bg-white border border-slate-200/70 text-[11px] text-slate-700"
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[9px] text-slate-500 shrink-0">
                      {i + 1}
                    </span>
                    <span className="truncate">{comp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bảng thông số kỹ thuật (Specifications) */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Thông số kỹ thuật & Cam kết chất lượng</span>
              </h4>
              <div className="rounded border border-slate-200 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(product.specifications).map(([key, val], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                      >
                        <td className="py-1.5 px-3 w-1/3 font-medium text-slate-500 text-[11px] border-r border-slate-100">
                          {key}
                        </td>
                        <td className="py-1.5 px-3 font-semibold text-slate-800 text-[11px]">
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={() => onAdd(product)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {countInQuotation > 0
                ? `Thêm tiếp vào báo giá (Đang có: x${countInQuotation})`
                : 'Thêm vào báo giá ngay'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
