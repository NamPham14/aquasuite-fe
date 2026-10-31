import type { CatalogStatus } from './catalog.types.ts'

/** Thương hiệu do API catalog trả về. */
export interface Brand {
  id: string
  code: string
  name: string
  description: string | null
  status: CatalogStatus
}

/** Thương hiệu rút gọn dùng trong danh sách lựa chọn. */
export interface BrandOption {
  brandId: string
  brandCode: string
  brandName: string
}

/** Dữ liệu tạo thương hiệu, bao gồm mã ổn định bắt buộc. */
export interface CreateBrandRequest {
  code: string
  name: string
  description: string | null
  status: CatalogStatus
}

/** Các trường có thể thay đổi; mã thương hiệu không thuộc request cập nhật. */
export interface UpdateBrandRequest {
  name: string
  description: string | null
  status: CatalogStatus
}
