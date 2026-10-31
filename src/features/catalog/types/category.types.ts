import type { CatalogStatus } from './catalog.types.ts'

/** Danh mục dạng phẳng do API trả về; parentId rỗng khi là danh mục gốc. */
export interface Category {
  id: string
  code: string
  name: string
  description: string | null
  status: CatalogStatus
  parentId: string | null
  createdAt: string
  updatedAt: string
}

/** Danh mục rút gọn do endpoint lựa chọn danh mục đang hoạt động trả về. */
export interface CategoryOption {
  categoryId: string
  categoryCode: string
  categoryName: string
}

/** Dữ liệu tạo danh mục với mã ổn định và danh mục cha tùy chọn. */
export interface CreateCategoryRequest {
  code: string
  name: string
  description: string | null
  status: CatalogStatus
  parentId: string | null
}

/** Các trường có thể thay đổi; mã danh mục không thuộc request cập nhật. */
export interface UpdateCategoryRequest {
  name: string
  description: string | null
  status: CatalogStatus
  parentId: string | null
}
