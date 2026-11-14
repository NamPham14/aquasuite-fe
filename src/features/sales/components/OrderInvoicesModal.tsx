import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  Plus,
  Receipt,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useCancelDraftInvoiceMutation,
  useCreateDraftInvoiceMutation,
  useGetOrderInvoicesQuery,
  useIssueSalesInvoiceMutation,
  useUpdateDraftInvoiceMutation,
} from '../api/salesOrderApi'
import { useGetSalesCatalogItemsQuery } from '../api/salesCatalogApi'
import type { SalesInvoiceResponse } from '../types/salesOrder.types'

interface OrderInvoicesModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderCode: string
  orderType: string
  orderStatus: string
  vatRate?: number | null
  canManageInvoices: boolean
}

interface EditableLine {
  variantId: string
  sku: string
  description: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate: number
}

function formatMoney(amount: number | undefined | null) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toDatetimeLocalValue(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function OrderInvoicesModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  orderType,
  orderStatus,
  vatRate,
  canManageInvoices,
}: OrderInvoicesModalProps) {
  const {
    data: invoices = [],
    isLoading,
    isFetching,
  } = useGetOrderInvoicesQuery(orderId, { skip: !isOpen || !orderId })

  const { data: catalogItems = [] } = useGetSalesCatalogItemsQuery(undefined, {
    skip: !isOpen,
  })

  const [updateDraftInvoice, { isLoading: isUpdating }] = useUpdateDraftInvoiceMutation()
  const [issueSalesInvoice, { isLoading: isIssuing }] = useIssueSalesInvoiceMutation()
  const [createDraftInvoice, { isLoading: isCreatingBatch }] = useCreateDraftInvoiceMutation()
  const [cancelDraftInvoice, { isLoading: isCancelling }] = useCancelDraftInvoiceMutation()

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [batchName, setBatchName] = useState<string>('')
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0)
  const [lines, setLines] = useState<EditableLine[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [selectedAddVariantId, setSelectedAddVariantId] = useState<string>('')
  const [confirmIssueOpen, setConfirmIssueOpen] = useState(false)
  const [confirmCancelBatchOpen, setConfirmCancelBatchOpen] = useState(false)

  // Form tạo đợt mới cho đơn PROJECT
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchDate, setNewBatchDate] = useState('')
  const [newBatchNote, setNewBatchNote] = useState('')
  const [splitFromInvoiceId, setSplitFromInvoiceId] = useState<string>('')
  const [newBatchLines, setNewBatchLines] = useState<EditableLine[]>([])
  const [newBatchAddVariantId, setNewBatchAddVariantId] = useState<string>('')

  const activeInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== 'CANCELLED'),
    [invoices]
  )

  const selectedInvoice: SalesInvoiceResponse | undefined = useMemo(() => {
    if (!invoices.length) return undefined
    return (
      invoices.find((inv) => inv.invoiceId === selectedInvoiceId) ||
      activeInvoices[0] ||
      invoices[0]
    )
  }, [invoices, activeInvoices, selectedInvoiceId])

  useEffect(() => {
    if (!isOpen) return
    if (selectedInvoice && selectedInvoice.invoiceId !== selectedInvoiceId) {
      setSelectedInvoiceId(selectedInvoice.invoiceId)
    }
  }, [isOpen, selectedInvoice, selectedInvoiceId])

  // Nạp dữ liệu hóa đơn vào form chỉnh sửa mỗi khi chuyển tab hóa đơn
  useEffect(() => {
    if (!selectedInvoice) return
    setBatchName(selectedInvoice.batchName || `Đợt ${selectedInvoice.batchNo}`)
    setScheduledDeliveryDate(toDatetimeLocalValue(selectedInvoice.scheduledDeliveryDate))
    setNote(selectedInvoice.note || '')
    setInvoiceDiscount(Number(selectedInvoice.discountAmount || 0))
    setLines(
      (selectedInvoice.items || []).map((it) => ({
        variantId: it.variantId,
        sku: it.sku || '',
        description: it.description || '',
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unitPrice || 0),
        discountAmount: Number(it.discountAmount || 0),
        taxRate: Number(it.taxRate || 0),
      }))
    )
    setIsDirty(false)
    setConfirmIssueOpen(false)
    setConfirmCancelBatchOpen(false)
  }, [selectedInvoice])

  const liveSubtotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const lineTotal = Math.max(0, l.unitPrice * l.quantity - l.discountAmount)
      return sum + lineTotal
    }, 0)
  }, [lines])

  const effectiveVatRate = useMemo(() => {
    if (selectedInvoice?.invoiceType === 'STORE') return 0
    return Number(vatRate ?? lines[0]?.taxRate ?? 0)
  }, [selectedInvoice, vatRate, lines])

  const liveTaxBase = Math.max(0, liveSubtotal - (invoiceDiscount || 0))
  const liveTaxAmount =
    effectiveVatRate > 0 ? Math.round((liveTaxBase * effectiveVatRate) / 100) : 0
  const liveTotalAmount = liveTaxBase + liveTaxAmount

  const canEditCurrent =
    Boolean(selectedInvoice?.editable) &&
    canManageInvoices &&
    selectedInvoice?.status === 'DRAFT' &&
    !selectedInvoice?.lockedByModificationRequest

  const isProjectOrder = orderType !== 'RETAIL'
  const canCreateNewBatch =
    isProjectOrder &&
    canManageInvoices &&
    orderStatus !== 'COMPLETED' &&
    orderStatus !== 'CANCELLED' &&
    !selectedInvoice?.lockedByModificationRequest

  const draftInvoices = useMemo(
    () => activeInvoices.filter((inv) => inv.status === 'DRAFT'),
    [activeInvoices]
  )

  const handleUpdateLine = (index: number, patch: Partial<EditableLine>) => {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    )
    setIsDirty(true)
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error('Hóa đơn phải giữ lại ít nhất 1 sản phẩm.')
      return
    }
    setLines((prev) => prev.filter((_, i) => i !== index))
    setIsDirty(true)
  }

  const handleAddLineFromCatalog = () => {
    if (!selectedAddVariantId) return
    const skuOption = catalogItems.find((c) => c.variantId === selectedAddVariantId)
    if (!skuOption) return

    const existingIdx = lines.findIndex((l) => l.variantId === skuOption.variantId)
    if (existingIdx >= 0) {
      handleUpdateLine(existingIdx, { quantity: lines[existingIdx].quantity + 1 })
    } else {
      setLines((prev) => [
        ...prev,
        {
          variantId: skuOption.variantId,
          sku: skuOption.sku,
          description: skuOption.name,
          quantity: 1,
          unitPrice: Number(skuOption.sellingPrice || 0),
          discountAmount: 0,
          taxRate: effectiveVatRate,
        },
      ])
      setIsDirty(true)
    }
    setSelectedAddVariantId('')
  }

  const buildUpdatePayload = () => ({
    batchName: batchName.trim() || undefined,
    scheduledDeliveryDate: scheduledDeliveryDate
      ? new Date(scheduledDeliveryDate).toISOString()
      : undefined,
    note: note.trim(),
    discountAmount: Math.max(0, Number(invoiceDiscount) || 0),
    items: lines.map((l) => ({
      variantId: l.variantId,
      quantity: Math.max(0.01, Number(l.quantity) || 1),
      discountAmount: Math.max(0, Number(l.discountAmount) || 0),
    })),
  })

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!selectedInvoice) return false
    if (lines.length === 0) {
      toast.error('Hóa đơn phải có ít nhất 1 sản phẩm.')
      return false
    }
    for (const line of lines) {
      if (!line.quantity || line.quantity <= 0) {
        toast.error(`Số lượng sản phẩm ${line.sku || line.description} phải lớn hơn 0.`)
        return false
      }
    }
    try {
      await updateDraftInvoice({
        invoiceId: selectedInvoice.invoiceId,
        orderId,
        body: buildUpdatePayload(),
      }).unwrap()
      toast.success('Đã lưu hóa đơn nháp và cập nhật đơn hàng thành công!')
      setIsDirty(false)
      return true
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể cập nhật hóa đơn nháp.')
      return false
    }
  }

  const handleConfirmIssue = async () => {
    if (!selectedInvoice) return
    if (isDirty) {
      const saved = await handleSaveDraft()
      if (!saved) return
    }
    try {
      await issueSalesInvoice({
        invoiceId: selectedInvoice.invoiceId,
        orderId,
      }).unwrap()
      toast.success(
        `Đã chốt & phát hành hóa đơn ${selectedInvoice.invoiceCode}. Bộ phận kho có thể lập phiếu xuất kho.`
      )
      setConfirmIssueOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể phát hành hóa đơn.')
    }
  }

  const handleConfirmCancelBatch = async () => {
    if (!selectedInvoice) return
    try {
      await cancelDraftInvoice({
        invoiceId: selectedInvoice.invoiceId,
        orderId,
      }).unwrap()
      toast.success('Đã hủy hóa đơn nháp của đợt này.')
      setConfirmCancelBatchOpen(false)
      setSelectedInvoiceId('')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể hủy đợt hóa đơn nháp.')
    }
  }

  // Khởi tạo dữ liệu form tạo đợt mới
  const openCreateBatchForm = () => {
    const nextNo = activeInvoices.length + 1
    setNewBatchName(`Đợt ${nextNo}`)
    setNewBatchDate('')
    setNewBatchNote('')
    setSplitFromInvoiceId(draftInvoices[0]?.invoiceId || '')
    setNewBatchLines([])
    setNewBatchAddVariantId('')
    setIsCreateBatchOpen(true)
  }

  const splitSourceInvoice = useMemo(
    () => draftInvoices.find((inv) => inv.invoiceId === splitFromInvoiceId),
    [draftInvoices, splitFromInvoiceId]
  )

  const handleAddLineToNewBatch = (variantId: string) => {
    if (!variantId) return
    if (splitSourceInvoice) {
      const src = splitSourceInvoice.items.find((it) => it.variantId === variantId)
      if (!src) return
      const defaultQty = Math.max(1, Math.floor(Number(src.quantity) / 2) || 1)
      setNewBatchLines((prev) => {
        if (prev.some((p) => p.variantId === variantId)) return prev
        return [
          ...prev,
          {
            variantId: src.variantId,
            sku: src.sku || '',
            description: src.description || '',
            quantity: Math.min(defaultQty, Number(src.quantity)),
            unitPrice: Number(src.unitPrice),
            discountAmount: 0,
            taxRate: Number(src.taxRate || 0),
          },
        ]
      })
    } else {
      const skuOption = catalogItems.find((c) => c.variantId === variantId)
      if (!skuOption) return
      setNewBatchLines((prev) => {
        if (prev.some((p) => p.variantId === variantId)) return prev
        return [
          ...prev,
          {
            variantId: skuOption.variantId,
            sku: skuOption.sku,
            description: skuOption.name,
            quantity: 1,
            unitPrice: Number(skuOption.sellingPrice || 0),
            discountAmount: 0,
            taxRate: effectiveVatRate,
          },
        ]
      })
    }
    setNewBatchAddVariantId('')
  }

  const handleCreateBatchSubmit = async () => {
    if (newBatchLines.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm cho đợt hóa đơn mới.')
      return
    }
    try {
      const created = await createDraftInvoice({
        orderId,
        body: {
          batchName: newBatchName.trim() || undefined,
          scheduledDeliveryDate: newBatchDate
            ? new Date(newBatchDate).toISOString()
            : undefined,
          note: newBatchNote.trim() || undefined,
          splitFromInvoiceId: splitFromInvoiceId || undefined,
          items: newBatchLines.map((l) => ({
            variantId: l.variantId,
            quantity: Math.max(0.01, Number(l.quantity) || 1),
            discountAmount: Math.max(0, Number(l.discountAmount) || 0),
          })),
        },
      }).unwrap()
      toast.success(`Đã tạo hóa đơn nháp ${created.batchName || created.invoiceCode}!`)
      setIsCreateBatchOpen(false)
      setSelectedInvoiceId(created.invoiceId)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Không thể tạo đợt hóa đơn mới.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">
                  Hóa đơn bán hàng — Đơn {orderCode}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                  {orderType === 'RETAIL' ? 'Hóa đơn cửa hàng (STORE)' : 'Hóa đơn công trình (PROJECT)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {orderType === 'RETAIL'
                  ? 'Hóa đơn khởi tạo ở trạng thái Nháp (DRAFT) để điều chỉnh nếu cần trước khi Chốt & Phát hành (ISSUED).'
                  : 'Quản lý các đợt hóa đơn của đơn công trình. Chỉ hóa đơn Đã phát hành (ISSUED) mới đủ điều kiện lập phiếu xuất kho.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Batch Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {invoices.map((inv) => {
              const isSelected = selectedInvoice?.invoiceId === inv.invoiceId && !isCreateBatchOpen
              const statusColor =
                inv.status === 'ISSUED'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : inv.status === 'CANCELLED'
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200'
              const statusLabel =
                inv.status === 'ISSUED'
                  ? 'Đã phát hành'
                  : inv.status === 'CANCELLED'
                  ? 'Đã hủy'
                  : 'Nháp'
              return (
                <button
                  key={inv.invoiceId}
                  type="button"
                  onClick={() => {
                    setIsCreateBatchOpen(false)
                    setSelectedInvoiceId(inv.invoiceId)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium transition ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{inv.batchName || `Đợt ${inv.batchNo}`}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${statusColor}`}>
                    {statusLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {canCreateNewBatch && !isCreateBatchOpen && (
            <button
              type="button"
              onClick={openCreateBatchForm}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm đợt hóa đơn</span>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span>Đang tải danh sách hóa đơn...</span>
            </div>
          ) : isCreateBatchOpen ? (
            /* Sub-form Tạo đợt hóa đơn mới */
            <div className="bg-white border border-sky-200 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900">Tạo hóa đơn Nháp (DRAFT) cho đợt giao mới</h3>
                <button
                  type="button"
                  onClick={() => setIsCreateBatchOpen(false)}
                  className="text-slate-500 hover:text-slate-800 font-medium"
                >
                  Quay lại hóa đơn hiện tại
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên đợt giao</label>
                  <input
                    type="text"
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="VD: Đợt 2 - Hoàn thiện"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lịch giao dự kiến</label>
                  <input
                    type="datetime-local"
                    value={newBatchDate}
                    onChange={(e) => setNewBatchDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nguồn hàng hóa của đợt</label>
                  <select
                    value={splitFromInvoiceId}
                    onChange={(e) => {
                      setSplitFromInvoiceId(e.target.value)
                      setNewBatchLines([])
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-500"
                  >
                    {draftInvoices.map((d) => (
                      <option key={d.invoiceId} value={d.invoiceId}>
                        Tách số lượng từ: {d.batchName || `Đợt ${d.batchNo}`} ({d.invoiceCode})
                      </option>
                    ))}
                    <option value="">+ Bổ sung hàng mới vào đơn hàng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn sản phẩm đưa vào đợt này</label>
                <div className="flex gap-2">
                  <select
                    value={newBatchAddVariantId}
                    onChange={(e) => handleAddLineToNewBatch(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">
                      {splitSourceInvoice
                        ? '-- Chọn sản phẩm từ hóa đơn nháp nguồn để tách sang đợt mới --'
                        : '-- Chọn sản phẩm từ Danh mục để bổ sung vào đơn --'}
                    </option>
                    {splitSourceInvoice
                      ? splitSourceInvoice.items.map((it) => (
                          <option key={it.variantId} value={it.variantId}>
                            {it.sku ? `${it.sku} - ` : ''}
                            {it.description} (Đang có trên đợt nguồn: {it.quantity})
                          </option>
                        ))
                      : catalogItems.map((c) => (
                          <option key={c.variantId} value={c.variantId}>
                            {c.sku} - {c.name} (Tồn khả dụng: {c.availableStock} | Giá: {formatMoney(c.sellingPrice)})
                          </option>
                        ))}
                  </select>
                </div>
              </div>

              {newBatchLines.length > 0 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-3">Sản phẩm</th>
                        <th className="py-2 px-3 w-28 text-right">Số lượng</th>
                        <th className="py-2 px-3 text-right">Đơn giá</th>
                        <th className="py-2 px-3 text-right">Thành tiền</th>
                        <th className="py-2 px-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newBatchLines.map((line, idx) => (
                        <tr key={line.variantId}>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            <div>{line.description}</div>
                            {line.sku && <div className="text-[10px] text-slate-500 font-mono">{line.sku}</div>}
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="0.01"
                              step="1"
                              value={line.quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                setNewBatchLines((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                                )
                              }}
                              className="w-full text-right px-2 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">{formatMoney(line.unitPrice)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-900">
                            {formatMoney(Math.max(0, line.unitPrice * line.quantity - line.discountAmount))}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setNewBatchLines((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú đợt giao</label>
                <input
                  type="text"
                  value={newBatchNote}
                  onChange={(e) => setNewBatchNote(e.target.value)}
                  placeholder="Ghi chú thêm cho đợt hóa đơn này..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBatchOpen(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCreateBatchSubmit}
                  disabled={isCreatingBatch}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-60"
                >
                  {isCreatingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Tạo hóa đơn nháp</span>
                </button>
              </div>
            </div>
          ) : !selectedInvoice ? (
            <div className="py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
              Đơn hàng này chưa có hóa đơn nào được khởi tạo.
            </div>
          ) : (
            <>
              {/* Alert Banner: UC-26 Lock */}
              {selectedInvoice.lockedByModificationRequest && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <div className="font-bold">Đơn hàng đang bị khóa bởi Yêu cầu điều chỉnh / hủy (UC-26)</div>
                    <div className="text-[11px] mt-0.5">
                      Hiện có yêu cầu sửa/hủy đơn đang chờ duyệt. Hóa đơn tạm thời bị khóa chỉnh sửa và phát hành cho đến khi yêu cầu UC-26 được xử lý xong.
                    </div>
                  </div>
                </div>
              )}

              {/* Alert Banner: ISSUED locked */}
              {selectedInvoice.status === 'ISSUED' && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <div className="font-bold">Hóa đơn đã Chốt &amp; Phát hành (ISSUED)</div>
                    <div className="text-[11px] mt-0.5">
                      Số liệu hóa đơn đã được khóa vĩnh viễn vào lúc {formatDateTime(selectedInvoice.issuedAt)}
                      {selectedInvoice.dueDate ? ` · Hạn thanh toán: ${selectedInvoice.dueDate}` : ''}. Bộ phận kho có thể dùng hóa đơn này để lập phiếu xuất kho.
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mã hóa đơn</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">{selectedInvoice.invoiceCode}</div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                    Tên đợt / Hóa đơn
                  </label>
                  {canEditCurrent ? (
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => {
                        setBatchName(e.target.value)
                        setIsDirty(true)
                      }}
                      className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:border-sky-500"
                    />
                  ) : (
                    <div className="font-semibold text-slate-800 mt-0.5">{selectedInvoice.batchName || `Đợt ${selectedInvoice.batchNo}`}</div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Lịch giao dự kiến
                  </label>
                  {canEditCurrent ? (
                    <input
                      type="datetime-local"
                      value={scheduledDeliveryDate}
                      onChange={(e) => {
                        setScheduledDeliveryDate(e.target.value)
                        setIsDirty(true)
                      }}
                      className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500"
                    />
                  ) : (
                    <div className="text-slate-700 mt-0.5">{formatDateTime(selectedInvoice.scheduledDeliveryDate)}</div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Ghi chú
                  </label>
                  {canEditCurrent ? (
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value)
                        setIsDirty(true)
                      }}
                      placeholder="Ghi chú hóa đơn..."
                      className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-sky-500"
                    />
                  ) : (
                    <div className="text-slate-700 mt-0.5">{selectedInvoice.note || '—'}</div>
                  )}
                </div>
              </div>

              {/* Add SKU bar when DRAFT editable */}
              {canEditCurrent && (
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">Thêm mặt hàng vào hóa đơn Nháp:</span>
                  <select
                    value={selectedAddVariantId}
                    onChange={(e) => setSelectedAddVariantId(e.target.value)}
                    className="flex-1 min-w-[240px] px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Chọn sản phẩm SKU từ Danh mục --</option>
                    {catalogItems.map((c) => (
                      <option key={c.variantId} value={c.variantId}>
                        {c.sku} — {c.name} (Tồn khả dụng: {c.availableStock} | {formatMoney(c.sellingPrice)})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddLineFromCatalog}
                    disabled={!selectedAddVariantId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng</span>
                  </button>
                </div>
              )}

              {/* Invoice Items Table */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">#</th>
                        <th className="py-2.5 px-3 font-semibold">Sản phẩm / SKU</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-28">Số lượng</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 font-semibold text-right w-32">Chiết khấu dòng</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Thành tiền</th>
                        {canEditCurrent && <th className="py-2.5 px-3 w-12 text-center">Xóa</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lines.map((line, idx) => {
                        const rowTotal = Math.max(0, line.unitPrice * line.quantity - line.discountAmount)
                        return (
                          <tr key={`${line.variantId}-${idx}`} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <div className="font-medium text-slate-900">{line.description || 'Sản phẩm'}</div>
                              {line.sku && <div className="text-[10px] font-mono text-slate-500">{line.sku}</div>}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {canEditCurrent ? (
                                <input
                                  type="number"
                                  min="0.01"
                                  step="1"
                                  value={line.quantity}
                                  onChange={(e) =>
                                    handleUpdateLine(idx, { quantity: Number(e.target.value) })
                                  }
                                  className="w-24 text-right px-2 py-1 border border-slate-300 rounded font-semibold focus:outline-none focus:border-sky-500"
                                />
                              ) : (
                                <span className="font-semibold text-slate-800">{line.quantity}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700">{formatMoney(line.unitPrice)}</td>
                            <td className="py-2 px-3 text-right">
                              {canEditCurrent ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="1000"
                                  value={line.discountAmount}
                                  onChange={(e) =>
                                    handleUpdateLine(idx, { discountAmount: Number(e.target.value) })
                                  }
                                  className="w-28 text-right px-2 py-1 border border-slate-300 rounded text-rose-700 focus:outline-none focus:border-sky-500"
                                />
                              ) : (
                                <span className="text-rose-600">
                                  {line.discountAmount > 0 ? `-${formatMoney(line.discountAmount)}` : '0 ₫'}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              {formatMoney(rowTotal)}
                            </td>
                            {canEditCurrent && (
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  disabled={lines.length <= 1}
                                  className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30"
                                  title={lines.length <= 1 ? 'Cần ít nhất 1 sản phẩm' : 'Xóa dòng hàng'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Totals */}
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="text-[11px] text-slate-500 max-w-md">
                    {canEditCurrent ? (
                      <span>
                        Khi bấm <strong>Lưu thay đổi</strong>, tồn kho giữ chỗ (available/reserved) và tổng tiền của đơn hàng sẽ được đồng bộ tự động.
                      </span>
                    ) : (
                      <span>
                        Trạng thái hiện tại: <strong>{selectedInvoice.status}</strong> (khóa chỉnh sửa).
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 min-w-[260px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Tạm tính:</span>
                      <span className="font-medium text-slate-900">{formatMoney(liveSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 gap-2">
                      <span>Chiết khấu hóa đơn:</span>
                      {canEditCurrent ? (
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={invoiceDiscount}
                          onChange={(e) => {
                            setInvoiceDiscount(Number(e.target.value))
                            setIsDirty(true)
                          }}
                          className="w-28 text-right px-2 py-0.5 border border-slate-300 rounded text-rose-700 bg-white"
                        />
                      ) : (
                        <span className="text-rose-600">-{formatMoney(invoiceDiscount)}</span>
                      )}
                    </div>
                    {effectiveVatRate > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Thuế VAT ({effectiveVatRate}%):</span>
                        <span className="font-medium text-slate-900">{formatMoney(liveTaxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Tổng hóa đơn:</span>
                      <span className="text-sky-700">{formatMoney(liveTotalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline Confirm Bars */}
              {confirmIssueOpen && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Xác nhận <strong>Chốt &amp; Phát hành</strong> hóa đơn{' '}
                      <strong>{selectedInvoice.invoiceCode}</strong>? Sau khi chuyển sang{' '}
                      <strong>ISSUED</strong>, hóa đơn sẽ khóa chỉnh sửa để kho xuất hàng.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmIssueOpen(false)}
                      className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmIssue}
                      disabled={isIssuing || isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {(isIssuing || isUpdating) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Xác nhận phát hành</span>
                    </button>
                  </div>
                </div>
              )}

              {confirmCancelBatchOpen && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-rose-900">
                    Xác nhận hủy bỏ hóa đơn nháp <strong>{selectedInvoice.batchName || selectedInvoice.invoiceCode}</strong>? Hàng hóa sẽ trả lại tồn kho giữ chỗ và trừ khỏi tổng đơn.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmCancelBatchOpen(false)}
                      className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Giữ lại
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancelBatch}
                      disabled={isCancelling}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-60"
                    >
                      {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Xác nhận hủy đợt</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isCreateBatchOpen && (
          <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />}
              {isDirty && (
                <span className="text-amber-700 font-semibold">• Có thay đổi chưa lưu trên hóa đơn Nháp</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEditCurrent && activeInvoices.length > 1 && !confirmCancelBatchOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmIssueOpen(false)
                    setConfirmCancelBatchOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy đợt nháp</span>
                </button>
              )}

              {canEditCurrent && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isUpdating || isIssuing || !isDirty}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-sky-600 text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold disabled:opacity-50 transition"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Lưu thay đổi</span>
                </button>
              )}

              {canEditCurrent && !confirmIssueOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCancelBatchOpen(false)
                    setConfirmIssueOpen(true)
                  }}
                  disabled={isUpdating || isIssuing}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-2xs disabled:opacity-50 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Chốt &amp; Phát hành</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

