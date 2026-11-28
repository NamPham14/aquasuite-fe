import type { CatalogItemOption } from '../types/salesCatalog.types.ts'
import type { CartItemResponse, CartResponse } from '../types/cart.types.ts'

export const GUEST_CART_STORAGE_KEY = 'aquasuite_guest_cart_v1'
export const GUEST_CART_UPDATED_EVENT = 'aquasuite:guest-cart-updated'

export interface GuestCartEntry {
  variantId: string
  quantity: number
  updatedAt: string
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    return null
  }
  return null
}

function notifyGuestCartChanged(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(GUEST_CART_UPDATED_EVENT))
  }
}

export function readGuestCart(): GuestCartEntry[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(GUEST_CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(
        (entry): entry is GuestCartEntry =>
          Boolean(entry) &&
          typeof entry.variantId === 'string' &&
          entry.variantId.trim() !== '' &&
          typeof entry.quantity === 'number' &&
          Number.isFinite(entry.quantity) &&
          entry.quantity >= 1,
      )
      .map((entry) => ({
        variantId: entry.variantId,
        quantity: Math.floor(entry.quantity),
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
      }))
  } catch {
    return []
  }
}

export function writeGuestCart(entries: GuestCartEntry[]): void {
  const storage = getStorage()
  if (!storage) return

  try {
    if (entries.length === 0) {
      storage.removeItem(GUEST_CART_STORAGE_KEY)
    } else {
      storage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(entries))
    }
    notifyGuestCartChanged()
  } catch {
    // Bỏ qua lỗi quota / private mode
  }
}

export function clearGuestCart(): void {
  writeGuestCart([])
}

export function upsertGuestCartItem(
  variantId: string,
  addQuantity: number,
  catalog: CatalogItemOption[] = [],
): { entries: GuestCartEntry[]; error?: string } {
  const safeQty = Math.max(1, Math.floor(addQuantity))
  const current = readGuestCart()
  const existing = current.find((item) => item.variantId === variantId)
  const nextQuantity = (existing?.quantity ?? 0) + safeQty

  const product = catalog.find((item) => item.variantId === variantId)
  if (product && product.availableStock > 0 && nextQuantity > product.availableStock) {
    return {
      entries: current,
      error: `Số lượng vượt quá tồn kho khả dụng (còn ${product.availableStock} ${product.unit})`,
    }
  }
  if (product && product.availableStock <= 0) {
    return {
      entries: current,
      error: `Sản phẩm ${product.sku} hiện tạm hết hàng`,
    }
  }

  const now = new Date().toISOString()
  const updated = existing
    ? current.map((item) =>
        item.variantId === variantId ? { ...item, quantity: nextQuantity, updatedAt: now } : item,
      )
    : [{ variantId, quantity: nextQuantity, updatedAt: now }, ...current]

  writeGuestCart(updated)
  return { entries: updated }
}

export function updateGuestCartQuantity(
  variantId: string,
  quantity: number,
  catalog: CatalogItemOption[] = [],
): { entries: GuestCartEntry[]; error?: string } {
  const safeQty = Math.max(1, Math.floor(quantity))
  const current = readGuestCart()
  const product = catalog.find((item) => item.variantId === variantId)
  if (product && product.availableStock > 0 && safeQty > product.availableStock) {
    return {
      entries: current,
      error: `Số lượng tối đa hiện có là ${product.availableStock} ${product.unit}`,
    }
  }

  const now = new Date().toISOString()
  const updated = current.map((item) =>
    item.variantId === variantId ? { ...item, quantity: safeQty, updatedAt: now } : item,
  )
  writeGuestCart(updated)
  return { entries: updated }
}

export function removeGuestCartItem(variantId: string): GuestCartEntry[] {
  const updated = readGuestCart().filter((item) => item.variantId !== variantId)
  writeGuestCart(updated)
  return updated
}

export function buildGuestCartResponse(
  entries: GuestCartEntry[],
  catalog: CatalogItemOption[] = [],
): CartResponse {
  const items: CartItemResponse[] = []
  let totalQuantity = 0
  let subtotal = 0
  let hasInvalidItems = false

  for (const entry of entries) {
    const product = catalog.find((c) => c.variantId === entry.variantId)
    const unitPrice = product?.sellingPrice ?? 0
    const availableQty = product?.availableStock ?? 0
    const lineTotal = unitPrice * entry.quantity
    const inStock = Boolean(product) && availableQty >= entry.quantity

    if (!inStock) {
      hasInvalidItems = true
    }

    totalQuantity += entry.quantity
    subtotal += lineTotal

    items.push({
      cartItemId: entry.variantId,
      variantId: entry.variantId,
      productId: null,
      sku: product?.sku ?? 'N/A',
      productName: product?.name ?? 'Sản phẩm Showroom',
      variantName: product?.brand ?? '',
      imageUrl: product?.imageUrl ?? null,
      unit: product?.unit ?? 'Cái',
      quantity: entry.quantity,
      unitPrice,
      currentSellingPrice: unitPrice,
      lineTotal,
      availableQty,
      variantStatus: product ? 'ACTIVE' : 'INACTIVE',
      inStock,
      priceChanged: false,
      updatedAt: entry.updatedAt,
    })
  }

  return {
    customerId: 'guest',
    items,
    totalItems: items.length,
    totalQuantity,
    subtotal,
    hasInvalidItems,
  }
}

