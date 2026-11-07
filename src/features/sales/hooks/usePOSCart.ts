import { useState, useMemo, useCallback } from 'react'
import type { CustomerOption } from '../api/customerApi'
import type {
  AllowedPosPaymentMethod,
  CreateComboItemRequest,
  CreateOrderItemRequest,
  CreateSalesOrderRequest,
  FulfillmentMethod,
} from '../types/salesOrder.types'

export interface CartItem {
  variantId: string
  sku: string
  name: string
  unitPrice: number
  quantity: number
  discountAmount: number
  availableStock: number
}

export interface CartCombo {
  comboId: string
  name: string
  unitPrice: number
  quantity: number
  discountAmount: number
}

export function usePOSCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [combos, setCombos] = useState<CartCombo[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null)
  const [walkInName, setWalkInName] = useState('')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>('IN_STORE_PICKUP')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<AllowedPosPaymentMethod>('CASH')
  const [orderDiscount, setOrderDiscount] = useState<number>(0)
  const [note, setNote] = useState('')

  // Map đếm số lượng cho ProductSelectionDrawer
  const selectedVariantCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}
    for (const it of items) {
      counts[it.variantId] = it.quantity
    }
    for (const cb of combos) {
      counts[cb.comboId] = cb.quantity
    }
    return counts
  }, [items, combos])

  // Thêm SKU lẻ
  const addItem = useCallback(
    (product: {
      id: string
      sku: string
      name: string
      sellingPrice: number
      availableStock: number
    }) => {
      setItems((prev) => {
        const existing = prev.find((it) => it.variantId === product.id)
        if (existing) {
          const nextQty = existing.quantity + 1
          return prev.map((it) =>
            it.variantId === product.id ? { ...it, quantity: nextQty } : it,
          )
        }
        return [
          ...prev,
          {
            variantId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: product.sellingPrice,
            quantity: 1,
            discountAmount: 0,
            availableStock: product.availableStock,
          },
        ]
      })
    },
    [],
  )

  const updateItemQuantity = useCallback((variantId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.variantId === variantId ? { ...it, quantity: Math.max(0.001, quantity) } : it,
      ),
    )
  }, [])

  const updateItemDiscount = useCallback((variantId: string, discountAmount: number) => {
    setItems((prev) =>
      prev.map((it) =>
        it.variantId === variantId ? { ...it, discountAmount: Math.max(0, discountAmount) } : it,
      ),
    )
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((it) => it.variantId !== variantId))
  }, [])

  // Thêm Combo
  const addCombo = useCallback(
    (combo: { id: string; name: string; sellingPrice: number }) => {
      setCombos((prev) => {
        const existing = prev.find((cb) => cb.comboId === combo.id)
        if (existing) {
          return prev.map((cb) =>
            cb.comboId === combo.id ? { ...cb, quantity: cb.quantity + 1 } : cb,
          )
        }
        return [
          ...prev,
          {
            comboId: combo.id,
            name: combo.name,
            unitPrice: combo.sellingPrice,
            quantity: 1,
            discountAmount: 0,
          },
        ]
      })
    },
    [],
  )

  const updateComboQuantity = useCallback((comboId: string, quantity: number) => {
    setCombos((prev) =>
      prev.map((cb) =>
        cb.comboId === comboId ? { ...cb, quantity: Math.max(1, Math.floor(quantity)) } : cb,
      ),
    )
  }, [])

  const removeCombo = useCallback((comboId: string) => {
    setCombos((prev) => prev.filter((cb) => cb.comboId !== comboId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setCombos([])
    setSelectedCustomer(null)
    setWalkInName('')
    setWalkInPhone('')
    setDeliveryAddress('')
    setPaymentMethod('CASH')
    setOrderDiscount(0)
    setNote('')
  }, [])

  // Tính toán tạm tính (Preview)
  const itemsSubtotal = useMemo(() => {
    return items.reduce((acc, it) => {
      const line = Math.max(0, it.unitPrice * it.quantity - (it.discountAmount || 0))
      return acc + line
    }, 0)
  }, [items])

  const combosSubtotal = useMemo(() => {
    return combos.reduce((acc, cb) => {
      const line = Math.max(0, cb.unitPrice * cb.quantity - (cb.discountAmount || 0))
      return acc + line
    }, 0)
  }, [combos])

  const subtotal = useMemo(() => itemsSubtotal + combosSubtotal, [itemsSubtotal, combosSubtotal])
  const finalTotal = useMemo(() => Math.max(0, subtotal - (orderDiscount || 0)), [subtotal, orderDiscount])

  // Sinh Request Payload chuẩn xác đối chiếu Backend
  const buildPayload = useCallback((): CreateSalesOrderRequest => {
    const orderItems: CreateOrderItemRequest[] = items.map((it) => ({
      variantId: it.variantId,
      quantity: it.quantity,
      discountAmount: it.discountAmount > 0 ? it.discountAmount : undefined,
    }))

    const orderCombos: CreateComboItemRequest[] = combos.map((cb) => ({
      comboId: cb.comboId,
      quantity: cb.quantity,
      discountAmount: cb.discountAmount > 0 ? cb.discountAmount : undefined,
    }))

    return {
      customerId: selectedCustomer ? selectedCustomer.customerId : undefined,
      customerPhone: !selectedCustomer && walkInPhone.trim() ? walkInPhone.trim() : undefined,
      customerName: !selectedCustomer && walkInName.trim() ? walkInName.trim() : undefined,
      orderType: 'RETAIL',
      orderChannel: 'COUNTER',
      fulfillmentMethod,
      paymentMethod,
      discountAmount: orderDiscount > 0 ? orderDiscount : 0,
      deliveryAddress:
        fulfillmentMethod === 'SCHEDULED_DELIVERY'
          ? deliveryAddress || selectedCustomer?.address || ''
          : undefined,
      note: note.trim() || undefined,
      items: orderItems.length > 0 ? orderItems : undefined,
      combos: orderCombos.length > 0 ? orderCombos : undefined,
    }
  }, [
    items,
    combos,
    selectedCustomer,
    walkInName,
    walkInPhone,
    fulfillmentMethod,
    paymentMethod,
    orderDiscount,
    deliveryAddress,
    note,
  ])

  return {
    items,
    combos,
    selectedCustomer,
    setSelectedCustomer,
    walkInName,
    setWalkInName,
    walkInPhone,
    setWalkInPhone,
    fulfillmentMethod,
    setFulfillmentMethod,
    deliveryAddress,
    setDeliveryAddress,
    paymentMethod,
    setPaymentMethod,
    orderDiscount,
    setOrderDiscount,
    note,
    setNote,
    selectedVariantCounts,
    addItem,
    updateItemQuantity,
    updateItemDiscount,
    removeItem,
    addCombo,
    updateComboQuantity,
    removeCombo,
    clearCart,
    itemsSubtotal,
    combosSubtotal,
    subtotal,
    finalTotal,
    buildPayload,
  }
}

