import { useState, useCallback, useEffect, useMemo } from 'react'
import type {
  OrderChannel,
  OrderStatus,
  PaymentStatus,
  OrderType,
  SalesOrderFilterParams,
} from '../types/salesOrder.types'

interface BuildFilterParamsInput {
  keyword: string
  orderStatus?: OrderStatus
  paymentStatus?: PaymentStatus
  orderType?: OrderType
  orderChannel?: OrderChannel
  fromDate: string
  toDate: string
  page: number
  size: number
}

/** Pure helper chuẩn hóa tham số lọc trước khi gửi lên GET /api/v1/sales/orders. */
export function buildSalesOrderFilterParams(
  input: BuildFilterParamsInput,
): SalesOrderFilterParams {
  return {
    keyword: input.keyword.trim() || undefined,
    orderStatus: input.orderStatus,
    paymentStatus: input.paymentStatus,
    orderType: input.orderType,
    orderChannel: input.orderChannel,
    fromDate: input.fromDate || undefined,
    toDate: input.toDate || undefined,
    page: input.page,
    size: input.size,
    sort: 'createdAt,desc',
  }
}

export function useSalesOrderFilters() {
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [orderStatus, setOrderStatusState] = useState<OrderStatus | undefined>(undefined)
  const [paymentStatus, setPaymentStatusState] = useState<PaymentStatus | undefined>(undefined)
  const [orderType, setOrderTypeState] = useState<OrderType | undefined>(undefined)
  const [orderChannel, setOrderChannelState] = useState<OrderChannel | undefined>(undefined)
  const [fromDate, setFromDateState] = useState('')
  const [toDate, setToDateState] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  // Debounce từ khóa để tránh gọi API liên tục mỗi phím gõ; xóa trắng thì áp dụng ngay.
  useEffect(() => {
    if (keyword === debouncedKeyword) return
    const delay = keyword.trim() === '' ? 0 : 350
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword)
      setPage(1)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [keyword, debouncedKeyword])

  const setOrderStatus = useCallback((val: OrderStatus | undefined) => {
    setOrderStatusState(val)
    setPage(1)
  }, [])

  const setPaymentStatus = useCallback((val: PaymentStatus | undefined) => {
    setPaymentStatusState(val)
    setPage(1)
  }, [])

  const setOrderType = useCallback((val: OrderType | undefined) => {
    setOrderTypeState(val)
    setPage(1)
  }, [])

  const setOrderChannel = useCallback((val: OrderChannel | undefined) => {
    setOrderChannelState(val)
    setPage(1)
  }, [])

  const setFromDate = useCallback((val: string) => {
    setFromDateState(val)
    setPage(1)
  }, [])

  const setToDate = useCallback((val: string) => {
    setToDateState(val)
    setPage(1)
  }, [])

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      keyword.trim() ||
        orderStatus ||
        paymentStatus ||
        orderType ||
        orderChannel ||
        fromDate ||
        toDate,
    )
  }, [keyword, orderStatus, paymentStatus, orderType, orderChannel, fromDate, toDate])

  const resetFilters = useCallback(() => {
    setKeyword('')
    setDebouncedKeyword('')
    setOrderStatusState(undefined)
    setPaymentStatusState(undefined)
    setOrderTypeState(undefined)
    setOrderChannelState(undefined)
    setFromDateState('')
    setToDateState('')
    setPage(1)
  }, [])

  const filterParams = useMemo<SalesOrderFilterParams>(() => {
    return buildSalesOrderFilterParams({
      keyword: debouncedKeyword,
      orderStatus,
      paymentStatus,
      orderType,
      orderChannel,
      fromDate,
      toDate,
      page,
      size,
    })
  }, [debouncedKeyword, orderStatus, paymentStatus, orderType, orderChannel, fromDate, toDate, page, size])

  return {
    keyword,
    setKeyword,
    orderStatus,
    setOrderStatus,
    paymentStatus,
    setPaymentStatus,
    orderType,
    setOrderType,
    orderChannel,
    setOrderChannel,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    page,
    setPage,
    size,
    setSize,
    hasActiveFilters,
    resetFilters,
    filterParams,
  }
}

