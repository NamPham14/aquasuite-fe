import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Calendar,
  FileText,
  MapPin,
  Package,
  ShieldAlert,
  ShieldCheck,
  User,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { normalizeApiError } from '../../shared/api/apiError'
import {
  useGetMyWarrantyRecordByIdQuery,
  useGetWarrantyRecordByIdQuery,
} from '../../features/servicedesk/api/warrantyApi'
import { WarrantyStatusBadge } from '../../features/servicedesk/components/WarrantyStatusBadge'
import { VoidWarrantyModal } from '../../features/servicedesk/components/VoidWarrantyModal'
import { ClaimWarrantyModal } from '../../features/servicedesk/components/ClaimWarrantyModal'
import { formatVnd } from '../../shared/lib/money'

export function WarrantyRecordDetailPage({ customerScope = false }: { customerScope?: boolean }) {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const canVoid = !customerScope && roles.includes('SHOP_OWNER')

  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)

  const staffQuery = useGetWarrantyRecordByIdQuery(id, { skip: customerScope || !id })
  const customerQuery = useGetMyWarrantyRecordByIdQuery(id, { skip: !customerScope || !id })
  const activeQuery = customerScope ? customerQuery : staffQuery

  const record = activeQuery.data
  const backPath = customerScope ? '/profile/warranties' : '/app/warranty-records'

  if (customerScope) {
    if (activeQuery.isLoading) {
      return (
        <div className="max-w-6xl mx-auto border border-[#E6E2DA] bg-white p-14 text-center text-xs text-[#78736A]">
          Đang tải hồ sơ thẻ bảo hành...
        </div>
      )
    }

    if (activeQuery.error || !record) {
      const message = activeQuery.error
        ? normalizeApiError(activeQuery.error).message
        : 'Không tìm thấy thông tin thẻ bảo hành.'
      return (
        <div className="max-w-4xl mx-auto space-y-5">
          <Link
            to={backPath}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại danh sách</span>
          </Link>
          <div role="alert" className="border border-[#E5B8B8] bg-[#FEF2F2] p-6 text-xs text-[#991B1B]">
            {message}
          </div>
        </div>
      )
    }

    const isClaimed = record.displayStatus === 'CLAIMED'
    const canSubmitClaim =
      record.canRequestSupport ??
      (record.status === 'ACTIVE' && !isClaimed && !record.openTicketCode)

    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Dossier Bảo hành */}
        <div className="flex flex-col justify-between gap-5 border border-[#E6E2DA] bg-white p-6 sm:p-8 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <Link
              to={backPath}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại bảo hành của tôi</span>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#8C6D46]" />
              <h1 className="font-editorial text-2xl sm:text-3xl font-normal text-[#171614] font-mono">
                {record.warrantyCode}
              </h1>
              <WarrantyStatusBadge status={record.displayStatus} tone="editorial" />
            </div>
            <p className="text-xs text-[#6B6760]">
              Thời hạn: <strong className="text-[#171614]">{record.warrantyMonths} tháng</strong> &middot; Còn lại:{' '}
              <strong className="text-[#171614] tabular-nums">{record.remainingDays} ngày</strong>
            </p>
          </div>

          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <button
              type="button"
              disabled={!canSubmitClaim}
              onClick={() => setShowClaimModal(true)}
              className="inline-flex h-11 items-center gap-2 border border-[#171614] bg-[#171614] px-5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:cursor-not-allowed disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] transition-colors cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5 text-[#C5B091]" />
              <span>Yêu cầu bảo hành thiết bị</span>
            </button>
            {record.openTicketCode && (
              <span className="text-[11px] text-[#854D0E]">
                Đang có yêu cầu bảo hành mở: <strong className="font-mono">{record.openTicketCode}</strong>
              </span>
            )}
            {isClaimed && (
              <span className="text-[11px] text-[#854D0E]">
                Thẻ đang có yêu cầu bảo hành chưa hoàn tất &mdash; không thể gửi thêm.
              </span>
            )}
            {record.status === 'VOIDED' && (
              <span className="text-[11px] text-[#991B1B]">
                Thẻ bảo hành đã bị vô hiệu hóa.
              </span>
            )}
          </div>
        </div>

        {record.status === 'VOIDED' && (
          <div className="flex items-start gap-3 border border-[#E5B8B8] bg-[#FEF2F2] p-5 text-xs text-[#991B1B]">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <div className="font-semibold">Thẻ bảo hành này đã bị hủy</div>
              <p>Lý do: {record.voidReason || 'Không có lý do ghi nhận'}</p>
              {record.voidedAt && <p className="text-[11px] opacity-80">Thời điểm hủy: {record.voidedAt}</p>}
            </div>
          </div>
        )}

        {/* Grid chi tiết */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="space-y-4 border border-[#E6E2DA] bg-white p-6">
            <h2 className="flex items-center gap-2 border-b border-[#E6E2DA] pb-3.5 font-editorial text-lg font-normal text-[#171614]">
              <Package className="h-4 w-4 text-[#8C6D46]" />
              <span>Sản phẩm &amp; Chính sách bảo hành</span>
            </h2>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Sản phẩm</dt>
                <dd className="mt-1 font-medium text-[#171614]">{record.productName || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Biến thể / SKU</dt>
                <dd className="mt-1 font-medium text-[#171614]">
                  {record.variantName || '—'} ({record.sku || '—'})
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Số Serial / Barcode</dt>
                <dd className="mt-1 font-mono font-medium text-[#171614]">
                  {record.serialNumber || 'Không áp dụng theo dõi serial'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Chính sách áp dụng</dt>
                <dd className="mt-1 font-medium text-[#171614]">
                  {record.policyName ? `${record.policyCode} - ${record.policyName}` : `${record.warrantyMonths} tháng`}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Ngày kích hoạt</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-medium text-[#171614] tabular-nums">
                  <Calendar className="h-3.5 w-3.5 text-[#8C6D46]" />
                  <span>{record.startDate}</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Ngày hết hạn</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-medium text-[#171614] tabular-nums">
                  <Calendar className="h-3.5 w-3.5 text-[#8C6D46]" />
                  <span>{record.endDate}</span>
                </dd>
              </div>
            </dl>
            <div className="border-t border-[#E6E2DA] bg-[#FAF9F6] p-4 text-xs">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#171614]">
                Điều khoản bảo hành
              </div>
              <p className="mt-1.5 whitespace-pre-line text-[#57534E] leading-relaxed">
                {record.warrantyTerms || 'Không có điều khoản bổ sung.'}
              </p>
            </div>
          </section>

          <section className="space-y-4 border border-[#E6E2DA] bg-white p-6">
            <h2 className="flex items-center gap-2 border-b border-[#E6E2DA] pb-3.5 font-editorial text-lg font-normal text-[#171614]">
              <User className="h-4 w-4 text-[#8C6D46]" />
              <span>Khách hàng &amp; Địa điểm lắp đặt</span>
            </h2>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Tên khách hàng</dt>
                <dd className="mt-1 font-medium text-[#171614]">{record.customerName || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Mã khách hàng</dt>
                <dd className="mt-1 font-medium font-mono text-[#171614]">{record.customerCode || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Số điện thoại</dt>
                <dd className="mt-1 font-medium text-[#171614] tabular-nums">{record.phoneNumber || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Email</dt>
                <dd className="mt-1 font-medium text-[#171614]">{record.customerEmail || '—'}</dd>
              </div>
            </dl>
            <div className="border-t border-[#E6E2DA] bg-[#FAF9F6] p-4 text-xs">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] font-semibold text-[#171614]">
                <MapPin className="h-3.5 w-3.5 text-[#8C6D46]" />
                <span>Địa chỉ lắp đặt / giao hàng</span>
              </div>
              <p className="mt-1.5 text-[#57534E]">
                {record.installationAddress || 'Chưa có thông tin địa chỉ lắp đặt.'}
              </p>
            </div>
          </section>

          <section className="space-y-4 border border-[#E6E2DA] bg-white p-6 lg:col-span-2">
            <h2 className="flex items-center gap-2 border-b border-[#E6E2DA] pb-3.5 font-editorial text-lg font-normal text-[#171614]">
              <FileText className="h-4 w-4 text-[#8C6D46]" />
              <span>Chứng từ đơn hàng, Hóa đơn &amp; Giao hàng</span>
            </h2>
            {record.orderInvoice ? (
              <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Mã đơn hàng</dt>
                  <dd className="mt-1 font-semibold font-mono text-[#171614]">
                    {record.orderInvoice.orderCode}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Trạng thái đơn / Thanh toán</dt>
                  <dd className="mt-1 font-medium text-[#171614]">
                    {record.orderInvoice.orderStatus} &middot; {record.orderInvoice.paymentStatus}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Mã hóa đơn</dt>
                  <dd className="mt-1 font-medium text-[#171614]">
                    {record.orderInvoice.invoiceCode || 'Chưa xuất hóa đơn'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-[#78736A]">Giá trị hóa đơn</dt>
                  <dd className="mt-1 font-medium text-[#171614] tabular-nums">
                    {record.orderInvoice.invoiceTotalAmount != null
                      ? formatVnd(record.orderInvoice.invoiceTotalAmount)
                      : '—'}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-[#6B6760]">Thẻ bảo hành cấp lẻ (không gắn đơn bán hàng).</p>
            )}

            <div className="border-t border-[#E6E2DA] pt-3.5 text-xs">
              <div className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#171614]">
                Biên bản giao hàng
              </div>
              {record.deliveryNote ? (
                <p className="mt-1 text-[#57534E]">
                  Phiếu giao: <strong className="font-mono text-[#171614]">{record.deliveryNote.deliveryCode}</strong> ({record.deliveryNote.status})
                </p>
              ) : (
                <p className="mt-1 text-[#78736A]">Chưa có biên bản giao hàng đính kèm.</p>
              )}
            </div>
          </section>
        </div>

        {showClaimModal && (
          <ClaimWarrantyModal
            warrantyRecordId={record.warrantyRecordId}
            onClose={() => setShowClaimModal(false)}
            onSuccess={() => {
              activeQuery.refetch()
            }}
          />
        )}
      </div>
    )
  }

  if (activeQuery.isLoading) {
    return (
      <div className="rounded-card border border-aqs-border bg-aqs-surface p-8 text-center text-sm text-aqs-ink-muted">
        Đang tải hồ sơ thẻ bảo hành...
      </div>
    )
  }

  if (activeQuery.error || !record) {
    const message = activeQuery.error
      ? normalizeApiError(activeQuery.error).message
      : 'Không tìm thấy thông tin thẻ bảo hành.'
    return (
      <div className="space-y-4">
        <Link
          to={backPath}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-aqs-accent hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Link>
        <div role="alert" className="rounded-card border border-aqs-danger-border bg-aqs-danger-soft p-6 text-sm text-aqs-danger">
          {message}
        </div>
      </div>
    )
  }

  const isClaimed = record.displayStatus === 'CLAIMED'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-card border border-aqs-border bg-aqs-surface p-5 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <Link
            to={backPath}
            className="inline-flex items-center gap-1 text-xs font-medium text-aqs-ink-muted hover:text-aqs-accent"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại danh sách thẻ bảo hành
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-aqs-accent" />
            <h1 className="text-xl font-bold text-aqs-ink">{record.warrantyCode}</h1>
            <WarrantyStatusBadge status={record.displayStatus} />
          </div>
          <p className="text-xs text-aqs-ink-muted">
            Thời hạn: <strong className="text-aqs-ink">{record.warrantyMonths} tháng</strong> • Còn lại:{' '}
            <strong className="text-aqs-ink">{record.remainingDays} ngày</strong>
          </p>
        </div>

        {canVoid && record.status === 'ACTIVE' && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <button
              type="button"
              disabled={isClaimed}
              onClick={() => setShowVoidModal(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              Hủy thẻ bảo hành
            </button>
            {isClaimed && (
              <span className="text-[11px] text-amber-700">
                Đang có yêu cầu bảo hành chưa hoàn tất — không thể hủy thẻ.
              </span>
            )}
          </div>
        )}
      </div>

      {record.status === 'VOIDED' && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <div className="font-semibold">Thẻ bảo hành này đã bị hủy</div>
            <p className="mt-0.5">Lý do: {record.voidReason || 'Không có lý do ghi nhận'}</p>
            {record.voidedAt && <p className="mt-0.5 text-[11px] text-rose-600">Thời điểm hủy: {record.voidedAt}</p>}
          </div>
        </div>
      )}

      {/* Main dossier grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Product & Policy */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            <Package className="h-4 w-4 text-sky-600" />
            Sản phẩm & Chính sách bảo hành
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Sản phẩm</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{record.productName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Biến thể / SKU</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {record.variantName || '—'} ({record.sku || '—'})
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Số Serial / Barcode</dt>
              <dd className="mt-0.5 font-mono font-medium text-slate-900">
                {record.serialNumber || 'Không áp dụng theo dõi serial'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Chính sách áp dụng</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {record.policyName ? `${record.policyCode} - ${record.policyName}` : `${record.warrantyMonths} tháng`}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Ngày kích hoạt</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium text-slate-900">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {record.startDate}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Ngày hết hạn</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium text-slate-900">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                {record.endDate}
              </dd>
            </div>
          </dl>
          <div className="rounded-lg bg-slate-50 p-3 text-xs">
            <div className="font-semibold text-slate-700">Điều khoản bảo hành</div>
            <p className="mt-1 whitespace-pre-line text-slate-600">
              {record.warrantyTerms || 'Không có điều khoản bổ sung.'}
            </p>
          </div>
        </section>

        {/* Customer & Installation site */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            <User className="h-4 w-4 text-sky-600" />
            Khách hàng & Địa điểm lắp đặt
          </h2>
          <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Tên khách hàng</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{record.customerName || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Mã khách hàng</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{record.customerCode || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Số điện thoại</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{record.phoneNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{record.customerEmail || '—'}</dd>
            </div>
          </dl>
          <div className="rounded-lg bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              Địa chỉ lắp đặt / giao hàng
            </div>
            <p className="mt-1 text-slate-600">{record.installationAddress || 'Chưa có thông tin địa chỉ lắp đặt.'}</p>
          </div>
        </section>

        {/* Order & Invoice & Delivery */}
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-sky-600" />
            Chứng từ đơn hàng, Hóa đơn & Giao hàng
          </h2>
          {record.orderInvoice ? (
            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Mã đơn hàng</dt>
                <dd className="mt-0.5 font-semibold text-sky-700">
                  <Link to={`/app/orders/${record.orderInvoice.orderId}`} className="hover:underline">
                    {record.orderInvoice.orderCode}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Trạng thái đơn / Thanh toán</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {record.orderInvoice.orderStatus} • {record.orderInvoice.paymentStatus}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Mã hóa đơn</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{record.orderInvoice.invoiceCode || 'Chưa xuất hóa đơn'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Giá trị hóa đơn</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {record.orderInvoice.invoiceTotalAmount != null
                    ? formatVnd(record.orderInvoice.invoiceTotalAmount)
                    : '—'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-slate-500">Thẻ bảo hành cấp lẻ (không gắn đơn bán hàng).</p>
          )}

          <div className="border-t border-slate-100 pt-3 text-xs">
            <div className="font-semibold text-slate-700">Biên bản giao hàng</div>
            {record.deliveryNote ? (
              <p className="mt-1 text-slate-600">
                Phiếu giao: <strong>{record.deliveryNote.deliveryCode}</strong> ({record.deliveryNote.status})
              </p>
            ) : (
              <p className="mt-1 text-slate-500">Chưa có biên bản giao hàng đính kèm.</p>
            )}
          </div>
        </section>
      </div>

      {showVoidModal && (
        <VoidWarrantyModal
          warrantyRecordId={record.warrantyRecordId}
          warrantyCode={record.warrantyCode}
          onClose={() => setShowVoidModal(false)}
        />
      )}
    </div>
  )
}
