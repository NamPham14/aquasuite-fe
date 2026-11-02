import { useDispatch } from 'react-redux'
import type { AppDispatch } from '../../../app/store.ts'
import {
  brandApi,
  useDownloadBrandImportReportMutation,
  useDownloadBrandImportTemplateMutation,
  useSubmitBrandImportJobMutation,
} from '../api/brandApi.ts'
import { CatalogImportDialog } from './CatalogImportDialog.tsx'

export interface BrandImportDialogProps {
  /** Callback khi import thành công ít nhất 1 thương hiệu */
  onSuccess?: () => void
  /** Callback đóng hộp thoại */
  onClose: () => void
}

/** Hộp thoại chuyên trách cho tính năng Import Thương hiệu từ Excel. */
export function BrandImportDialog({ onSuccess, onClose }: BrandImportDialogProps) {
  const dispatch = useDispatch<AppDispatch>()
  const [downloadTemplate] = useDownloadBrandImportTemplateMutation()
  const [submitJob] = useSubmitBrandImportJobMutation()
  const [downloadReport] = useDownloadBrandImportReportMutation()

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
      brandApi.endpoints.getBrandImportProgress.initiate(jobId, { forceRefetch: true }),
    )
    return await action.unwrap()
  }

  async function handleDownloadReport(jobId: string): Promise<Blob> {
    return await downloadReport(jobId).unwrap()
  }

  return (
    <CatalogImportDialog
      title="Nhập thương hiệu từ Excel"
      entityName="thương hiệu"
      templateFileName="Brand_Import_Template.xlsx"
      reportFileName="Brand_Import_Report.xlsx"
      headers={['code', 'name', 'description', 'status']}
      onDownloadTemplate={handleDownloadTemplate}
      onSubmitFile={handleSubmitFile}
      onFetchProgress={handleFetchProgress}
      onDownloadReport={handleDownloadReport}
      onSuccess={onSuccess}
      onClose={onClose}
    />
  )
}
