import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import {
  useGetCartQuery,
  useAddCartItemMutation,
  useMergeCartItemsMutation,
  useUpdateCartItemQuantityMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} from '../api/cartApi.ts'
import {
  buildGuestCartResponse,
  clearGuestCart,
  GUEST_CART_UPDATED_EVENT,
  readGuestCart,
  removeGuestCartItem,
  updateGuestCartQuantity,
  upsertGuestCartItem,
  type GuestCartEntry,
} from '../lib/guestCartStorage.ts'
import { addCartItemSchema, updateCartItemQuantitySchema } from '../schemas/cart.schema.ts'
import { useGetSalesCatalogItemsQuery } from '../api/salesCatalogApi.ts'

/**
 * Hook quản lý toàn bộ thao tác giỏ hàng trực tuyến của khách hàng (UC-17).
 * Hỗ trợ đầy đủ cả người dùng đã đăng nhập (đồng bộ DB) và khách vãng lai (Guest Cart đồng bộ catalog live từ API & tự gộp khi đăng nhập).
 */
export function useCustomerCart(enabled = true) {
  const {
    data: serverCart,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetCartQuery(undefined, { skip: !enabled })

  const {
    data: guestCatalogItems = [],
    isLoading: isLoadingGuestCatalog,
    isFetching: isFetchingGuestCatalog,
  } = useGetSalesCatalogItemsQuery(undefined, { skip: enabled })

  const [addCartItemMutation] = useAddCartItemMutation()
  const [mergeCartItemsMutation] = useMergeCartItemsMutation()
  const [updateCartItemQuantityMutation] = useUpdateCartItemQuantityMutation()
  const [removeCartItemMutation] = useRemoveCartItemMutation()
  const [clearCartMutation, { isLoading: isClearing }] = useClearCartMutation()

  const [pendingVariantIds, setPendingVariantIds] = useState<Record<string, boolean>>({})
  const [pendingItemIds, setPendingItemIds] = useState<Record<string, boolean>>({})
  const [guestEntries, setGuestEntries] = useState<GuestCartEntry[]>(() => readGuestCart())
  const mergingRef = useRef(false)

  // Lắng nghe đồng bộ Guest Cart giữa Header, Storefront, PDP và CartPage
  useEffect(() => {
    const syncGuestEntries = () => {
      setGuestEntries(readGuestCart())
    }
    window.addEventListener(GUEST_CART_UPDATED_EVENT, syncGuestEntries)
    window.addEventListener('storage', syncGuestEntries)
    return () => {
      window.removeEventListener(GUEST_CART_UPDATED_EVENT, syncGuestEntries)
      window.removeEventListener('storage', syncGuestEntries)
    }
  }, [])

  // Tự động gộp Guest Cart vào server khi khách hàng vừa đăng nhập thành công
  useEffect(() => {
    if (!enabled || mergingRef.current) return
    const pendingGuestItems = readGuestCart()
    if (pendingGuestItems.length === 0) return

    mergingRef.current = true
    void mergeCartItemsMutation({
      items: pendingGuestItems.map((entry) => ({
        variantId: entry.comboId || entry.isCombo ? undefined : entry.variantId,
        comboId: entry.comboId || (entry.isCombo ? entry.variantId : undefined),
        quantity: entry.quantity,
      })),
    })
      .unwrap()
      .then(() => {
        clearGuestCart()
        setGuestEntries([])
        toast.success(
          `Đã đồng bộ ${pendingGuestItems.length} sản phẩm từ giỏ hàng tạm vào tài khoản`,
        )
      })
      .catch(() => {
        // Giữ nguyên guest cart nếu đồng bộ tạm thời thất bại
      })
      .finally(() => {
        mergingRef.current = false
      })
  }, [enabled, mergeCartItemsMutation])

  const markVariantPending = useCallback((variantId: string, pending: boolean) => {
    setPendingVariantIds((prev) => {
      if (!pending) {
        const next = { ...prev }
        delete next[variantId]
        return next
      }
      return { ...prev, [variantId]: true }
    })
  }, [])

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
    async (targetId: string, quantity = 1, options?: { isCombo?: boolean }) => {
      const isCombo = Boolean(options?.isCombo)
      const parsed = addCartItemSchema.safeParse({
        variantId: isCombo ? undefined : targetId,
        comboId: isCombo ? targetId : undefined,
        quantity,
      })
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? 'Dữ liệu thêm giỏ hàng không hợp lệ')
        return false
      }

      if (!enabled) {
        const res = upsertGuestCartItem(targetId, parsed.data.quantity, guestCatalogItems, {
          isCombo,
        })
        if (res.error) {
          toast.error(res.error)
          return false
        }
        setGuestEntries(res.entries)
        toast.success(
          isCombo
            ? 'Đã thêm gói Combo vào giỏ hàng tạm'
            : 'Đã thêm sản phẩm vào giỏ hàng tạm',
        )
        return true
      }

      markVariantPending(targetId, true)
      try {
        await addCartItemMutation(parsed.data).unwrap()
        toast.success(
          isCombo
            ? 'Đã thêm gói Combo vào giỏ hàng'
            : 'Đã thêm sản phẩm vào giỏ hàng',
        )
        return true
      } catch (err) {
        toast.error(normalizeApiError(err).message)
        return false
      } finally {
        markVariantPending(targetId, false)
      }
    },
    [addCartItemMutation, enabled, guestCatalogItems, markVariantPending],
  )

  const handleUpdateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      const parsed = updateCartItemQuantitySchema.safeParse({ quantity })
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? 'Số lượng không hợp lệ')
        return false
      }

      if (!enabled) {
        const res = updateGuestCartQuantity(cartItemId, parsed.data.quantity, guestCatalogItems)
        if (res.error) {
          toast.error(res.error)
          return false
        }
        setGuestEntries(res.entries)
        return true
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
    [enabled, guestCatalogItems, markItemPending, updateCartItemQuantityMutation],
  )

  const handleRemoveItem = useCallback(
    async (cartItemId: string) => {
      if (!enabled) {
        const entries = removeGuestCartItem(cartItemId)
        setGuestEntries(entries)
        toast.success('Đã xóa sản phẩm khỏi giỏ hàng')
        return true
      }

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
    [enabled, markItemPending, removeCartItemMutation],
  )

  const handleClearCart = useCallback(async () => {
    if (!enabled) {
      clearGuestCart()
      setGuestEntries([])
      toast.success('Đã làm trống giỏ hàng')
      return true
    }

    try {
      await clearCartMutation().unwrap()
      toast.success('Đã làm trống giỏ hàng')
      return true
    } catch (err) {
      toast.error(normalizeApiError(err).message)
      return false
    }
  }, [clearCartMutation, enabled])

  const guestCart = useMemo(
    () => (!enabled ? buildGuestCartResponse(guestEntries, guestCatalogItems) : undefined),
    [enabled, guestCatalogItems, guestEntries],
  )

  const activeCart = enabled ? serverCart : guestCart
  const isAdding = Object.keys(pendingVariantIds).length > 0

  return {
    cart: activeCart,
    isGuestCart: !enabled,
    items: activeCart?.items ?? [],
    totalItems: activeCart?.totalItems ?? 0,
    totalQuantity: activeCart?.totalQuantity ?? 0,
    subtotal: activeCart?.subtotal ?? 0,
    hasInvalidItems: activeCart?.hasInvalidItems ?? false,
    isLoading: enabled ? isLoading : guestEntries.length > 0 && isLoadingGuestCatalog,
    isFetching: enabled ? isFetching : guestEntries.length > 0 && isFetchingGuestCatalog,
    isError: enabled ? isError : false,
    error: enabled && error ? normalizeApiError(error) : null,
    isAdding,
    pendingVariantIds,
    isClearing,
    pendingItemIds,
    refetch,
    handleAddItem,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearCart,
  }
}
