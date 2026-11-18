import { baseApi } from '../../../shared/api/baseApi.ts'
import type { CartItemResponse, CartResponse } from '../types/cart.types.ts'
import type {
  CustomerAddressDto,
  OnlineCheckoutPreviewResponse,
  OnlineOrderCheckoutResponse,
  OnlineOrderItemResponse,
  PayosPaymentLinkResponse,
  PlaceOnlineOrderRequest,
} from '../types/onlineCheckout.types.ts'

function normalizeCartItem(raw: Record<string, unknown>): CartItemResponse {
  return {
    cartItemId: String(raw.cartItemId ?? ''),
    variantId: String(raw.variantId ?? ''),
    productId: raw.productId ? String(raw.productId) : null,
    sku: String(raw.sku ?? ''),
    productName: String(raw.productName ?? ''),
    variantName: String(raw.variantName ?? ''),
    unit: String(raw.unit ?? ''),
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unitPrice ?? 0),
    currentSellingPrice: Number(raw.currentSellingPrice ?? raw.unitPrice ?? 0),
    lineTotal: Number(raw.lineTotal ?? 0),
    availableQty: Number(raw.availableQty ?? 0),
    variantStatus: String(raw.variantStatus ?? 'ACTIVE'),
    inStock: Boolean(raw.inStock ?? true),
    priceChanged: Boolean(raw.priceChanged ?? false),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCart(payload: any): CartResponse {
  const raw = payload ?? {}
  const rawItems = Array.isArray(raw.items) ? raw.items : []
  return {
    customerId: String(raw.customerId ?? ''),
    items: rawItems.map(normalizeCartItem),
    totalItems: Number(raw.totalItems ?? rawItems.length ?? 0),
    totalQuantity: Number(raw.totalQuantity ?? 0),
    subtotal: Number(raw.subtotal ?? 0),
    hasInvalidItems: Boolean(raw.hasInvalidItems ?? false),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeAddress(raw: any): CustomerAddressDto {
  return {
    addressId: String(raw?.addressId ?? ''),
    customerId: String(raw?.customerId ?? ''),
    recipientName: String(raw?.recipientName ?? ''),
    phone: String(raw?.phone ?? ''),
    province: raw?.province ? String(raw.province) : null,
    district: raw?.district ? String(raw.district) : null,
    ward: raw?.ward ? String(raw.ward) : null,
    streetAddress: raw?.streetAddress ? String(raw.streetAddress) : null,
    addressText: String(raw?.addressText ?? ''),
    label: raw?.label ? String(raw.label) : null,
    isDefault: Boolean(raw?.isDefault ?? false),
    createdAt: raw?.createdAt ? String(raw.createdAt) : null,
    updatedAt: raw?.updatedAt ? String(raw.updatedAt) : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCheckoutPreviewResponse(res: any): OnlineCheckoutPreviewResponse {
  const payload = res?.data ?? res ?? {}
  const savedAddresses = Array.isArray(payload.savedAddresses)
    ? payload.savedAddresses.map(normalizeAddress)
    : []
  return {
    cart: normalizeCart(payload.cart),
    savedAddresses,
    defaultAddress: payload.defaultAddress ? normalizeAddress(payload.defaultAddress) : null,
    shippingFee: Number(payload.shippingFee ?? 0),
    grandTotal: Number(payload.grandTotal ?? payload.cart?.subtotal ?? 0),
    payosConfigured: Boolean(payload.payosConfigured ?? false),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOrderItem(raw: any): OnlineOrderItemResponse {
  return {
    orderItemId: String(raw?.orderItemId ?? ''),
    orderId: String(raw?.orderId ?? ''),
    variantId: raw?.variantId ? String(raw.variantId) : null,
    comboId: raw?.comboId ? String(raw.comboId) : null,
    sku: String(raw?.sku ?? ''),
    productName: String(raw?.productName ?? ''),
    variantName: String(raw?.variantName ?? ''),
    quantity: Number(raw?.quantity ?? 0),
    unitPrice: Number(raw?.unitPrice ?? 0),
    discountAmount: Number(raw?.discountAmount ?? 0),
    lineTotal: Number(raw?.lineTotal ?? 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePayosPayment(raw: any): PayosPaymentLinkResponse | null {
  if (!raw) return null
  return {
    payosOrderCode: Number(raw.payosOrderCode ?? 0),
    paymentLinkId: String(raw.paymentLinkId ?? ''),
    checkoutUrl: String(raw.checkoutUrl ?? ''),
    qrCode: String(raw.qrCode ?? ''),
    bin: raw.bin ? String(raw.bin) : null,
    accountNumber: raw.accountNumber ? String(raw.accountNumber) : null,
    accountName: raw.accountName ? String(raw.accountName) : null,
    amount: Number(raw.amount ?? 0),
    amountPaid: Number(raw.amountPaid ?? 0),
    description: String(raw.description ?? ''),
    status: String(raw.status ?? 'PENDING'),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeOnlineOrderCheckoutResponse(res: any): OnlineOrderCheckoutResponse {
  const payload = res?.data ?? res ?? {}
  const items = Array.isArray(payload.items) ? payload.items.map(normalizeOrderItem) : []
  return {
    orderId: String(payload.orderId ?? ''),
    orderCode: String(payload.orderCode ?? ''),
    customerId: String(payload.customerId ?? ''),
    orderChannel: String(payload.orderChannel ?? 'ONLINE'),
    orderType: String(payload.orderType ?? 'RETAIL'),
    orderStatus: String(payload.orderStatus ?? 'PENDING_CONFIRMATION'),
    paymentStatus: String(payload.paymentStatus ?? 'UNPAID'),
    paymentMethod: String(payload.paymentMethod ?? 'CASH'),
    subtotal: Number(payload.subtotal ?? 0),
    shippingFee: Number(payload.shippingFee ?? 0),
    totalAmount: Number(payload.totalAmount ?? 0),
    deliveryAddress: String(payload.deliveryAddress ?? ''),
    deliverySchedule: payload.deliverySchedule ? String(payload.deliverySchedule) : null,
    note: payload.note ? String(payload.note) : null,
    createdAt: String(payload.createdAt ?? ''),
    items,
    payosPayment: normalizePayosPayment(payload.payosPayment),
  }
}

export const onlineCheckoutApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyOnlineOrders: build.query<OnlineOrderCheckoutResponse[], void>({
      query: () => '/sales/online-orders',
      transformResponse: (res: unknown): OnlineOrderCheckoutResponse[] => {
        const raw = (res as { data?: unknown })?.data ?? res
        if (!Array.isArray(raw)) return []
        return raw.map((item) => normalizeOnlineOrderCheckoutResponse({ data: item }))
      },
      providesTags: ['OnlineOrder'],
    }),
    getCheckoutPreview: build.query<OnlineCheckoutPreviewResponse, void>({
      query: () => '/sales/online-orders/checkout-preview',
      transformResponse: normalizeCheckoutPreviewResponse,
      providesTags: ['OnlineOrder', 'Cart'],
    }),
    placeOnlineOrder: build.mutation<OnlineOrderCheckoutResponse, PlaceOnlineOrderRequest>({
      query: (body) => ({
        url: '/sales/online-orders',
        method: 'POST',
        body,
      }),
      transformResponse: normalizeOnlineOrderCheckoutResponse,
      invalidatesTags: ['Cart', 'OnlineOrder'],
    }),
    getOnlineOrderDetail: build.query<OnlineOrderCheckoutResponse, string>({
      query: (orderId) => `/sales/online-orders/${orderId}`,
      transformResponse: normalizeOnlineOrderCheckoutResponse,
      providesTags: ['OnlineOrder'],
    }),
    verifyPayosPayment: build.mutation<OnlineOrderCheckoutResponse, string>({
      query: (orderId) => ({
        url: `/sales/online-orders/${orderId}/payos/verify`,
        method: 'POST',
      }),
      transformResponse: normalizeOnlineOrderCheckoutResponse,
      invalidatesTags: ['OnlineOrder'],
    }),
    createOrRefreshPayosPaymentLink: build.mutation<OnlineOrderCheckoutResponse, string>({
      query: (orderId) => ({
        url: `/sales/online-orders/${orderId}/payos/payment-link`,
        method: 'POST',
      }),
      transformResponse: normalizeOnlineOrderCheckoutResponse,
      invalidatesTags: ['OnlineOrder'],
    }),
  }),
})

export const {
  useGetMyOnlineOrdersQuery,
  useGetCheckoutPreviewQuery,
  usePlaceOnlineOrderMutation,
  useGetOnlineOrderDetailQuery,
  useVerifyPayosPaymentMutation,
  useCreateOrRefreshPayosPaymentLinkMutation,
} = onlineCheckoutApi

