import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  AlertTriangle,
  Plus,
  CheckCircle2,
  Truck,
  PlusCircle,
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
  PurchaseOrderDeliveryType,
  CreatePurchaseOrderStageRequest,
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
  isNewlyAdded?: boolean
}

export interface EditorStageRow {
  stageId?: string
  stageName: string
  description?: string
  expectedDeliveryDate: string
  percent: number | string
  amount: number
  sortOrder?: number
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

  // Lock status check: if status is CONFIRMED, COMPLETED, or CANCELLED, items and prices cannot be edited
  const isLocked = Boolean(
    initialData?.status &&
    initialData.status !== 'DRAFT' &&
    initialData.status !== 'QUOTED'
  )

  // Header State
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? '')
  const warehouseCode = initialData?.warehouseCode ?? 'WH_MAIN'
  const [expectedDate, setExpectedDate] = useState(initialData?.expectedDate ?? '')
  const [note, setNote] = useState(initialData?.note ?? '')

  // Delivery Plan & Staging State (Phase 2 QUOTED)
  const [deliveryPlanType, setDeliveryPlanType] = useState<PurchaseOrderDeliveryType>(
    initialData?.deliveryPlanType ?? 'SINGLE'
  )

  const [stages, setStages] = useState<EditorStageRow[]>(() => {
    if (initialData?.stages && initialData.stages.length > 0) {
      return initialData.stages.map((st) => ({
        stageId: st.stageId,
        stageName: st.stageName,
        description: st.description ?? '',
        expectedDeliveryDate: st.expectedDeliveryDate,
        percent: st.percent,
        amount: st.amount,
        sortOrder: st.sortOrder,
      }))
    }
    return [
      {
        stageName: 'Đợt 1 (Toàn bộ)',
        description: 'Giao toàn bộ đơn hàng một lần',
        expectedDeliveryDate: initialData?.expectedDate ?? '',
        percent: 100,
        amount: initialData?.totalAmount ?? 0,
        sortOrder: 0,
      },
    ]
  })

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

  // Queries
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useGetActiveSuppliersQuery()
  const [triggerLowStock, { isFetching: isAutofilling }] = useLazyGetLowStockSuggestionsQuery()

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.supplierId === supplierId),
    [suppliers, supplierId]
  )

  const selectedVariantIds = useMemo(() => items.map((i) => i.variantId), [items])

  const initialVariantIdSet = useMemo(
    () => new Set(initialData?.items?.map((it) => it.variantId) ?? []),
    [initialData]
  )

  // Line totals & grand total calculation
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

  // Sync stage amounts when grandTotal, deliveryPlanType or expectedDate changes
  useEffect(() => {
    if (deliveryPlanType === 'SINGLE') {
      setStages([
        {
          stageName: 'Đợt 1 (Toàn bộ)',
          description: 'Giao toàn bộ đơn hàng một lần',
          expectedDeliveryDate: expectedDate || '',
          percent: 100,
          amount: grandTotal,
          sortOrder: 0,
        },
      ])
    } else {
      // If STAGED, automatically recalculate amounts for all stages based on their percentage
      setStages((prev) => {
        if (!prev || prev.length === 0) return prev
        let sumPrev = 0
        const totalP = prev.reduce((s, x) => s + (parseFloat(String(x.percent)) || 0), 0)
        const isFull100 = Math.abs(totalP - 100) < 0.01

        return prev.map((st, idx) => {
          const p = parseFloat(String(st.percent)) || 0
          if (idx === prev.length - 1 && prev.length > 1 && isFull100) {
            const lastAmt = Math.max(0, grandTotal - sumPrev)
            return { ...st, amount: lastAmt }
          }
          const amt = Math.round((grandTotal * p) / 100)
          sumPrev += amt
          return { ...st, amount: amt }
        })
      })
    }
  }, [deliveryPlanType, grandTotal, expectedDate])

  // Format helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  // Calculate sum of percent
  const stageTotalPercent = useMemo(() => {
    return stages.reduce((sum, s) => {
      const p = parseFloat(String(s.percent))
      return sum + (isNaN(p) ? 0 : p)
    }, 0)
  }, [stages])

  const isPercentBalanced = useMemo(() => {
    return Math.abs(stageTotalPercent - 100) < 0.01
  }, [stageTotalPercent])

  // Calculate sum of stage amounts
  const stageTotalAmount = useMemo(() => {
    return stages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
  }, [stages])

  // Auto-balance last stage percentage and amount
  const handleAutoBalanceLastStage = () => {
    if (stages.length <= 1) return
    const prevPercentSum = stages.slice(0, -1).reduce((sum, s) => sum + (parseFloat(String(s.percent)) || 0), 0)
    const lastPercent = Math.max(0, Number((100 - prevPercentSum).toFixed(2)))
    const prevAmountSum = stages.slice(0, -1).reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    const lastAmount = Math.max(0, grandTotal - prevAmountSum)

    setStages((prev) => {
      const copy = [...prev]
      copy[copy.length - 1] = {
        ...copy[copy.length - 1],
        percent: lastPercent,
        amount: lastAmount,
      }
      return copy
    })
    toast.success(`Đã tự động tính đợt cuối: ${lastPercent}% (${formatCurrency(lastAmount)})`)
  }

  // Handlers for Items
  const handleAddItemFromDrawer = (item: SupplierItemOptionResponse) => {
    if (isLocked) return
    const isNew = mode === 'edit' && !initialVariantIdSet.has(item.variantId)
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
        isNewlyAdded: isNew,
      },
    ])
    if (isNew) {
      toast.info(`Đã thêm "${item.productName}". Sản phẩm mới có nhãn Chờ báo giá (lần 2).`)
    } else {
      toast.success(`Đã thêm "${item.productName}" vào đơn mua`)
    }
  }

  const handleRemoveItem = (index: number) => {
    if (isLocked) return
    const item = items[index]
    setItems((prev) => prev.filter((_, idx) => idx !== index))
    if (item) {
      toast.info(`Đã xóa "${item.productName}" khỏi danh sách`)
    }
  }

  const handleQuantityChange = (index: number, val: string) => {
    if (isLocked) return
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: val } : it))
    )
  }

  const handleUnitCostChange = (index: number, val: string) => {
    if (isLocked) return
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, unitCost: val } : it))
    )
  }

  const handleAutoFill = async () => {
    if (isLocked) return
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
              unitCost: null,
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

  // Staging handlers
  const handleAddStage = () => {
    const nextIdx = stages.length + 1
    const currentPercentSum = stages.reduce((sum, s) => sum + (parseFloat(String(s.percent)) || 0), 0)
    const remainingPercent = Math.max(0, Number((100 - currentPercentSum).toFixed(2)))
    const currentAmountSum = stages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    const remainingAmount = Math.max(0, grandTotal - currentAmountSum)

    const newStage: EditorStageRow = {
      stageName: `Đợt ${nextIdx}`,
      description: '',
      expectedDeliveryDate: expectedDate || '',
      percent: remainingPercent,
      amount: remainingAmount,
      sortOrder: nextIdx - 1,
    }
    setStages((prev) => [...prev, newStage])
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      toast.error('Đơn mua hàng phải có ít nhất một đợt giao')
      return
    }
    setStages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleStagePercentChange = (index: number, valStr: string) => {
    setStages((prev) => {
      const copy = [...prev]
      const rawVal = parseFloat(valStr)
      const p = isNaN(rawVal) ? 0 : Math.max(0, Math.min(100, rawVal))
      copy[index] = {
        ...copy[index],
        percent: valStr === '' ? '' : p,
        amount: Math.round((grandTotal * p) / 100),
      }

      // Re-evaluate amounts to keep exact balance if sum of percents equals 100
      let sumPrev = 0
      const totalP = copy.reduce((s, x) => s + (parseFloat(String(x.percent)) || 0), 0)
      const isFull100 = Math.abs(totalP - 100) < 0.01

      return copy.map((st, idx) => {
        const itemP = parseFloat(String(st.percent)) || 0
        if (idx === copy.length - 1 && copy.length > 1 && isFull100) {
          const lastAmt = Math.max(0, grandTotal - sumPrev)
          return { ...st, amount: lastAmt }
        }
        const amt = Math.round((grandTotal * itemP) / 100)
        sumPrev += amt
        return { ...st, amount: amt }
      })
    })
  }

  const handleStageFieldChange = (
    index: number,
    field: keyof EditorStageRow,
    val: any
  ) => {
    setStages((prev) =>
      prev.map((st, idx) => (idx === index ? { ...st, [field]: val } : st))
    )
  }

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLocked) {
      toast.error('Đơn mua hàng đã chốt và đang trong tiến trình giao nhận. Để đặt thêm hàng, vui lòng tạo Đơn mua hàng mới.')
      return
    }

    if (mode === 'create' && !supplierId) {
      toast.error('Vui lòng chọn nhà cung cấp')
      return
    }

    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm vào đơn mua hàng')
      return
    }

    for (const it of items) {
      const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity))
      if (isNaN(q) || q <= 0) {
        toast.error(`Số lượng của "${it.productName}" không hợp lệ (phải lớn hơn 0)`)
        return
      }

      if (mode === 'edit' && it.unitCost !== null && it.unitCost !== undefined && it.unitCost !== '') {
        const c = typeof it.unitCost === 'number' ? it.unitCost : parseFloat(String(it.unitCost))
        if (isNaN(c) || c < 0) {
          toast.error(`Đơn giá của "${it.productName}" không được âm`)
          return
        }
      }
    }

    if (mode === 'edit') {
      const hasAnyPrice = items.some(
        (it) => it.unitCost !== null && it.unitCost !== undefined && it.unitCost !== '' && Number(it.unitCost) > 0
      )
      if (hasAnyPrice && !expectedDate) {
        toast.error('Vui lòng nhập ngày giao hàng dự kiến khi có đơn giá nhập')
        return
      }

      // Check stages expected delivery date
      for (const st of stages) {
        if (!st.expectedDeliveryDate) {
          toast.error(`Đợt "${st.stageName}" chưa có ngày giao hàng dự kiến`)
          return
        }
      }

      // Check 100% percent validation for STAGED delivery
      if (deliveryPlanType === 'STAGED') {
        if (!isPercentBalanced) {
          toast.error(
            `Tổng tỷ lệ các đợt giao hiện là ${stageTotalPercent.toFixed(2)}% (phải đúng bằng 100%). Vui lòng nhấn "Tự cân đối đợt cuối" hoặc điều chỉnh lại tỷ lệ.`
          )
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
          deliveryPlanType,
          items: items.map((it) => ({
            variantId: it.variantId,
            quantity: typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity)),
          })),
        })
      } else if (mode === 'edit' && onSubmitEdit && initialData) {
        // Prepare stages ensuring exact integer/currency balance
        let runningSum = 0
        const preparedStages: CreatePurchaseOrderStageRequest[] = stages.map((st, i) => {
          const p = parseFloat(String(st.percent)) || 0
          let amt = Math.round((grandTotal * p) / 100)
          if (i === stages.length - 1 && stages.length > 1) {
            amt = Math.max(0, grandTotal - runningSum)
          } else {
            runningSum += amt
          }
          return {
            stageId: st.stageId,
            stageName: st.stageName,
            description: st.description,
            expectedDeliveryDate: st.expectedDeliveryDate,
            percent: p,
            amount: amt,
            sortOrder: i,
          }
        })

        await onSubmitEdit({
          expectedDate: expectedDate || undefined,
          note: note.trim() || undefined,
          deliveryPlanType,
          stages: preparedStages,
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
      {/* Locked Alert Banner for CONFIRMED PO */}
      {isLocked && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 shadow-sm flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <h3 className="text-sm font-bold text-amber-900">
              Đơn mua hàng đã chốt và đang trong tiến trình giao nhận
            </h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Danh sách sản phẩm, số lượng và đơn giá đã được khóa cứng theo quy trình nghiệp vụ.
              Để đặt thêm hàng từ nhà cung cấp, vui lòng tạo một Đơn mua hàng mới.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/app/purchase-orders/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Tạo Đơn mua hàng mới
              </Link>
              <Link
                to={`/app/purchase-orders/${initialData?.purchaseOrderId}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
              >
                Xem chi tiết đơn & Đợt giao
              </Link>
            </div>
          </div>
        </div>
      )}

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
                  ? 'Giai đoạn 1 (DRAFT): Tạo đơn hỏi giá NCC (không có ô giá, chỉ chọn sản phẩm & số lượng)'
                  : 'Giai đoạn 2 (QUOTED): Cập nhật đơn giá NCC báo, thỏa thuận điều khoản & chia đợt giao'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/purchase-orders')}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Quay lại
            </button>
            {!isLocked && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Đang lưu...' : mode === 'create' ? 'Lưu PO nháp (DRAFT)' : 'Lưu báo giá & Đợt giao'}
              </button>
            )}
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
                  setItems([])
                }}
                disabled={isLoadingSuppliers || isLocked}
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

          {/* Warehouse */}
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
              {mode === 'edit' && <span className="text-amber-600 font-normal text-[11px]">(bắt buộc khi có giá)</span>}
            </label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              disabled={isLocked}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-slate-50"
            />
          </div>
        </div>

        {/* Note */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Ghi chú / Điều khoản thỏa thuận (Zalo, thanh toán, giao nhận)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isLocked}
            placeholder="Ví dụ: Đã chốt qua Zalo, nhận hàng kiểm OK rồi thanh toán từng đợt, giao tại kho Tổng..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white placeholder:text-slate-400 disabled:bg-slate-50"
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
                ? 'Dạng 1 (DRAFT): Chỉ nhập số lượng hỏi giá, không có ô đơn giá'
                : 'Dạng 2 (QUOTED): Nhập đơn giá NCC báo và kiểm tra thành tiền'}
            </p>
          </div>

          {!isLocked && (
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
          )}
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
                      <th className="px-4 py-3 text-right w-48">Đơn giá nhập (đ)</th>
                      <th className="px-4 py-3 text-right">Giá nhập gần nhất</th>
                      <th className="px-4 py-3 text-right w-44">Thành tiền</th>
                    </>
                  )}
                  {!isLocked && <th className="px-4 py-3 text-center w-16">Xóa</th>}
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
                      <div>{row.productName}</div>
                      {row.isNewlyAdded && (
                        <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          Chờ NCC báo giá (lần 2)
                        </span>
                      )}
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
                        disabled={isLocked}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        placeholder="Số lượng..."
                        className="w-28 px-2 py-1 text-right text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium disabled:bg-slate-50"
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
                            disabled={isLocked}
                            onChange={(e) => handleUnitCostChange(idx, e.target.value)}
                            placeholder={row.isNewlyAdded ? 'Nhập giá (lần 2)...' : 'Nhập giá NCC...'}
                            className="w-40 px-2 py-1 text-right text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium disabled:bg-slate-50"
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
                    {!isLocked && (
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
                    )}
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

      {/* Staged Delivery & Pay-on-Delivery Configuration (Dạng 2 QUOTED) */}
      {mode === 'edit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Kế hoạch Giao hàng & Thanh toán theo đợt (Pay-on-delivery)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mô hình giao đợt nào trả đợt đó: Kế toán kiểm hàng OK thì thanh toán luôn cho đợt đó.
                </p>
              </div>
            </div>

            {/* Delivery Type Radios */}
            {!isLocked && (
              <div className="flex items-center gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryPlanType"
                    checked={deliveryPlanType === 'SINGLE'}
                    onChange={() => setDeliveryPlanType('SINGLE')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>Giao 1 lần duy nhất (100%)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="deliveryPlanType"
                    checked={deliveryPlanType === 'STAGED'}
                    onChange={() => setDeliveryPlanType('STAGED')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>Giao chia nhiều đợt</span>
                </label>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {deliveryPlanType === 'SINGLE' ? (
              <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-sky-900 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">Giao một lần toàn bộ đơn hàng (100%)</div>
                  <div className="text-sky-700 mt-0.5">
                    Số tiền thanh toán dự kiến:{' '}
                    <span className="font-bold">{formatCurrency(grandTotal)}</span> | Ngày giao:{' '}
                    <span className="font-medium">{expectedDate || 'Chưa chọn'}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                  1 Đợt duy nhất
                </span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-2.5 w-12 text-center">STT</th>
                        <th className="px-3 py-2.5 w-44">Tên đợt</th>
                        <th className="px-3 py-2.5">Mô tả hàng giao</th>
                        <th className="px-3 py-2.5 w-40">Ngày giao dự kiến</th>
                        <th className="px-3 py-2.5 text-right w-32">Tỷ lệ (%)</th>
                        <th className="px-3 py-2.5 text-right w-44">Số tiền đợt (đ)</th>
                        {!isLocked && <th className="px-3 py-2.5 text-center w-12">Xóa</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stages.map((st, sIdx) => (
                        <tr key={sIdx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                            {sIdx + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={st.stageName}
                              disabled={isLocked}
                              onChange={(e) => handleStageFieldChange(sIdx, 'stageName', e.target.value)}
                              placeholder="Tên đợt..."
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-semibold disabled:bg-slate-50"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="text"
                              value={st.description ?? ''}
                              disabled={isLocked}
                              onChange={(e) => handleStageFieldChange(sIdx, 'description', e.target.value)}
                              placeholder="Ví dụ: Giao vòi sen + lavabo..."
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs disabled:bg-slate-50"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="date"
                              value={st.expectedDeliveryDate}
                              disabled={isLocked}
                              onChange={(e) =>
                                handleStageFieldChange(sIdx, 'expectedDeliveryDate', e.target.value)
                              }
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs disabled:bg-slate-50"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="relative inline-block w-28">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={st.percent ?? ''}
                                disabled={isLocked}
                                onChange={(e) => handleStagePercentChange(sIdx, e.target.value)}
                                placeholder="0"
                                className="w-full pr-6 pl-2 py-1 text-right border border-slate-300 rounded text-xs font-bold text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-50"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                                %
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="w-full px-2.5 py-1 text-right bg-slate-50 border border-slate-200 rounded text-xs font-semibold font-mono text-slate-800 tabular-nums shadow-2xs">
                              {formatCurrency(st.amount)}
                            </div>
                          </td>
                          {!isLocked && (
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveStage(sIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Xóa đợt"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isLocked && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAddStage}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm đợt giao
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoBalanceLastStage}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Tự động tính phần tiền còn lại cho đợt cuối cùng"
                      >
                        Tự cân đối đợt cuối
                      </button>
                    </div>

                    {/* Balance Status Indicator */}
                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        Tổng tỷ lệ:{' '}
                        <span className="font-bold text-slate-900">{stageTotalPercent.toFixed(2)}%</span> / 100%
                      </div>
                      <div className="text-slate-300">|</div>
                      <div>
                        Tổng tiền:{' '}
                        <span className="font-bold text-slate-900">{formatCurrency(stageTotalAmount)}</span>
                      </div>
                      {isPercentBalanced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã đủ 100% tỷ lệ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full font-semibold border border-rose-200 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {stageTotalPercent < 100
                            ? `Thiếu ${(100 - stageTotalPercent).toFixed(2)}% (Bấm Tự cân đối đợt cuối)`
                            : `Vượt quá ${(stageTotalPercent - 100).toFixed(2)}%`}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

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
