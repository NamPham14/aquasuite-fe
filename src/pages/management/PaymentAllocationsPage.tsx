import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  Download,
  FileText,
  Inbox,
  ReceiptText,
  RotateCcw,
  Search,
  WalletCards,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AppDispatch, RootState } from '../../app/store.ts'
import { ActivityLogPanel } from '../../features/audit'
import { useGetCustomerDebtsQuery } from '../../features/finance/api/customerDebtApi.ts'
import {
  paymentAllocationApi,
  useCreatePaymentAllocationMutation,
  useGetPaymentAllocationTargetsQuery,
  useGetPaymentAllocationsQuery,
  useGetUnallocatedReceiptsQuery,
  useReversePaymentAllocationMutation,
} from '../../features/finance/api/paymentAllocationApi.ts'
import type {
  PaymentAllocationLine,
  PaymentAllocationReceipt,
  PaymentAllocationTarget,
} from '../../features/finance/types/paymentAllocation.types.ts'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import {
  useGetSalesOrderByIdQuery,
  useGetSalesOrdersQuery,
} from '../../features/sales/api/salesOrderApi.ts'
import { normalizeApiError } from '../../shared/api/apiError.ts'
import { formatDateTime, formatVnd } from '../../shared/lib/money.ts'

type ReceiptTabView = 'UNALLOCATED' | 'ALLOCATED' | 'ALL'
type PeriodFilter = 'all' | 'month' | 'last30' | 'prevMonth' | 'custom'
type QueueAllocStatusFilter = '' | 'ACTIVE' | 'REVERSED'

interface CreatedVoucherState {
  voucherCode: string
  receiptCode: string
  paymentMethod: string
  customerLabel: string
  orderLabel: string
  actorLabel: string
  createdAtText: string
  reason: string
  remainingAfter: number
  lines: { allocationCode: string; invoiceCode: string; amount: number }[]
}

const primaryBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-control bg-aqs-accent px-3.5 text-xs font-semibold text-white transition-colors hover:bg-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:cursor-not-allowed disabled:bg-aqs-surface-subtle disabled:text-aqs-ink-faint'
const secondaryBtn =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-aqs-border bg-aqs-surface px-3 text-xs font-medium text-aqs-ink transition-colors hover:border-slate-300 hover:bg-aqs-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:cursor-not-allowed disabled:opacity-45'
const dangerSmallBtn =
  'inline-flex h-9 items-center justify-center gap-1 rounded-control border border-aqs-danger-border bg-aqs-danger-soft px-3 text-xs font-semibold text-aqs-danger transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-danger disabled:cursor-not-allowed disabled:opacity-45'

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}…` : value
}

function formatShortDate(iso?: string | null) {
  if (!iso) return '—'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed)
}

function paymentMethodLabel(method?: string | null) {
  if (!method) return '—'
  const upper = method.toUpperCase()
  if (upper === 'BANK_TRANSFER' || upper === 'BANK_WIRE') return 'Chuyển khoản'
  if (upper === 'CASH') return 'Tiền mặt'
  if (upper === 'CARD' || upper === 'CREDIT_CARD') return 'Thẻ POS'
  if (upper === 'COD') return 'Thu hộ COD'
  return method
}

function paymentSourceLabel(method?: string | null) {
  const upper = (method ?? '').toUpperCase()
  if (upper === 'BANK_TRANSFER' || upper === 'BANK_WIRE') return 'Chuyển khoản đã đối soát'
  if (upper === 'COD') return 'Thu hộ COD đã bàn giao'
  return 'Thu trực tiếp tại quầy'
}

function allocationTypeLabel(type: string) {
  if (type === 'AUTO_ADVANCE') return 'Tự động FIFO'
  if (type === 'REPOINTED') return 'Hệ thống tự re-point'
  return 'Phân bổ thủ công'
}

/* Đọc số tiền thành chữ tiếng Việt cho dòng "Viết bằng chữ" trên Mẫu số 01-TT */
const VN_ONES = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

function vnReadGroup(num: number, isFirstGroup: boolean) {
  const hundreds = Math.floor(num / 100)
  const rest = num % 100
  const tens = Math.floor(rest / 10)
  const units = rest % 10
  const parts: string[] = []
  if (hundreds > 0) parts.push(`${VN_ONES[hundreds]} trăm`)
  else if (!isFirstGroup) parts.push('không trăm')
  if (tens === 0) {
    if (units > 0) {
      if (parts.length > 0) parts.push('linh')
      parts.push(VN_ONES[units])
    }
  } else if (tens === 1) {
    parts.push('mười')
    if (units === 5) parts.push('lăm')
    else if (units > 0) parts.push(VN_ONES[units])
  } else {
    parts.push(`${VN_ONES[tens]} mươi`)
    if (units === 1) parts.push('mốt')
    else if (units === 5) parts.push('lăm')
    else if (units > 0) parts.push(VN_ONES[units])
  }
  return parts.join(' ')
}

function vnWords(amount: number) {
  const rounded = Math.round(Math.max(0, amount))
  if (!rounded) return 'Không đồng'
  const scales = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ']
  const groups: number[] = []
  let current = rounded
  while (current > 0) {
    groups.push(current % 1000)
    current = Math.floor(current / 1000)
  }
  const out: string[] = []
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue
    out.push(`${vnReadGroup(groups[i], i === groups.length - 1)}${scales[i] ?? ''}`)
  }
  const text = out.join(' ').replace(/\s+/g, ' ').trim()
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`
}

