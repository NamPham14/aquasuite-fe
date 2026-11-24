import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react'
import {
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../../shared/api/apiError'
import {
  useGetClaimFormQuery,
  useSubmitWarrantyTicketMutation,
} from '../api/warrantyTicketApi'
import {
  createWarrantyTicketSchema,
  type CreateWarrantyTicketFormData,
} from '../schemas/warrantyTicketSchemas'
import { MediaUploader } from './MediaUploader'
import type { PreferredSlot, TicketMedia, WarrantyTicketDetail } from '../types/warrantyTicket.types'

interface ClaimWarrantyModalProps {
  warrantyRecordId: string
  onClose: () => void
  onSuccess?: (ticket: WarrantyTicketDetail) => void
}

function getTodayString(): string {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

function getMaxDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}

export function ClaimWarrantyModal({
  warrantyRecordId,
  onClose,
  onSuccess,
}: ClaimWarrantyModalProps) {
  const { data: claimForm, isLoading: isLoadingForm } = useGetClaimFormQuery(warrantyRecordId)
  const [submitTicket, { isLoading: isSubmitting }] = useSubmitWarrantyTicketMutation()

  const [mediaList, setMediaList] = useState<TicketMedia[]>([])
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  // Xác nhận chủ động khi thẻ đã hết hạn (bắt buộc tích mới cho gửi — khớp BE SVD_033).
  const [acknowledgeExpired, setAcknowledgeExpired] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateWarrantyTicketFormData>({
    resolver: zodResolver(createWarrantyTicketSchema),
    defaultValues: {
      warrantyRecordId,
      issueDescription: '',
      preferredDate: '',
      preferredSlot: null,
      siteAddress: '',
    },
  })

  // Pre-populate address when claim form data arrives
  useEffect(() => {
    if (claimForm?.suggestedSiteAddress) {
      setValue('siteAddress', claimForm.suggestedSiteAddress)
    }
  }, [claimForm, setValue])

  const currentDesc = watch('issueDescription') || ''
  const currentAddress = watch('siteAddress') || ''

  const onSubmit = async (values: CreateWarrantyTicketFormData) => {
    if (isUploadingMedia) {
      toast.warning('Vui lòng đợi file media tải lên hoàn tất trước khi gửi.')
      return
    }

    setServerError(null)
    try {
      const res = await submitTicket({
        warrantyRecordId,
        issueDescription: values.issueDescription.trim(),
        preferredDate: values.preferredDate ? values.preferredDate : null,
        preferredSlot: values.preferredSlot as PreferredSlot | null,
        siteAddress: values.siteAddress.trim(),
        media: mediaList,
        acknowledgeExpired: claimForm?.expired ? acknowledgeExpired : undefined,
      }).unwrap()

      toast.success(
        'MSG85: Yêu cầu bảo hành đã được gửi. Cửa hàng sẽ liên hệ bạn trong vòng 4 giờ làm việc.',
        { duration: 6000 }
      )
      onSuccess?.(res)
      onClose()
    } catch (err: any) {
      const parsed = normalizeApiError(err)
      setServerError(parsed.message || 'Gửi yêu cầu bảo hành thất bại.')
    }
  }

  const todayStr = getTodayString()
  const maxDateStr = getMaxDateString()
  const canSubmit = claimForm?.canSubmit ?? true
  const isBusy = isSubmitting || isUploadingMedia
  // Thẻ hết hạn: phải tích xác nhận mới cho gửi (khớp ràng buộc BE).
  const expiredBlocked = !!claimForm?.expired && !acknowledgeExpired

  return (
    <ManagementDialog
      onClose={onClose}
      title="Yêu cầu hỗ trợ bảo hành thiết bị"
      closeDisabled={isBusy}
    >
      {isLoadingForm ? (
        <div className="flex flex-col items-center justify-center p-10 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <span className="mt-2 text-xs">Đang tải hồ sơ thẻ bảo hành...</span>
        </div>
      ) : !claimForm ? (
        <div className="p-6">
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            Không tìm thấy dữ liệu thẻ bảo hành hoặc bạn không có quyền truy cập.
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : (
        <ManagementForm
          onSubmit={handleSubmit(onSubmit)}
          onClose={onClose}
          submitLabel={
            isUploadingMedia
              ? 'Đang tải file...'
              : isSubmitting
                ? 'Đang gửi yêu cầu...'
                : 'Gửi yêu cầu bảo hành'
          }
          submitDisabled={!canSubmit || isBusy || expiredBlocked}
          closeDisabled={isBusy}
        >
          {/* Cảnh báo lỗi từ server */}
          {serverError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {serverError}
            </div>
          )}

          {/* Cảnh báo nếu thẻ bị khóa/chặn */}
          {!canSubmit && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <span className="font-semibold">Không thể gửi yêu cầu bảo hành</span>
                <p className="mt-0.5">{claimForm.blockedReason}</p>
              </div>
            </div>
          )}

          {/* Cảnh báo nếu thẻ đã hết hạn */}
          {claimForm.expired && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-semibold">Bảo hành đã hết hạn ({claimForm.endDate})</span>
                <p className="mt-0.5 text-amber-700">
                  Thiết bị của bạn đã quá hạn bảo hành tiêu chuẩn. Bạn vẫn có thể gửi yêu cầu hỗ trợ, cửa hàng sẽ liên hệ trao đổi phương án và chi phí sửa chữa phù hợp.
                </p>
                <label className="mt-2.5 flex cursor-pointer items-start gap-2 font-medium text-amber-900">
                  <input
                    type="checkbox"
                    checked={acknowledgeExpired}
                    onChange={(e) => setAcknowledgeExpired(e.target.checked)}
                    disabled={isBusy}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span>Tôi hiểu thẻ đã hết hạn và vẫn muốn gửi yêu cầu (có thể phát sinh chi phí sửa chữa).</span>
                </label>
              </div>
            </div>
          )}

          {/* Khối thông tin cố định (Read-only) */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
            <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2 font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>Thông tin thiết bị & thời hạn bảo hành</span>
            </div>
            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Sản phẩm</dt>
                <dd className="font-medium text-slate-900">{claimForm.productName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Mã thẻ bảo hành</dt>
                <dd className="font-mono font-semibold text-sky-700">{claimForm.warrantyCode}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Biến thể / SKU</dt>
                <dd className="font-medium text-slate-800">
                  {claimForm.variantName || '—'} {claimForm.sku ? `(${claimForm.sku})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Số Serial / Barcode</dt>
                <dd className="font-mono font-medium text-slate-800">
                  {claimForm.serialNumber || 'Không theo dõi serial'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngày kích hoạt</dt>
                <dd className="font-medium text-slate-800">{claimForm.startDate}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngày hết hạn</dt>
                <dd className={`font-medium ${claimForm.expired ? 'font-semibold text-rose-600' : 'text-slate-800'}`}>
                  {claimForm.endDate} {claimForm.expired ? '(Đã hết hạn)' : ''}
                </dd>
              </div>
            </dl>
          </div>

          {/* Khối thông tin liên hệ của khách */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <User className="h-4 w-4 text-slate-500" />
              <span>Thông tin liên hệ của bạn</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
              <span>Họ tên: <strong className="text-slate-800">{claimForm.contactName}</strong></span>
              <span>SĐT: <strong className="text-slate-800">{claimForm.contactPhone}</strong></span>
              {claimForm.contactEmail && (
                <span>Email: <strong className="text-slate-800">{claimForm.contactEmail}</strong></span>
              )}
            </div>
          </div>

          {/* Form input: Mô tả sự cố */}
          <ManagementFormField
            id="ticket-issue-description"
            label="Mô tả chi tiết sự cố / lỗi gặp phải *"
            error={errors.issueDescription?.message}
            hint={`Tối thiểu 10 ký tự, tối đa 2000 ký tự (${currentDesc.length}/2000).`}
          >
            <textarea
              id="ticket-issue-description"
              {...register('issueDescription')}
              rows={4}
              disabled={!canSubmit || isBusy}
              placeholder="Ví dụ: Vòi rửa thông minh không kéo ra được khi bấm nút wash; đèn đỏ nhấp nháy báo lỗi liên tục..."
              className={managementFieldClass}
            />
          </ManagementFormField>

          {/* Form input: Lịch hẹn & Khung giờ mong muốn */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ManagementFormField
              id="ticket-preferred-date"
              label="Ngày hẹn mong muốn (Tùy chọn)"
              error={errors.preferredDate?.message}
              hint="Chọn ngày trong vòng 60 ngày tới"
            >
              <input
                id="ticket-preferred-date"
                type="date"
                {...register('preferredDate')}
                min={todayStr}
                max={maxDateStr}
                disabled={!canSubmit || isBusy}
                className={managementFieldClass}
              />
            </ManagementFormField>

            <ManagementFormField
              id="ticket-preferred-slot"
              label="Khung giờ thuận tiện (Tùy chọn)"
              error={errors.preferredSlot?.message}
            >
              <select
                id="ticket-preferred-slot"
                {...register('preferredSlot')}
                disabled={!canSubmit || isBusy}
                className={managementFieldClass}
              >
                <option value="">Linh hoạt / Bất kỳ lúc nào</option>
                <option value="MORNING">Buổi sáng (08:00 - 12:00)</option>
                <option value="AFTERNOON">Buổi chiều (13:00 - 17:00)</option>
                <option value="EVENING">Buổi tối (17:00 - 20:00)</option>
              </select>
            </ManagementFormField>
          </div>

          {/* Form input: Địa chỉ xử lý */}
          <ManagementFormField
            id="ticket-site-address"
            label="Địa chỉ tiếp nhận sửa chữa / kiểm tra *"
            error={errors.siteAddress?.message}
            hint="Địa chỉ nhà hoặc công trình nơi đặt thiết bị cần hỗ trợ."
          >
            {claimForm.customerAddresses && claimForm.customerAddresses.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-slate-500">Chọn nhanh từ sổ địa chỉ:</span>
                {claimForm.customerAddresses.map((addr) => (
                  <button
                    key={addr}
                    type="button"
                    onClick={() => setValue('siteAddress', addr, { shouldValidate: true })}
                    className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
                      currentAddress === addr
                        ? 'border-sky-500 bg-sky-50 font-medium text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {addr}
                  </button>
                ))}
              </div>
            )}
            <input
              id="ticket-site-address"
              type="text"
              {...register('siteAddress')}
              disabled={!canSubmit || isBusy}
              placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
              className={managementFieldClass}
            />
          </ManagementFormField>

          {/* Upload media: Ảnh/Video */}
          <MediaUploader
            value={mediaList}
            onChange={setMediaList}
            onUploadingChange={setIsUploadingMedia}
            disabled={!canSubmit || isBusy}
          />
        </ManagementForm>
      )}
    </ManagementDialog>
  )
}
