import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
  CustomerEditorialModal,
  editorialFieldClass,
} from './CustomerEditorialModal'
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
    control,
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

  useEffect(() => {
    if (claimForm?.suggestedSiteAddress) {
      setValue('siteAddress', claimForm.suggestedSiteAddress)
    }
  }, [claimForm, setValue])

  const currentDesc = useWatch({ control, name: 'issueDescription' }) || ''
  const currentAddress = useWatch({ control, name: 'siteAddress' }) || ''

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
        { duration: 6000 },
      )
      onSuccess?.(res)
      onClose()
    } catch (err: unknown) {
      const parsed = normalizeApiError(err)
      setServerError(parsed.message || 'Gửi yêu cầu bảo hành thất bại.')
    }
  }

  const todayStr = getTodayString()
  const maxDateStr = getMaxDateString()
  const canSubmit = claimForm?.canSubmit ?? true
  const isBusy = isSubmitting || isUploadingMedia
  const expiredBlocked = Boolean(claimForm?.expired) && !acknowledgeExpired

  return (
    <CustomerEditorialModal
      eyebrow="Chăm sóc hậu mãi"
      title="Yêu cầu hỗ trợ bảo hành thiết bị"
      onClose={onClose}
      closeDisabled={isBusy}
    >
      {isLoadingForm ? (
        <div className="flex flex-col items-center justify-center p-12 text-[#78736A]">
          <Loader2 className="h-7 w-7 animate-spin text-[#8C6D46]" />
          <span className="mt-2.5 text-xs">Đang tải hồ sơ thẻ bảo hành...</span>
        </div>
      ) : !claimForm ? (
        <div className="p-6 space-y-4">
          <div className="border border-[#E5B8B8] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
            Không tìm thấy dữ liệu thẻ bảo hành hoặc bạn không có quyền truy cập.
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#D6D1C7] px-4 py-2 text-xs font-medium text-[#171614] hover:border-[#171614] cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {serverError && (
            <div className="border border-[#E5B8B8] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B]">
              {serverError}
            </div>
          )}

          {!canSubmit && (
            <div className="flex items-start gap-2.5 border border-[#E5B8B8] bg-[#FEF2F2] p-4 text-xs text-[#991B1B]">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">Không thể gửi yêu cầu bảo hành</span>
                <p className="mt-0.5">{claimForm.blockedReason}</p>
              </div>
            </div>
          )}

          {claimForm.expired && (
            <div className="flex items-start gap-2.5 border border-[#E6D3B3] bg-[#FAF5EB] p-4 text-xs text-[#854D0E]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">Bảo hành đã hết hạn ({claimForm.endDate})</span>
                <p className="mt-1 leading-relaxed">
                  Thiết bị của bạn đã quá hạn bảo hành tiêu chuẩn. Bạn vẫn có thể gửi yêu cầu hỗ trợ, Showroom sẽ liên hệ trao đổi phương án và chi phí sửa chữa phù hợp.
                </p>
                <label className="mt-2.5 flex cursor-pointer items-start gap-2 font-medium text-[#171614]">
                  <input
                    type="checkbox"
                    checked={acknowledgeExpired}
                    onChange={(e) => setAcknowledgeExpired(e.target.checked)}
                    disabled={isBusy}
                    className="mt-0.5 h-3.5 w-3.5 accent-[#171614]"
                  />
                  <span>Tôi hiểu thẻ đã hết hạn và vẫn muốn gửi yêu cầu (có thể phát sinh chi phí sửa chữa).</span>
                </label>
              </div>
            </div>
          )}

          {/* Thông tin thiết bị */}
          <div className="space-y-3 border border-[#E6E2DA] bg-[#FAF9F6] p-4 text-xs">
            <div className="flex items-center gap-2 border-b border-[#E6E2DA] pb-2 font-semibold text-[#171614]">
              <ShieldCheck className="h-4 w-4 text-[#8C6D46]" />
              <span>Thông tin thiết bị &amp; thời hạn bảo hành</span>
            </div>
            <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Sản phẩm</dt>
                <dd className="mt-0.5 font-medium text-[#171614]">{claimForm.productName || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Mã thẻ bảo hành</dt>
                <dd className="mt-0.5 font-mono font-semibold text-[#171614]">{claimForm.warrantyCode}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Biến thể / SKU</dt>
                <dd className="mt-0.5 font-medium text-[#171614]">
                  {claimForm.variantName || '—'} {claimForm.sku ? `(${claimForm.sku})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Số Serial / Barcode</dt>
                <dd className="mt-0.5 font-mono font-medium text-[#171614]">
                  {claimForm.serialNumber || 'Không theo dõi serial'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Ngày kích hoạt</dt>
                <dd className="mt-0.5 font-medium text-[#171614] tabular-nums">{claimForm.startDate}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Ngày hết hạn</dt>
                <dd className={`mt-0.5 font-medium tabular-nums ${claimForm.expired ? 'font-semibold text-[#991B1B]' : 'text-[#171614]'}`}>
                  {claimForm.endDate} {claimForm.expired ? '(Đã hết hạn)' : ''}
                </dd>
              </div>
            </dl>
          </div>

          {/* Liên hệ khách hàng */}
          <div className="border border-[#E6E2DA] bg-white p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#171614]">
              <User className="h-4 w-4 text-[#8C6D46]" />
              <span>Thông tin liên hệ của bạn</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[#57534E]">
              <span>Họ tên: <strong className="text-[#171614]">{claimForm.contactName}</strong></span>
              <span>SĐT: <strong className="text-[#171614] tabular-nums">{claimForm.contactPhone}</strong></span>
              {claimForm.contactEmail && (
                <span>Email: <strong className="text-[#171614]">{claimForm.contactEmail}</strong></span>
              )}
            </div>
          </div>

          {/* Mô tả sự cố */}
          <div>
            <label htmlFor="ticket-issue-description" className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E]">
              Mô tả chi tiết sự cố / lỗi gặp phải <span className="text-[#991B1B]">*</span>
            </label>
            <textarea
              id="ticket-issue-description"
              {...register('issueDescription')}
              rows={4}
              disabled={!canSubmit || isBusy}
              placeholder="Ví dụ: Vòi rửa thông minh không kéo ra được khi bấm nút wash; đèn báo lỗi..."
              className={editorialFieldClass}
            />
            {errors.issueDescription?.message ? (
              <p className="mt-1 text-[11px] text-[#991B1B]">{errors.issueDescription.message}</p>
            ) : (
              <p className="mt-1 text-[11px] text-[#78736A]">
                Tối thiểu 10 ký tự, tối đa 2000 ký tự ({currentDesc.length}/2000).
              </p>
            )}
          </div>

          {/* Lịch hẹn */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="ticket-preferred-date" className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E]">
                Ngày hẹn mong muốn (Tùy chọn)
              </label>
              <input
                id="ticket-preferred-date"
                type="date"
                {...register('preferredDate')}
                min={todayStr}
                max={maxDateStr}
                disabled={!canSubmit || isBusy}
                className={editorialFieldClass}
              />
              {errors.preferredDate?.message ? (
                <p className="mt-1 text-[11px] text-[#991B1B]">{errors.preferredDate.message}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[#78736A]">Chọn ngày trong vòng 60 ngày tới</p>
              )}
            </div>

            <div>
              <label htmlFor="ticket-preferred-slot" className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E]">
                Khung giờ thuận tiện (Tùy chọn)
              </label>
              <select
                id="ticket-preferred-slot"
                {...register('preferredSlot')}
                disabled={!canSubmit || isBusy}
                className={editorialFieldClass}
              >
                <option value="">Linh hoạt / Bất kỳ lúc nào</option>
                <option value="MORNING">Buổi sáng (08:00 - 12:00)</option>
                <option value="AFTERNOON">Buổi chiều (13:00 - 17:00)</option>
                <option value="EVENING">Buổi tối (17:00 - 20:00)</option>
              </select>
              {errors.preferredSlot?.message && (
                <p className="mt-1 text-[11px] text-[#991B1B]">{errors.preferredSlot.message}</p>
              )}
            </div>
          </div>

          {/* Địa chỉ tiếp nhận */}
          <div>
            <label htmlFor="ticket-site-address" className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E]">
              Địa chỉ tiếp nhận sửa chữa / kiểm tra <span className="text-[#991B1B]">*</span>
            </label>
            {claimForm.customerAddresses && claimForm.customerAddresses.length > 1 && (
              <div className="my-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-[#78736A]">Chọn nhanh từ sổ địa chỉ:</span>
                {claimForm.customerAddresses.map((addr) => (
                  <button
                    key={addr}
                    type="button"
                    onClick={() => setValue('siteAddress', addr, { shouldValidate: true })}
                    className={`border px-2.5 py-0.5 text-[11px] transition-colors cursor-pointer ${
                      currentAddress === addr
                        ? 'border-[#171614] bg-[#171614] font-medium text-[#FAF9F6]'
                        : 'border-[#D6D1C7] bg-white text-[#57534E] hover:border-[#171614]'
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
              className={editorialFieldClass}
            />
            {errors.siteAddress?.message ? (
              <p className="mt-1 text-[11px] text-[#991B1B]">{errors.siteAddress.message}</p>
            ) : (
              <p className="mt-1 text-[11px] text-[#78736A]">Địa chỉ nhà hoặc công trình nơi đặt thiết bị cần hỗ trợ.</p>
            )}
          </div>

          <MediaUploader
            value={mediaList}
            onChange={setMediaList}
            onUploadingChange={setIsUploadingMedia}
            disabled={!canSubmit || isBusy}
          />

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#E6E2DA]">
            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="h-10 border border-[#D6D1C7] bg-white px-5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#57534E] hover:border-[#171614] hover:text-[#171614] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isBusy || expiredBlocked}
              className="h-10 border border-[#171614] bg-[#171614] px-6 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] cursor-pointer disabled:cursor-not-allowed"
            >
              {isUploadingMedia
                ? 'Đang tải file...'
                : isSubmitting
                  ? 'Đang gửi yêu cầu...'
                  : 'Gửi yêu cầu bảo hành'}
            </button>
          </div>
        </form>
      )}
    </CustomerEditorialModal>
  )
}
