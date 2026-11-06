import { downloadBlobAsFile } from './fileDownload.ts'
import type { ProductSummary } from '../types/product.types.ts'

function formatPriceNumber(num?: number | null): string {
  if (num == null) return ''
  return num.toString()
}

function formatPriceRangeText(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'Chưa có giá'
  if (min != null && max != null) {
    if (min === max) return `${min.toLocaleString('vi-VN')} ₫`
    return `${min.toLocaleString('vi-VN')} – ${max.toLocaleString('vi-VN')} ₫`
  }
  if (min != null) return `Từ ${min.toLocaleString('vi-VN')} ₫`
  return `Đến ${max!.toLocaleString('vi-VN')} ₫`
}

function formatStatus(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Đang kinh doanh'
    case 'DRAFT':
      return 'Bản nháp'
    case 'DISCONTINUED':
      return 'Ngừng kinh doanh'
    default:
      return status
  }
}

function formatProductType(type?: string | null): string {
  switch (type) {
    case 'STANDARD':
      return 'Sản phẩm tiêu chuẩn'
    case 'BUNDLE':
      return 'Bộ/Combo sản phẩm'
    default:
      return type ?? 'Sản phẩm tiêu chuẩn'
  }
}

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val == null) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

/**
 * Xuất danh sách sản phẩm ra file CSV mã hóa UTF-8 kèm BOM.
 * Excel nhận diện chính xác font chữ tiếng Việt có dấu mà không bị lỗi font.
 */
export function exportProductsToExcel(
  products: ProductSummary[],
  customFilename?: string,
): void {
  const filename =
    customFilename ??
    `Danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`

  const headers = [
    'Mã sản phẩm',
    'Tên sản phẩm',
    'Danh mục',
    'Thương hiệu',
    'Loại sản phẩm',
    'Giá bán nhỏ nhất (VNĐ)',
    'Giá bán lớn nhất (VNĐ)',
    'Khoảng giá hiển thị',
    'Số lượng biến thể',
    'Trạng thái kinh doanh',
    'Ngày tạo',
  ]

  const rows = products.map((item) => [
    escapeCsvCell(item.productCode),
    escapeCsvCell(item.productName),
    escapeCsvCell(item.categoryName),
    escapeCsvCell(item.brandName || '—'),
    escapeCsvCell(formatProductType(item.productType)),
    escapeCsvCell(formatPriceNumber(item.minSellingPrice)),
    escapeCsvCell(formatPriceNumber(item.maxSellingPrice)),
    escapeCsvCell(formatPriceRangeText(item.minSellingPrice, item.maxSellingPrice)),
    escapeCsvCell(item.totalVariants),
    escapeCsvCell(formatStatus(item.status)),
    escapeCsvCell(item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'),
  ])

  const csvContent =
    '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  downloadBlobAsFile(blob, filename)
}

