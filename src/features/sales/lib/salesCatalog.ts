import type { CatalogItemOption } from '../data/catalogProducts.data.ts'

type SalesCatalogItem = Omit<CatalogItemOption, 'brand'> & { brand?: string | null }

export function normalizeSalesCatalog(response: SalesCatalogItem[] | { data: SalesCatalogItem[] }): CatalogItemOption[] {
  const items = Array.isArray(response) ? response : response.data
  if (!Array.isArray(items)) throw new Error('Phản hồi danh mục bán hàng không hợp lệ.')
  return items.map((item) => ({ ...item, brand: item.brand ?? (item.isCombo ? 'AQUA-COMBO' : '') }))
}
