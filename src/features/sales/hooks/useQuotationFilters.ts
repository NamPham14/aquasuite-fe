import { useState } from 'react'
import type { QuotationFilterParams, QuotationStatus } from '../types/quotation.types'

export function useQuotationFilters(initialParams?: QuotationFilterParams) {
  const [search, setSearch] = useState(initialParams?.search ?? '')
  const [status, setStatus] = useState<QuotationStatus | ''>(initialParams?.status ?? '')
  const [customerId, setCustomerId] = useState(initialParams?.customerId ?? '')
  const [fromDate, setFromDate] = useState(initialParams?.fromDate ?? '')
  const [toDate, setToDate] = useState(initialParams?.toDate ?? '')
  const [page, setPage] = useState(initialParams?.page ?? 1)
  const [size, setSize] = useState(initialParams?.size ?? 10)
  const [sortBy, setSortBy] = useState(initialParams?.sortBy ?? 'createdAt')
  const [direction, setDirection] = useState<'asc' | 'desc'>(initialParams?.direction ?? 'desc')

  const resetFilters = () => {
    setSearch('')
    setStatus('')
    setCustomerId('')
    setFromDate('')
    setToDate('')
    setPage(1)
    setSortBy('createdAt')
    setDirection('desc')
  }

  const queryParams: QuotationFilterParams = {
    search: search.trim() || undefined,
    status: status || undefined,
    customerId: customerId || undefined,
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
    customerId,
    setCustomerId,
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

