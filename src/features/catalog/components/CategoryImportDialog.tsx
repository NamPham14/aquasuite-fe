import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../../../app/store.ts'
import {
  categoryApi,
  useDownloadCategoryImportReportMutation,
  useDownloadCategoryImportTemplateMutation,
  useSubmitCategoryImportJobMutation,
} from '../api/categoryApi.ts'
import { CatalogImportDialog } from './CatalogImportDialog.tsx'

export interface CategoryImportDialogProps {
  /** Callback khi import thành công ít nhất 1 danh mục */
  onSuccess?: () => void
  /** Callback đóng hộp thoại */
  onClose: () => void
}

/** Hộp thoại chuyên trách cho tính năng Import Danh mục từ Excel. */
export function CategoryImportDialog({ onSuccess, onClose }: CategoryImportDialogProps) {
  const dispatch = useDispatch<AppDispatch>()
  const [downloadTemplate] = useDownloadCategoryImportTemplateMutation()
  const [submitJob] = useSubmitCategoryImportJobMutation()
  const [downloadReport] = useDownloadCategoryImportReportMutation()

  async function handleDownloadTemplate(): Promise<Blob> {
    return await downloadTemplate().unwrap()
  }

  async function handleSubmitFile(file: File): Promise<{ jobId: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await submitJob(formData).unwrap()
    return res
  }

  async function handleFetchProgress(jobId: string) {
    const action = dispatch(
      categoryApi.endpoints.getCategoryImportProgress.initiate(jobId, { forceRefetch: true }),
    )
    return await action.unwrap()
  }

  async function handleDownloadReport(jobId: string): Promise<Blob> {
    return await downloadReport(jobId).unwrap()
  }

  return (
    <CatalogImportDialog
      title="Nhập danh mục từ Excel"
      entityName="danh mục"
      templateFileName="Category_Import_Template.xlsx"
      reportFileName="Category_Import_Report.xlsx"
      headers={['code', 'name', 'parent_code', 'description', 'status']}
      extraNotes={
        <li>
          <strong className="text-slate-700">Danh mục cha (parent_code):</strong> Để trống nếu là
          danh mục gốc. Nếu có mã cha, danh mục cha phải tồn tại sẵn trong hệ thống trước khi import
          (không hỗ trợ tạo cha ở dòng trên và gán con ở dòng dưới trong cùng một file).
        </li>
      }
      onDownloadTemplate={handleDownloadTemplate}
      onSubmitFile={handleSubmitFile}
      onFetchProgress={handleFetchProgress}
      onDownloadReport={handleDownloadReport}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  )
}
