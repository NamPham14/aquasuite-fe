/**
 * Kiểu dữ liệu cho nghiệp vụ Tra cứu & Quản lý Tồn kho (UC-31).
 * Phản chiếu đúng DTO của backend module inventory (InventoryController).
 */

/** Trạng thái tồn kho suy ra từ tồn khả dụng và ngưỡng tối thiểu (khớp enum InventoryStockStatus ở BE). */
export type InventoryStockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

/**
 * Một dòng tồn kho hiển thị trên bảng tra cứu.
 * Trả về từ GET /inventory và GET /inventory/low-stock (bên trong Spring Page).
 */
export interface InventoryListItem {
  variantId: string
  sku?: string | null
  productName?: string | null
  unit?: string | null
  onHandQty: number
  reservedQty: number
  availableQty: number
  minimumQty: number
  maximumQty?: number | null
  status: InventoryStockStatus
  lowStock: boolean
}

/** Tồn kho chi tiết của một SKU. Trả về từ GET /inventory/{variantId} và PATCH .../threshold. */
export interface StockSummary {
  inventoryId?: string
  variantId: string
  warehouseCode: string
  onHandQty: number
  reservedQty: number
  availableQty: number
  minimumQty: number
  maximumQty?: number | null
  isLowStock: boolean
}

/** Một dòng thẻ kho (biến động tồn). Trả về từ GET /inventory/{variantId}/movements. */
export interface StockMovement {
  movementId: string
  inventoryId: string
  variantId: string
  movementType: string
  quantity: number
  balanceAfter: number
  referenceType: string
  referenceId?: string | null
  note?: string | null
  createdBy?: string | null
  createdAt: string
}

/** Tham số lọc cho màn tra cứu tồn kho (page tính từ 1 ở tầng UI). */
export interface InventoryFilterParams {
  keyword?: string
  status?: InventoryStockStatus | ''
  lowStockOnly?: boolean
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

/** Body cập nhật ngưỡng tồn an toàn (PATCH /inventory/{variantId}/threshold). */
export interface UpdateThresholdRequest {
  minimumQty: number
  maximumQty?: number | null
}
