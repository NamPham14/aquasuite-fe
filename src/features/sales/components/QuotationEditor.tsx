import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Send,
  ChevronDown,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  usePreviewQuotationMutation,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useSubmitApprovalMutation,
  useApproveQuotationMutation,
  useRejectQuotationMutation,
  useSendQuotationMutation,
  useMarkAcceptedMutation,
  useMarkLostMutation,
  useCreateRevisionMutation,
} from '../api/quotationApi'
import { useGetCustomerOptionsQuery } from '../api/customerApi'
import { quotationSchema, type QuotationFormValues } from '../schemas/quotation.schema'
import type { QuotationResponse, QuotationPaymentMilestone, QuotationStatus } from '../types/quotation.types'
import { QuotationActionDialog, type QuotationActionType } from './QuotationActionDialog'
import { ProductSelectionDrawer } from './ProductSelectionDrawer'
import { ProductDetailModal } from './ProductDetailModal'
import {
  CATALOG_PRODUCTS,
  type CatalogItemOption,
} from '../data/catalogProducts.data'
import { QuotationStatusBadge } from './QuotationStatusBadge'
import { useAuth } from '../../iam/hooks/useAuth'

interface QuotationEditorProps {
  initialData?: QuotationResponse | null
  isEditMode?: boolean
}

const SAMPLE_CUSTOMERS = [
  {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Công ty Cổ phần Xây dựng Hòa Bình',
    code: 'CUST-HB-01',
    address: 'Khu đô thị Sala, TP. Thủ Đức, TP. Hồ Chí Minh',
    email: 'purchasing@hoabinhcorp.vn',
  },
  {
    id: 'c2222222-2222-2222-2222-222222222222',
    name: 'Tập đoàn Vingroup - BQL Vinhomes Grand Park',
    code: 'CUST-VIN-02',
    address: 'Đường Nguyễn Xiển, P. Long Thạnh Mỹ, TP. Thủ Đức, TP.HCM',
    email: 'procurement.vhgp@vinhomes.vn',
  },
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    name: 'Công ty Cổ phần Tập đoàn Đầu tư Địa ốc Nova',
    code: 'CUST-NOVA-03',
    address: '65 Nguyễn Du, Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    email: 'supplychain@novaland.com.vn',
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    name: 'Khách hàng dự án Biệt thự Thảo Điền',
    code: 'CUST-RETAIL-04',
    address: 'Số 12 Nguyễn Văn Hưởng, Thảo Điền, TP. Thủ Đức, TP.HCM',
    email: 'lan.thaodien@gmail.com',
  },
]

interface EditableItemRow {
  variantId: string
  quantity: number | string
  discountRate: number | string
  customSku?: string
  customName?: string
  brand?: string
  unitPrice?: number
  stock?: number
  unit?: string
  isCombo?: boolean
}

