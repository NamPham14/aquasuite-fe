import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Tên danh mục là bắt buộc.').max(100),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug là bắt buộc.')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug không đúng định dạng.'),
  description: z.string().trim().max(500).optional(),
  active: z.boolean(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

