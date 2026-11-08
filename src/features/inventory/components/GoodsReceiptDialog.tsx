import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { PackageCheck, X, AlertCircle, Warehouse, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatVnd } from '../../../shared/lib/money'
import { normalizeApiError } from '../../../shared/api/apiError'
import {
  useGetReceivablePurchaseOrderQuery,
  useCreateGoodsReceiptMutation,
} from '../api/goodsReceiptApi'
import type { ReceivableItemView } from '../types/goodsReceipt.types'

interface GoodsReceiptDialogProps {
  isOpen: boolean
  purchaseOrderId: string
  poCode: string
  onClose: () => void
  /** Gọi sau khi lập phiếu thành công (để màn cha refetch PO). */
  onSuccess?: () => void
}

/** Chuẩn hóa chuỗi nhập thành số không âm; trả về NaN nếu không hợp lệ. */
function parseQty(raw: string): number {
  if (raw.trim() === '') return 0
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

const numberFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/**
 * UC-32 — Dialog lập & xác nhận phiếu nhập kho theo đơn mua hàng (Hướng B).
 *
 * Tải các dòng còn phải nhận của PO, cho nhập số thực nhận từng dòng (mặc định = số còn lại,
 * chặn vượt ngay tại client), rồi gửi một request tạo = xác nhận. Khi thành công, tồn đã được
 * cộng và phiếu bất biến; màn cha được yêu cầu refetch để cập nhật tiến độ.
 */
export function GoodsReceiptDialog({
  isOpen,
  purchaseOrderId,
  poCode,
  onClose,
  onSuccess,
}: GoodsReceiptDialogProps) {
  const { data, isLoading, isError, error } = useGetReceivablePurchaseOrderQuery(purchaseOrderId, {
    skip: !isOpen,
  })
  const [createReceipt, { isLoading: isSubmitting }] = useCreateGoodsReceiptMutation()

  // Số thực nhận theo từng dòng (chuỗi để dễ nhập liệu), key = purchaseOrderItemId.
  const [qtyByItem, setQtyByItem] = useState<Record<string, string>>({})
  const [invoiceNo, setInvoiceNo] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')

  // Khóa cuộn nền khi mở.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Mặc định mỗi dòng nhận hết phần còn lại khi dữ liệu PO về.
  useEffect(() => {
    if (data?.items) {
      const init: Record<string, string> = {}
      for (const it of data.items) {
        init[it.purchaseOrderItemId] = it.remainingQty > 0 ? String(it.remainingQty) : '0'
      }
      setQtyByItem(init)
      setInvoiceNo('')
      setNote('')
      setFormError('')
    }
  }, [data])

  const receivableItems = useMemo(
    () => (data?.items ?? []).filter((it) => it.remainingQty > 0),
    [data],
  )

  const estimatedTotal = useMemo(() => {
    let total = 0
    for (const it of receivableItems) {
      const q = parseQty(qtyByItem[it.purchaseOrderItemId] ?? '')
      if (Number.isFinite(q) && q > 0) total += q * (it.unitCost ?? 0)
    }
    return total
  }, [receivableItems, qtyByItem])

  if (!isOpen) return null

  const setQty = (item: ReceivableItemView, raw: string) => {
    setQtyByItem((prev) => ({ ...prev, [item.purchaseOrderItemId]: raw }))
    if (formError) setFormError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const items: { purchaseOrderItemId: string; quantity: number }[] = []
    for (const it of receivableItems) {
      const q = parseQty(qtyByItem[it.purchaseOrderItemId] ?? '')
      if (Number.isNaN(q) || q < 0) {
        setFormError(`Số lượng nhận của "${it.productName ?? it.sku}" không hợp lệ.`)
        return
      }
      if (q > it.remainingQty) {
        setFormError(
          `Số lượng nhận của "${it.productName ?? it.sku}" vượt số còn lại (${numberFmt.format(it.remainingQty)}).`,
        )
        return
      }
      if (q > 0) items.push({ purchaseOrderItemId: it.purchaseOrderItemId, quantity: q })
    }

    if (items.length === 0) {
      setFormError('Phải nhận ít nhất một mặt hàng với số lượng lớn hơn 0.')
      return
    }

    try {
      const res = await createReceipt({
        purchaseOrderId,
        supplierInvoiceNo: invoiceNo.trim() || undefined,
        note: note.trim() || undefined,
        items,
      }).unwrap()
      toast.success(`Đã lập phiếu nhập kho ${res.receiptCode} cho đơn ${poCode}`)
      onSuccess?.()
      onClose()
    } catch (err) {
      const apiErr = normalizeApiError(err)
      setFormError(apiErr.message)
      toast.error(apiErr.message)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-800">Nhập kho theo đơn mua</h3>
              <p className="text-xs text-slate-500">
                Đơn <span className="font-mono font-semibold text-slate-700">{poCode}</span>
                {data?.warehouseCode && (
                  <>
                    {' · '}
                    <span className="inline-flex items-center gap-1">
                      <Warehouse className="w-3 h-3" /> {data.warehouseCode}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {isLoading ? (
              <div className="py-16 text-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <p className="text-sm">Đang tải danh sách hàng còn phải nhận...</p>
              </div>
            ) : isError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {normalizeApiError(error).message}
              </div>
            ) : !data?.receivable ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                Đơn mua hàng không ở trạng thái cho phép nhập kho (cần CONFIRMED hoặc
                PARTIALLY_RECEIVED). Trạng thái hiện tại: {data?.status}.
              </div>
            ) : receivableItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Tất cả mặt hàng của đơn này đã được nhận đủ.
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100 font-medium">
                      <tr>
                        <th className="px-3 py-2.5">Sản phẩm / SKU</th>
                        <th className="px-3 py-2.5 text-center">ĐVT</th>
                        <th className="px-3 py-2.5 text-right">Còn lại</th>
                        <th className="px-3 py-2.5 text-right w-32">Thực nhận</th>
                        <th className="px-3 py-2.5 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receivableItems.map((it) => {
                        const q = parseQty(qtyByItem[it.purchaseOrderItemId] ?? '')
                        const invalid = Number.isNaN(q) || q < 0 || q > it.remainingQty
                        const lineTotal = Number.isFinite(q) && q > 0 ? q * (it.unitCost ?? 0) : 0
                        return (
                          <tr key={it.purchaseOrderItemId} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2.5">
                              <div className="font-medium text-slate-900">{it.productName}</div>
                              <div className="text-xs font-mono text-slate-500">{it.sku}</div>
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-slate-600">
                              {it.unit}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-amber-600">
                              {numberFmt.format(it.remainingQty)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <input
                                type="number"
                                min={0}
                                max={it.remainingQty}
                                step="any"
                                value={qtyByItem[it.purchaseOrderItemId] ?? ''}
                                onChange={(e) => setQty(it, e.target.value)}
                                className={`w-28 px-2 py-1.5 text-sm text-right border rounded-lg focus:outline-none focus:ring-2 ${
                                  invalid
                                    ? 'border-rose-300 focus:ring-rose-400 bg-rose-50'
                                    : 'border-slate-200 focus:ring-emerald-500'
                                }`}
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-700">
                              {formatVnd(lineTotal)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Thông tin chứng từ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Số hóa đơn NCC
                    </label>
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      placeholder="VD: HD-2026-001"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Ghi chú đợt nhập (tùy chọn)"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-sky-600" />
                  Khi xác nhận, tồn kho được cộng ngay và phiếu không thể sửa. Hãy kiểm tra kỹ số
                  lượng thực nhận trước khi lập phiếu.
                </div>
              </>
            )}

            {formError && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                {formError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div className="text-sm">
              <span className="text-slate-500">Tạm tính giá trị phiếu: </span>
              <span className="font-bold text-emerald-700">{formatVnd(estimatedTotal)}</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading || !data?.receivable || receivableItems.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Đang lập phiếu...' : 'Lập & xác nhận phiếu'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
