import { z } from 'zod'
import {
  catalogCodeSchema,
  catalogDescriptionSchema,
  catalogNameSchema,
  catalogStatusSchema,
} from './catalog.schema.ts'

/** Kiểm tra và chuẩn hóa dữ liệu form thương hiệu trước khi gửi API. */
export const brandSchema = z.object({
  code: catalogCodeSchema,
  name: catalogNameSchema,
  description: catalogDescriptionSchema,
  status: catalogStatusSchema,
})

export type BrandFormValues = z.input<typeof brandSchema>
export type ValidBrandFormValues = z.output<typeof brandSchema>
