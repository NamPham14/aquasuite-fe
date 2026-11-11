import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PackagePlus,
  Trash2,
  Sparkles,
  Save,
  ArrowLeft,
  Building2,
  Warehouse,
  Calendar,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetActiveSuppliersQuery,
  useLazyGetLowStockSuggestionsQuery,
} from '../api/purchaseOrderApi'
import type {
  PurchaseOrderResponse,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  SupplierItemOptionResponse,
} from '../types/purchaseOrder.types'
import { ProductSelectDrawer } from './ProductSelectDrawer'

export interface EditorItemRow {
  variantId: string
  sku: string
  productName: string
  unit: string
  quantity: number | string
  unitCost?: number | string | null
  lastSupplyPrice?: number | null
}

interface PurchaseOrderEditorProps {
  mode: 'create' | 'edit'
  initialData?: PurchaseOrderResponse
  isSubmitting?: boolean
  onSubmitCreate?: (data: CreatePurchaseOrderRequest) => Promise<void>
  onSubmitEdit?: (data: UpdatePurchaseOrderRequest) => Promise<void>
}

export function PurchaseOrderEditor({
  mode,
  initialData,
  isSubmitting = false,
  onSubmitCreate,
  onSubmitEdit,
}: PurchaseOrderEditorProps) {
  const navigate = useNavigate()

  // Header State - Using real system warehouse WH_MAIN
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? '')
  const warehouseCode = initialData?.warehouseCode ?? 'WH_MAIN'
  const [expectedDate, setExpectedDate] = useState(initialData?.expectedDate ?? '')
  const [note, setNote] = useState(initialData?.note ?? '')

  // Items State
  const [items, setItems] = useState<EditorItemRow[]>(() => {
    if (!initialData?.items) return []
    return initialData.items.map((it) => ({
      variantId: it.variantId,
      sku: it.sku,
      productName: it.productName,
      unit: it.unit,
      quantity: it.quantity,
      unitCost: it.unitCost,
      lastSupplyPrice: it.lastSupplyPrice,
    }))
  })

  // Drawer & Autofill State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Queries (Real APIs)
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useGetActiveSuppliersQuery()
  const [triggerLowStock, { isFetching: isAutofilling }] = useLazyGetLowStockSuggestionsQuery()

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.supplierId === supplierId),
    [suppliers, supplierId]
  )

  const selectedVariantIds = useMemo(() => items.map((i) => i.variantId), [items])

  // Calculation for Edit Mode
  const lineTotals = useMemo(() => {
    return items.map((it) => {
      const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)) || 0
      const c =
        it.unitCost === undefined || it.unitCost === null || it.unitCost === ''
          ? 0
          : typeof it.unitCost === 'number'
          ? it.unitCost
          : parseFloat(String(it.unitCost)) || 0
      if (c < 0) return 0
      return q * c
    })
  }, [items])

  const grandTotal = useMemo(() => {
    return lineTotals.reduce((sum, val) => sum + val, 0)
  }, [lineTotals])

  // Format helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  // Handlers
  const handleAddItemFromDrawer = (item: SupplierItemOptionResponse) => {
    setItems((prev) => [
      ...prev,
      {
        variantId: item.variantId,
        sku: item.sku,
        productName: item.productName,
        unit: item.unit,
        quantity: 1,
        unitCost: item.lastSupplyPrice ?? null,
        lastSupplyPrice: item.lastSupplyPrice,
      },
    ])
    toast.success(`Đã thêm "${item.productName}" vào đơn mua`)
  }

  const handleRemoveItem = (index: number) => {
    const item = items[index]
    setItems((prev) => prev.filter((_, idx) => idx !== index))
    if (item) {
      toast.info(`Đã xóa "${item.productName}" khỏi danh sách`)
    }
  }

  const handleQuantityChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: val } : it))
    )
  }

  const handleUnitCostChange = (index: number, val: string) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, unitCost: val } : it))
    )
  }

  const handleAutoFill = async () => {
    if (!supplierId) {
      toast.error('Vui lòng chọn nhà cung cấp trước khi gợi ý')
      return
    }
    try {
      const suggestions = await triggerLowStock(supplierId).unwrap()
      if (!suggestions || suggestions.length === 0) {
        toast.info('Không có sản phẩm nào của nhà cung cấp này đạt ngưỡng sắp hết')
        return
      }

      let addedCount = 0
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.variantId))
        const newRows: EditorItemRow[] = []

        suggestions.forEach((sug) => {
          if (!existingIds.has(sug.variantId) && (sug.suggestedQty ?? 0) > 0) {
            newRows.push({
              variantId: sug.variantId,
              sku: sug.sku,
              productName: sug.productName,
              unit: sug.unit,
              quantity: sug.suggestedQty ?? 1,
              unitCost: sug.lastSupplyPrice ?? null,
              lastSupplyPrice: sug.lastSupplyPrice,
            })
            addedCount++
          }
        })

        return [...prev, ...newRows]
      })
      if (addedCount > 0) {
        toast.success(`Đã tự động thêm ${addedCount} sản phẩm sắp hết vào đơn mua`)
      } else {
        toast.info('Tất cả sản phẩm gợi ý đã có trong danh sách đơn mua')
      }
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể lấy gợi ý đặt hàng')
    }
  }

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'create' && !supplierId) {
      toast.error('Vui lòng chọn nhà cung cấp')
      return
    }

    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm vào đơn mua hàng')
      return
    }

    // Validate quantities and unit costs
    for (const it of items) {
      const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity))
      if (isNaN(q) || q <= 0) {
        toast.error(`Số lượng của "${it.productName}" không hợp lệ (phải là số lớn hơn 0, không được nhập chữ hay số âm)`)
        return
      }

      if (mode === 'edit' && it.unitCost !== null && it.unitCost !== undefined && it.unitCost !== '') {
        const c = typeof it.unitCost === 'number' ? it.unitCost : parseFloat(String(it.unitCost))
        if (isNaN(c) || c < 0) {
          toast.error(`Đơn giá của "${it.productName}" không được âm hoặc chứa chữ`)
          return
        }
      }
    }

    try {
      if (mode === 'create' && onSubmitCreate) {
        await onSubmitCreate({
          supplierId,
          warehouseCode,
          expectedDate: expectedDate || undefined,
          note: note.trim() || undefined,
          items: items.map((it) => ({
            variantId: it.variantId,
            quantity: typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)),
          })),
        })
      } else if (mode === 'edit' && onSubmitEdit && initialData) {
        await onSubmitEdit({
          expectedDate: expectedDate || undefined,
          note: note.trim() || undefined,
          version: initialData.version,
          items: items.map((it) => ({
            variantId: it.variantId,
            quantity: typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)),
            unitCost:
              it.unitCost === null || it.unitCost === undefined || it.unitCost === ''
                ? null
                : typeof it.unitCost === 'number'
                ? it.unitCost
                : parseFloat(String(it.unitCost)),
          })),
        })
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu đơn mua hàng')
    }
  }

  return (
    <form onSubmit={validateAndSubmit} noValidate className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/purchase-orders')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {mode === 'create' ? 'Tạo đơn mua hàng (PO)' : `Chỉnh sửa PO: ${initialData?.poCode}`}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'create'
                  ? 'Giai đoạn 1: Chọn NCC, sản phẩm & số lượng dự kiến gửi báo giá'
                  : 'Giai đoạn 2: Cập nhật đơn giá thương lượng, điều khoản thỏa thuận và hạn giao'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/purchase-orders')}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Lưu PO nháp' : 'Cập nhật PO'}
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Nhà cung cấp <span className="text-rose-500">*</span>
            </label>
            {mode === 'create' ? (
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value)
                  setItems([]) // clear items if supplier changes
                }}
                disabled={isLoadingSuppliers}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.supplierName} ({s.supplierCode})
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium">
                {initialData?.supplierName} ({initialData?.supplierCode})
              </div>
            )}
          </div>

          {/* Warehouse - Real warehouse in system WH_MAIN */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Warehouse className="w-3.5 h-3.5 text-slate-400" />
              Kho nhận hàng <span className="text-rose-500">*</span>
            </label>
            <div className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium flex items-center justify-between">
              <span>Kho Tổng ({warehouseCode})</span>
              <span className="text-[11px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">Mặc định</span>
            </div>
          </div>

          {/* Expected Delivery Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày giao hàng dự kiến
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            />
          </div>
        </div>

        {/* Note */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Ghi chú / Điều khoản thỏa thuận (Zalo, thanh toán, giao hàng)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Đã chốt qua Zalo, thanh toán 50% khi nhận hàng, giao tại kho Tổng..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Danh sách sản phẩm đặt mua ({items.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'create'
                ? 'Giai đoạn 1: Chỉ nhập số lượng, đơn giá sẽ được bổ sung sau khi NCC báo giá'
                : 'Giai đoạn 2: Nhập đơn giá nhập đã thỏa thuận'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {mode === 'create' && (
              <button
                type="button"
                onClick={handleAutoFill}
                disabled={!supplierId || isAutofilling}
                className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {isAutofilling ? 'Đang gợi ý...' : 'Auto-Fill hàng sắp hết'}
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              disabled={!supplierId}
              className="px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              Thêm sản phẩm
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <PackagePlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Chưa có sản phẩm nào được chọn.</p>
            <p className="text-xs mt-1">
              {!supplierId
                ? 'Vui lòng chọn nhà cung cấp ở trên trước khi chọn sản phẩm.'
                : 'Nhấn "Thêm sản phẩm" hoặc "Auto-Fill hàng sắp hết" để bắt đầu.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100 font-semibold">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">STT</th>
                  <th className="px-4 py-3">Mã SKU</th>
                  <th className="px-4 py-3">Tên sản phẩm</th>
                  <th className="px-4 py-3 text-center">ĐVT</th>
                  <th className="px-4 py-3 text-right w-36">Số lượng đặt</th>
                  {mode === 'edit' && (
                    <>
                      <th className="px-4 py-3 text-right w-44">Đơn giá nhập (đ)</th>
                      <th className="px-4 py-3 text-right">Giá nhập gần nhất</th>
                      <th className="px-4 py-3 text-right w-44">Thành tiền</th>
                    </>
                  )}
                  <th className="px-4 py-3 text-center w-16">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => (
                  <tr key={row.variantId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                      {row.sku}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.productName}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-medium">
                      {row.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.quantity ?? ''}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        placeholder="Số lượng..."
                        className="w-28 px-2 py-1 text-right text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                      />
                    </td>
                    {mode === 'edit' && (
                      <>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.unitCost ?? ''}
                            onChange={(e) => handleUnitCostChange(idx, e.target.value)}
                            placeholder="Nhập giá NCC..."
                            className="w-36 px-2 py-1 text-right text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500 font-medium">
                          {row.lastSupplyPrice ? formatCurrency(row.lastSupplyPrice) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          {formatCurrency(lineTotals[idx])}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa dòng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer calculation in Edit mode */}
        {mode === 'edit' && items.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              * Tổng giá trị đơn mua được tính từ các dòng đã nhập đơn giá thỏa thuận
            </span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700">Tổng giá trị đơn mua:</span>
              <span className="text-lg font-bold text-sky-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Product Drawer */}
      <ProductSelectDrawer
        isOpen={isDrawerOpen}
        supplierId={supplierId}
        supplierName={selectedSupplier?.supplierName}
        selectedVariantIds={selectedVariantIds}
        onClose={() => setIsDrawerOpen(false)}
        onSelectItem={handleAddItemFromDrawer}
      />
    </form>
  )
}
