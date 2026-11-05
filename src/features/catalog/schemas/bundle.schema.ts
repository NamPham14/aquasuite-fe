import { z } from 'zod'

export const bundleSchema = z.object({
  productCode: z.string().trim().min(1, 'Vui lòng nhập mã combo.').max(100, 'Mã tối đa 100 ký tự.'),
  name: z.string().trim().min(1, 'Vui lòng nhập tên combo.').max(255, 'Tên tối đa 255 ký tự.'),
  description: z.string().max(10000, 'Mô tả tối đa 10.000 ký tự.'),
  packagePrice: z.string().regex(/^\d{1,13}(\.\d{1,2})?$/, 'Giá tối đa 13 chữ số nguyên và 2 chữ số thập phân.').refine((value) => Number(value) > 0, 'Giá gói phải lớn hơn 0.'),
  validFrom: z.string(),
  validUntil: z.string(),
  items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int('Số lượng phải là số nguyên.').min(1, 'Số lượng tối thiểu 1.').max(10000, 'Số lượng tối đa 10.000.') })).min(1, 'Chọn ít nhất một SKU.').max(100, 'Tối đa 100 SKU.'),
}).superRefine((value, context) => {
  if (new Set(value.items.map((item) => item.variantId)).size !== value.items.length) context.addIssue({ code: 'custom', path: ['items'], message: 'Không được chọn trùng SKU.' })
  if (Boolean(value.validFrom) !== Boolean(value.validUntil)) context.addIssue({ code: 'custom', path: ['validUntil'], message: 'Nhập cả ngày bắt đầu và kết thúc, hoặc để trống cả hai.' })
  if (value.validFrom && value.validUntil && (!Number.isFinite(Date.parse(value.validFrom)) || !Number.isFinite(Date.parse(value.validUntil)) || Date.parse(value.validFrom) >= Date.parse(value.validUntil))) context.addIssue({ code: 'custom', path: ['validUntil'], message: 'Ngày kết thúc phải sau ngày bắt đầu hợp lệ.' })
})

export type BundleFormValues = z.infer<typeof bundleSchema>

export function bundleDefinition(values: BundleFormValues) {
  return { ...values, description: values.description || null,
    validFrom: values.validFrom ? new Date(values.validFrom).toISOString() : null,
    validUntil: values.validUntil ? new Date(values.validUntil).toISOString() : null }
}
