import { z } from 'zod'

export const brandSchema = z.object({
  name: z.string().trim().min(1, 'Tên thương hiệu là bắt buộc.').max(100),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug là bắt buộc.')
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug không đúng định dạng.'),
  description: z.string().trim().max(500).optional(),
  logoUrl: z.union([z.url('URL logo không hợp lệ.'), z.literal('')]).optional(),
  active: z.boolean(),
})

export type BrandFormValues = z.infer<typeof brandSchema>