export function PaymentAllocationsPage() {
  const { user } = useAuth()
  const dispatch = useDispatch<AppDispatch>()
  const isAccountant = (user?.roles ?? []).includes('ACCOUNTANT')

  const [receiptView, setReceiptView] = useState<ReceiptTabView>('UNALLOCATED')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  /* Bộ lọc & phân trang cho 2 tab tra cứu: "Đã phân bổ hết" (ALLOCATED) và "Tất cả" (ALL) */
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [periodFrom, setPeriodFrom] = useState('')
  const [periodTo, setPeriodTo] = useState('')
  const [queueAllocStatus, setQueueAllocStatus] = useState<QueueAllocStatusFilter>('')
  const [pageSize, setPageSize] = useState<number>(5)
  const [clientPage, setClientPage] = useState<number>(1)

  /* Modals cấp trang */
  const [detailReceiptId, setDetailReceiptId] = useState<string | null>(null)
  const [reverseTarget, setReverseTarget] = useState<{
    receiptId: string
    receiptCode: string
    remainingBefore: number
    line: PaymentAllocationLine
    invoiceLabel: string
  } | null>(null)
  const [reverseReason, setReverseReason] = useState('')
  const [voucherModal, setVoucherModal] = useState<CreatedVoucherState | null>(null)

  const [reverseAllocation, reverseState] = useReversePaymentAllocationMutation()

  /* Queries dữ liệu thật từ Backend */
  const activeTabQuery = useGetUnallocatedReceiptsQuery(
    { page: 0, size: 200, view: receiptView },
    { skip: !isAccountant },
  )
  const openQueueKpiQuery = useGetUnallocatedReceiptsQuery(
    { page: 0, size: 200, view: 'UNALLOCATED' },
    { skip: !isAccountant },
  )
  /* Tương thích ngược nếu bộ test preload cache mặc định { page: 0, size: 20 } */
  const legacyDefaultCache = useSelector(
    (state: RootState) =>
      paymentAllocationApi.endpoints.getUnallocatedReceipts.select({ page: 0, size: 20 })(state)?.data,
  )

  const ordersQuery = useGetSalesOrdersQuery({ page: 1, size: 200 }, { skip: !isAccountant })
  const debtsQuery = useGetCustomerDebtsQuery({ page: 0, size: 200 }, { skip: !isAccountant })

  const orderMap = useMemo(() => {
    const map = new Map<
      string,
      { orderCode: string; customerName?: string | null; orderStatus: string; orderType?: string }
    >()
    for (const item of ordersQuery.data?.items ?? []) {
      map.set(item.orderId, {
        orderCode: item.orderCode,
        customerName: item.customerName,
        orderStatus: item.orderStatus,
        orderType: item.orderType,
      })
    }
    return map
  }, [ordersQuery.data])

  const customerMap = useMemo(() => {
    const map = new Map<string, { customerName: string; customerCode: string; customerType?: string }>()
    for (const item of debtsQuery.data?.content ?? []) {
      map.set(item.customerId, {
        customerName: item.customerName,
        customerCode: item.customerCode,
        customerType: item.customerType,
      })
    }
    return map
  }, [debtsQuery.data])

  const tabReceipts: PaymentAllocationReceipt[] = useMemo(() => {
    if (activeTabQuery.data?.content) return activeTabQuery.data.content
    if (receiptView === 'UNALLOCATED' && legacyDefaultCache?.content) return legacyDefaultCache.content
    return []
  }, [activeTabQuery.data, legacyDefaultCache, receiptView])

  const openReceiptsForKpi: PaymentAllocationReceipt[] = useMemo(() => {
    if (openQueueKpiQuery.data?.content) return openQueueKpiQuery.data.content
    if (legacyDefaultCache?.content) return legacyDefaultCache.content
    return []
  }, [openQueueKpiQuery.data, legacyDefaultCache])

  /* Tự nạp lịch sử phân bổ & hóa đơn cho các phiếu khi ở tab tra cứu ("Đã phân bổ hết" / "Tất cả") */
  useEffect(() => {
    if (!isAccountant || receiptView === 'UNALLOCATED' || tabReceipts.length === 0) return
    const subs = tabReceipts.map((r) =>
      dispatch(paymentAllocationApi.endpoints.getPaymentAllocations.initiate(r.receiptId)),
    )
    return () => {
      subs.forEach((sub) => sub.unsubscribe())
    }
  }, [dispatch, isAccountant, receiptView, tabReceipts])

  const apiQueriesState = useSelector((state: RootState) => state[paymentAllocationApi.reducerPath].queries)

  const allocationsByReceipt = useMemo(() => {
    const map = new Map<string, PaymentAllocationLine[]>()
    const rootSnapshot = { [paymentAllocationApi.reducerPath]: { queries: apiQueriesState } } as unknown as RootState
    for (const r of tabReceipts) {
      const cached = paymentAllocationApi.endpoints.getPaymentAllocations.select(r.receiptId)(rootSnapshot)?.data
      if (cached) map.set(r.receiptId, cached)
    }
    return map
  }, [apiQueriesState, tabReceipts])

  const invoiceCodeMap = useMemo(() => {
    const map = new Map<string, string>()
    const rootSnapshot = { [paymentAllocationApi.reducerPath]: { queries: apiQueriesState } } as unknown as RootState
    for (const r of tabReceipts) {
      const targets = paymentAllocationApi.endpoints.getPaymentAllocationTargets.select(r.receiptId)(rootSnapshot)?.data
      for (const inv of targets?.invoices ?? []) {
        map.set(inv.invoiceId, inv.invoiceCode)
      }
    }
    return map
  }, [apiQueriesState, tabReceipts])

  /* Tính mốc thời gian tham chiếu để lọc kỳ trên tab tra cứu */
  const referenceDate = useMemo(() => {
    let latest: Date | null = null
    for (const r of tabReceipts) {
      const d = new Date(r.receivedAt)
      if (!Number.isNaN(d.getTime()) && (!latest || d > latest)) latest = d
    }
    return latest ?? new Date()
  }, [tabReceipts])

  const isOpenTab = receiptView === 'UNALLOCATED'

  const filteredReceipts = useMemo(() => {
    if (isOpenTab) {
      /* Hàng đợi việc cần làm: hiện tất cả phiếu chờ phân bổ, cũ nhất trước */
      return [...tabReceipts].sort((a, b) => {
        const da = new Date(a.receivedAt).getTime()
        const db = new Date(b.receivedAt).getTime()
        if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return da - db
        return a.receiptCode.localeCompare(b.receiptCode)
      })
    }

    const q = search.trim().toLowerCase()
    const filtered = tabReceipts.filter((r) => {
      /* 1. Lọc theo kỳ */
      if (period !== 'all') {
        const d = new Date(r.receivedAt)
        if (!Number.isNaN(d.getTime())) {
          if (period === 'month') {
            if (d.getMonth() !== referenceDate.getMonth() || d.getFullYear() !== referenceDate.getFullYear()) {
              return false
            }
          } else if (period === 'prevMonth') {
            const pm = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
            if (d.getMonth() !== pm.getMonth() || d.getFullYear() !== pm.getFullYear()) return false
          } else if (period === 'last30') {
            const start = new Date(
              referenceDate.getFullYear(),
              referenceDate.getMonth(),
              referenceDate.getDate() - 29,
              0,
              0,
              0,
            )
            const end = new Date(
              referenceDate.getFullYear(),
              referenceDate.getMonth(),
              referenceDate.getDate(),
              23,
              59,
              59,
              999,
            )
            if (d < start || d > end) return false
          } else if (period === 'custom') {
            if (periodFrom) {
              const fromDate = new Date(`${periodFrom}T00:00:00`)
              if (!Number.isNaN(fromDate.getTime()) && d < fromDate) return false
            }
            if (periodTo) {
              const toDate = new Date(`${periodTo}T23:59:59.999`)
              if (!Number.isNaN(toDate.getTime()) && d > toDate) return false
            }
          }
        }
      }

      const orderInfo = orderMap.get(r.orderId)
      const custInfo = customerMap.get(r.customerId)
      const allocs = allocationsByReceipt.get(r.receiptId) ?? []

      /* 2. Lọc theo trạng thái phân bổ bên trong phiếu */
      if (queueAllocStatus) {
        const hasMatchingStatus = allocs.some(
          (a) => (a.allocationStatus ?? 'ACTIVE').toUpperCase() === queueAllocStatus,
        )
        if (!hasMatchingStatus) return false
      }

      /* 3. Tìm kiếm gộp: mã phiếu thu, mã phân bổ, mã hóa đơn, mã đơn hoặc tên khách hàng */
      if (q) {
        const haystack = [
          r.receiptCode,
          r.orderId,
          orderInfo?.orderCode ?? '',
          r.customerId,
          orderInfo?.customerName ?? '',
          custInfo?.customerName ?? '',
          custInfo?.customerCode ?? '',
          r.paymentMethod,
          paymentMethodLabel(r.paymentMethod),
        ]
          .join(' ')
          .toLowerCase()
        if (haystack.includes(q)) return true

        const allocMatched = allocs.some((a) => {
          const invCode = invoiceCodeMap.get(a.invoiceId) ?? ''
          return `${a.allocationId} ${a.invoiceId} ${invCode}`.toLowerCase().includes(q)
        })
        return allocMatched
      }

      return true
    })

    /* Tab tra cứu: mới nhất trước */
    return filtered.sort((a, b) => {
      const da = new Date(a.receivedAt).getTime()
      const db = new Date(b.receivedAt).getTime()
      if (!Number.isNaN(da) && !Number.isNaN(db) && da !== db) return db - da
      return b.receiptCode.localeCompare(a.receiptCode)
    })
  }, [
    allocationsByReceipt,
    customerMap,
    invoiceCodeMap,
    isOpenTab,
    orderMap,
    period,
    periodFrom,
    periodTo,
    queueAllocStatus,
    referenceDate,
    search,
    tabReceipts,
  ])

  const totalPages = isOpenTab ? 1 : Math.max(1, Math.ceil(filteredReceipts.length / pageSize))
  const safePage = isOpenTab ? 1 : Math.min(Math.max(1, clientPage), totalPages)
  const startIdx = isOpenTab ? 0 : (safePage - 1) * pageSize
  const pagedReceipts = isOpenTab
    ? filteredReceipts
    : filteredReceipts.slice(startIdx, startIdx + pageSize)

  /* Chọn mặc định phiếu đầu tiên trong danh sách nếu chưa chọn hoặc phiếu đang chọn không còn trong tab */
  useEffect(() => {
    if (filteredReceipts.length === 0) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !filteredReceipts.some((r) => r.receiptId === selectedId)) {
      setSelectedId(filteredReceipts[0].receiptId)
    }
  }, [filteredReceipts, selectedId])

  useEffect(() => {
    setClientPage(1)
  }, [receiptView, search, period, periodFrom, periodTo, queueAllocStatus, pageSize])

  /* KPI tổng quan */
  const kpiUnallocatedMoney = useMemo(
    () => openReceiptsForKpi.reduce((sum, r) => sum + Math.max(0, r.remainingAmount), 0),
    [openReceiptsForKpi],
  )
  const kpiQueueCount = openReceiptsForKpi.length
  const kpiElectronicInvoiceDebt = useMemo(() => {
    if (!debtsQuery.data?.content) return null
    return debtsQuery.data.content.reduce((sum, c) => sum + Math.max(0, c.issuedInvoiceReceivable ?? 0), 0)
  }, [debtsQuery.data])

  const periodDescription = useMemo(() => {
    const mmYyyy = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    if (period === 'month') return `Kỳ: tháng ${mmYyyy(referenceDate)}`
    if (period === 'prevMonth') {
      const pm = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
      return `Kỳ: tháng ${mmYyyy(pm)}`
    }
    if (period === 'last30') {
      const s = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - 29)
      return `Kỳ: 30 ngày gần nhất (${s.toLocaleDateString('vi-VN')} – ${referenceDate.toLocaleDateString('vi-VN')})`
    }
    if (period === 'custom') return 'Kỳ: khoảng ngày đã chọn'
    return 'Kỳ: tất cả'
  }, [period, referenceDate])

  function resolveOrderLabel(orderId: string) {
    return orderMap.get(orderId)?.orderCode ?? shortId(orderId)
  }

  function resolveCustomerLabel(orderId: string, customerId: string) {
    return (
      orderMap.get(orderId)?.customerName ||
      customerMap.get(customerId)?.customerName ||
      `Khách hàng ${shortId(customerId)}`
    )
  }

  async function handleConfirmReverse() {
    if (!reverseTarget || !reverseReason.trim()) return
    try {
      await reverseAllocation({
        receiptId: reverseTarget.receiptId,
        allocationId: reverseTarget.line.allocationId,
        reason: reverseReason.trim(),
      }).unwrap()
      toast.success(
        `Đã thu hồi phân bổ ${formatVnd(reverseTarget.line.allocatedAmount)} về phiếu ${reverseTarget.receiptCode} — hãy phân bổ lại vào hóa đơn đúng.`,
      )
      const reopenedReceiptId = reverseTarget.receiptId
      setReverseTarget(null)
      setReverseReason('')
      setReceiptView('UNALLOCATED')
      setSelectedId(reopenedReceiptId)
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    }
  }

  function downloadVoucherTxt(v: CreatedVoucherState) {
    const lines = [
      `PHIEU PHAN BO TIEN THU - ${v.voucherCode}`,
      'AquaSuite IMS',
      '',
      `Phieu thu goc: ${v.receiptCode} (${paymentMethodLabel(v.paymentMethod)} - ${paymentSourceLabel(v.paymentMethod)})`,
      `Khach hang: ${v.customerLabel} | Don hang: ${v.orderLabel}`,
      `Nguoi lap: ${v.actorLabel} | ${v.createdAtText}`,
      `Ly do: ${v.reason}`,
      '',
      ...v.lines.map((l) => `${l.allocationCode}  ->  ${l.invoiceCode}  :  ${formatVnd(l.amount)}`),
      '',
      `Tong phan bo: ${formatVnd(v.lines.reduce((s, l) => s + l.amount, 0))}`,
      `Chua phan bo con lai: ${formatVnd(v.remainingAfter)}`,
      '',
      'MSG95: Receipt voucher created and payments allocated successfully.',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${v.voucherCode}.txt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  if (!isAccountant) return <AccessDenied />

  const selectedReceipt =
    filteredReceipts.find((r) => r.receiptId === selectedId) ??
    tabReceipts.find((r) => r.receiptId === selectedId) ??
    null
  const detailReceipt =
    tabReceipts.find((r) => r.receiptId === detailReceiptId) ??
    openReceiptsForKpi.find((r) => r.receiptId === detailReceiptId) ??
    null

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-12 font-aqs-sans text-[13.5px] text-aqs-ink">
      {/* Header trang */}
      <header className="border-b border-aqs-border pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-aqs-ink-faint">
              <Link to="/app/dashboard" className="hover:text-aqs-accent-hover">Tổng quan</Link>
              <span>/</span>
              <span>Tài chính &amp; Công nợ</span>
              <span>/</span>
              <b className="font-medium text-aqs-ink-muted">Phân bổ tiền thu</b>
            </div>
            <h1 className="mt-2 text-[clamp(22px,2vw,28px)] font-bold tracking-[-0.025em] text-aqs-ink">
              Phiếu thu &amp; Phân bổ tiền thu
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-aqs-ink-muted">
              Phân bổ tiền thu đã xác minh vào các hóa đơn điện tử đã phát hành của cùng đơn hàng.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-control border border-aqs-border bg-aqs-surface px-3 py-1.5 text-xs">
            <span className="font-semibold text-aqs-ink-muted">Vai trò</span>
            <span className="rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-2.5 py-0.5 font-semibold text-aqs-accent-hover">
              Kế toán — {user?.username ?? 'ACCOUNTANT'}
            </span>
          </div>
        </div>
      </header>

      {/* KPI Strip 3 ô chỉ số */}
      <section aria-label="Tổng quan" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-aqs-border border-t-[3px] border-t-aqs-accent bg-aqs-surface px-4 py-3.5">
          <div className="text-xs font-semibold text-aqs-ink-muted">Tiền đã xác minh · chưa phân bổ</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-aqs-ink">
            {openQueueKpiQuery.isLoading && !legacyDefaultCache ? '—' : formatVnd(kpiUnallocatedMoney)}
          </div>
        </div>
        <div className="rounded-card border border-aqs-border bg-aqs-surface px-4 py-3.5">
          <div className="text-xs font-semibold text-aqs-ink-muted">Phiếu thu đang chờ phân bổ</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-aqs-ink">
            {openQueueKpiQuery.isLoading && !legacyDefaultCache ? '—' : `${kpiQueueCount} phiếu`}
          </div>
        </div>
        <div className="rounded-card border border-aqs-border border-t-[3px] border-t-aqs-warning bg-aqs-surface px-4 py-3.5">
          <div className="text-xs font-semibold text-aqs-ink-muted">Hóa đơn điện tử còn nợ</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-aqs-ink">
            {kpiElectronicInvoiceDebt === null ? '—' : formatVnd(kpiElectronicInvoiceDebt)}
          </div>
        </div>
      </section>

      {/* Bố cục chính 2 cột: Cột trái 400px (Hàng đợi phiếu thu) · Cột phải (Khu vực phân bổ) */}
      <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* LEFT PANEL: Hàng đợi phiếu thu */}
        <section
          aria-label="Hàng đợi phiếu thu"
          className="overflow-hidden rounded-card border border-aqs-border bg-aqs-surface lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-100px)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 pt-3 pb-2">
            <h2 className="text-sm font-bold text-aqs-ink">Hàng đợi phiếu thu</h2>
            <span className="text-xs text-aqs-ink-faint">
              {isOpenTab
                ? `${filteredReceipts.length} phiếu đang chờ`
                : `${filteredReceipts.length} phiếu · trang ${safePage}/${totalPages}`}
            </span>
          </div>

          <div className="px-3.5 pb-3.5 lg:overflow-y-auto lg:max-h-[calc(100vh-200px)]">
            {/* 3 Tabs */}
            <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
              {(
                [
                  { value: 'UNALLOCATED', label: 'Chờ phân bổ' },
                  { value: 'ALLOCATED', label: 'Đã phân bổ hết' },
                  { value: 'ALL', label: 'Tất cả' },
                ] as const
              ).map((tab) => {
                const active = receiptView === tab.value
                return (
                  <button
                    key={tab.value}
                    role="tab"
                    aria-selected={active}
                    type="button"
                    onClick={() => setReceiptView(tab.value)}
                    className={`min-h-8 cursor-pointer rounded-control border px-3 py-1 text-xs transition ${
                      active
                        ? 'border-aqs-accent bg-aqs-accent font-semibold text-white'
                        : 'border-aqs-border-strong bg-aqs-surface font-medium text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Bộ điều khiển Tìm kiếm + Kỳ hiển thị + Trạng thái phân bổ + Mỗi trang cho tab "Đã phân bổ hết" & "Tất cả" */}
            {!isOpenTab && (
              <>
                <div className="mb-2.5 flex flex-wrap items-end gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
                  <div className="min-w-0 flex-[2_1_200px]">
                    <label htmlFor="queueSearch" className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Tìm kiếm
                    </label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="queueSearch"
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Mã phiếu thu, mã phân bổ, mã hóa đơn, mã đơn hoặc tên khách hàng…"
                        aria-label="Tìm phiếu thu hoặc phân bổ theo mã phiếu, mã phân bổ, mã hóa đơn, mã đơn hoặc khách hàng"
                        className="h-8 w-full rounded border border-slate-300 bg-white pr-2.5 pl-8 text-xs text-slate-900 outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="min-w-0 flex-[1_1_130px]">
                    <label htmlFor="periodSel" className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Kỳ hiển thị
                    </label>
                    <select
                      id="periodSel"
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
                      aria-label="Lọc phiếu thu theo kỳ"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                    >
                      <option value="all">Tất cả kỳ</option>
                      <option value="month">Tháng hiện tại</option>
                      <option value="last30">30 ngày gần nhất</option>
                      <option value="prevMonth">Tháng trước</option>
                      <option value="custom">Tùy chọn khoảng ngày…</option>
                    </select>
                  </div>

                  {period === 'custom' && (
                    <div className="flex w-full flex-wrap items-end gap-2.5">
                      <div className="min-w-0 flex-1">
                        <label htmlFor="periodFrom" className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Từ ngày thu
                        </label>
                        <input
                          id="periodFrom"
                          type="date"
                          value={periodFrom}
                          onChange={(e) => setPeriodFrom(e.target.value)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="periodTo" className="mb-1 block text-[11px] font-semibold text-slate-600">
                          Đến ngày thu
                        </label>
                        <input
                          id="periodTo"
                          type="date"
                          value={periodTo}
                          onChange={(e) => setPeriodTo(e.target.value)}
                          className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="min-w-0 flex-[1_1_140px]">
                    <label
                      htmlFor="queueAllocStatus"
                      className="mb-1 block text-[11px] font-semibold text-slate-600"
                    >
                      Trạng thái phân bổ
                    </label>
                    <select
                      id="queueAllocStatus"
                      value={queueAllocStatus}
                      onChange={(e) => setQueueAllocStatus(e.target.value as QueueAllocStatusFilter)}
                      aria-label="Lọc theo trạng thái phân bổ trong phiếu"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="ACTIVE">Đang hiệu lực (ACTIVE)</option>
                      <option value="REVERSED">Đã thu hồi (REVERSED)</option>
                    </select>
                  </div>

                  <div className="min-w-0 flex-[1_1_110px]">
                    <label htmlFor="pageSizeSel" className="mb-1 block text-[11px] font-semibold text-slate-600">
                      Mỗi trang
                    </label>
                    <select
                      id="pageSizeSel"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value) || 5)}
                      aria-label="Số phiếu mỗi trang"
                      className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none focus:border-sky-500"
                    >
                      <option value={5}>5 phiếu</option>
                      <option value={10}>10 phiếu</option>
                      <option value={20}>20 phiếu</option>
                    </select>
                  </div>
                </div>

                <p className="mb-2.5 text-xs text-slate-500">
                  {periodDescription}
                  {search.trim() ? ` · Từ khóa: “${search.trim()}”` : ''}
                  {queueAllocStatus ? ` · Trạng thái phân bổ: ${queueAllocStatus}` : ''}
                  {` · Tìm thấy ${filteredReceipts.length} trong tổng ${tabReceipts.length} phiếu của tab này.`}
                </p>
              </>
            )}

            {/* Danh sách thẻ phiếu thu */}
            {activeTabQuery.isLoading && !legacyDefaultCache ? (
              <Loading text="Đang tải hàng đợi phiếu thu…" />
            ) : activeTabQuery.isError && !legacyDefaultCache ? (
              <ErrorBox error={activeTabQuery.error} />
            ) : pagedReceipts.length === 0 ? (
              <Empty
                text={
                  isOpenTab
                    ? 'Không còn phiếu nào đang chờ phân bổ.'
                    : 'Không có phiếu nào khớp điều kiện tìm kiếm.'
                }
              />
            ) : (
              <div className="space-y-2">
                {pagedReceipts.map((r) => {
                  const pct =
                    r.receiptAmount > 0
                      ? Math.min(100, Math.round((r.allocatedAmount / r.receiptAmount) * 100))
                      : 100
                  const isDone = r.remainingAmount <= 0
                  const orderInfo = orderMap.get(r.orderId)
                  const isCancelledOrder = orderInfo?.orderStatus === 'CANCELLED'
                  const isSelected = r.receiptId === selectedId
                  const inlineAllocs = (allocationsByReceipt.get(r.receiptId) ?? []).filter(
                    (a) =>
                      !queueAllocStatus ||
                      (a.allocationStatus ?? 'ACTIVE').toUpperCase() === queueAllocStatus,
                  )

                  return (
                    <div
                      key={r.receiptId}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(r.receiptId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedId(r.receiptId)
                        }
                      }}
                      className={`w-full cursor-pointer rounded-md border p-3 text-left transition ${
                        isSelected
                          ? 'border-sky-500 bg-sky-50/70 ring-1 ring-sky-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      } ${isDone && !isSelected ? 'opacity-80' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-mono text-[13.5px] font-bold text-slate-900">
                            {r.receiptCode}
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] text-slate-600">
                            {resolveCustomerLabel(r.orderId, r.customerId)} ·{' '}
                            <span className="font-mono">{resolveOrderLabel(r.orderId)}</span>
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          VERIFIED
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Nguồn: {paymentSourceLabel(r.paymentMethod)} · Đã xác minh lúc{' '}
                        {formatDateTime(r.receivedAt)}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {paymentMethodLabel(r.paymentMethod)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {formatShortDate(r.receivedAt)}
                        </span>
                        {isCancelledOrder && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Đơn đã hủy
                          </span>
                        )}
                        {isDone && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Đã phân bổ hết
                          </span>
                        )}
                      </div>

                      {/* Thanh tiến độ phân bổ */}
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sky-700 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-600">
                        <span>
                          Đã thu <b className="tabular-nums text-slate-900">{formatVnd(r.receiptAmount)}</b>
                        </span>
                        <span>
                          Đã phân bổ{' '}
                          <b className="tabular-nums text-slate-900">{formatVnd(r.allocatedAmount)}</b>
                        </span>
                        <span>
                          Chưa phân bổ{' '}
                          <b className="tabular-nums text-sky-700">
                            {formatVnd(Math.max(0, r.remainingAmount))}
                          </b>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDetailReceiptId(r.receiptId)
                        }}
                        className="mt-2 inline-flex text-xs font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                      >
                        Xem phiếu thu gốc →
                      </button>

                      {/* Danh sách phân bổ bên trong thẻ phiếu khi ở tab "Đã phân bổ hết" / "Tất cả" */}
                      {!isOpenTab && (
                        <div className="mt-2.5 border-t border-dashed border-slate-300 pt-2">
                          <div className="mb-1.5 text-[11px] font-semibold text-slate-600">
                            {inlineAllocs.length > 0
                              ? 'Phân bổ của phiếu này:'
                              : queueAllocStatus
                                ? 'Phiếu này không có phân bổ nào ở trạng thái đang lọc.'
                                : 'Chưa có phân bổ nào cho phiếu này.'}
                          </div>
                          {inlineAllocs.length > 0 && (
                            <div className="space-y-1.5">
                              {inlineAllocs.map((al) => {
                                const isActive = (al.allocationStatus ?? 'ACTIVE') === 'ACTIVE'
                                const isRepointed = al.allocationType === 'REPOINTED'
                                const invLabel = invoiceCodeMap.get(al.invoiceId) ?? shortId(al.invoiceId)
                                return (
                                  <div
                                    key={al.allocationId}
                                    className="flex items-start justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs"
                                  >
                                    <div className="min-w-0 leading-relaxed">
                                      <div>
                                        <span className="font-mono font-semibold text-slate-800">
                                          {shortId(al.allocationId)}
                                        </span>{' '}
                                        →{' '}
                                        <span className="font-mono font-semibold text-slate-800">
                                          {invLabel}
                                        </span>{' '}
                                        ·{' '}
                                        {isActive ? (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[10.5px] font-semibold text-emerald-700">
                                            ● Hiệu lực
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.2 text-[10.5px] font-semibold text-rose-800">
                                            ● REVERSED
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-500">
                                        {formatDateTime(al.allocatedAt)} · {allocationTypeLabel(al.allocationType)}
                                        {al.reversalReason ? (
                                          <>
                                            <br />
                                            Lý do thu hồi: {al.reversalReason}
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                      <span className="font-bold tabular-nums text-slate-900">
                                        {formatVnd(al.allocatedAmount)}
                                      </span>
                                      {isActive && (
                                        <>
                                          <button
                                            type="button"
                                            disabled={isRepointed}
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setReverseTarget({
                                                receiptId: r.receiptId,
                                                receiptCode: r.receiptCode,
                                                remainingBefore: r.remainingAmount,
                                                line: al,
                                                invoiceLabel: invLabel,
                                              })
                                              setReverseReason('')
                                            }}
                                            className={dangerSmallBtn}
                                          >
                                            Thu hồi / Điều chỉnh
                                          </button>
                                          {isRepointed && (
                                            <span className="max-w-[180px] text-right text-[10.5px] leading-snug text-amber-800">
                                              Bản ghi hệ thống tự re-point sang hóa đơn thay thế — không thu hồi thường.
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Thanh phân trang chân Hàng đợi phiếu thu */}
            <div
              aria-label="Phân trang hàng đợi phiếu thu"
              className="-mx-3.5 mt-3 -mb-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600"
            >
              {isOpenTab ? (
                <span>Hiện tất cả {filteredReceipts.length} phiếu · cũ nhất trước</span>
              ) : filteredReceipts.length === 0 ? (
                <span>Không có phiếu nào khớp tìm kiếm / kỳ đã chọn ở tab này.</span>
              ) : (
                <>
                  <span>
                    Đang xem phiếu {startIdx + 1}–{startIdx + pagedReceipts.length} trong{' '}
                    {filteredReceipts.length} phiếu đã lọc · Tổng tab chưa lọc: {tabReceipts.length} phiếu
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                      className={secondaryBtn}
                    >
                      ← Trước
                    </button>
                    <span className="px-1 font-semibold text-slate-700">
                      Trang {safePage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
                      className={secondaryBtn}
                    >
                      Sau →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: Khu vực phân bổ (Workspace) */}
        <section
          aria-label="Khu vực phân bổ"
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs lg:sticky lg:top-4 lg:self-start"
        >
          <AllocationWorkspace
            receipt={selectedReceipt}
            actorLabel={`Kế toán — ${user?.username ?? 'ACCOUNTANT'}`}
            fallbackCustomerLabel={
              selectedReceipt
                ? resolveCustomerLabel(selectedReceipt.orderId, selectedReceipt.customerId)
                : ''
            }
            fallbackOrderLabel={selectedReceipt ? resolveOrderLabel(selectedReceipt.orderId) : ''}
            onOpenOriginalReceipt={(id) => setDetailReceiptId(id)}
            onOpenReverse={(payload) => {
              setReverseTarget(payload)
              setReverseReason('')
            }}
            onVoucherCreated={(voucher) => setVoucherModal(voucher)}
          />
        </section>
      </div>

      {/* Nhật ký hoạt động */}
      <ActivityLogPanel
        entityType="PAYMENT_RECEIPT"
        title="Nhật ký hoạt động"
        description="Hệ thống tự động ghi nhận mọi thao tác phân bổ, thu hồi đảo ngược và điều chỉnh hóa đơn thay thế."
        emptyMessage="Chưa có hoạt động phân bổ nào được ghi nhận."
      />

      {/* Modal 1: Xem phiếu thu gốc (Mẫu số 01-TT Thông tư 133/2016/TT-BTC) */}
      {detailReceipt && (
        <OriginalReceiptModal
          receipt={detailReceipt}
          customerLabel={resolveCustomerLabel(detailReceipt.orderId, detailReceipt.customerId)}
          orderLabel={resolveOrderLabel(detailReceipt.orderId)}
          onClose={() => setDetailReceiptId(null)}
        />
      )}

      {/* Modal 2: Thu hồi / Điều chỉnh phân bổ */}
      {reverseTarget && (
        <ReverseAllocationDialog
          target={reverseTarget}
          reason={reverseReason}
          onReasonChange={setReverseReason}
          onClose={() => setReverseTarget(null)}
          onConfirm={() => void handleConfirmReverse()}
          saving={reverseState.isLoading}
        />
      )}

      {/* Modal 3: Phiếu phân bổ tiền thu (MSG95) */}
      {voucherModal && (
        <VoucherSuccessModal
          voucher={voucherModal}
          onClose={() => setVoucherModal(null)}
          onDownload={() => downloadVoucherTxt(voucherModal)}
        />
      )}
    </div>
  )
}

function AllocationWorkspace({
  receipt,
  actorLabel,
  fallbackCustomerLabel,
  fallbackOrderLabel,
  onOpenOriginalReceipt,
  onOpenReverse,
  onVoucherCreated,
}: {
  receipt: PaymentAllocationReceipt | null
  actorLabel: string
  fallbackCustomerLabel: string
  fallbackOrderLabel: string
  onOpenOriginalReceipt: (receiptId: string) => void
  onOpenReverse: (payload: {
    receiptId: string
    receiptCode: string
    remainingBefore: number
    line: PaymentAllocationLine
    invoiceLabel: string
  }) => void
  onVoucherCreated: (voucher: CreatedVoucherState) => void
}) {
  const receiptId = receipt?.receiptId ?? null
  const targetsQuery = useGetPaymentAllocationTargetsQuery(receiptId ?? '', { skip: !receiptId })
  const historyQuery = useGetPaymentAllocationsQuery(receiptId ?? '', { skip: !receiptId })
  const orderId = targetsQuery.data?.orderId ?? receipt?.orderId ?? ''
  const orderQuery = useGetSalesOrderByIdQuery(orderId, { skip: !orderId })

  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const [allocate, allocateState] = useCreatePaymentAllocationMutation()

  useEffect(() => {
    setAmounts({})
    setReason('')
    setPreviewOpen(false)
    requestIdRef.current = null
  }, [receiptId])

  const targets = targetsQuery.data
  const invoices = useMemo(() => targets?.invoices ?? [], [targets])
  const invoiceCodeById = useMemo(
    () => new Map(invoices.map((inv) => [inv.invoiceId, inv.invoiceCode])),
    [invoices],
  )

  const selectedLines = useMemo(
    () =>
      invoices
        .map((invoice) => ({ invoice, amount: Number(amounts[invoice.invoiceId] || 0) }))
        .filter((line) => Number.isFinite(line.amount) && line.amount > 0),
    [amounts, invoices],
  )

  const currentTotal = selectedLines.reduce((sum, line) => sum + line.amount, 0)
  const remainingAmount = targets?.remainingAmount ?? receipt?.remainingAmount ?? 0
  const exceedsInvoice = invoices.some(
    (inv) => Number(amounts[inv.invoiceId] || 0) > inv.outstandingAmount,
  )
  const exceedsReceipt = currentTotal > remainingAmount
  const orderTaxDebt = invoices.reduce((sum, inv) => sum + Math.max(0, inv.outstandingAmount), 0)
  const isOrderCancelled = orderQuery.data?.orderStatus === 'CANCELLED'

  const canPreview =
    Boolean(targets) &&
    !isOrderCancelled &&
    remainingAmount > 0 &&
    selectedLines.length > 0 &&
    !exceedsReceipt &&
    !exceedsInvoice

  function fillMaxForInvoice(inv: PaymentAllocationTarget) {
    const otherEntered = Object.entries(amounts).reduce((sum, [id, val]) => {
      if (id === inv.invoiceId) return sum
      const parsed = Number(val || 0)
      return sum + (Number.isFinite(parsed) ? parsed : 0)
    }, 0)
    const cap = Math.max(0, Math.min(inv.outstandingAmount, remainingAmount - otherEntered))
    setAmounts((prev) => ({ ...prev, [inv.invoiceId]: cap > 0 ? String(cap) : '' }))
  }

  async function confirmAndSubmitAllocation() {
    if (!receiptId || !targets || !canPreview) return
    const allocationRequestId = requestIdRef.current ?? createRequestId()
    requestIdRef.current = allocationRequestId
    const finalReason = reason.trim() || 'Phân bổ thủ công bởi Kế toán'
    try {
      const result = await allocate({
        receiptId,
        body: {
          allocationRequestId,
          allocations: selectedLines.map((line) => ({
            invoiceId: line.invoice.invoiceId,
            allocatedAmount: line.amount,
          })),
          reason: reason.trim() || undefined,
        },
      }).unwrap()

      const createdAtText = new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date())

      const voucherLines =
        result.allocations && result.allocations.length > 0
          ? result.allocations.map((al) => ({
              allocationCode: shortId(al.allocationId),
              invoiceCode: invoiceCodeById.get(al.invoiceId) ?? shortId(al.invoiceId),
              amount: al.allocatedAmount,
            }))
          : selectedLines.map((line) => ({
              allocationCode: shortId(result.allocationRequestId),
              invoiceCode: line.invoice.invoiceCode,
              amount: line.amount,
            }))

      setPreviewOpen(false)
      setAmounts({})
      setReason('')
      requestIdRef.current = null

      onVoucherCreated({
        voucherCode: `PT-${result.allocationRequestId.slice(0, 8).toUpperCase()}`,
        receiptCode: targets.receiptCode,
        paymentMethod: receipt?.paymentMethod ?? 'BANK_TRANSFER',
        customerLabel: orderQuery.data?.customerName || fallbackCustomerLabel,
        orderLabel: orderQuery.data?.orderCode || fallbackOrderLabel,
        actorLabel,
        createdAtText,
        reason: finalReason,
        remainingAfter: result.remainingReceiptAmount,
        lines: voucherLines,
      })

      toast.success('MSG95 — Phiếu thu đã được lập và phân bổ thanh toán thành công.')
    } catch (error) {
      toast.error(normalizeApiError(error).message)
    }
  }

  if (!receiptId || !receipt) {
    return (
      <div className="flex min-h-[380px] items-center justify-center p-8 text-center text-sm text-slate-500">
        <div>
          <WalletCards className="mx-auto mb-2 h-9 w-9 text-slate-300" />
          Chọn một phiếu thu ở cột trái để bắt đầu phân bổ.
        </div>
      </div>
    )
  }

  if (targetsQuery.isLoading) return <Loading text="Đang tải hóa đơn điện tử của đơn hàng…" />
  if (targetsQuery.isError || !targets) return <ErrorBox error={targetsQuery.error} />

  const customerLabel = orderQuery.data?.customerName || fallbackCustomerLabel
  const orderLabel = orderQuery.data?.orderCode || fallbackOrderLabel
  const openInvoices = invoices.filter((i) => i.outstandingAmount > 0)

  return (
    <div className="p-4">
      {/* Đầu khu vực phân bổ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[15px] font-bold text-slate-900">
            {targets.receiptCode} — {customerLabel}
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
            Đơn <span className="font-mono font-semibold text-slate-800">{orderLabel}</span>
            {orderQuery.data?.orderType ? ` · ${orderQuery.data.orderType}` : ''} ·{' '}
            {paymentMethodLabel(receipt.paymentMethod)} · Nguồn:{' '}
            {paymentSourceLabel(receipt.paymentMethod)} · Ngày thu{' '}
            {formatShortDate(receipt.receivedAt)}
            {orderQuery.data?.quotationCode ? (
              <>
                <br />
                Từ báo giá <b>{orderQuery.data.quotationCode}</b>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            VERIFIED
          </span>
          {isOrderCancelled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Đơn đã hủy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Đang xử lý
            </span>
          )}
          <button
            type="button"
            onClick={() => onOpenOriginalReceipt(targets.receiptId)}
            className={secondaryBtn}
          >
            Xem phiếu thu gốc
          </button>
          <Link to={`/app/orders/${targets.orderId}`} className={secondaryBtn}>
            <ReceiptText className="h-3.5 w-3.5" />
            Mở đơn
          </Link>
        </div>
      </div>

      {/* 4 ô chỉ số của phiếu thu đang chọn */}
      <div className="my-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-slate-600">Số tiền đã thu</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
            {formatVnd(targets.receiptAmount)}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-slate-600">Đã phân bổ</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
            {formatVnd(targets.allocatedAmount)}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-slate-600">Chưa phân bổ</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-sky-700">
            {formatVnd(Math.max(0, targets.remainingAmount))}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-slate-600">Nợ hóa đơn điện tử của đơn</div>
          <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
            {formatVnd(orderTaxDebt)}
          </div>
        </div>
      </div>

      {/* Các trạng thái cảnh báo nghiệp vụ */}
      {isOrderCancelled ? (
        <div className="my-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-900">
          <b>Đơn hàng {orderLabel} đã hủy.</b> Không thể phân bổ. Số tiền đã xác minh{' '}
          <b>{formatVnd(targets.remainingAmount)}</b> được giữ để xử lý hoàn tiền hoặc đối soát.
        </div>
      ) : targets.remainingAmount <= 0 ? (
        <div className="my-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
          <b>Phiếu thu đã phân bổ hết.</b> Toàn bộ {formatVnd(targets.receiptAmount)} của phiếu đã
          phân bổ vào các hóa đơn điện tử của đơn {orderLabel}.
          {openInvoices.length > 0
            ? ` Đơn ${orderLabel} vẫn còn hóa đơn điện tử chưa thu: ${openInvoices
                .map((i) => `${i.invoiceCode} còn nợ ${formatVnd(i.outstandingAmount)}`)
                .join('; ')} — khoản nợ này chờ phiếu thu khác của đơn, không thuộc phiếu này.`
            : ''}
        </div>
      ) : openInvoices.length === 0 ? (
        <div className="my-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          <b>Đơn {orderLabel} chưa có hóa đơn điện tử đã phát hành còn nợ.</b> Số tiền{' '}
          <b>{formatVnd(targets.remainingAmount)}</b> đang ở trạng thái chưa phân bổ.
        </div>
      ) : null}

      {exceedsReceipt && (
        <div
          role="alert"
          className="my-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-900"
        >
          <b>Tổng phân bổ vượt quá số chưa phân bổ của phiếu thu.</b> Tổng đang nhập:{' '}
          {formatVnd(currentTotal)} · Tối đa: {formatVnd(targets.remainingAmount)}.
        </div>
      )}

      {/* Bảng Hóa đơn điện tử thuộc cùng đơn hàng */}
      {invoices.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[740px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                <th className="px-2.5 py-2">Hóa đơn (cùng đơn {orderLabel})</th>
                <th className="px-2.5 py-2">Loại / Trạng thái</th>
                <th className="px-2.5 py-2">Ngày phát hành</th>
                <th className="px-2.5 py-2 text-right">Tổng tiền</th>
                <th className="px-2.5 py-2 text-right">Đã phân bổ</th>
                <th className="px-2.5 py-2 text-right">Còn nợ</th>
                <th className="w-44 px-2.5 py-2 text-right">Số tiền phân bổ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.map((inv) => {
                const rawVal = amounts[inv.invoiceId] ?? ''
                const numericVal = Number(rawVal || 0)
                const rowOver = numericVal > inv.outstandingAmount
                const lockedRow =
                  isOrderCancelled || targets.remainingAmount <= 0 || inv.outstandingAmount <= 0
                const otherSum = Object.entries(amounts).reduce((s, [id, v]) => {
                  if (id === inv.invoiceId) return s
                  return s + (Number(v || 0) || 0)
                }, 0)
                const fillCap = Math.max(
                  0,
                  Math.min(inv.outstandingAmount, targets.remainingAmount - otherSum),
                )

                return (
                  <tr
                    key={inv.invoiceId}
                    className={
                      rowOver
                        ? 'bg-rose-50/70'
                        : inv.outstandingAmount <= 0
                          ? 'bg-slate-50 text-slate-500'
                          : 'bg-white'
                    }
                  >
                    <td className="px-2.5 py-2.5 align-top">
                      <span className="font-mono font-semibold text-slate-900">
                        {inv.invoiceCode}
                      </span>
                      <div className="text-xs text-slate-500">
                        {inv.invoiceSymbol || 'Hóa đơn điện tử đã ký số'}
                      </div>
                      {inv.outstandingAmount <= 0 && (
                        <div className="mt-1 text-xs text-slate-500">Đã thu đủ — không còn nợ</div>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 align-top">
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Điện tử · TAX
                      </span>
                      <div className="mt-1 text-xs text-slate-500">ISSUED</div>
                    </td>
                    <td className="px-2.5 py-2.5 align-top text-xs text-slate-700">
                      {formatShortDate(inv.issueDate)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right align-top tabular-nums">
                      {formatVnd(inv.totalAmount)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right align-top tabular-nums text-slate-600">
                      {formatVnd(inv.verifiedPaidAmount)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right align-top tabular-nums">
                      <b className="text-slate-900">
                        {formatVnd(Math.max(0, inv.outstandingAmount))}
                      </b>
                      <div className="text-xs text-slate-500">
                        Hạn: {inv.dueDate ? formatShortDate(inv.dueDate) : '—'}
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 text-right align-top">
                      {lockedRow ? (
                        <input
                          type="text"
                          value="—"
                          disabled
                          aria-label="Không phân bổ được"
                          className="h-8 w-36 rounded border border-slate-200 bg-slate-100 px-2 text-right text-xs text-slate-400"
                        />
                      ) : (
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={rawVal}
                            aria-label={`Số tiền phân bổ cho ${inv.invoiceCode}`}
                            onChange={(e) =>
                              setAmounts((prev) => ({
                                ...prev,
                                [inv.invoiceId]: e.target.value.replace(/[^0-9.]/g, ''),
                              }))
                            }
                            className={`h-8 w-36 rounded border px-2 text-right text-xs tabular-nums outline-none ${
                              rowOver
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : 'border-slate-300 bg-white text-slate-900 focus:border-sky-500'
                            }`}
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() => fillMaxForInvoice(inv)}
                              className="mt-1 cursor-pointer text-xs font-semibold text-sky-700 underline hover:text-sky-900"
                            >
                              Điền tối đa {formatVnd(fillCap)}
                            </button>
                          </div>
                          {rowOver && (
                            <div className="mt-1 text-xs font-semibold text-rose-800">
                              Vượt số còn nợ của hóa đơn. Tối đa:{' '}
                              {formatVnd(inv.outstandingAmount)}.
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ô Lý do & Thanh tổng kết xác nhận phân bổ (chỉ hiện khi phiếu còn tiền và có hóa đơn còn nợ) */}
      {!isOrderCancelled && targets.remainingAmount > 0 && openInvoices.length > 0 && (
        <>
          <div className="mt-3">
            <label htmlFor="allocReason" className="mb-1 block text-[11px] font-semibold text-slate-600">
              Lý do / ghi chú phân bổ
            </label>
            <input
              id="allocReason"
              type="text"
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Phân bổ tiền thu đợt 2 theo yêu cầu đối soát của khách"
              className="h-8 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-sky-500"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="text-xs text-slate-600">
              Tổng đang phân bổ
              <b
                className={`block text-base tabular-nums ${
                  exceedsReceipt ? 'text-rose-800' : 'text-slate-900'
                }`}
              >
                {formatVnd(currentTotal)}
              </b>
            </div>
            <div className="text-xs text-slate-600">
              Chưa phân bổ của phiếu thu
              <b className="block text-base tabular-nums text-slate-900">
                {formatVnd(targets.remainingAmount)}
              </b>
            </div>
            <div className="text-xs text-slate-600">
              Còn lại sau lần phân bổ này
              <b
                className={`block text-base tabular-nums ${
                  targets.remainingAmount - currentTotal < 0 ? 'text-rose-800' : 'text-sky-700'
                }`}
              >
                {formatVnd(targets.remainingAmount - currentTotal)}
              </b>
            </div>
            <button
              type="button"
              disabled={!canPreview || allocateState.isLoading}
              onClick={() => setPreviewOpen(true)}
              className={primaryBtn}
            >
              {allocateState.isLoading ? 'Đang phân bổ…' : 'Xem lại & xác nhận phân bổ →'}
            </button>
          </div>
        </>
      )}

      {/* Lịch sử phân bổ của phiếu thu đang chọn */}
      <div className="mt-4 border-t border-slate-200 pt-3.5">
        <h3 className="text-sm font-semibold text-slate-900">Lịch sử phân bổ của phiếu thu</h3>
        {historyQuery.isLoading ? (
          <p className="mt-2 text-xs text-slate-500">Đang tải lịch sử…</p>
        ) : (historyQuery.data ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">Phiếu thu này chưa có bản ghi phân bổ.</p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100">
            {(historyQuery.data ?? []).map((line) => {
              const isActive = (line.allocationStatus ?? 'ACTIVE') === 'ACTIVE'
              const isRepointed = line.allocationType === 'REPOINTED'
              const invLabel = invoiceCodeById.get(line.invoiceId) ?? shortId(line.invoiceId)
              return (
                <div
                  key={line.allocationId}
                  className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-xs"
                >
                  <div>
                    <div>
                      <span className="font-mono font-semibold text-slate-800">
                        {shortId(line.allocationId)}
                      </span>{' '}
                      <span className="text-slate-400">→</span>{' '}
                      <strong className="font-mono text-slate-900">{invLabel}</strong>{' '}
                      {isActive ? (
                        <span className="ml-1 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                          ● Hiệu lực
                        </span>
                      ) : (
                        <span className="ml-1 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10.5px] font-semibold text-rose-800">
                          ● REVERSED
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 ${
                        !isActive ? 'text-amber-800' : 'text-slate-500'
                      }`}
                    >
                      {!isActive
                        ? `Đã thu hồi${line.reversalReason ? ` · Lý do: ${line.reversalReason}` : ''}`
                        : `${allocationTypeLabel(line.allocationType)} · ${formatDateTime(line.allocatedAt)}${line.reason ? ` · ${line.reason}` : ''}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <strong className="tabular-nums text-slate-900">
                      {formatVnd(line.allocatedAmount)}
                    </strong>
                    {isActive && (
                      <button
                        type="button"
                        disabled={isRepointed}
                        title={
                          isRepointed
                            ? 'Bản ghi được hệ thống tự động re-point sang hóa đơn thay thế'
                            : 'Thu hồi / Điều chỉnh phân bổ'
                        }
                        onClick={() =>
                          onOpenReverse({
                            receiptId: targets.receiptId,
                            receiptCode: targets.receiptCode,
                            remainingBefore: targets.remainingAmount,
                            line,
                            invoiceLabel: invLabel,
                          })
                        }
                        className={dangerSmallBtn}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Thu hồi / Điều chỉnh
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Xem lại trước khi xác nhận phân bổ */}
      {previewOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem lại trước khi xác nhận phân bổ"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Xem lại trước khi xác nhận phân bổ
            </h3>
            <p className="mt-1 text-[13px] text-slate-600">
              Kiểm tra số tiền phân bổ cho từng hóa đơn trước khi xác nhận.
            </p>

            <div className="my-3.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[11px] font-semibold text-slate-600">Phiếu thu</div>
                <div className="mt-0.5 font-mono text-[15px] font-bold text-slate-900">
                  {targets.receiptCode}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {customerLabel} · {orderLabel}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[11px] font-semibold text-slate-600">Còn dư trước phân bổ</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
                  {formatVnd(targets.remainingAmount)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[11px] font-semibold text-slate-600">Tổng lần này</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-slate-900">
                  {formatVnd(currentTotal)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-[11px] font-semibold text-slate-600">Còn dư sau phân bổ</div>
                <div className="mt-0.5 text-base font-bold tabular-nums text-sky-700">
                  {formatVnd(targets.remainingAmount - currentTotal)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {targets.remainingAmount - currentTotal > 0
                    ? 'Phần dư giữ nguyên chưa phân bổ'
                    : 'Phiếu sẽ phân bổ hết sau lần này'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="px-3 py-2">Phiếu thu → Hóa đơn</th>
                    <th className="px-3 py-2 text-right">Số tiền phân bổ</th>
                    <th className="px-3 py-2 text-right">Dư nợ trước</th>
                    <th className="px-3 py-2 text-right">Dư nợ mới sau phân bổ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedLines.map(({ invoice: inv, amount }) => {
                    const after = Math.max(0, inv.outstandingAmount - amount)
                    return (
                      <tr key={inv.invoiceId}>
                        <td className="px-3 py-2">
                          <span className="font-mono font-bold">{targets.receiptCode}</span> →{' '}
                          <span className="font-mono font-bold">{inv.invoiceCode}</span>
                          <div className="text-xs text-slate-500">
                            {inv.invoiceSymbol || 'Hóa đơn điện tử'} · Hạn{' '}
                            {inv.dueDate ? formatShortDate(inv.dueDate) : '—'}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatVnd(amount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatVnd(inv.outstandingAmount)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <b>{formatVnd(after)}</b>
                          {after === 0 && (
                            <span className="ml-1.5 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">
                              ● Trả đủ
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-slate-50 font-bold">
                    <td className="px-3 py-2">Tổng cộng</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatVnd(currentTotal)}</td>
                    <td colSpan={2} className="px-3 py-2 text-right tabular-nums">
                      Còn dư của phiếu sau lần này:{' '}
                      {formatVnd(targets.remainingAmount - currentTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-2.5 text-[13px] text-slate-600">
              <b>Lý do / ghi chú:</b>{' '}
              {reason.trim() || 'Phân bổ thủ công bởi Kế toán'}
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={allocateState.isLoading}
                onClick={() => setPreviewOpen(false)}
                className={secondaryBtn}
              >
                Quay lại sửa số tiền
              </button>
              <button
                type="button"
                disabled={allocateState.isLoading}
                onClick={() => void confirmAndSubmitAllocation()}
                className={primaryBtn}
              >
                {allocateState.isLoading ? 'Đang lập phiếu…' : 'Xác nhận phân bổ & lập phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OriginalReceiptModal({
  receipt,
  customerLabel,
  orderLabel,
  onClose,
}: {
  receipt: PaymentAllocationReceipt
  customerLabel: string
  orderLabel: string
  onClose: () => void
}) {
  const d = new Date(receipt.receivedAt)
  const dateLine = !Number.isNaN(d.getTime())
    ? `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
    : 'Ngày.... tháng.... năm....'
  const words = vnWords(receipt.receiptAmount)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem phiếu thu gốc"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Xem phiếu thu gốc</h3>
            <p className="mt-1 text-[13px] text-slate-600">
              Bản gốc của phiếu thu đúng như lúc ghi nhận khoản thu, trình bày theo Mẫu số 01-TT
              (Thông tư 133/2016/TT-BTC) — chỉ để xem, không sửa được.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="mt-3.5 rounded border border-slate-300 bg-white p-5 text-[15px] leading-relaxed text-slate-950"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          <div className="flex flex-wrap justify-between gap-4">
            <div className="min-w-[220px] flex-1">
              <div className="flex items-baseline gap-1.5">
                <b>Đơn vị:</b>
                <span className="flex-1 border-b border-dotted border-slate-600 px-1.5">
                  AquaSuite — Thám Vân Home
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <b>Địa chỉ:</b>
                <span className="flex-1 border-b border-dotted border-slate-600 px-1.5" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold">Mẫu số 01 - TT</div>
              <div className="text-[13.5px] italic">
                (Ban hành theo Thông tư số 133/2016/TT-BTC
                <br />
                ngày 26/8/2016 của Bộ Tài chính)
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div />
            <div className="text-center">
              <div className="text-xl font-bold tracking-wide">PHIẾU THU</div>
              <div className="italic">{dateLine}</div>
            </div>
            <div className="space-y-1 text-sm sm:justify-self-end">
              <div className="flex items-baseline gap-1.5">
                <span>Quyển số:</span>
                <span className="min-w-24 flex-1 border-b border-dotted border-slate-600 px-1" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span>Số:</span>
                <span className="min-w-24 flex-1 border-b border-dotted border-slate-600 px-1 font-semibold">
                  {receipt.receiptCode}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-baseline gap-1.5">
              <span>Họ và tên người nộp tiền:</span>
              <span className="flex-1 border-b border-dotted border-slate-600 px-1.5">
                {customerLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span>Lý do nộp:</span>
              <span className="flex-1 border-b border-dotted border-slate-600 px-1.5">
                Thu tiền đơn hàng {orderLabel} ({paymentMethodLabel(receipt.paymentMethod)})
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span>Số tiền:</span>
              <span className="border-b border-dotted border-slate-600 px-2 font-bold">
                {formatVnd(receipt.receiptAmount)}
              </span>
              <span>(Viết bằng chữ):</span>
              <span className="flex-1 border-b border-dotted border-slate-600 px-1.5 italic">
                {words}
              </span>
            </div>
          </div>

          <div className="mt-4 text-right italic">{dateLine}</div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-center text-sm sm:grid-cols-5">
            {[
              { role: 'Giám đốc', note: '(Ký, họ tên, đóng dấu)', name: '' },
              { role: 'Kế toán trưởng', note: '(Ký, họ tên)', name: '' },
              { role: 'Người nộp tiền', note: '(Ký, họ tên)', name: customerLabel },
              { role: 'Người lập phiếu', note: '(Ký, họ tên)', name: 'Kế toán' },
              { role: 'Thủ quỹ', note: '(Ký, họ tên)', name: '' },
            ].map((s) => (
              <div key={s.role}>
                <div className="font-bold">{s.role}</div>
                <div className="text-xs italic">{s.note}</div>
                <div className="mt-8 min-h-5 font-semibold">{s.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span>Đã nhận đủ số tiền (viết bằng chữ):</span>
            <span className="flex-1 border-b border-dotted border-slate-600 px-1.5 italic">
              {words}
            </span>
          </div>
        </div>

        <div className="mt-2.5 text-xs text-slate-600">
          Nguồn ghi nhận: {paymentSourceLabel(receipt.paymentMethod)} · Phương thức thu:{' '}
          {paymentMethodLabel(receipt.paymentMethod)} · Trạng thái: VERIFIED · Thời điểm:{' '}
          {formatDateTime(receipt.receivedAt)}
        </div>
        <div className="mt-2.5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Phiếu thu gốc được lập tại thời điểm ghi nhận khoản thu — số tiền và nội dung trên phiếu
          không thay đổi theo phân bổ.
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Đóng
          </button>
          <button type="button" onClick={onClose} className={primaryBtn}>
            Đóng &amp; quay lại phân bổ
          </button>
        </div>
      </div>
    </div>
  )
}

function ReverseAllocationDialog({
  target,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  saving,
}: {
  target: {
    receiptId: string
    receiptCode: string
    remainingBefore: number
    line: PaymentAllocationLine
    invoiceLabel: string
  }
  reason: string
  onReasonChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thu hồi / Điều chỉnh phân bổ"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h3 className="text-base font-bold text-slate-900">Thu hồi / Điều chỉnh phân bổ</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
          Bản ghi <b className="font-mono">{shortId(target.line.allocationId)}</b>: phiếu{' '}
          <span className="font-mono">{target.receiptCode}</span> → hóa đơn{' '}
          <span className="font-mono">{target.invoiceLabel}</span> ·{' '}
          <b>{formatVnd(target.line.allocatedAmount)}</b>
          <br />
          Phiếu thu hiện còn dư chưa phân bổ <b>{formatVnd(target.remainingBefore)}</b> — sau thu
          hồi sẽ thành{' '}
          <b>{formatVnd(target.remainingBefore + target.line.allocatedAmount)}</b> để phân bổ lại.
        </p>

        <div className="my-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          Khi xác nhận, bản ghi cũ chuyển sang <b>REVERSED</b>, số tiền hoàn về{' '}
          <b>dư chưa phân bổ</b> của phiếu để Kế toán phân bổ thủ công lại (hệ thống không tự FIFO
          lại).
        </div>

        <label
          htmlFor="reverseReason"
          className="mb-1 block text-[12.5px] font-bold text-slate-700"
        >
          Lý do thu hồi / điều chỉnh <span className="text-rose-700">* bắt buộc</span>
        </label>
        <input
          id="reverseReason"
          type="text"
          maxLength={1000}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Ví dụ: Phân bổ nhầm sang hóa đơn đợt 1, đúng phải là đợt 2"
          className="h-9 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-sky-500"
        />

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={saving} onClick={onClose} className={secondaryBtn}>
            Hủy
          </button>
          <button
            type="button"
            disabled={!reason.trim() || saving}
            onClick={onConfirm}
            className={primaryBtn}
          >
            {saving ? 'Đang thu hồi…' : 'Xác nhận thu hồi — tạo bản ghi đảo ngược'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VoucherSuccessModal({
  voucher,
  onClose,
  onDownload,
}: {
  voucher: CreatedVoucherState
  onClose: () => void
  onDownload: () => void
}) {
  const total = voucher.lines.reduce((s, l) => s + l.amount, 0)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phiếu phân bổ tiền thu"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="max-h-[88vh] w-full max-w-xl overflow-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="mb-3.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13.5px] font-semibold text-emerald-800">
          MSG95 — “Receipt voucher created and payments allocated successfully.”
          <br />
          <span className="font-medium">
            Phiếu thu đã được lập và phân bổ thanh toán thành công.
          </span>
        </div>

        <div className="rounded-md border-[1.5px] border-dashed border-slate-300 bg-slate-50 p-3.5">
          <h4 className="mb-2.5 text-center text-sm font-bold tracking-wide text-slate-900">
            PHIẾU PHÂN BỔ TIỀN THU · <span className="font-mono">{voucher.voucherCode}</span>
          </h4>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-dotted divide-slate-200">
              <tr>
                <td className="py-1.5 text-slate-600">Phiếu thu gốc</td>
                <td className="py-1.5 font-mono">
                  <b>{voucher.receiptCode}</b> — {paymentMethodLabel(voucher.paymentMethod)} ·{' '}
                  {paymentSourceLabel(voucher.paymentMethod)}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-600">Khách hàng / Đơn hàng</td>
                <td className="py-1.5">
                  {voucher.customerLabel} · <span className="font-mono">{voucher.orderLabel}</span>
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-600">Người lập</td>
                <td className="py-1.5">
                  {voucher.actorLabel} · {voucher.createdAtText}
                </td>
              </tr>
              <tr>
                <td className="py-1.5 text-slate-600">Lý do</td>
                <td className="py-1.5">{voucher.reason}</td>
              </tr>
            </tbody>
          </table>

          <table className="mt-2.5 w-full border-t border-slate-200 text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-500 uppercase">
                <th className="py-1.5">Mã phân bổ</th>
                <th className="py-1.5">Hóa đơn điện tử</th>
                <th className="py-1.5 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-slate-200">
              {voucher.lines.map((l, idx) => (
                <tr key={`${l.invoiceCode}-${idx}`}>
                  <td className="py-1.5 font-mono">{l.allocationCode}</td>
                  <td className="py-1.5 font-mono">{l.invoiceCode}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatVnd(l.amount)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} className="py-1.5 font-bold">
                  Tổng phân bổ lần này
                </td>
                <td className="py-1.5 text-right font-bold tabular-nums">{formatVnd(total)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-1.5 text-slate-600">
                  Số chưa phân bổ còn lại của phiếu thu
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatVnd(voucher.remainingAfter)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Đóng
          </button>
          <button type="button" onClick={onDownload} className={primaryBtn}>
            <Download className="h-3.5 w-3.5" />
            Tải phiếu phân bổ (.txt)
          </button>
        </div>
      </div>
    </div>
  )
}

function Loading({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
      {text}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
      {text}
    </div>
  )
}

function ErrorBox({ error }: { error: unknown }) {
  return (
    <p className="m-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-800">
      Không thể tải dữ liệu: {normalizeApiError(error).message}
    </p>
  )
}

function AccessDenied() {
  return (
    <main className="mx-auto mt-10 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
      <FileText className="mx-auto h-9 w-9 text-slate-400" />
      <h1 className="mt-3 font-bold text-slate-900">Chỉ dành cho Kế toán</h1>
      <p className="mt-1 text-sm text-slate-500">
        Phân bổ khoản thu vào hóa đơn là nghiệp vụ tài chính, được backend giới hạn cho vai
        trò ACCOUNTANT.
      </p>
      <Link to="/app/dashboard" className={`${secondaryBtn} mt-4`}>
        <ChevronLeft className="h-4 w-4" />
        Về bảng điều khiển
      </Link>
    </main>
  )
}
