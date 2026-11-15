import { z } from 'zod'

export const createWarrantyTicketSchema = z.object({
  warrantyRecordId: z.string().min(1, 'Thiếu thông tin thẻ bảo hành'),
  issueDescription: z
    .string()
    .trim()
    .min(10, 'Mô tả sự cố phải có tối thiểu 10 ký tự.')
    .max(2000, 'Mô tả sự cố không được vượt quá 2000 ký tự.'),
  preferredDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true
      const date = new Date(val)
      if (isNaN(date.getTime())) return false

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 60)
      maxDate.setHours(23, 59, 59, 999)

      return date >= today && date <= maxDate
    }, 'Ngày hẹn phải từ hôm nay đến tối đa 60 ngày tới.'),
  preferredSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional().nullable(),
  siteAddress: z
    .string()
    .trim()
    .min(5, 'Địa chỉ xử lý phải có tối thiểu 5 ký tự.')
    .max(500, 'Địa chỉ xử lý không được vượt quá 500 ký tự.'),
})

export type CreateWarrantyTicketFormData = z.infer<typeof createWarrantyTicketSchema>

export const cancelWarrantyTicketSchema = z.object({
  reason: z.string().trim().max(500, 'Lý do hủy không được vượt quá 500 ký tự.').optional(),
})

export type CancelWarrantyTicketFormData = z.infer<typeof cancelWarrantyTicketSchema>

