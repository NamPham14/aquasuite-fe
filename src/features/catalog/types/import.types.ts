/** Trạng thái tiến trình nhập dữ liệu từ Excel theo contract BE. */
export type CatalogImportJobStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_ERRORS'
  | 'FAILED'

/** Dữ liệu tiến trình của một job import từ Redis snapshot của BE. */
export interface CatalogImportJob {
  jobId: string
  status: CatalogImportJobStatus
  totalRows: number | null
  processedRows: number
  createdRows: number
  skippedRows: number
  errorRows: number
  percentage: number | null
  message: string | null
  startedAt: string | null
  finishedAt: string | null
}

/** Phản hồi sau khi BE chấp nhận file và tạo job tạm thời (HTTP 202). */
export interface CatalogImportSubmitResponse {
  jobId: string
  status: string
}
