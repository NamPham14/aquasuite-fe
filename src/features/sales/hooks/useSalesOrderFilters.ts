import { useState, useCallback, useMemo } from 'react'
import type { OrderStatus, PaymentStatus, OrderType, SalesOrderFilterParams } from '../types/salesOrder.types'

export function useSalesOrderFilters() {
  const [keyword, setKeyword] = useState('')
  const [orderStatus, setOrderStatus] = useState<OrderStatus | undefined>(undefined)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | undefined>(undefined)
  const [orderType, setOrderType] = useState<OrderType | undefined>(undefined)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  const hasActiveFilters = useMemo(() => {
    return Boolean(keyword || orderStatus || paymentStatus || orderType || fromDate || toDate)
  }, [keyword, orderStatus, paymentStatus, orderType, fromDate, toDate])

  const resetFilters = useCallback(() => {
    setKeyword('')
    setOrderStatus(undefined)
    setPaymentStatus(undefined)
    setOrderType(undefined)
    setFromDate('')
    setToDate('')
    setPage(1)
  }, [])

  const filterParams = useMemo<SalesOrderFilterParams>(() => {
    return {
      keyword: keyword.trim() || undefined,
      orderStatus,
      paymentStatus,
      orderType,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      size,
      sort: 'createdAt,desc',
    }
  }, [keyword, orderStatus, paymentStatus, orderType, fromDate, toDate, page, size])

  return {
    keyword,
    setKeyword,
    orderStatus,
    setOrderStatus,
    paymentStatus,
    setPaymentStatus,
    orderType,
    setOrderType,
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

