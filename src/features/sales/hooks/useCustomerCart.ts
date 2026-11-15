import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import {
  useGetCartQuery,
  useAddCartItemMutation,
  useUpdateCartItemQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} from '../api/cartApi.ts'
import { addCartItemSchema, updateCartItemQuantitySchema } from '../schemas/cart.schema.ts'

/**
 * Hook quản lý toàn bộ thao tác giỏ hàng trực tuyến của khách hàng (UC-17).
 */
export function useCustomerCart(enabled = true) {
  const {
    data: cart,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetCartQuery(undefined, { skip: !enabled })

  const [addCartItemMutation, { isLoading: isAdding }] = useAddCartItemMutation()
  const [updateCartItemQuantityMutation] = useUpdateCartItemQuantityMutation()
  const [removeCartItemMutation] = useRemoveCartItemMutation()
  const [clearCartMutation, { isLoading: isClearing }] = useClearCartMutation()

  const [pendingItemIds, setPendingItemIds] = useState<Record<string, boolean>>({})

  const markItemPending = useCallback((cartItemId: string, pending: boolean) => {
    setPendingItemIds((prev) => {
      if (!pending) {
        const next = { ...prev }
        delete next[cartItemId]
        return next
      }
      return { ...prev, [cartItemId]: true }
    })
  }, [])

  const handleAddItem = useCallback(
    async (variantId: string, quantity = 1) => {
      const parsed = addCartItemSchema.safeParse({ variantId, quantity })
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? 'Dữ liệu thêm giỏ hàng không hợp lệ')
        return false
      }

      try {
        await addCartItemMutation(parsed.data).unwrap()
        toast.success('Đã thêm sản phẩm vào giỏ hàng')
        return true
      } catch (err) {
        toast.error(normalizeApiError(err).message)
        return false
      }
    },
    [addCartItemMutation],
  )

  const handleUpdateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      const parsed = updateCartItemQuantitySchema.safeParse({ quantity })
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? 'Số lượng không hợp lệ')
        return false
      }

      markItemPending(cartItemId, true)
      try {
        await updateCartItemQuantityMutation({
          cartItemId,
          data: parsed.data,
        }).unwrap()
        return true
      } catch (err) {
        toast.error(normalizeApiError(err).message)
        return false
      } finally {
        markItemPending(cartItemId, false)
      }
    },
    [markItemPending, updateCartItemQuantityMutation],
  )

  const handleRemoveItem = useCallback(
    async (cartItemId: string) => {
      markItemPending(cartItemId, true)
      try {
        await removeCartItemMutation(cartItemId).unwrap()
        toast.success('Đã xóa sản phẩm khỏi giỏ hàng')
        return true
      } catch (err) {
        toast.error(normalizeApiError(err).message)
        return false
      } finally {
        markItemPending(cartItemId, false)
      }
    },
    [markItemPending, removeCartItemMutation],
  )

  const handleClearCart = useCallback(async () => {
    try {
      await clearCartMutation().unwrap()
      toast.success('Đã làm trống giỏ hàng')
      return true
    } catch (err) {
      toast.error(normalizeApiError(err).message)
      return false
    }
  }, [clearCartMutation])

  return {
    cart,
    items: cart?.items ?? [],
    totalItems: cart?.totalItems ?? 0,
    totalQuantity: cart?.totalQuantity ?? 0,
    subtotal: cart?.subtotal ?? 0,
    hasInvalidItems: cart?.hasInvalidItems ?? false,
    isLoading,
    isFetching,
    isError,
    error: error ? normalizeApiError(error) : null,
    isAdding,
    isClearing,
    pendingItemIds,
    refetch,
    handleAddItem,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  }
}

