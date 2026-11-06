import { Trash2, Package, Layers, AlertCircle, Plus, Minus } from 'lucide-react'
import type { CartCombo, CartItem } from '../hooks/usePOSCart'

interface POSCartTableProps {
  items: CartItem[]
  combos: CartCombo[]
  onUpdateItemQuantity: (variantId: string, quantity: number) => void
  onRemoveItem: (variantId: string) => void
  onUpdateComboQuantity: (comboId: string, quantity: number) => void
  onRemoveCombo: (comboId: string) => void
  onOpenCatalog: () => void
}

export function POSCartTable({
  items,
  combos,
  onUpdateItemQuantity,
  onRemoveItem,
  onUpdateComboQuantity,
  onRemoveCombo,
  onOpenCatalog,
}: POSCartTableProps) {
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  const hasItems = items.length > 0 || combos.length > 0

  if (!hasItems) {
    return (
      <div className="border border-dashed border-slate-300 rounded-lg p-10 text-center bg-slate-50/50">
        <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
          <Package className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-medium text-slate-800">Chưa có sản phẩm nào trong đơn hàng</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Chọn các thiết bị hoặc gói combo từ danh mục để bắt đầu lên đơn tại quầy.
        </p>
        <button
          type="button"
          onClick={onOpenCatalog}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm sản phẩm & Combo</span>
        </button>
      </div>
    )
  }

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Danh sách mặt hàng ({items.length + combos.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenCatalog}
          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm mặt hàng</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-semibold">
            <tr>
              <th className="px-4 py-2.5">Sản phẩm / Mặt hàng</th>
              <th className="px-3 py-2.5 text-right">Đơn giá</th>
              <th className="px-3 py-2.5 text-center">Số lượng</th>
              <th className="px-3 py-2.5 text-right">Thành tiền</th>
              <th className="px-3 py-2.5 text-center w-12">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Combo Items */}
            {combos.map((cb) => {
              const lineTotal = Math.max(0, cb.unitPrice * cb.quantity - (cb.discountAmount || 0))
              return (
                <tr key={`combo-${cb.comboId}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="p-1 rounded bg-indigo-50 text-indigo-600 mt-0.5">
                        <Layers className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900">{cb.name}</div>
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Gói Combo
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700">
                    {formatMoney(cb.unitPrice)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateComboQuantity(cb.comboId, cb.quantity - 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40"
                        disabled={cb.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={cb.quantity}
                        onChange={(e) => onUpdateComboQuantity(cb.comboId, Number(e.target.value) || 1)}
                        className="w-12 text-center text-xs py-0.5 border border-slate-200 rounded font-medium focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateComboQuantity(cb.comboId, cb.quantity + 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(lineTotal)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveCombo(cb.comboId)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                      title="Xóa combo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}

            {/* SKU Items */}
            {items.map((it) => {
              const lineTotal = Math.max(0, it.unitPrice * it.quantity - (it.discountAmount || 0))
              const isStockLow = it.availableStock !== undefined && it.quantity > it.availableStock

              return (
                <tr key={`sku-${it.variantId}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="p-1 rounded bg-sky-50 text-sky-600 mt-0.5">
                        <Package className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>Mã SKU: <span className="font-mono text-slate-700">{it.sku}</span></span>
                          {it.availableStock !== undefined && (
                            <span className={isStockLow ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                              (Tồn kho: {it.availableStock})
                            </span>
                          )}
                        </div>
                        {isStockLow && (
                          <div className="flex items-center gap-1 text-[11px] text-rose-600 mt-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>Vượt tồn kho khả dụng ({it.availableStock})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-700">
                    {formatMoney(it.unitPrice)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateItemQuantity(it.variantId, it.quantity - 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-40"
                        disabled={it.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={it.quantity}
                        onChange={(e) => onUpdateItemQuantity(it.variantId, Number(e.target.value) || 0.001)}
                        className="w-14 text-center text-xs py-0.5 border border-slate-200 rounded font-medium focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateItemQuantity(it.variantId, it.quantity + 1)}
                        className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(lineTotal)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(it.variantId)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                      title="Xóa mặt hàng"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
