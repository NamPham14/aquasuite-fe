import { useState } from 'react'
import type { PurchaseOrderFilterParams, PurchaseOrderStatus } from '../types/purchaseOrder.types'

export function usePurchaseOrderFilters(initialParams?: PurchaseOrderFilterParams) {
  const [search, setSearch] = useState(initialParams?.search ?? '')
  const [status, setStatus] = useState<PurchaseOrderStatus | ''>(initialParams?.status ?? '')
  const [supplierId, setSupplierId] = useState(initialParams?.supplierId ?? '')
  const [fromDate, setFromDate] = useState(initialParams?.fromDate ?? '')
  const [toDate, setToDate] = useState(initialParams?.toDate ?? '')
  const [page, setPage] = useState(initialParams?.page ?? 1)
  const [size, setSize] = useState(initialParams?.size ?? 10)
  const [sortBy, setSortBy] = useState(initialParams?.sortBy ?? 'createdAt')
  const [direction, setDirection] = useState<'asc' | 'desc'>(initialParams?.direction ?? 'desc')

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setSupplierId('')
    setFromDate('')
    setToDate('')
    setPage(1)
    setSortBy('createdAt')
    setDirection('desc')
  }

  const queryParams: PurchaseOrderFilterParams = {
    search: search.trim() || undefined,
    status: status || undefined,
    supplierId: supplierId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    size,
    sortBy,
    direction,
  }

  return {
    search,
    setSearch,
    status,
    setStatus,
    supplierId,
    setSupplierId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    page,
    setPage,
    size,
    setSize,
    sortBy,
    setSortBy,
    direction,
    setDirection,
    resetFilters,
    queryParams,
  }
}