import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building,
  MapPin,
  Mail,
  Printer,
  GitCommit,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Package,
  FileCheck,
  Loader2,
  AlertCircle,
  CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetQuotationQuery,
  useDeleteQuotationMutation,
  useSubmitApprovalMutation,
  useApproveQuotationMutation,
  useRejectQuotationMutation,
  useSendQuotationMutation,
  useCreateRevisionMutation,
  useMarkAcceptedMutation,
  useMarkLostMutation,
  QuotationStatusBadge,
  QuotationActionDialog,
  QuotationRevisionHistoryDrawer,
  type QuotationActionType,
  type QuotationResponse,
} from '../../features/sales'
import { useAuth } from '../../features/iam/hooks/useAuth'

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { user } = useAuth()
  const isAdmin = user?.roles?.some((r) =>
    ['ADMIN', 'ROLE_ADMIN', 'SHOP_OWNER', 'ROLE_SHOP_OWNER'].includes(r.toUpperCase())
  ) ?? false

  const { data: quotationRaw, isLoading, isError, error, refetch } = useGetQuotationQuery(id as string, {
    skip: !id,
  })

  // Mutations
  const [deleteQuotation, { isLoading: isDeleting }] = useDeleteQuotationMutation()
  const [submitApproval, { isLoading: isSubmittingApproval }] = useSubmitApprovalMutation()
  const [approveQuotation, { isLoading: isApproving }] = useApproveQuotationMutation()
  const [rejectQuotation, { isLoading: isRejecting }] = useRejectQuotationMutation()
  const [sendQuotation, { isLoading: isSending }] = useSendQuotationMutation()
  const [createRevision, { isLoading: isCreatingRev }] = useCreateRevisionMutation()
  const [markAccepted, { isLoading: isAccepting }] = useMarkAcceptedMutation()
  const [markLost, { isLoading: isLosing }] = useMarkLostMutation()

  const [isRevisionDrawerOpen, setIsRevisionDrawerOpen] = useState(false)
  const [actionDialog, setActionDialog] = useState<QuotationActionType | null>(null)

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Đang tải thông tin chi tiết báo giá...</p>
      </div>
    )
  }

  if (isError || !quotationRaw) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3 text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Không tìm thấy báo giá yêu cầu</h3>
        <p className="text-xs text-slate-500 mb-4">
          {(error as any)?.data?.message || 'Báo giá này không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/quotations')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách báo giá</span>
        </button>
      </div>
    )
  }

  const quotation: QuotationResponse = (quotationRaw as any)?.data || quotationRaw

  const formatMoney = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  // Check expired
  const isExpired = quotation.validUntil && new Date(quotation.validUntil) < new Date(new Date().setHours(0, 0, 0, 0))

  const handleConfirmAction = async (noteOrReason: string) => {
    if (!actionDialog || !id) return

    try {
      if (actionDialog === 'submit_approval') {
        await submitApproval({ id, body: { approvalNote: noteOrReason } }).unwrap()
        toast.success(`Đã trình phê duyệt báo giá ${quotation.quotationCode}!`)
      } else if (actionDialog === 'approve') {
        await approveQuotation({ id, body: { approvalNote: noteOrReason } }).unwrap()
        toast.success(`Đã phê duyệt báo giá ${quotation.quotationCode}!`)
      } else if (actionDialog === 'reject') {
        await rejectQuotation({ id, body: { rejectionReason: noteOrReason } }).unwrap()
        toast.success(`Đã từ chối báo giá ${quotation.quotationCode}!`)
      } else if (actionDialog === 'send') {
        await sendQuotation(id).unwrap()
        toast.success(`Đã phát hành báo giá ${quotation.quotationCode} gửi khách hàng!`)
      } else if (actionDialog === 'mark_accepted') {
        await markAccepted({ id, body: { signedFileUrl: noteOrReason } }).unwrap()
        toast.success(`Chúc mừng! Đã chốt đơn thành công cho báo giá ${quotation.quotationCode}!`)
      } else if (actionDialog === 'mark_lost') {
        await markLost({ id, body: { lostReason: noteOrReason } }).unwrap()
        toast.success(`Đã ghi nhận mất đơn cho ${quotation.quotationCode}!`)
      } else if (actionDialog === 'create_revision') {
        const rev = await createRevision(id).unwrap()
        toast.success(`Đã tạo bản sửa đổi mới rev.${rev.revisionNo} cho mã ${quotation.quotationCode}!`)
        navigate(`/app/quotations/${rev.quotationId}`)
      } else if (actionDialog === 'delete') {
        await deleteQuotation(id).unwrap()
        toast.success(`Đã xóa vĩnh viễn báo giá ${quotation.quotationCode}!`)
        navigate('/app/quotations')
      }
      setActionDialog(null)
      refetch()
    } catch (err: any) {
      toast.error(err?.data?.message || 'Có lỗi xảy ra khi thực hiện thao tác. Vui lòng thử lại!')
    }
  }

  const grandTotal = quotation.summary?.grandTotal ?? 0
  const canEdit = quotation.status === 'DRAFT' || quotation.status === 'REJECTED'

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2 px-2 sm:px-4">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/quotations')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Danh sách</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Báo giá {quotation.quotationCode}
            </h1>
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-slate-800 text-white">
              rev.{quotation.revisionNo}
            </span>
            <QuotationStatusBadge status={quotation.status} />
            {isExpired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                <AlertTriangle className="w-3 h-3" />
                Đã hết hạn
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Lịch sử phiên bản */}
          <button
            type="button"
            onClick={() => setIsRevisionDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <GitCommit className="w-3.5 h-3.5 text-slate-500" />
            <span>Lịch sử đàm phán</span>
          </button>

          {/* In / Xuất PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In / Xuất PDF</span>
          </button>

          {/* Sửa (chỉ khi DRAFT / REJECTED) */}
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate(`/app/quotations/${quotation.quotationId}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Chỉnh sửa</span>
            </button>
          )}

          {/* Trình duyệt chiết khấu (Chỉ hiện khi chiết khấu vượt khung > 10% hoặc đơn từng bị từ chối) */}
          {canEdit && (quotation.approval?.requiresApproval || quotation.status === 'REJECTED') && (
            <button
              type="button"
              onClick={() => setActionDialog('submit_approval')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trình duyệt</span>
            </button>
          )}

          {/* Phê duyệt (Admin only) - Chỉ hiện khi đơn thực sự cần duyệt (> 10% chiết khấu) hoặc đang PENDING_APPROVAL */}
          {(quotation.status === 'PENDING_APPROVAL' || (canEdit && quotation.approval?.requiresApproval === true)) && isAdmin && (
            <button
              type="button"
              onClick={() => setActionDialog('approve')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-semibold hover:bg-sky-800 transition shadow-2xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Phê duyệt</span>
            </button>
          )}

          {/* Từ chối (Admin only) */}
          {quotation.status === 'PENDING_APPROVAL' && isAdmin && (
            <button
              type="button"
              onClick={() => setActionDialog('reject')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Từ chối</span>
            </button>
          )}

          {/* Phát hành gửi khách: Chỉ cho phép gửi khi đã DUYỆT (APPROVED), hoặc khi DRAFT mà chiết khấu <= 10% */}
          {(quotation.status === 'APPROVED' || (canEdit && quotation.approval?.requiresApproval === false)) && (
            <button
              type="button"
              onClick={() => setActionDialog('send')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Phát hành gửi khách</span>
            </button>
          )}

          {/* Tạo phiên bản đàm phán (Revision) */}
          {(quotation.status === 'SENT' || quotation.status === 'APPROVED' || quotation.status === 'LOST') && (
            <button
              type="button"
              onClick={() => setActionDialog('create_revision')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <GitCommit className="w-3.5 h-3.5 text-slate-500" />
              <span>Tạo Revision</span>
            </button>
          )}

          {/* Chốt đơn */}
          {(quotation.status === 'SENT' || quotation.status === 'APPROVED') && (
            <button
              type="button"
              onClick={() => setActionDialog('mark_accepted')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-2xs"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Chốt đơn</span>
            </button>
          )}

          {/* Mất đơn */}
          {(quotation.status === 'SENT' || quotation.status === 'APPROVED') && (
            <button
              type="button"
              onClick={() => setActionDialog('mark_lost')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Mất dự án</span>
            </button>
          )}

          {/* Xóa nháp Rev 1 */}
          {quotation.status === 'DRAFT' && quotation.revisionNo === 1 && (
            <button
              type="button"
              onClick={() => setActionDialog('delete')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area - Printable Document Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header (for Print and Display) */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-sky-800 tracking-tight">AQUASUITE</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">IMS PROJECT SALES</span>
            </div>
            <p className="text-xs text-slate-500">Hệ thống phân phối vật tư & giải pháp xử lý nước công trình</p>
          </div>
          <div className="text-right space-y-1">
            <div className="text-xs text-slate-400 uppercase font-semibold">Mã chứng từ</div>
            <div className="text-lg font-mono font-bold text-slate-900">{quotation.quotationCode}</div>
            <div className="text-xs text-slate-500">Phiên bản: rev.{quotation.revisionNo}</div>
          </div>
        </div>

        {/* Project & Partner Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-xl border border-slate-200/80">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-500" />
              <span>Thông tin Khách hàng & Công trình</span>
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="font-bold text-slate-900 text-base">{quotation.projectName}</div>
              <div className="text-slate-700 font-medium">
                Đối tác: {quotation.customerName && quotation.customerName !== 'Walk-in Retail Customer'
                  ? quotation.customerName
                  : 'Khách lẻ tại quầy'}
              </div>
              {quotation.deliveryAddress && (
                <div className="text-xs text-slate-500 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{quotation.deliveryAddress}</span>
                </div>
              )}
              {quotation.sentToEmail && (
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{quotation.sentToEmail}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Hiệu lực & Cam kết Giao hàng</span>
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Ngày lập báo giá:</span>
                <span className="font-semibold text-slate-900">{quotation.quotationDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Hạn cam kết giá:</span>
                <span className={`font-semibold ${isExpired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {quotation.validUntil || 'Không xác định'}
                  {isExpired && ' (Hết hạn)'}
                </span>
              </div>
              {quotation.deliverySchedule && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-0.5">Tiến độ giao hàng:</span>
                  <span className="font-medium text-slate-800 italic bg-white p-2 rounded border border-slate-200 block">
                    {quotation.deliverySchedule}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-700" />
              <span>Danh mục Vật tư & Thiết bị</span>
            </h3>
            <span className="text-xs text-slate-500">Tổng cộng: {quotation.items?.length ?? 0} hạng mục</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3">Mã SKU / Tên Vật Tư</th>
                  <th className="py-3 px-3 text-center w-16">ĐVT</th>
                  <th className="py-3 px-3 text-right w-20">SL</th>
                  <th className="py-3 px-3 text-right w-28">Đơn Giá</th>
                  <th className="py-3 px-3 text-right w-20">CK (%)</th>
                  <th className="py-3 px-3 text-right w-28">Giảm Trừ</th>
                  <th className="py-3 px-3 text-right w-32">Thành Tiền</th>
                  <th className="py-3 px-3 w-40 text-center">Tình Trạng Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {quotation.items?.map((item, index) => {
                  const hasBackorder = item.backorderQty !== undefined && item.backorderQty > 0

                  return (
                    <tr key={item.quotationItemId} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 text-center text-slate-400 font-medium">{index + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.sku}</div>
                        <div className="text-2xs text-slate-500">{item.variantName || '---'}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-medium">{item.unit}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-amber-700">
                        {item.discountRate > 0 ? `${item.discountRate}%` : '---'}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-500">
                        {item.discountAmount > 0 ? formatMoney(item.discountAmount) : '0 đ'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatMoney(item.lineTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {hasBackorder ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/90 whitespace-nowrap shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Thiếu {item.backorderQty} ({item.leadTimeDays ?? 7}n)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/90 whitespace-nowrap shadow-2xs">
                            <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Sẵn sàng giao</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Milestones (If any) */}
        {quotation.milestones && quotation.milestones.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-700" />
              <span>Tiến Độ Thanh Toán Theo Giai Đoạn Hợp Đồng</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {quotation.milestones.map((m, idx) => {
                const milestoneAmount = (grandTotal * m.percent) / 100

                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        Đợt {idx + 1}: {m.stageName}
                      </span>
                      <span className="text-xs font-black text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                        {m.percent}%
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-600">
                      Tương đương: <span className="font-bold text-slate-900">{formatMoney(milestoneAmount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Financial Summary & Note Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Terms & Notes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Điều khoản thương mại & Ghi chú
            </h3>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-600 leading-relaxed min-h-[140px]">
              {quotation.note ? (
                quotation.note
              ) : (
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  <li>Báo giá đã bao gồm các mức thuế và phụ phí niêm yết theo quy định.</li>
                  <li>Giá trị báo giá có hiệu lực cam kết theo thời hạn ghi trên chứng từ.</li>
                  <li>Phương thức thanh toán theo thỏa thuận hoặc các đợt ghi rõ trong hợp đồng.</li>
                </ul>
              )}
            </div>
          </div>

          {/* Totals Panel */}
          <div className="space-y-2 bg-slate-50/80 p-5 rounded-xl border border-slate-200">
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Tổng giá niêm yết:</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {formatMoney(quotation.summary?.listPriceTotal)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Tổng chiết khấu dự án:</span>
              <span className="font-semibold tabular-nums text-rose-600">
                -{formatMoney(quotation.summary?.totalDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1 border-t border-slate-200/60 pt-2">
              <span>Doanh thu thuần (Net):</span>
              <span className="font-semibold tabular-nums text-slate-800">
                {formatMoney(quotation.summary?.netAmount)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Thuế VAT ({quotation.summary?.vatRate ?? 0}%):</span>
              <span className="font-semibold tabular-nums text-slate-800">
                +{formatMoney(quotation.summary?.vatAmount)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600 py-1">
              <span>Cước vận chuyển:</span>
              <span className="font-semibold tabular-nums text-slate-800">
                +{formatMoney(quotation.summary?.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 border-t-2 border-slate-300 pt-3">
              <span>TỔNG THANH TOÁN:</span>
              <span className="text-sky-800 text-lg tabular-nums">
                {formatMoney(quotation.summary?.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* OWNER DATA SECRET WIDGET (ONLY FOR ADMIN/STORE OWNER) */}
        {isAdmin && quotation.ownerData && (
          <div className="p-5 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3 print:hidden">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-purple-700" />
              <span>Chỉ số Biên Lợi Nhuận Quản Trị (Bảo Mật Nội Bộ)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-purple-100 shadow-2xs">
                <div className="text-slate-500 text-2xs uppercase font-semibold">Tổng Giá Vốn</div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatMoney(quotation.ownerData.totalCost)}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-purple-100 shadow-2xs">
                <div className="text-slate-500 text-2xs uppercase font-semibold">Lợi Nhuận Gộp</div>
                <div className="text-sm font-bold text-emerald-600 tabular-nums">
                  {formatMoney(quotation.ownerData.grossProfit)}
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-purple-100 shadow-2xs">
                <div className="text-slate-500 text-2xs uppercase font-semibold">Tỷ Lệ Lãi Gộp</div>
                <div className="text-sm font-black text-purple-700 tabular-nums">
                  {quotation.ownerData.marginPercent ?? 0}%
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-purple-100 shadow-2xs">
                <div className="text-slate-500 text-2xs uppercase font-semibold">Margin Khi Duyệt</div>
                <div className="text-sm font-black text-slate-800 tabular-nums">
                  {quotation.ownerData.marginPercentAtApproval !== undefined
                    ? `${quotation.ownerData.marginPercentAtApproval}%`
                    : 'Chưa duyệt'}
                </div>
              </div>
            </div>
            {quotation.ownerData.approvalNote && (
              <div className="text-xs text-purple-900 bg-white/80 p-2.5 rounded border border-purple-100">
                <span className="font-bold">Ghi chú duyệt của Sếp:</span> {quotation.ownerData.approvalNote}
              </div>
            )}
          </div>
        )}

        {/* Signature Box (For Print View) */}
        <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-center text-xs">
          <div className="space-y-16">
            <div className="font-bold uppercase tracking-wider text-slate-800">ĐẠI DIỆN KHÁCH HÀNG / NHÀ THẦU</div>
            <div className="text-slate-400 italic">(Ký, ghi rõ họ tên và đóng dấu)</div>
          </div>
          <div className="space-y-16">
            <div className="font-bold uppercase tracking-wider text-slate-800">ĐẠI DIỆN AQUASUITE VIỆT NAM</div>
            <div className="text-slate-400 italic">(Ký, ghi rõ họ tên và đóng dấu)</div>
          </div>
        </div>
      </div>

      {/* Revision History Drawer */}
      <QuotationRevisionHistoryDrawer
        quotationCode={quotation.quotationCode}
        currentRevisionNo={quotation.revisionNo}
        isOpen={isRevisionDrawerOpen}
        onClose={() => setIsRevisionDrawerOpen(false)}
        onSelectRevision={(selectedId) => {
          setIsRevisionDrawerOpen(false)
          if (selectedId !== id) {
            navigate(`/app/quotations/${selectedId}`)
          }
        }}
      />

      {/* Action Dialog (Approve, Reject, Submit, Send, Mark Accepted, Mark Lost, Delete) */}
      {actionDialog && (
        <QuotationActionDialog
          type={actionDialog}
          quotationCode={quotation.quotationCode}
          onClose={() => setActionDialog(null)}
          onSubmit={handleConfirmAction}
          submitting={
            isDeleting ||
            isSubmittingApproval ||
            isApproving ||
            isRejecting ||
            isSending ||
            isCreatingRev ||
            isAccepting ||
            isLosing
          }
        />
      )}
    </div>
  )
}

