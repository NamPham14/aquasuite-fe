import { useState } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../../../app/store.ts'
import {
  productApi,
  useDownloadProductImportReportMutation,
  useSubmitProductImportJobMutation,
} from '../api/productApi.ts'
import { CatalogImportDialog } from './CatalogImportDialog.tsx'

export interface ProductImportDialogProps {
  /** Callback khi import hoàn tất và có sản phẩm được tạo mới thành công */
  onSuccess?: () => void
  /** Callback đóng hộp thoại */
  onClose: () => void
}

/** Chế độ xử lý khi phát hiện SKU đã tồn tại trong hệ thống */
export type ProductImportMode = 'SKIP_EXISTING' | 'OVERWRITE_EXISTING'

const EXPECTED_PRODUCT_HEADERS = [
  'Mã nhóm SP (product_code) *',
  'Tên sản phẩm gốc (product_name) *',
  'Mã danh mục (category_code) *',
  'Mã thương hiệu (brand_code)',
  'Mã SKU (sku) *',
  'Tên biến thể (variant_name) *',
  'Đơn vị tính (unit) *',
  'Màu sắc (color)',
  'Kích thước (size)',
  'Giá vốn (cost_price) *',
  'Giá bán (selling_price) *',
  'Quản lý Serial (serial_tracking)',
  'Thông số kỹ thuật (technical_spec)',
  'Link hình ảnh (image_urls)',
  'Mô tả (description)',
  'Tồn kho đầu kỳ (initial_stock)',
  'Định mức tồn tối thiểu (minimum_qty)',
]

/** Hộp thoại chuyên trách cho tính năng Nhập Danh mục Sản phẩm hàng loạt từ Excel. */
export function ProductImportDialog({ onSuccess, onClose }: ProductImportDialogProps) {
  const dispatch = useDispatch<AppDispatch>()
  const [importMode, setImportMode] = useState<ProductImportMode>('SKIP_EXISTING')
  const [submitJob] = useSubmitProductImportJobMutation()
  const [downloadReport] = useDownloadProductImportReportMutation()

  /** Tải file mẫu từ thư mục mẫu tích hợp sẵn */
  async function handleDownloadTemplate(): Promise<Blob> {
    const response = await fetch('/samples/products_import_sample.xlsx')
    if (!response.ok) {
      throw new Error('Không thể tải file mẫu. Vui lòng thử lại sau.')
    }
    return await response.blob()
  }

  /** Gửi file Excel cùng chế độ import lên API Backend */
  async function handleSubmitFile(file: File): Promise<{ jobId: string }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('importMode', importMode)
    const res = await submitJob(formData).unwrap()
    return res
  }

  /** Lấy thông tin tiến độ xử lý ngầm (Redis snapshot) */
  async function handleFetchProgress(jobId: string) {
    const action = dispatch(
      productApi.endpoints.getProductImportProgress.initiate(jobId, { forceRefetch: true }),
    )
    return await action.unwrap()
  }

  /** Tải file Excel báo cáo các dòng dữ liệu bị lỗi */
  async function handleDownloadReport(jobId: string): Promise<Blob> {
    return await downloadReport(jobId).unwrap()
  }

  const extraNotes = (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="import-mode-select" className="font-semibold text-slate-900">
          Chế độ xử lý SKU trùng:
        </label>
        <select
          id="import-mode-select"
          value={importMode}
          onChange={(e) => setImportMode(e.target.value as ProductImportMode)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="SKIP_EXISTING">Bỏ qua SKU đã tồn tại (Chỉ tạo mới)</option>
          <option value="OVERWRITE_EXISTING">Ghi đè/Cập nhật thông tin nếu đã có SKU</option>
        </select>
      </div>
      <p className="mt-2 text-slate-500">
        Lưu ý: Dòng 1 là nhóm gộp, dòng 2 là tiêu đề cột. Dữ liệu bắt đầu đọc từ dòng số 3. Danh mục
        và thương hiệu phải tồn tại sẵn ở trạng thái Hoạt động.
      </p>
    </div>
  )

  return (
    <CatalogImportDialog
      title="Nhập sản phẩm từ Excel"
      entityName="sản phẩm"
      templateFileName="Product_Import_Template.xlsx"
      reportFileName="Product_Import_Errors.xlsx"
      headers={EXPECTED_PRODUCT_HEADERS}
      extraNotes={extraNotes}
      onDownloadTemplate={handleDownloadTemplate}
      onSubmitFile={handleSubmitFile}
      onFetchProgress={handleFetchProgress}
      onDownloadReport={handleDownloadReport}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  )
}

