/** Phân loại loại đơn hàng */
export type OrderType = 'RETAIL' | 'PROJECT'

/** Kênh bán hàng phát sinh đơn */
export type OrderChannel = 'COUNTER' | 'POS' | 'ONLINE' | 'DIRECT_SALES'

/** Trạng thái đơn hàng (Khớp 100% OrderStatus.java Backend) */
export type OrderStatus = 'PROCESSING' | 'COMPLETED' | 'CANCELLED'

/** Trạng thái thanh toán của đơn hàng (Khớp 100% PaymentStatus.java Backend) */
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

/** Phương thức thực hiện / nhận hàng */
export type FulfillmentMethod = 'IN_STORE_PICKUP' | 'SCHEDULED_DELIVERY'

/** Toàn bộ enum hình thức thanh toán phía Backend Java */
export type BackendPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CREDIT'

/**
 * Phương thức thanh toán HỢP LỆ được phép chọn khi tạo đơn tại quầy POS (UC-21).
 * Tuyệt đối loại trừ 'CARD' ở cấp độ Type-System để không gửi lên Backend.
 */
export type AllowedPosPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CREDIT'

// =================== REQUEST DTOS ===================

export interface CreateOrderItemRequest {
  variantId: string
  quantity: number
  discountAmount?: number
}

export interface CreateComboItemRequest {
  comboId: string
  quantity: number
  discountAmount?: number
}

export interface CreateSalesOrderRequest {
  customerId?: string
  customerPhone?: string
  customerName?: string
  orderType?: OrderType
  orderChannel?: OrderChannel
  fulfillmentMethod?: FulfillmentMethod
  paymentMethod: AllowedPosPaymentMethod
  discountAmount?: number
  deliveryAddress?: string
  note?: string
  items?: CreateOrderItemRequest[]
  combos?: CreateComboItemRequest[]
}

export interface SalesOrderFilterParams {
  keyword?: string
  orderStatus?: OrderStatus
  paymentStatus?: PaymentStatus
  orderType?: OrderType
  fromDate?: string
  toDate?: string
  page?: number
  size?: number
  sort?: string
}

// =================== RESPONSE DTOS ===================

export interface SalesOrderItemResponse {
  orderItemId: string
  orderId: string
  variantId: string
  comboId?: string | null
  sku: string
  productName: string
  variantName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
}

export interface SalesOrderDisplayItemResponse {
  itemType: 'SINGLE' | 'COMBO'
  sku: string | null
  unitPrice: number | null
  discountAmount: number | null
  comboId: string | null
  productName: string
  quantity: number | null
  lineTotal: number
  item: SalesOrderItemResponse | null
  components: SalesOrderItemResponse[]
}

export interface SalesOrderMilestoneResponse {
  milestoneId: string
  stageName: string
  percent: number
  amount: number
  sortOrder: number
}

export interface SalesOrderDetailResponse {
  orderId: string
  orderCode: string
  storeInvoiceId?: string | null
  customerId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  quotationId?: string | null
  quotationCode?: string | null
  projectName?: string | null
  deliverySchedule?: string | null
  vatRate?: number | null
  shippingFee?: number | null
  depositPercent?: number | null
  depositAmount?: number | null
  creditTermDays?: number | null
  remainingDebtAmount?: number | null
  debtCondition?: string | null
  salesStaffId?: string | null
  salesStaffName?: string | null
  orderType: OrderType
  orderChannel: OrderChannel
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  orderDate: string
  dueDate?: string | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  deliveryAddress?: string | null
  note?: string | null
  createdAt: string
  updatedAt: string
  displayItems?: SalesOrderDisplayItemResponse[]
  items: SalesOrderItemResponse[]
  milestones: SalesOrderMilestoneResponse[]
}

export interface SalesOrderSummaryResponse {
  orderId: string
  orderCode: string
  customerId?: string | null
  customerName?: string | null
  customerPhone?: string | null
  quotationId?: string | null
  quotationCode?: string | null
  projectName?: string | null
  depositPercent?: number | null
  depositAmount?: number | null
  creditTermDays?: number | null
  remainingDebtAmount?: number | null
  salesStaffId?: string | null
  salesStaffName?: string | null
  orderType: OrderType
  orderChannel: OrderChannel
  orderStatus: OrderStatus
  paymentStatus: PaymentStatus
  orderDate: string
  dueDate?: string | null
  subtotal: number
  discountAmount: number
  totalAmount: number
  deliveryAddress?: string | null
  itemCount: number
  createdAt: string
}

// =================== CREDIT CONTROL (HÀO) INTEGRATION DTOS ===================

export interface CustomerDebtDetailResponse {
  customerId: string
  customerName: string
  customerPhone?: string
  creditLimit: number
  outstandingBalance: number
  overdueBalance: number
  availableCredit: number
  debtStatus: string
  isBlocked?: boolean
}

export interface CreditCheckRequest {
  orderId?: string
  orderChannel: string
  newOrderAmount: number
}

export interface CreditCheckResponse {
  customerId: string
  approved: boolean
  overrideAllowed: boolean
  debtStatus: string
  reasonCode?: string | null
  creditLimit: number
  outstandingBalance: number
  overdueBalance: number
  availableCredit: number
}

// =================== FINANCE (NAM) INTEGRATION DTOS ===================

export interface OrderPaymentSummaryResponse {
  orderId: string
  totalAmount: number
  verifiedPaid: number
  pendingAmount: number
  remaining: number
  paymentStatus: string
}
