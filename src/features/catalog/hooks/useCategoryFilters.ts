import { useMemo, useState } from 'react'
import type { Category } from '../types/category.types'

export function useCategoryFilters(categories: Category[]) {
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi')

    return categories.filter((category) => {
      const matchesSearch =
        !normalizedSearch ||
        category.name.toLocaleLowerCase('vi').includes(normalizedSearch) ||
        category.slug.toLocaleLowerCase('vi').includes(normalizedSearch)

      return matchesSearch && (!activeOnly || category.active)
    })
  }, [activeOnly, categories, search])

  return { search, setSearch, activeOnly, setActiveOnly, filteredCategories }
}

