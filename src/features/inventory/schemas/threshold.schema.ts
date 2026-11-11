import { z } from 'zod'

/**
 * Schema kiểm tra ngưỡng tồn an toàn (UC-31), khớp ràng buộc BR-04 ở backend:
 * - minimumQty bắt buộc, ≥ 0.
 * - maximumQty tùy chọn; nếu nhập thì phải ≥ minimumQty.
 * Dùng chuỗi cho ô nhập để kiểm soát trường rỗng, chuyển số khi submit.
 */
export const thresholdSchema = z
  .object({
    minimumQty: z
      .number({ error: 'Ngưỡng tối thiểu không hợp lệ' })
      .min(0, 'Ngưỡng tối thiểu phải ≥ 0'),
    maximumQty: z
      .number({ error: 'Ngưỡng tối đa không hợp lệ' })
      .min(0, 'Ngưỡng tối đa phải ≥ 0')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => data.maximumQty == null || data.maximumQty >= data.minimumQty,
    { path: ['maximumQty'], message: 'Ngưỡng tối đa phải ≥ ngưỡng tối thiểu' },
  )

export type ThresholdFormData = z.infer<typeof thresholdSchema>
