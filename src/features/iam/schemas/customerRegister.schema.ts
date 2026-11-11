import { z } from 'zod'

export const customerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Họ tên cần ít nhất 2 ký tự.').max(50, 'Họ tên tối đa 50 ký tự.'),
  email: z.string().trim().email('Email không hợp lệ.').max(320),
  phone: z.string().trim().regex(/^0[35789][0-9]{8}$/, 'Nhập số điện thoại Việt Nam gồm 10 chữ số.'),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.').max(72)
    .refine(value => /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9\s]/.test(value), 'Cần chữ hoa, chữ thường, số và ký tự đặc biệt.')
    .refine(value => new TextEncoder().encode(value).length <= 72, 'Mật khẩu tối đa 72 byte UTF-8.'),
  passwordConfirmation: z.string(),
  termsAccepted: z.boolean().refine(value => value, 'Bạn cần đồng ý điều khoản để đăng ký.'),
}).refine(value => value.password === value.passwordConfirmation, { path: ['passwordConfirmation'], message: 'Mật khẩu xác nhận không khớp.' })

export const registrationOtpSchema = z.string().regex(/^[0-9]{6}$/, 'Mã OTP gồm 6 chữ số.')
export type CustomerRegisterData = z.infer<typeof customerRegisterSchema>
