import { baseApi } from '../../../shared/api/baseApi.ts'
import type {
  AddCartItemRequest,
  CartItemResponse,
  CartResponse,
  UpdateCartItemQuantityRequest,
} from '../types/cart.types.ts'

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
function normalizeCartResponse(res: any): CartResponse {
  const payload = res?.data ?? res ?? {}
  const rawItems = Array.isArray(payload.items) ? payload.items : []
  return {
    customerId: String(payload.customerId ?? ''),
    items: rawItems.map((item: Record<string, unknown>) => normalizeCartItem(item)),
    totalItems: Number(payload.totalItems ?? rawItems.length),
    totalQuantity: Number(payload.totalQuantity ?? 0),
    subtotal: Number(payload.subtotal ?? 0),
    hasInvalidItems: Boolean(payload.hasInvalidItems ?? false),
  }
}

export const cartApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query<CartResponse, void>({
      query: () => ({
        url: '/sales/cart',
        method: 'GET',
      }),
      transformResponse: normalizeCartResponse,
      providesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),

    addCartItem: builder.mutation<CartResponse, AddCartItemRequest>({
      query: (body) => ({
        url: '/sales/cart/items',
        method: 'POST',
        body,
      }),
      transformResponse: normalizeCartResponse,
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),

    updateCartItemQuantity: builder.mutation<
      CartResponse,
      { cartItemId: string; data: UpdateCartItemQuantityRequest }
    >({
      query: ({ cartItemId, data }) => ({
        url: `/sales/cart/items/${cartItemId}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: normalizeCartResponse,
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),

    removeCartItem: builder.mutation<CartResponse, string>({
      query: (cartItemId) => ({
        url: `/sales/cart/items/${cartItemId}`,
        method: 'DELETE',
      }),
      transformResponse: normalizeCartResponse,
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),

    clearCart: builder.mutation<CartResponse, void>({
      query: () => ({
        url: '/sales/cart',
        method: 'DELETE',
      }),
      transformResponse: normalizeCartResponse,
      invalidatesTags: [{ type: 'Cart', id: 'CURRENT' }],
    }),
  }),
})

export const {
  useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApi

