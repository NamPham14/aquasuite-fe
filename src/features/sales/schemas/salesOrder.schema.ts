import { z } from 'zod'

export const createOrderItemSchema = z.object({
  variantId: z.string().min(1, 'Mã biến thể không được để trống'),
  quantity: z.number().min(0.001, 'Số lượng sản phẩm tối thiểu là 0.001'),
  discountAmount: z.number().min(0, 'Chiết khấu không được âm').optional().default(0),
})

export const createComboItemSchema = z.object({
  comboId: z.string().min(1, 'Mã combo không được để trống'),
  quantity: z.number().int('Số lượng combo phải là số nguyên').min(1, 'Số lượng combo tối thiểu là 1'),
  discountAmount: z.number().min(0, 'Chiết khấu không được âm').optional().default(0),
})

export const createSalesOrderSchema = z
  .object({
    customerId: z.string().optional(),
    customerPhone: z.string().optional(),
    customerName: z.string().optional(),
    orderType: z.enum(['RETAIL', 'PROJECT']).default('RETAIL'),
    orderChannel: z.enum(['COUNTER', 'POS', 'ONLINE', 'DIRECT_SALES']).default('COUNTER'),
    fulfillmentMethod: z.enum(['IN_STORE_PICKUP', 'SCHEDULED_DELIVERY']).default('IN_STORE_PICKUP'),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT']),
    discountAmount: z.number().min(0, 'Chiết khấu không được âm').optional().default(0),
    deliveryAddress: z.string().optional(),
    note: z.string().max(500, 'Ghi chú tối đa 500 ký tự').optional(),
    items: z.array(createOrderItemSchema).default([]),
    combos: z.array(createComboItemSchema).default([]),
  })
  .refine(
    (data) => (data.items && data.items.length > 0) || (data.combos && data.combos.length > 0),
    {
      message: 'Đơn hàng phải có ít nhất một sản phẩm hoặc một gói combo',
      path: ['items'],
    },
  )
  .refine(
    (data) => {
      if (data.fulfillmentMethod === 'SCHEDULED_DELIVERY') {
        return Boolean(data.deliveryAddress && data.deliveryAddress.trim().length > 0)
      }
      return true
    },
    {
      message: 'Vui lòng nhập địa chỉ nhận hàng khi chọn giao hàng theo lịch',
      path: ['deliveryAddress'],
    },
  )

export type CreateSalesOrderFormValues = z.infer<typeof createSalesOrderSchema>
