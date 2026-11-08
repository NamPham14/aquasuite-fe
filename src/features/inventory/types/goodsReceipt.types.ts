/**
 * Kiểu dữ liệu cho nghiệp vụ Nhập kho theo đơn mua hàng (UC-32).
 * Phản chiếu đúng DTO của backend (inventory goods-receipts + purchasing receivable view).
 */

/** Một dòng đơn mua còn có thể nhận, trả về từ GET /inventory/goods-receipts/receivable/{poId}. */
export interface ReceivableItemView {
  purchaseOrderItemId: string
  variantId: string
  sku?: string
  productName?: string
  unit: string
  unitCost?: number | null
  quantityOrdered: number
  quantityReceived: number
  remainingQty: number
}

/** Snapshot đơn mua hàng phục vụ lập phiếu nhập kho. */
export interface ReceivablePurchaseOrderView {
  purchaseOrderId: string
  poCode: string
  status: string
  receivable: boolean
  warehouseCode: string
  supplierId: string
  items: ReceivableItemView[]
}

/** Một dòng số lượng thực nhận gửi lên khi lập phiếu. */
export interface CreateGoodsReceiptItemRequest {
  purchaseOrderItemId: string
  quantity: number
}

/** Body tạo + xác nhận phiếu nhập kho (Hướng B: một hành động). */
export interface CreateGoodsReceiptRequest {
  purchaseOrderId: string
  supplierInvoiceNo?: string
  invoiceImageUrl?: string
  note?: string
  items: CreateGoodsReceiptItemRequest[]
}

/** Một dòng chi tiết của phiếu nhập kho trả về. */
export interface GoodsReceiptItemResponse {
  goodsReceiptItemId: string
  purchaseOrderItemId: string
  variantId?: string
  unit: string
  quantity: number
  unitCost: number
  lineTotal: number
}

/** Phiếu nhập kho trả về. */
export interface GoodsReceiptResponse {
  goodsReceiptId: string
  receiptCode: string
  purchaseOrderId: string
  status: string
  receiptDate: string
  supplierInvoiceNo?: string
  invoiceImageUrl?: string
  totalAmount: number
  note?: string
  createdBy: string
  confirmedBy?: string
  confirmedAt?: string
  createdAt: string
  items?: GoodsReceiptItemResponse[]
}
