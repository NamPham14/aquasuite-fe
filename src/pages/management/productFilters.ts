export interface FilterableProduct {
  id: string
  name: string
  category: string
  status: string
}

export function filterProducts<T extends FilterableProduct>(products: T[], search: string, category: string, status: string): T[] {
  const query = search.trim().toLocaleLowerCase('vi-VN')
  return products.filter((product) =>
    (!query || `${product.id} ${product.name}`.toLocaleLowerCase('vi-VN').includes(query)) &&
    (!category || product.category === category) &&
    (!status || product.status === status),
  )
}
