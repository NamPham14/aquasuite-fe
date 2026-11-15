import { z } from 'zod'

/**
 * Schema kiểm tra dữ liệu đầu vào khi thêm hoặc cập nhật số lượng sản phẩm trong giỏ hàng (UC-17).
 */
export const addCartItemSchema = z.object({
  variantId: z.string().min(1, 'Mã biến thể sản phẩm không được để trống'),
  quantity: z
    .number({ message: 'Số lượng phải là số hợp lệ' })
    .int('Số lượng sản phẩm phải là số nguyên')
    .min(1, 'Số lượng tối thiểu là 1'),
})

export const updateCartItemQuantitySchema = z.object({
  quantity: z
    .number({ message: 'Số lượng phải là số hợp lệ' })
    .int('Số lượng sản phẩm phải là số nguyên')
    .min(1, 'Số lượng tối thiểu là 1'),
})

export type AddCartItemFormValues = z.infer<typeof addCartItemSchema>
export type UpdateCartItemQuantityFormValues = z.infer<typeof updateCartItemQuantitySchema>

