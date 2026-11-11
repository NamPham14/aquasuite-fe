import { useMemo, useState } from 'react'
import type { InventoryFilterParams, InventoryStockStatus } from '../types/inventory.types'

/**
 * Quản lý trạng thái bộ lọc cho màn Tra cứu Tồn kho (UC-31).
 * Gom từ khóa, trạng thái, cờ chỉ-tồn-thấp và số trang về một nơi, đồng thời dựng sẵn
 * object tham số truyền cho query. Mọi thay đổi bộ lọc đều đưa trang về 1 để tránh lệch kết quả.
 */
export function useInventoryFilters(initial?: { page?: number; size?: number }) {
  const [keyword, setKeywordRaw] = useState('')
  const [status, setStatusRaw] = useState<InventoryStockStatus | ''>('')
  const [lowStockOnly, setLowStockOnlyRaw] = useState(false)
  const [page, setPage] = useState(initial?.page ?? 1)
  const size = initial?.size ?? 10

  const setKeyword = (value: string) => { setKeywordRaw(value); setPage(1) }
  const setStatus = (value: InventoryStockStatus | '') => { setStatusRaw(value); setPage(1) }
  const setLowStockOnly = (value: boolean) => { setLowStockOnlyRaw(value); setPage(1) }

  /** Đặt lại toàn bộ bộ lọc về mặc định. */
  const resetFilters = () => {
    setKeywordRaw('')
    setStatusRaw('')
    setLowStockOnlyRaw(false)
    setPage(1)
  }

  const queryParams = useMemo<InventoryFilterParams>(() => ({
    keyword: keyword.trim() || undefined,
    status: status || undefined,
    lowStockOnly: lowStockOnly || undefined,
    page,
    size,
    sortBy: 'updatedAt',
    direction: 'desc',
  }), [keyword, status, lowStockOnly, page, size])

  return {
    keyword, setKeyword,
    status, setStatus,
    lowStockOnly, setLowStockOnly,
    page, setPage,
    resetFilters,
    queryParams,
  }
}
