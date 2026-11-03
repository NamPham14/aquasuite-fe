import { useDeferredValue, useState } from 'react'
import type {
  CatalogListParams,
  CatalogSortDirection,
  CatalogStatus,
} from '../types'

/** Quản lý bộ lọc và tham số trang server; đổi bộ lọc sẽ quay về trang đầu. */
export function useCatalogListState(defaultSortBy = 'code') {
  const [search, setSearchValue] = useState('')
  const [status, setStatusValue] = useState<'' | CatalogStatus>('')
  const [sortBy, setSortByValue] = useState(defaultSortBy)
  const [direction, setDirectionValue] = useState<CatalogSortDirection>('asc')
  const [page, setPage] = useState(0)
  const deferredSearch = useDeferredValue(search.trim())

  /** Đổi từ khóa tìm kiếm và quay về trang đầu. */
  const setSearch = (value: string) => {
    setSearchValue(value)
    setPage(0)
  }
  /** Đổi trạng thái lọc và quay về trang đầu. */
  const setStatus = (value: string) => {
    setStatusValue(value as '' | CatalogStatus)
    setPage(0)
  }
  /** Đổi trường sắp xếp và quay về trang đầu. */
  const setSortBy = (value: string) => {
    setSortByValue(value)
    setPage(0)
  }
  /** Đổi chiều sắp xếp và quay về trang đầu. */
  const setDirection = (value: string) => {
    setDirectionValue(value as CatalogSortDirection)
    setPage(0)
  }
  /** Khôi phục bộ lọc, sắp xếp và trang mặc định. */
  const reset = () => {
    setSearchValue('')
    setStatusValue('')
    setSortByValue(defaultSortBy)
    setDirectionValue('asc')
    setPage(0)
  }

  const query: CatalogListParams = {
    page,
    size: 20,
    sortBy,
    direction,
    ...(deferredSearch ? { search: deferredSearch } : {}),
    ...(status ? { status } : {}),
  }

  return {
    search,
    status,
    sortBy,
    direction,
    page,
    query,
    setSearch,
    setStatus,
    setSortBy,
    setDirection,
    setPage,
    reset,
  }
}