export function QuotationEditor({ initialData, isEditMode = false }: QuotationEditorProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  // API Mutations
  const [createQuotation, { isLoading: isCreating }] = useCreateQuotationMutation()
  const [updateQuotation, { isLoading: isUpdating }] = useUpdateQuotationMutation()
  const [submitApproval, { isLoading: isSubmittingApproval }] = useSubmitApprovalMutation()
  const [approveQuotation, { isLoading: isApproving }] = useApproveQuotationMutation()
  const [rejectQuotation, { isLoading: isRejecting }] = useRejectQuotationMutation()
  const [sendQuotation, { isLoading: isSending }] = useSendQuotationMutation()
  const [markAccepted, { isLoading: isAccepting }] = useMarkAcceptedMutation()
  const [markLost, { isLoading: isLosing }] = useMarkLostMutation()
  const [createRevision, { isLoading: isCreatingRev }] = useCreateRevisionMutation()

  const [previewApi] = usePreviewQuotationMutation()
  const { data: customerOptions, isLoading: isCustomersLoading } = useGetCustomerOptionsQuery()

  const isAdmin = useMemo(() => {
    return (
      user?.roles?.some((r) =>
        ['ADMIN', 'ROLE_ADMIN', 'SHOP_OWNER', 'ROLE_SHOP_OWNER'].includes(r.toUpperCase()),
      ) ?? false
    )
  }, [user])

  const [currentStatus, setCurrentStatus] = useState<QuotationStatus | undefined>(initialData?.status)
  useEffect(() => {
    if (initialData?.status) {
      setCurrentStatus(initialData.status)
    }
  }, [initialData?.status])

  const [actionDialog, setActionDialog] = useState<QuotationActionType | null>(null)

  const handleConfirmAction = async (noteOrReason: string) => {
    if (!actionDialog || !initialData?.quotationId) return
    const id = initialData.quotationId
    const code = initialData.quotationCode

    try {
      if (actionDialog === 'submit_approval') {
        const res = await submitApproval({ id, body: { approvalNote: noteOrReason } }).unwrap()
        setCurrentStatus(res.status)
        toast.success(`Đã trình phê duyệt báo giá ${code}!`)
      } else if (actionDialog === 'approve') {
        const res = await approveQuotation({ id, body: { approvalNote: noteOrReason } }).unwrap()
        setCurrentStatus(res.status)
        toast.success(`Đã phê duyệt báo giá ${code}!`)
      } else if (actionDialog === 'reject') {
        const res = await rejectQuotation({ id, body: { rejectionReason: noteOrReason } }).unwrap()
        setCurrentStatus(res.status)
        toast.success(`Đã từ chối báo giá ${code}!`)
      } else if (actionDialog === 'send') {
        const res = await sendQuotation(id).unwrap()
        setCurrentStatus(res.status)
        toast.success(`Đã phát hành báo giá ${code} gửi khách hàng!`)
      } else if (actionDialog === 'mark_accepted') {
        const res = await markAccepted({ id, body: { signedFileUrl: noteOrReason } }).unwrap()
        setCurrentStatus(res.status)
        toast.success(`Chúc mừng! Đã chốt đơn thành công báo giá ${code}!`)
      } else if (actionDialog === 'mark_lost') {
        const res = await markLost({ id, body: { lostReason: noteOrReason } }).unwrap()
        setCurrentStatus(res.status)
        toast.success(`Đã ghi nhận mất đơn cho ${code}!`)
      } else if (actionDialog === 'create_revision') {
        const rev = await createRevision(id).unwrap()
        toast.success(`Đã tạo bản sửa đổi mới rev.${rev.revisionNo} cho mã ${code}!`)
        setActionDialog(null)
        navigate(`/app/quotations/${rev.quotationId}/edit`)
        return
      }
      setActionDialog(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác.')
    }
  }

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

  // Form State
  const [customerId, setCustomerId] = useState(initialData?.customerId || '')
  const [projectName, setProjectName] = useState(initialData?.projectName || '')
  const [deliveryAddress, setDeliveryAddress] = useState(initialData?.deliveryAddress || '')
  const [deliverySchedule] = useState(initialData?.deliverySchedule || '')
  const [sentToEmail, setSentToEmail] = useState(initialData?.sentToEmail || '')
  const [validUntil, setValidUntil] = useState(() =>
    initialData?.validUntil ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  )
  const [todayString] = useState(() => new Date().toLocaleDateString('vi-VN'))
  const [vatRate, setVatRate] = useState<number>(initialData?.summary?.vatRate ?? 10)
  const [shippingFee, setShippingFee] = useState<number | string>(initialData?.summary?.shippingFee ?? 0)
  const [note, setNote] = useState(initialData?.note || '')

  // Items State - Bắt đầu bằng mảng rỗng khi tạo mới theo phản hồi của user
  const [items, setItems] = useState<EditableItemRow[]>(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((i) => {
        const foundCatalog = CATALOG_PRODUCTS.find((p) => p.variantId === i.variantId)
        return {
          variantId: i.variantId,
          quantity: i.quantity,
          discountRate: i.discountRate,
          customSku: i.sku || foundCatalog?.sku,
          customName: i.variantName || foundCatalog?.name,
          brand: foundCatalog?.brand || 'TOTO',
          unitPrice: i.unitPrice || foundCatalog?.sellingPrice,
          stock: i.backorderQty && i.backorderQty > 0 ? 0 : foundCatalog?.availableStock || 20,
          unit: i.unit || foundCatalog?.unit || 'bộ',
          isCombo: foundCatalog?.isCombo || false,
        }
      })
    }
    return []
  })

  // 3 Loại Điều khoản thanh toán: Đặt cọc, Công nợ, Theo đợt
  const [hasDepositTerm, setHasDepositTerm] = useState<boolean>(() => {
    return initialData?.depositPercent != null && initialData.depositPercent > 0
  })
  const [depositPercent, setDepositPercent] = useState<number | string>(() => {
    return initialData?.depositPercent ?? ''
  })

  const [hasDebtTerm, setHasDebtTerm] = useState<boolean>(() => {
    return initialData?.creditTermDays != null && initialData.creditTermDays > 0
  })
  const [creditTermDays, setCreditTermDays] = useState<number | string>(() => {
    return initialData?.creditTermDays ?? ''
  })
  const [remainingDebtAmount, setRemainingDebtAmount] = useState<number | string>(() => {
    return initialData?.remainingDebtAmount ?? ''
  })

  const [hasMilestonesTerm, setHasMilestonesTerm] = useState<boolean>(() => {
    return Boolean(initialData?.milestones && initialData.milestones.length > 0)
  })
  const [milestones, setMilestones] = useState<QuotationPaymentMilestone[]>(() => {
    if (initialData?.milestones && initialData.milestones.length > 0) {
      return initialData.milestones
    }
    return [
      {
        sortOrder: 1,
        stageName: 'Đợt 1: Đặt cọc xác nhận đơn hàng',
        percent: 30,
      },
      {
        sortOrder: 2,
        stageName: 'Đợt 2: Thanh toán khi giao hàng đến công trình',
        percent: 60,
      },
      {
        sortOrder: 3,
        stageName: 'Đợt 3: Thanh toán quyết toán sau nghiệm thu',
        percent: 10,
      },
    ]
  })

  const [isTermDropdownOpen, setIsTermDropdownOpen] = useState(false)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tableDetailProduct, setTableDetailProduct] = useState<CatalogItemOption | null>(null)
  const [previewSummary, setPreviewSummary] = useState(initialData?.summary || null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Format tiền tệ
  const formatMoney = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  // Map số lượng từng sản phẩm để hiển thị trong Drawer
  const selectedVariantCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const it of items) {
      counts[it.variantId] = (counts[it.variantId] || 0) + (Number(it.quantity) || 1)
    }
    return counts
  }, [items])

  // Tổng % mốc thanh toán
  const totalMilestonePercent = useMemo(() => {
    return milestones.reduce((sum, m) => sum + (Number(m.percent) || 0), 0)
  }, [milestones])

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
    // Đồng bộ ngay giá trị client realtime trước
    setPreviewSummary(clientSummary)

    if (!items || items.length === 0) {
      return
    }

    const timer = setTimeout(async () => {
      try {
        const payload: QuotationFormValues = {
          customerId: customerId || '00000000-0000-0000-0000-000000000000',
          projectName: projectName || 'Dự án chưa đặt tên',
          deliveryAddress,
          deliverySchedule,
          sentToEmail,
          validUntil,
          vatRate: Number(vatRate) || 0,
          shippingFee: Number(shippingFee) || 0,
          note,
          depositPercent: hasDepositTerm && depositPercent !== '' ? Number(depositPercent) : undefined,
          depositAmount: hasDepositTerm && depositPercent !== '' ? ((clientSummary?.grandTotal || 0) * Number(depositPercent)) / 100 : undefined,
          creditTermDays: hasDebtTerm && creditTermDays !== '' ? Number(creditTermDays) : undefined,
          remainingDebtAmount: hasDebtTerm
            ? (remainingDebtAmount !== '' ? Number(remainingDebtAmount) : Math.max(0, (clientSummary?.grandTotal || 0) - (hasDepositTerm && depositPercent !== '' ? ((clientSummary?.grandTotal || 0) * Number(depositPercent)) / 100 : 0)))
            : undefined,
          items: items.map((i) => ({
            variantId: i.variantId,
            quantity: Number(i.quantity) || 1,
            discountRate: Number(i.discountRate) || 0,
          })),
          milestones: hasMilestonesTerm
            ? milestones.map((m, index) => ({
                sortOrder: index + 1,
                stageName: m.stageName,
                percent: Number(m.percent) || 0,
              }))
            : [],
        }
        const res = await previewApi(payload).unwrap()
        const summary = (res as any)?.data?.summary || (res as any)?.summary
        if (summary) {
          setPreviewSummary(summary)
        }
      } catch {
        setPreviewSummary(clientSummary)
      }
    }, 250)

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

  // Cập nhật khi chọn khách hàng
  const handleCustomerChange = (selectedId: string) => {
    setCustomerId(selectedId)
    const found = customerList.find((c) => c.id === selectedId)
    if (found) {
      if (!deliveryAddress) setDeliveryAddress(found.address)
      if (!sentToEmail) setSentToEmail(found.email)
    }
  }

  // Thêm sản phẩm từ Drawer bên phải
  const handleSelectFromDrawer = (product: CatalogItemOption) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.variantId === product.variantId)
      if (existingIdx >= 0) {
        const updated = [...prev]
        const currentQty = Number(updated[existingIdx].quantity) || 1
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: currentQty + 1,
        }
        toast.info(`Tăng số lượng "${product.name}" lên ${currentQty + 1}`)
        return updated
      }

      toast.success(`Đã thêm "${product.name}" vào báo giá`)
      return [
        ...prev,
        {
          variantId: product.variantId,
          quantity: 1,
          discountRate: 0,
          customSku: product.sku,
          customName: product.name,
          brand: product.brand,
          unitPrice: product.sellingPrice,
          stock: product.availableStock,
          unit: product.unit,
          isCombo: product.isCombo,
        },
      ]
    })
  }

  // Xóa dòng sản phẩm (cho phép xóa tự do, không bắt buộc giữ lại)
  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  // Cập nhật giá trị dòng
  const updateItem = (idx: number, field: keyof EditableItemRow, val: any) => {
    setItems((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  // Xem chi tiết sản phẩm / SKU
  const viewDetail = (row: EditableItemRow) => {
    const found = CATALOG_PRODUCTS.find((p) => p.variantId === row.variantId)
    if (found) {
      setTableDetailProduct(found)
    } else {
      setTableDetailProduct({
        variantId: row.variantId,
        sku: row.customSku || '',
        name: row.customName || '',
        brand: row.brand || 'TOTO',
        category: 'Thiết bị vệ sinh',
        sellingPrice: row.unitPrice || 0,
        availableStock: row.stock || 0,
        unit: row.unit || 'bộ',
        isCombo: row.isCombo,
      })
    }
  }

  // Thêm 1 trong 3 loại điều khoản (Cọc, Công nợ, Theo đợt)
  const handleAddTerm = (type: 'DEPOSIT' | 'DEBT' | 'MILESTONE') => {
    if (type === 'DEPOSIT') {
      setHasDepositTerm(true)
      if (!depositPercent) setDepositPercent(30)
      toast.success('Đã thêm điều khoản Đặt cọc')
    } else if (type === 'DEBT') {
      setHasDebtTerm(true)
      if (!creditTermDays) setCreditTermDays(30)
      toast.success('Đã thêm điều khoản Công nợ')
    } else if (type === 'MILESTONE') {
      setHasMilestonesTerm(true)
      toast.success('Đã thêm điều khoản Thanh toán theo đợt')
    }
    setIsTermDropdownOpen(false)
  }

  // Thêm mốc thanh toán
  const addMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        sortOrder: prev.length + 1,
        stageName: `Đợt ${prev.length + 1}: `,
        percent: 0,
      },
    ])
  }

  // Xóa mốc thanh toán
  const removeMilestone = (idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx))
  }

  // Cập nhật mốc thanh toán
  const updateMilestone = (idx: number, field: keyof QuotationPaymentMilestone, val: any) => {
    setMilestones((prev) => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: val }
      return copy
    })
  }

  // Lưu báo giá
  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault()
    setValidationErrors({})

    const payload: QuotationFormValues = {
      customerId,
      projectName,
      deliveryAddress,
      deliverySchedule,
      sentToEmail,
      validUntil,
      vatRate,
      shippingFee: Number(shippingFee) || 0,
      note,
      depositPercent: hasDepositTerm && depositPercent !== '' ? Number(depositPercent) : undefined,
      depositAmount: hasDepositTerm && depositPercent !== '' ? ((displaySummary?.grandTotal || 0) * Number(depositPercent)) / 100 : undefined,
      creditTermDays: hasDebtTerm && creditTermDays !== '' ? Number(creditTermDays) : undefined,
      remainingDebtAmount: hasDebtTerm
        ? (remainingDebtAmount !== '' ? Number(remainingDebtAmount) : Math.max(0, (displaySummary?.grandTotal || 0) - (hasDepositTerm && depositPercent !== '' ? ((displaySummary?.grandTotal || 0) * Number(depositPercent)) / 100 : 0)))
        : undefined,
      items: items.map((i) => ({
        variantId: i.variantId,
        quantity: Number(i.quantity) || 1,
        discountRate: Number(i.discountRate) || 0,
      })),
      milestones: hasMilestonesTerm
        ? milestones.map((m, index) => ({
            sortOrder: index + 1,
            stageName: m.stageName,
            percent: Number(m.percent) || 0,
          }))
        : [],
    }

    // Validate Zod
    const validateRes = quotationSchema.safeParse(payload)
    if (!validateRes.success) {
      const errMap: Record<string, string> = {}
      validateRes.error.issues.forEach((err) => {
        const path = err.path.join('.')
        errMap[path] = err.message
      })
      setValidationErrors(errMap)
      toast.error('Vui lòng điền đủ các thông tin bắt buộc (Tên dự án, Khách hàng)')
      return
    }

    try {
      if (isEditMode && initialData) {
        await updateQuotation({
          id: initialData.quotationId,
          body: payload,
        }).unwrap()
        toast.success(`Cập nhật báo giá ${initialData.quotationCode} thành công!`)
      } else {
        const created = await createQuotation(payload).unwrap()
        toast.success(`Tạo mới báo giá ${created.quotationCode || ''} thành công!`)
      }
      navigate('/app/quotations')
    } catch (err: any) {
      toast.error(err?.data?.message || 'Có lỗi xảy ra khi lưu báo giá')
    }
  }

  // Xử lý in PDF
  const handlePrintPdf = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Header bar gọn gàng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded border border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/quotations')}
            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900">
                {isEditMode ? `Báo Giá: ${initialData?.quotationCode || ''}` : 'Tạo Báo Giá Dự Án'}
              </h1>
              {currentStatus && <QuotationStatusBadge status={currentStatus} />}
              {isEditMode && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                  rev.{initialData?.revisionNo || 1}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>
                Người tạo: <strong className="text-slate-600 font-medium">{user?.username || 'Sales Staff'}</strong>
              </span>
              <span>•</span>
              <span>Ngày: {initialData?.quotationDate || todayString}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Xem PDF</span>
          </button>

          {(!currentStatus || currentStatus === 'DRAFT' || currentStatus === 'REJECTED') && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isCreating || isUpdating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'Lưu thay đổi' : 'Lưu báo giá (DRAFT)'}</span>
            </button>
          )}

          {isEditMode && currentStatus && (
            <>
              {(currentStatus === 'DRAFT' || currentStatus === 'REJECTED') && (
                <>
                  <button
                    type="button"
                    onClick={() => setActionDialog('submit_approval')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 transition"
                  >
                    <span>Trình duyệt</span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setActionDialog('approve')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Duyệt ngay</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActionDialog('send')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-sky-600 text-xs font-semibold text-white hover:bg-sky-700 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Phát hành (Gửi khách)</span>
                  </button>
                </>
              )}

              {currentStatus === 'PENDING_APPROVAL' && (
                <>
                  {isAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionDialog('approve')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Phê duyệt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionDialog('reject')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      Đang chờ quản lý duyệt
                    </span>
                  )}
                </>
              )}

              {currentStatus === 'APPROVED' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActionDialog('send')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-sky-600 text-xs font-semibold text-white hover:bg-sky-700 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi khách (SENT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDialog('mark_accepted')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Chốt đơn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDialog('create_revision')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <span>Tạo Revision</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDialog('mark_lost')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-rose-300 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
                  >
                    <span>Mất đơn</span>
                  </button>
                </>
              )}

              {currentStatus === 'SENT' && (
                <>
                  <button
                    type="button"
                    onClick={() => setActionDialog('mark_accepted')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Chốt đơn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDialog('create_revision')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    <span>Tạo Revision</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionDialog('mark_lost')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-rose-300 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
                  >
                    <span>Mất đơn</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* PHẦN 1: THÔNG TIN KHÁCH HÀNG & DỰ ÁN */}
        <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              1. Thông tin khách hàng & Dự án
            </h2>
            <button
              type="button"
              onClick={() => toast.info('Chức năng tạo nhanh khách hàng mới CRM')}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:underline"
            >
              + Tạo nhanh khách hàng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Tên dự án */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Tên dự án <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nhập tên dự án / công trình..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className={`w-full rounded border px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-400 transition ${
                  validationErrors.projectName
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              />
              {validationErrors.projectName && (
                <p className="text-[10px] text-rose-500 mt-0.5">{validationErrors.projectName}</p>
              )}
            </div>

            {/* Thời gian hiệu lực */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Thời gian hiệu lực báo giá
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* Khách hàng B2B */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Khách hàng / Nhà mua hàng B2B <span className="text-rose-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full rounded border px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-400 bg-white transition ${
                  validationErrors.customerId
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                <option value="">
                  {isCustomersLoading ? '-- Đang tải khách hàng từ máy chủ... --' : '-- Chọn khách hàng --'}
                </option>
                {customerList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {validationErrors.customerId && (
                <p className="text-[10px] text-rose-500 mt-0.5">{validationErrors.customerId}</p>
              )}
            </div>

            {/* Địa chỉ nhận hàng */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Địa chỉ nhận hàng
              </label>
              <input
                type="text"
                placeholder="Địa chỉ giao hàng..."
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-400"
              />
            </div>

            {/* Email nhận hàng */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Email nhận hàng (sentToEmail)
              </label>
              <input
                type="email"
                placeholder="email@doitac.com"
                value={sentToEmail}
                onChange={(e) => setSentToEmail(e.target.value)}
                className={`w-full rounded border px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-400 transition ${
                  validationErrors.sentToEmail
                    ? 'border-rose-400 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              />
              {validationErrors.sentToEmail && (
                <p className="text-[10px] text-rose-500 mt-0.5">{validationErrors.sentToEmail}</p>
              )}
            </div>
          </div>
        </div>

        {/* PHẦN 2: DANH MỤC SẢN PHẨM TRONG BÁO GIÁ */}
        <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                2. Danh mục sản phẩm & Thiết bị
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {items.length} mặt hàng trong báo giá
              </p>
            </div>

            {/* CHỈ 1 NÚT DUY NHẤT: Thêm sản phẩm & Combo */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm sản phẩm / Combo</span>
            </button>
          </div>

          {items.length === 0 ? (
            /* Empty state tinh gọn khi chưa có sản phẩm */
            <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded bg-slate-50/30">
              <ShoppingBag className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-slate-700">Chưa có sản phẩm nào trong báo giá</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                Mở ngăn danh mục bên phải để tìm kiếm và chọn thiết bị lẻ hoặc combo dự án
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Mở bảng chọn sản phẩm</span>
              </button>
            </div>
          ) : (
            <>
              {/* Bảng sản phẩm gọn gàng, phẳng và cân đối chuẩn */}
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="w-full text-left text-xs border-collapse table-fixed min-w-[850px]">
                  <colgroup>
                    <col className="w-10" />
                    <col />
                    <col className="w-28" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col className="w-32" />
                    <col className="w-10" />
                  </colgroup>
                  <thead className="bg-slate-50/80 text-slate-600 font-medium border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-2 text-center text-slate-400">#</th>
                      <th className="py-2.5 px-3 text-left">Sản phẩm / Mã SKU</th>
                      <th className="py-2.5 px-3 text-center">Tồn kho</th>
                      <th className="py-2.5 px-3 text-center">Số lượng</th>
                      <th className="py-2.5 px-3 text-right">Giá niêm yết</th>
                      <th className="py-2.5 px-3 text-center">% Chiết khấu</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá sau CK</th>
                      <th className="py-2.5 px-3 text-right font-semibold text-slate-800">
                        Thành tiền
                      </th>
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {items.map((row, idx) => {
                      const qty = Number(row.quantity) || 0
                      const price = row.unitPrice || 0
                      const disc = Number(row.discountRate) || 0
                      const unitPriceAfter = Math.max(0, price * (1 - disc / 100))
                      const lineTotal = Math.max(0, unitPriceAfter * qty)

                      return (
                        <tr key={row.variantId + '-' + idx} className="hover:bg-slate-50/50 transition">
                          {/* STT */}
                          <td className="py-2.5 px-2 text-center text-slate-400 text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Sản phẩm / SKU - Click mở Popup xem chi tiết & ảnh */}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => viewDetail(row)}
                                  className="font-medium text-slate-900 leading-snug hover:text-sky-800 hover:underline text-left"
                                  title="Bấm để xem ảnh & thông số kỹ thuật"
                                >
                                  {row.customName}
                                </button>
                                {row.isCombo && (
                                  <span className="inline-block px-1 py-0.2 rounded font-mono text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                    COMBO
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                                <span className="font-mono text-slate-600 font-medium">
                                  {row.customSku}
                                </span>
                                <span>•</span>
                                <span>{row.brand || 'TOTO'}</span>
                                <span>•</span>
                                <span>ĐVT: {row.unit || 'bộ'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Tồn kho phẳng */}
                          <td className="py-2.5 px-3 text-center">
                            {row.stock && row.stock > 0 ? (
                              <div className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>Sẵn {row.stock}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-amber-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <span>Đặt trước</span>
                              </div>
                            )}
                          </td>

                          {/* Số lượng */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={row.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className="w-16 text-center mx-auto block font-medium rounded border border-slate-200 px-1 py-1 text-xs focus:outline-none focus:border-slate-400"
                            />
                          </td>

                          {/* Giá niêm yết */}
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                            {formatMoney(price)}
                          </td>

                          {/* % Chiết khấu */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={row.discountRate}
                                onChange={(e) => updateItem(idx, 'discountRate', e.target.value)}
                                className="w-14 text-center font-medium rounded border border-slate-200 px-1 py-1 text-xs focus:outline-none focus:border-slate-400"
                              />
                              <span className="text-slate-400 text-[10px]">%</span>
                            </div>
                          </td>

                          {/* Đơn giá sau CK */}
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                            {formatMoney(unitPriceAfter)}
                          </td>

                          {/* Thành tiền */}
                          <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-slate-900">
                            {formatMoney(lineTotal)}
                          </td>

                          {/* Nút xóa */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                              title="Xóa dòng"
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

              {/* Dưới bảng: Nút thêm và tổng tiền hàng trước thuế */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm sản phẩm khác</span>
                </button>

                <div className="text-right text-xs">
                  <span className="text-slate-500">Tiền hàng (chưa VAT): </span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatMoney(displaySummary?.netAmount)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* PHẦN 3 & 4: ĐIỀU KHOẢN THANH TOÁN & TỔNG HỢP BÁO GIÁ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PHẦN 3: ĐIỀU KHOẢN THANH TOÁN (CỌC / CÔNG NỢ / THEO ĐỢT) */}
          <div className="rounded border border-slate-200 bg-white p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  3. Điều khoản thanh toán & Công nợ
                </h3>

                {/* 1 NÚT THÊM ĐIỀU KHOẢN DUY NHẤT VỚI 3 OPTION DROPDOWN */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsTermDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Thêm điều khoản</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isTermDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleAddTerm('DEPOSIT')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 flex items-start gap-2.5 transition"
                      >
                        <span className="p-1 rounded bg-amber-100 text-amber-700 text-xs">💰</span>
                        <div>
                          <div className="font-semibold text-slate-900">Điều khoản Đặt cọc</div>
                          <div className="text-[11px] text-slate-500">Cọc bao nhiêu % đơn hàng</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTerm('DEBT')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 flex items-start gap-2.5 transition"
                      >
                        <span className="p-1 rounded bg-blue-100 text-blue-700 text-xs">📑</span>
                        <div>
                          <div className="font-semibold text-slate-900">Điều khoản Công nợ</div>
                          <div className="text-[11px] text-slate-500">Nợ bao nhiêu, sau bao lâu thì trả</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddTerm('MILESTONE')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 flex items-start gap-2.5 transition"
                      >
                        <span className="p-1 rounded bg-purple-100 text-purple-700 text-xs">📅</span>
                        <div>
                          <div className="font-semibold text-slate-900">Thanh toán theo đợt</div>
                          <div className="text-[11px] text-slate-500">Chia theo mốc tiến độ (Đợt 1, 2...)</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TRƯỜNG HỢP CHƯA CHỌN ĐIỀU KHOẢN NÀO */}
              {!hasDepositTerm && !hasDebtTerm && !hasMilestonesTerm && (
                <div className="p-6 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  <p className="font-medium text-slate-600 mb-1">Chưa chọn điều khoản thanh toán riêng</p>
                  <p className="text-[11px]">Bấm nút <strong>"+ Thêm điều khoản"</strong> ở góc trên để chọn: Đặt cọc, Công nợ hoặc Thanh toán theo đợt.</p>
                </div>
              )}

              {/* 1. KHỐI ĐIỀU KHOẢN ĐẶT CỌC */}
              {hasDepositTerm && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                      <span>💰</span> ĐIỀU KHOẢN ĐẶT CỌC
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasDepositTerm(false)
                        setDepositPercent('')
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                      title="Bỏ điều khoản đặt cọc"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-700 font-medium">Khách đặt cọc:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={depositPercent}
                        onChange={(e) => setDepositPercent(e.target.value)}
                        placeholder="30"
                        className="w-16 rounded border border-amber-300 bg-white px-2 py-1 text-xs font-bold text-right focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-slate-600 font-bold">% đơn</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-600">
                      Tương đương: <strong className="text-amber-900 font-bold">{formatMoney(((displaySummary?.grandTotal || 0) * (Number(depositPercent) || 0)) / 100)}</strong>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">Khách hàng thanh toán tiền cọc ngay khi xác nhận đặt hàng để tiến hành giao/giữ hàng.</p>
                </div>
              )}

              {/* 2. KHỐI ĐIỀU KHOẢN CÔNG NỢ */}
              {hasDebtTerm && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                      <span>📑</span> ĐIỀU KHOẢN CÔNG NỢ
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasDebtTerm(false)
                        setCreditTermDays('')
                        setRemainingDebtAmount('')
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                      title="Bỏ điều khoản công nợ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Số tiền công nợ:</span>
                      <span className="font-bold text-blue-900 text-sm">
                        {formatMoney(
                          remainingDebtAmount !== ''
                            ? Number(remainingDebtAmount)
                            : Math.max(0, (displaySummary?.grandTotal || 0) - ((displaySummary?.grandTotal || 0) * (Number(depositPercent) || 0)) / 100)
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
                      <span>Thời hạn thanh toán: Sau</span>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={creditTermDays}
                        onChange={(e) => setCreditTermDays(e.target.value)}
                        placeholder="30"
                        className="w-16 rounded border border-blue-300 bg-white px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-blue-500"
                      />
                      <span>ngày tính từ ngày nhận hàng</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. KHỐI THANH TOÁN THEO ĐỢT (MILESTONES) */}
              {hasMilestonesTerm && (
                <div className="rounded-lg border border-purple-200 bg-purple-50/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                      <span>📅</span> THANH TOÁN THEO ĐỢT ({milestones.length} ĐỢT)
                    </span>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        totalMilestonePercent === 100
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}>
                        {totalMilestonePercent}% / 100%
                      </span>

                      <button
                        type="button"
                        onClick={() => setHasMilestonesTerm(false)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                        title="Bỏ thanh toán theo đợt"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        totalMilestonePercent === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, totalMilestonePercent))}%` }}
                    />
                  </div>

                  {totalMilestonePercent !== 100 && (
                    <div className="p-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Tổng tỷ lệ các đợt phải đúng 100% (còn lệch {100 - totalMilestonePercent}%).</span>
                    </div>
                  )}

                  {/* Danh sách đợt */}
                  <div className="space-y-1.5">
                    {milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded border border-slate-200 bg-white flex items-center gap-1.5 text-xs"
                      >
                        <input
                          type="text"
                          placeholder={`Đợt ${idx + 1}: Tên đợt...`}
                          value={m.stageName}
                          onChange={(e) => updateMilestone(idx, 'stageName', e.target.value)}
                          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:border-slate-400 font-medium"
                        />
                        <div className="flex items-center gap-0.5 shrink-0">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={m.percent}
                            onChange={(e) =>
                              updateMilestone(idx, 'percent', Number(e.target.value))
                            }
                            className="w-14 text-right font-semibold rounded border border-slate-200 px-1 py-1 text-xs focus:outline-none focus:border-slate-400"
                          />
                          <span className="text-slate-400 text-[11px]">%</span>
                        </div>
                        {milestones.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMilestone(idx)}
                            className="text-slate-300 hover:text-rose-600 p-1 transition"
                            title="Xóa đợt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addMilestone}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm mốc đợt</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PHẦN 4: TỔNG HỢP BÁO GIÁ DỰ ÁN */}
          <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                4. Tổng hợp báo giá dự án
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Tổng tiền niêm yết:</span>
                <span className="font-medium text-slate-900 tabular-nums">
                  {formatMoney(displaySummary?.listPriceTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Chiết khấu dự án:</span>
                <span className="text-emerald-700 font-medium tabular-nums">
                  - {formatMoney(displaySummary?.totalDiscount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700 font-medium border-t border-slate-100 pt-1.5">
                <span>Thành tiền (Chưa VAT):</span>
                <span className="tabular-nums font-semibold text-slate-900">
                  {formatMoney(displaySummary?.netAmount)}
                </span>
              </div>

              {/* VAT */}
              <div className="flex items-center justify-between text-slate-600 gap-2">
                <div className="flex items-center gap-1">
                  <span>Thuế GTGT:</span>
                  <select
                    value={vatRate}
                    onChange={(e) => setVatRate(Number(e.target.value))}
                    className="rounded border border-slate-200 px-1 py-0.5 text-xs bg-slate-50 focus:outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="8">8%</option>
                    <option value="10">10%</option>
                  </select>
                </div>
                <span className="font-medium text-slate-800 tabular-nums">
                  {formatMoney(displaySummary?.vatAmount)}
                </span>
              </div>

              {/* Phí vận chuyển */}
              <div className="flex items-center justify-between text-slate-600 gap-2">
                <span>Phí vận chuyển:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={shippingFee}
                    onChange={(e) => setShippingFee(e.target.value)}
                    className="w-24 text-right font-medium rounded border border-slate-200 px-1.5 py-0.5 text-xs focus:outline-none focus:border-slate-400"
                  />
                  <span className="text-slate-400 text-[10px]">đ</span>
                </div>
              </div>

              {/* TỔNG THANH TOÁN PHẲNG, SANG TRỌNG */}
              <div className="rounded bg-slate-50 p-3 border border-slate-200 flex items-center justify-between mt-2.5">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">TỔNG THANH TOÁN:</span>
                  <span className="text-[10px] text-slate-400">Đã gồm VAT & Vận chuyển</span>
                </div>
                <span className="text-base font-bold text-slate-900 tabular-nums">
                  {formatMoney(displaySummary?.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="rounded border border-slate-200 bg-white p-3.5 space-y-1 text-xs">
          <label className="text-[11px] font-medium text-slate-600 block">
            Ghi chú điều kiện báo giá & Nghiệm thu
          </label>
          <textarea
            rows={2}
            placeholder="Nhập ghi chú thêm cho khách hàng hoặc nội bộ..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded border border-slate-200 p-2 text-xs focus:outline-none focus:border-slate-400"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-1 pb-4">
          <button
            type="button"
            onClick={() => navigate('/app/quotations')}
            className="px-3 py-1.5 rounded border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isEditMode ? 'Lưu thay đổi' : 'Lưu báo giá (DRAFT)'}</span>
          </button>
        </div>
      </div>

      {/* DRAWER BÊN PHẢI ĐỂ CHỌN SẢN PHẨM & COMBO */}
      <ProductSelectionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectProduct={handleSelectFromDrawer}
        selectedVariantCounts={selectedVariantCounts}
      />

      {/* POPUP XEM CHI TIẾT SẢN PHẨM / SKU TỪ BẢNG */}
      <ProductDetailModal
        product={tableDetailProduct}
        onClose={() => setTableDetailProduct(null)}
        onAdd={(prod) => {
          handleSelectFromDrawer(prod)
          setTableDetailProduct(null)
        }}
        countInQuotation={
          tableDetailProduct ? selectedVariantCounts[tableDetailProduct.variantId] || 0 : 0
        }
      />

      {/* DIALOG XÁC NHẬN CHUYỂN TRẠNG THÁI NGHIỆP VỤ */}
      {actionDialog && initialData?.quotationCode && (
        <QuotationActionDialog
          type={actionDialog}
          quotationCode={initialData.quotationCode}
          onClose={() => setActionDialog(null)}
          onSubmit={handleConfirmAction}
          submitting={
            isSubmittingApproval ||
            isApproving ||
            isRejecting ||
            isSending ||
            isAccepting ||
            isLosing ||
            isCreatingRev
          }
        />
      )}
    </div>
  )
}
