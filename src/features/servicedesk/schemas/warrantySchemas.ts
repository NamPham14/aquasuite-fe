import { z } from 'zod'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const createWarrantyFromOrderSchema = z
  .object({
    orderId: z.string().trim().regex(UUID_REGEX, 'Vui lòng chọn đơn hàng hợp lệ.'),
    orderItemId: z.string().trim().regex(UUID_REGEX, 'Vui lòng chọn dòng sản phẩm trong đơn hàng.'),
    serialTracking: z.boolean().optional(),
    serialNumber: z
      .string()
      .trim()
      .max(255, 'Số serial không được vượt quá 255 ký tự.')
      .optional()
      .or(z.literal('')),
    startDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'Ngày kích hoạt không đúng định dạng YYYY-MM-DD.'),
  })
  .superRefine((data, ctx) => {
    if (data.serialTracking && (!data.serialNumber || data.serialNumber.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serialNumber'],
        message: 'Sản phẩm quản lý theo serial bắt buộc nhập số serial.',
      })
    }
  })

export type CreateWarrantyFromOrderValues = z.infer<typeof createWarrantyFromOrderSchema>

export const createAdHocWarrantySchema = z
  .object({
    customerId: z.string().trim().regex(UUID_REGEX, 'Vui lòng chọn khách hàng.'),
    variantId: z.string().trim().regex(UUID_REGEX, 'Vui lòng chọn sản phẩm (SKU).'),
    warrantyPolicyId: z
      .string()
      .trim()
      .regex(UUID_REGEX, 'Chính sách bảo hành không hợp lệ.')
      .optional()
      .or(z.literal('')),
    serialTracking: z.boolean().optional(),
    serialNumber: z
      .string()
      .trim()
      .max(255, 'Số serial không được vượt quá 255 ký tự.')
      .optional()
      .or(z.literal('')),
    startDate: z
      .string()
      .trim()
      .regex(DATE_REGEX, 'Ngày kích hoạt không đúng định dạng YYYY-MM-DD.'),
  })
  .superRefine((data, ctx) => {
    if (data.serialTracking && (!data.serialNumber || data.serialNumber.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serialNumber'],
        message: 'Sản phẩm quản lý theo serial bắt buộc nhập số serial.',
      })
    }
  })

export type CreateAdHocWarrantyValues = z.infer<typeof createAdHocWarrantySchema>

export const voidWarrantySchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Lý do hủy thẻ phải có ít nhất 3 ký tự.')
    .max(500, 'Lý do hủy thẻ không được vượt quá 500 ký tự.'),
})

export type VoidWarrantyValues = z.infer<typeof voidWarrantySchema>

export const warrantyPhoneFilterSchema = z
  .string()
  .trim()
  .max(20, 'Số điện thoại tìm kiếm tối đa 20 ký tự.')
  .refine((val) => val === '' || /^[0-9+\s-]+$/.test(val), {
    message: 'Số điện thoại chỉ được chứa chữ số và ký tự +, -.',
  })

