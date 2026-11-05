import { z } from 'zod'

export const customerLoginSchema = z.object({
  phone: z.string().trim().regex(/^0[35789][0-9]{8}$/, 'Nhập SĐT Việt Nam gồm 10 số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.'),
  password: z.string().min(1, 'Mật khẩu không được để trống')
    .max(100, 'Mật khẩu tối đa 100 ký tự')
    .refine((value) => value.trim().length > 0, 'Mật khẩu không được chỉ chứa khoảng trắng'),
})

export type CustomerLoginFormData = z.infer<typeof customerLoginSchema>
