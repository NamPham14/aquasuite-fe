import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email không được để trống')
    .email('Email không đúng định dạng')
    .max(320, 'Email tối đa 320 ký tự'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .max(100, 'Mật khẩu tối đa 100 ký tự'),
})

export type LoginFormData = z.infer<typeof loginSchema>
