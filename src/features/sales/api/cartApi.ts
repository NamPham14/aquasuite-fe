import { baseApi } from '../../../shared/api/baseApi.ts'
import type {
  AddCartItemRequest,
  CartItemResponse,
  CartResponse,
  MergeCartItemsRequest,
  UpdateCartItemQuantityRequest,
} from '../types/cart.types.ts'

export function normalizeCartItem(raw: Record<string, unknown>): CartItemResponse {
  const comboId = raw.comboId ? String(raw.comboId) : null
  const variantId = raw.variantId ? String(raw.variantId) : comboId ?? ''
  const isCombo = Boolean(raw.isCombo ?? raw.combo ?? comboId)

  return {
    cartItemId: String(raw.cartItemId ?? ''),
    variantId,
    comboId,
    productId: raw.productId ? String(raw.productId) : null,
    sku: String(raw.sku ?? ''),
    productName: String(raw.productName ?? ''),
    variantName: String(raw.variantName ?? ''),
    imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
    unit: String(raw.unit ?? ''),
    quantity: Number(raw.quantity ?? 0),
    unitPrice: Number(raw.unitPrice ?? 0),
    currentSellingPrice: Number(raw.currentSellingPrice ?? raw.unitPrice ?? 0),
    lineTotal: Number(raw.lineTotal ?? 0),
    availableQty: Number(raw.availableQty ?? 0),
    variantStatus: String(raw.variantStatus ?? 'ACTIVE'),
    inStock: Boolean(raw.inStock ?? true),
    priceChanged: Boolean(raw.priceChanged ?? false),
    isCombo,
    components: Array.isArray(raw.components) ? raw.components.map(String) : undefined,
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeCartResponse(res: any): CartResponse {
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

    mergeCartItems: builder.mutation<CartResponse, MergeCartItemsRequest>({
      query: (body) => ({
        url: '/sales/cart/items/merge',
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
  useMergeCartItemsMutation,
  useUpdateCartItemQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApi
