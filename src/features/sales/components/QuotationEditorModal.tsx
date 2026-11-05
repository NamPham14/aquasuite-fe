import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Plus, Trash2, Printer, AlertTriangle, Layers, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import {
  usePreviewQuotationMutation,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
} from '../api/quotationApi'
import { useGetCustomerOptionsQuery } from '../api/customerApi'
import { quotationSchema, type QuotationFormValues } from '../schemas/quotation.schema'
import type { QuotationResponse, QuotationPaymentMilestone } from '../types/quotation.types'
import { useAuth } from '../../iam/hooks/useAuth'

interface QuotationEditorModalProps {
  initialData?: QuotationResponse | null
  onClose: () => void
  onSuccess: (saved: QuotationResponse) => void
  onSubmitApprovalRequest?: (quotationId: string, quotationCode: string) => void
}

interface SkuOption {
  variantId: string
  sku: string
  name: string
  brand: string
  sellingPrice: number
  availableStock: number
  unit: string
  isCombo?: boolean
}

// Danh sách danh mục thiết bị vệ sinh mẫu đồng bộ catalog
const SAMPLE_SKUS: SkuOption[] = [
  {
    variantId: 'e1111111-1111-1111-1111-111111111111',
    sku: 'CS989VT/TCF9757SAT',
    name: 'Bồn cầu thông minh Neorest AH',
    brand: 'TOTO',
    sellingPrice: 85000000,
    availableStock: 25,
    unit: 'bộ',
    isCombo: false,
  },
  {
    variantId: 'e2222222-2222-2222-2222-222222222222',
    sku: 'MS885DT8',
    name: 'Bồn cầu 1 khối nắp đóng êm',
    brand: 'TOTO',
    sellingPrice: 9450000,
    availableStock: 18,
    unit: 'bộ',
    isCombo: false,
  },
  {
    variantId: 'e3333333-3333-3333-3333-333333333333',
    sku: 'TLG04307V',
    name: 'Vòi gật gù chậu rửa mặt nóng lạnh',
    brand: 'TOTO',
    sellingPrice: 4200000,
    availableStock: 40,
    unit: 'cái',
    isCombo: false,
  },
  {
    variantId: 'e4444444-4444-4444-4444-444444444444',
    sku: 'TBV03404J',
    name: 'Sen tắm nhiệt độ Comfort Wave',
    brand: 'TOTO',
    sellingPrice: 7800000,
    availableStock: 12,
    unit: 'bộ',
    isCombo: false,
  },
  {
    variantId: 'e5555555-5555-5555-5555-555555555555',
    sku: 'CB-LUX-MASTER',
    name: 'Combo Phòng tắm Master Sang Trọng 2026',
    brand: 'AQUA-COMBO',
    sellingPrice: 105000000,
    availableStock: 8,
    unit: 'bộ',
    isCombo: true,
  },
  {
    variantId: 'e6666666-6666-6666-6666-666666666666',
    sku: 'CB-STANDARD-01',
    name: 'Combo Thiết bị Vệ sinh Tiêu chuẩn Khách sạn',
    brand: 'AQUA-COMBO',
    sellingPrice: 22500000,
    availableStock: 15,
    unit: 'bộ',
    isCombo: true,
  },
]

const SAMPLE_CUSTOMERS = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Công ty Cổ phần Xây dựng Hòa Bình',
    code: 'CUST-HB-01',
    address: 'Khu đô thị Sala, TP. Thủ Đức, TP. Hồ Chí Minh',
    email: 'purchasing@hoabinhcorp.com',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    name: 'Tập đoàn Bất động sản Novaland',
    code: 'CUST-NOVA',
    address: '65 Nguyễn Du, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    email: 'procurement@novaland.com.vn',
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    name: 'Đại lý Vật liệu Xây dựng Minh Quân',
    code: 'DL-MINHQUAN',
    address: 'Số 124 Quốc Lộ 13, TP. Thủ Dầu Một, Bình Dương',
    email: 'vlxd.minhquan@gmail.com',
  },
]

export function QuotationEditorModal({
  initialData,
  onClose,
  onSuccess,
  onSubmitApprovalRequest,
}: QuotationEditorModalProps) {
  const { user } = useAuth()
  const isEdit = !!initialData?.quotationId
  const { data: customerOptions, isLoading: isCustomersLoading } = useGetCustomerOptionsQuery()

  const customerList = useMemo(() => {
    const list = Array.isArray(customerOptions) ? customerOptions : (customerOptions as any)?.data
    if (list && Array.isArray(list) && list.length > 0) {
      return list.map((c: any) => ({
        id: c.customerId,
        name: c.customerName,
        code: c.customerCode,
        address: c.address || '',
        email: c.email || '',
      }))
    }
    return SAMPLE_CUSTOMERS
  }, [customerOptions])

  const [projectName, setProjectName] = useState(initialData?.projectName ?? '')
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? SAMPLE_CUSTOMERS[0].id)
  const [deliveryAddress, setDeliveryAddress] = useState(initialData?.deliveryAddress ?? SAMPLE_CUSTOMERS[0].address)
  const [deliverySchedule, setDeliverySchedule] = useState(initialData?.deliverySchedule ?? '')
  const [sentToEmail, setSentToEmail] = useState(initialData?.sentToEmail ?? SAMPLE_CUSTOMERS[0].email)
  const [validUntil, setValidUntil] = useState(initialData?.validUntil ?? '')
  const [vatRate, setVatRate] = useState<number>(initialData?.summary?.vatRate ?? 10)
  const [shippingFee, setShippingFee] = useState<number>(initialData?.summary?.shippingFee ?? 0)
  const [note, setNote] = useState(initialData?.note ?? '')

  // Items
  const [items, setItems] = useState<
    {
      variantId: string
      quantity: number
      discountRate: number
      customSku?: string
      customName?: string
      unitPrice?: number
      stock?: number
      unit?: string
      lineTotal?: number
    }[]
  >(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        discountRate: i.discountRate,
        customSku: i.sku,
        customName: i.variantName,
        unitPrice: i.unitPrice,
        unit: i.unit,
        lineTotal: i.lineTotal,
      }))
    }
    // Mặc định 1 sản phẩm mẫu như trên wireframe
    const first = SAMPLE_SKUS[0]
    return [
      {
        variantId: first.variantId,
        quantity: 12,
        discountRate: 8,
        customSku: first.sku,
        customName: first.name,
        unitPrice: first.sellingPrice,
        stock: first.availableStock,
        unit: first.unit,
        lineTotal: 12 * first.sellingPrice * (1 - 0.08),
      },
    ]
  })

  // Milestones
  const [milestones, setMilestones] = useState<QuotationPaymentMilestone[]>(() => {
    if (initialData?.milestones && initialData.milestones.length > 0) {
      return initialData.milestones
    }
    return [
      { stageName: 'Đợt 1 (Đặt cọc)', percent: 30, sortOrder: 1 },
      { stageName: 'Đợt 2 (Giao hàng tại chân công trình)', percent: 50, sortOrder: 2 },
      { stageName: 'Đợt 3 (Nghiệm thu quyết toán)', percent: 20, sortOrder: 3 },
    ]
  })

  // Preview mutation từ BE
  const [previewApi] = usePreviewQuotationMutation()
  const [createApi, { isLoading: isCreating }] = useCreateQuotationMutation()
  const [updateApi, { isLoading: isUpdating }] = useUpdateQuotationMutation()
  const isSaving = isCreating || isUpdating

  // Realtime Summary state
  const [previewSummary, setPreviewSummary] = useState(initialData?.summary)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 1. Tính toán realtime ngay trên Client (0ms delay)
  const clientSummary = useMemo(() => {
    const listPrice = items.reduce(
      (sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
      0,
    )
    const discountAmt = items.reduce(
      (sum, item) =>
        sum +
        (Number(item.unitPrice) || 0) *
          (Number(item.quantity) || 0) *
          ((Number(item.discountRate) || 0) / 100),
      0,
    )
    const net = Math.max(0, listPrice - discountAmt)
    const currentVatRate = Number(vatRate) || 0
    const vat = Math.round((net * currentVatRate) / 100)
    const currentShipping = Number(shippingFee) || 0
    const grand = net + vat + currentShipping

    return {
      listPriceTotal: listPrice,
      totalDiscount: discountAmt,
      netAmount: net,
      vatRate: currentVatRate,
      vatAmount: vat,
      shippingFee: currentShipping,
      grandTotal: grand,
    }
  }, [items, vatRate, shippingFee])

  const displaySummary = previewSummary || clientSummary

  // 2. Debounced API /preview call từ Server để đối soát chính xác
  useEffect(() => {
    setPreviewSummary(clientSummary)

    if (!customerId || items.length === 0) return

    const timer = setTimeout(async () => {
      try {
        const payload = {
          customerId,
          projectName: projectName || 'Dự thảo',
          deliveryAddress,
          deliverySchedule,
          sentToEmail,
          validUntil: validUntil || undefined,
          vatRate: Number(vatRate) || 0,
          shippingFee: Number(shippingFee) || 0,
          note,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: Number(i.quantity) || 1,
            discountRate: Number(i.discountRate) || 0,
          })),
          milestones,
        }
        const res = await previewApi(payload).unwrap()
        const summary = (res as any)?.data?.summary || (res as any)?.summary
        if (summary) {
          setPreviewSummary(summary)
        }
      } catch {
        setPreviewSummary(clientSummary)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [
    customerId,
    projectName,
    deliveryAddress,
    deliverySchedule,
    sentToEmail,
    validUntil,
    vatRate,
    shippingFee,
    note,
    items,
    milestones,
    previewApi,
    clientSummary,
  ])

  const [todayString] = useState(() => new Date().toLocaleDateString('vi-VN'))

  // Cập nhật khi chọn khách hàng
  const handleCustomerChange = (selectedId: string) => {
    setCustomerId(selectedId)
    const found = customerList.find((c) => c.id === selectedId)
    if (found) {
      if (!deliveryAddress) setDeliveryAddress(found.address)
      if (!sentToEmail) setSentToEmail(found.email)
    }
  }

  // Thêm dòng sản phẩm (lẻ hoặc combo)
  const addItem = (isCombo = false) => {
    const candidates = SAMPLE_SKUS.filter((s) => s.isCombo === isCombo)
    const selected = candidates[0] || SAMPLE_SKUS[0]
    setItems((prev) => [
      ...prev,
      {
        variantId: selected.variantId,
        quantity: 1,
        discountRate: 0,
        customSku: selected.sku,
        customName: selected.name,
        unitPrice: selected.sellingPrice,
        stock: selected.availableStock,
        unit: selected.unit,
        lineTotal: selected.sellingPrice,
      },
    ])
  }

  const updateItem = (index: number, field: string, value: unknown) => {
    setItems((prev) => {
      const next = [...prev]
      const target = { ...next[index], [field]: value }
      if (field === 'variantId') {
        const found = SAMPLE_SKUS.find((s) => s.variantId === value)
        if (found) {
          target.customSku = found.sku
          target.customName = found.name
          target.unitPrice = found.sellingPrice
          target.stock = found.availableStock
          target.unit = found.unit
        }
      }
      const qty = Number(target.quantity) || 0
      const price = Number(target.unitPrice) || 0
      const disc = Number(target.discountRate) || 0
      target.lineTotal = qty * price * (1 - disc / 100)
      next[index] = target
      return next
    })
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error('Báo giá phải có ít nhất một sản phẩm!')
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Milestone actions
  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      { stageName: `Đợt ${prev.length + 1}`, percent: 0, sortOrder: prev.length + 1 },
    ])
  }

  const updateMilestone = (index: number, field: 'stageName' | 'percent', val: unknown) => {
    setMilestones((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: field === 'percent' ? Number(val) : val }
      return next
    })
  }

  const removeMilestone = (index: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== index))
  }

  const totalMilestonePercent = useMemo(
    () => milestones.reduce((sum, m) => sum + (Number(m.percent) || 0), 0),
    [milestones],
  )

  // Validate và Save Form
  const handleSave = async (event?: FormEvent) => {
    if (event) event.preventDefault()

    const rawValues: QuotationFormValues = {
      projectName: projectName.trim(),
      customerId,
      deliveryAddress: deliveryAddress.trim(),
      deliverySchedule: deliverySchedule.trim(),
      sentToEmail: sentToEmail.trim(),
      validUntil: validUntil || undefined,
      vatRate: Number(vatRate),
      shippingFee: Number(shippingFee) || 0,
      note: note.trim(),
      items: items.map((i) => ({
        variantId: i.variantId,
        quantity: Number(i.quantity),
        discountRate: Number(i.discountRate) || 0,
      })),
      milestones,
    }

    const validation = quotationSchema.safeParse(rawValues)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        fieldErrors[path] = issue.message
      }
      setErrors(fieldErrors)
      const firstMsg = validation.error.issues[0]?.message || 'Vui lòng kiểm tra lại thông tin!'
      toast.error(firstMsg)
      return
    }

    setErrors({})

    try {
      if (isEdit && initialData?.quotationId) {
        const updated = await updateApi({ id: initialData.quotationId, body: validation.data }).unwrap()
        toast.success(`Đã cập nhật báo giá ${updated.quotationCode || ''}!`)
        onSuccess(updated)
      } else {
        const created = await createApi(validation.data).unwrap()
        toast.success(`Đã tạo thành công báo giá ${created.quotationCode}!`)
        onSuccess(created)
      }
    } catch {
      toast.error('Có lỗi xảy ra khi lưu báo giá. Vui lòng thử lại!')
    }
  }

  const formatMoney = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quotation-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-3 sm:p-6 backdrop-blur-xs"
    >
      <div className="relative flex w-full max-w-6xl max-h-[92vh] flex-col rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Header Card */}
        <header className="flex flex-wrap items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50 rounded-t-xl gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                {isEdit ? 'Chỉnh sửa báo giá' : 'Tạo mới báo giá dự án'}
              </span>
              <h1 id="quotation-editor-title" className="text-lg font-bold text-slate-900">
                {initialData?.quotationCode ? `Mã Báo Giá: ${initialData.quotationCode}` : 'Mã Báo Giá: (Hệ thống tự sinh)'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Người tạo: <strong>{initialData?.customerName ? user?.username : (user?.username || 'Sales 1')}</strong> | Ngày tạo:{' '}
              {initialData?.quotationDate || todayString}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem / In PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              aria-label="Đóng cửa sổ"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* 1. THÔNG TIN KHÁCH HÀNG */}
          <section className="rounded-xl border border-slate-200 p-5 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                Thông tin khách hàng & Dự án
              </h2>
              <span className="text-xs text-slate-500">* Bắt buộc nhập</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Hàng 1 */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-projectName">
                  Tên dự án *
                </label>
                <input
                  id="q-projectName"
                  type="text"
                  placeholder="Ví dụ: Căn hộ cao cấp Masteri An Phú - Tòa A"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-sky-500 ${
                    errors.projectName ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                  }`}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                {errors.projectName && <p className="text-2xs text-red-600">{errors.projectName}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-validUntil">
                  Thời gian hiệu lực báo giá
                </label>
                <input
                  id="q-validUntil"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-sky-500"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>

              {/* Hàng 2 */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-customer">
                  Chọn Khách hàng / Nhà mua hàng B2B *
                </label>
                <select
                  id="q-customer"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-sky-500 bg-white"
                  value={customerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="">
                    {isCustomersLoading ? '-- Đang tải khách hàng... --' : '-- Chọn khách hàng --'}
                  </option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {errors.customerId && <p className="text-2xs text-red-600">{errors.customerId}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-deliveryAddress">
                  Địa chỉ nhận hàng
                </label>
                <input
                  id="q-deliveryAddress"
                  type="text"
                  placeholder="Địa chỉ chân công trình nhận thiết bị"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-sky-500"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-sentToEmail">
                  Email liên hệ nhận hàng (sentToEmail)
                </label>
                <input
                  id="q-sentToEmail"
                  type="email"
                  placeholder="contact@congtrinh.vn"
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-sky-500 ${
                    errors.sentToEmail ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                  }`}
                  value={sentToEmail}
                  onChange={(e) => setSentToEmail(e.target.value)}
                />
                {errors.sentToEmail && <p className="text-2xs text-red-600">{errors.sentToEmail}</p>}
              </div>

              {/* Hàng 3 (Phần 4 đã bổ sung) */}
              <div className="space-y-1 md:col-span-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-deliverySchedule">
                  Tiến độ / Lịch giao hàng dự kiến
                </label>
                <input
                  id="q-deliverySchedule"
                  type="text"
                  placeholder="Ví dụ: Giao 2 đợt theo tiến độ hoàn thiện tầng"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-sky-500"
                  value={deliverySchedule}
                  onChange={(e) => setDeliverySchedule(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="q-note">
                  Ghi chú chung báo giá (note)
                </label>
                <input
                  id="q-note"
                  type="text"
                  placeholder="Ghi chú điều kiện nghiệm thu, bảo hành hoặc thỏa thuận thêm..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-sky-500"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* 2. DANH MỤC SẢN PHẨM */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Danh mục sản phẩm</h2>
                <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                  {items.length} mục
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addItem(false)}
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-sky-300 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 transition-colors shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm sản phẩm lẻ khác...</span>
                </button>
                <button
                  type="button"
                  onClick={() => addItem(true)}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-800 transition-colors shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>+ Thêm combo khác...</span>
                </button>
              </div>
            </div>

            {errors.items && (
              <div className="p-3 bg-red-50 text-xs text-red-600 border-b border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errors.items}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3 min-w-[240px]">Sản phẩm / Mã sản phẩm</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Tồn kho</th>
                    <th className="py-2.5 px-3 w-24">Số lượng</th>
                    <th className="py-2.5 px-3 min-w-[110px] text-right">Giá niêm yết</th>
                    <th className="py-2.5 px-3 w-28 text-center">% Chiết khấu</th>
                    <th className="py-2.5 px-3 min-w-[120px] text-right">Đơn giá sau CK</th>
                    <th className="py-2.5 px-3 min-w-[130px] text-right">Thành tiền</th>
                    <th className="py-2.5 px-2 w-10 text-center">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const priceAfterDisc = (item.unitPrice || 0) * (1 - (item.discountRate || 0) / 100)
                    return (
                      <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{index + 1}</td>
                        <td className="py-2.5 px-3">
                          <select
                            className="w-full rounded border border-slate-300 p-1.5 text-xs bg-white focus:outline-sky-500 font-medium text-slate-800"
                            value={item.variantId}
                            onChange={(e) => updateItem(index, 'variantId', e.target.value)}
                          >
                            {SAMPLE_SKUS.map((s) => (
                              <option key={s.variantId} value={s.variantId}>
                                [{s.sku}] {s.name} ({s.brand})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-2xs font-medium ${
                              (item.stock || 0) >= item.quantity
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {(item.stock || 0) >= item.quantity
                              ? `Sẵn hàng (${item.stock || 25})`
                              : `Thiếu ${item.quantity - (item.stock || 0)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            className="w-full rounded border border-slate-300 p-1.5 text-center font-medium focus:outline-sky-500"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', Math.max(1, Number(e.target.value)))}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              className="w-16 rounded border border-slate-300 p-1.5 text-center font-semibold text-sky-700 focus:outline-sky-500"
                              value={item.discountRate}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  'discountRate',
                                  Math.min(100, Math.max(0, Number(e.target.value))),
                                )
                              }
                            />
                            <span className="text-slate-400 font-semibold">%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatMoney(priceAfterDisc)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-sky-900">
                          {formatMoney(item.lineTotal || item.quantity * priceAfterDisc)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Xóa dòng này"
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
          </section>

          {/* 3. KHỐI DƯỚI: ĐIỀU KHOẢN THANH TOÁN (TRÁI) & TỔNG HỢP TÀI CHÍNH (PHẢI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* TRÁI: ĐIỀU KHOẢN THANH TOÁN */}
            <section className="rounded-xl border border-slate-200 p-5 bg-white shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  Điều khoản Thanh toán (Mốc = 100%)
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    Math.abs(totalMilestonePercent - 100) < 0.05
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Tổng: {totalMilestonePercent.toFixed(1)}% / 100%
                </span>
              </div>

              {errors.milestones && (
                <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{errors.milestones}</p>
              )}

              <div className="space-y-2">
                {milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-xs focus:outline-sky-500"
                      value={m.stageName}
                      placeholder="Tên đợt thanh toán"
                      onChange={(e) => updateMilestone(idx, 'stageName', e.target.value)}
                    />
                    <div className="flex items-center gap-1 w-24">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:outline-sky-500"
                        value={m.percent}
                        onChange={(e) => updateMilestone(idx, 'percent', e.target.value)}
                      />
                      <span className="text-slate-500 font-semibold">%</span>
                    </div>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Xóa mốc"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addMilestone}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 pt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm mốc mới...</span>
              </button>
            </section>

            {/* PHẢI: TỔNG HỢP BÁO GIÁ DỰ ÁN */}
            <section className="rounded-xl border border-slate-200 p-5 bg-slate-50/70 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2">
                Tổng hợp Báo giá Dự án
              </h3>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1">
                  <span>Tổng tiền niêm yết (Hàng lẻ + Combo):</span>
                  <span className="font-semibold text-slate-800">
                    {formatMoney(displaySummary?.listPriceTotal)}
                  </span>
                </div>

                <div className="flex justify-between py-1 text-emerald-700">
                  <span>Tổng tiền chiết khấu:</span>
                  <span className="font-semibold">- {formatMoney(displaySummary?.totalDiscount)}</span>
                </div>

                <div className="flex justify-between py-1 border-t border-slate-200 font-medium text-slate-800">
                  <span>Thành tiền sau CK (Chưa VAT):</span>
                  <span>{formatMoney(displaySummary?.netAmount)}</span>
                </div>

                {/* Dropdown VAT chuẩn Backend AllowedVatRate */}
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-700">Thuế GTGT (VAT):</span>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-bold text-sky-800 bg-white"
                      value={vatRate}
                      onChange={(e) => setVatRate(Number(e.target.value))}
                    >
                      <option value={10}>10% (Chuẩn)</option>
                      <option value={8}>8% (Ưu đãi)</option>
                      <option value={5}>5%</option>
                      <option value={0}>0% (Không thuế)</option>
                    </select>
                    <span className="font-semibold text-slate-800">
                      {formatMoney(displaySummary?.vatAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-slate-700">Phí vận chuyển / bốc xếp:</span>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    className="w-32 rounded border border-slate-300 px-2 py-1 text-right text-xs font-semibold text-slate-800 bg-white focus:outline-sky-500"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                  />
                </div>

                <div className="flex justify-between items-center py-2.5 border-t-2 border-sky-600 text-sm font-bold text-sky-950">
                  <span className="uppercase tracking-tight text-xs">TỔNG THANH TOÁN:</span>
                  <span className="text-base text-sky-700">{formatMoney(displaySummary?.grandTotal)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 rounded-b-xl gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {isEdit && initialData?.status === 'DRAFT' && onSubmitApprovalRequest && (
              <button
                type="button"
                onClick={() => onSubmitApprovalRequest(initialData.quotationId, initialData.quotationCode)}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                Trình phê duyệt
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="rounded-lg bg-sky-700 px-5 py-2 text-xs font-bold text-white hover:bg-sky-800 transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu cập nhật' : 'Lưu bản nháp'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
