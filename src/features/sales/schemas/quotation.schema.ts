import { z } from 'zod'

export const quotationItemSchema = z.object({
  variantId: z.string().min(1, 'Vui lòng chọn sản phẩm.'),
  quantity: z.number().positive('Số lượng phải lớn hơn 0.'),
  discountRate: z.number().min(0, 'Chiết khấu tối thiểu là 0%').max(100, 'Chiết khấu tối đa là 100%').default(0),
})

export const paymentMilestoneSchema = z.object({
  stageName: z.string().trim().min(1, 'Tên đợt thanh toán là bắt buộc.'),
  percent: z.number().min(0.01, 'Tỷ lệ thanh toán phải lớn hơn 0%').max(100, 'Tỷ lệ thanh toán tối đa 100%'),
  sortOrder: z.number().optional(),
})

export const quotationSchema = z
  .object({
    projectName: z.string().trim().min(1, 'Tên dự án là bắt buộc.').max(255, 'Tên dự án tối đa 255 ký tự.'),
    customerId: z.string().trim().min(1, 'Khách hàng / Nhà mua hàng là bắt buộc.'),
    deliveryAddress: z.string().trim().max(500, 'Địa chỉ nhận hàng tối đa 500 ký tự.').optional().or(z.literal('')),
    deliverySchedule: z.string().trim().max(500, 'Tiến độ giao hàng tối đa 500 ký tự.').optional().or(z.literal('')),
    sentToEmail: z
      .string()
      .trim()
      .email('Email nhận hàng không đúng định dạng.')
      .optional()
      .or(z.literal('')),
    validUntil: z.string().optional().or(z.literal('')),
    vatRate: z.number().refine((val) => [0, 5, 8, 10].includes(val), {
      message: 'Thuế GTGT (VAT) chỉ được là 0%, 5%, 8% hoặc 10%.',
    }),
    shippingFee: z.number().min(0, 'Phí vận chuyển phải lớn hơn hoặc bằng 0.'),
    note: z.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự.').optional().or(z.literal('')),
    depositPercent: z.number().min(0).max(100).optional(),
    depositAmount: z.number().min(0).optional(),
    creditTermDays: z.number().int().min(0).max(365).optional(),
    remainingDebtAmount: z.number().min(0).optional(),
    debtCondition: z.string().trim().max(1000).optional().or(z.literal('')),
    items: z.array(quotationItemSchema).default([]),
    milestones: z.array(paymentMilestoneSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.milestones && data.milestones.length > 0) {
      const totalPercent = data.milestones.reduce((acc, curr) => acc + (curr.percent || 0), 0)
      if (Math.abs(totalPercent - 100) > 0.05) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tổng tỷ lệ các đợt thanh toán phải bằng 100% (Hiện tại: ${totalPercent.toFixed(1)}%).`,
          path: ['milestones'],
        })
      }
    }
  })

export type QuotationFormValues = z.infer<typeof quotationSchema>
export type QuotationItemFormValues = z.infer<typeof quotationItemSchema>
export type PaymentMilestoneFormValues = z.infer<typeof paymentMilestoneSchema>

