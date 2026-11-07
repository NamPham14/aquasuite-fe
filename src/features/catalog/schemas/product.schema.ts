import { z } from 'zod'

export const productCodeSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập mã sản phẩm.')
  .max(100, 'Mã sản phẩm tối đa 100 ký tự.')
  .transform((val) => val.toUpperCase())
  .refine(
    (val) => /^[A-Z0-9][A-Z0-9_-]*$/.test(val),
    'Mã sản phẩm chỉ gồm chữ in hoa, số, gạch ngang và gạch dưới; bắt đầu bằng chữ hoặc số.',
  )

export const productNameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên sản phẩm.')
  .max(255, 'Tên sản phẩm tối đa 255 ký tự.')

export const productStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'DISCONTINUED', 'DELETED'])

export const productTypeSchema = z.enum(['NORMAL', 'BUNDLE'])

export const productSchema = z.object({
  productCode: productCodeSchema,
  productName: productNameSchema,
  categoryId: z.string().trim().min(1, 'Vui lòng chọn danh mục sản phẩm.'),
  brandId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  description: z
    .string()
    .trim()
    .max(5000, 'Mô tả tối đa 5.000 ký tự.')
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  productType: productTypeSchema.default('NORMAL'),
  status: productStatusSchema.default('DRAFT'),
  imageUrls: z.array(z.string().trim().url('Đường dẫn ảnh không hợp lệ (cần bắt đầu bằng http:// hoặc https://)')).default([]),
  specifications: z.record(z.string(), z.unknown()).default({}),
})

export type ProductFormValues = z.input<typeof productSchema>
export type ValidProductFormValues = z.output<typeof productSchema>

