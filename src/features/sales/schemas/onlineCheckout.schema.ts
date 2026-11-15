import { z } from 'zod'

/**
 * Schema kiểm tra dữ liệu đặt hàng trực tuyến (UC-18).
 * Lưu ý: Kênh Online không hỗ trợ công nợ (CREDIT), chỉ hỗ trợ BANK_TRANSFER (PayOS) hoặc CASH (COD).
 */
export const placeOnlineOrderSchema = z
  .object({
    addressId: z.string().trim().optional().nullable(),
    recipientName: z.string().trim().optional(),
    recipientPhone: z.string().trim().optional(),
    deliveryAddress: z.string().trim().optional(),
    deliverySchedule: z.string().trim().max(255, 'Lịch giao hàng tối đa 255 ký tự').optional(),
    note: z.string().trim().max(1000, 'Ghi chú tối đa 1000 ký tự').optional(),
    paymentMethod: z.enum(['BANK_TRANSFER', 'CASH'], {
      message: 'Đơn hàng trực tuyến chỉ hỗ trợ PayOS (BANK_TRANSFER) hoặc COD (CASH)',
    }),
  })
  .superRefine((data, ctx) => {
    const hasSavedAddress = Boolean(data.addressId && data.addressId.length > 0)
    const manualAddress = data.deliveryAddress?.trim() ?? ''

    if (!hasSavedAddress && manualAddress.length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['deliveryAddress'],
        message: 'Vui lòng chọn địa chỉ đã lưu hoặc nhập địa chỉ giao hàng tối thiểu 5 ký tự',
      })
    }
  })

export type PlaceOnlineOrderSchemaValues = z.infer<typeof placeOnlineOrderSchema>

