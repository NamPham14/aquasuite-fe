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

        {customerScope && (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <button
              type="button"
              disabled={!(record.canRequestSupport ?? (record.status === 'ACTIVE' && !isClaimed && !record.openTicketCode))}
              onClick={() => setShowClaimModal(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Wrench className="h-4 w-4" />
              Yêu cầu bảo hành thiết bị
            </button>
            {record.openTicketCode && (
              <span className="text-[11px] text-amber-700">
                Đang có yêu cầu bảo hành mở: <strong>{record.openTicketCode}</strong>
              </span>
            )}
            {isClaimed && (
              <span className="text-[11px] text-amber-700">
                Thẻ đang có yêu cầu bảo hành chưa hoàn tất — không thể gửi thêm.
              </span>
            )}
            {record.status === 'VOIDED' && (
              <span className="text-[11px] text-rose-700">
                Thẻ bảo hành đã bị vô hiệu hóa.
              </span>
            )}
          </div>
        )}

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
                  {!customerScope ? (
                    <Link to={`/app/orders/${record.orderInvoice.orderId}`} className="hover:underline">
                      {record.orderInvoice.orderCode}
                    </Link>
                  ) : (
                    record.orderInvoice.orderCode
                  )}
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
