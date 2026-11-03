import { z } from 'zod'
import {
  catalogCodeSchema,
  catalogDescriptionSchema,
  catalogNameSchema,
  catalogStatusSchema,
} from './catalog.schema.ts'

/** Kiểm tra và chuẩn hóa dữ liệu form danh mục trước khi gửi API. */
export const categorySchema = z.object({
  code: catalogCodeSchema,
  name: catalogNameSchema,
  description: catalogDescriptionSchema,
  status: catalogStatusSchema,
  parentId: z.string(),
})

export type CategoryFormValues = z.input<typeof categorySchema>
export type ValidCategoryFormValues = z.output<typeof categorySchema>
