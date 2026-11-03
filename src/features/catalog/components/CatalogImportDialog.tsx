import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { getCatalogErrorState, translateImportJobReason } from '../lib/catalogError.ts'
import { downloadBlobAsFile } from '../lib/fileDownload.ts'
import type { CatalogImportJob } from '../types/import.types.ts'

const MAX_FILE_BYTES = 5_242_880 // 5 MiB

export interface CatalogImportDialogProps {
  /** Tiêu đề modal (vd: 'Nhập thương hiệu từ Excel') */
  title: string
  /** Tên thực thể dạng chữ thường (vd: 'thương hiệu', 'danh mục') */
  entityName: string
  /** Tên file mẫu khi tải về */
  templateFileName: string
  /** Tên file báo cáo kết quả khi tải về */
  reportFileName: string
  /** Danh sách tên các cột header theo đúng thứ tự */
  headers: string[]
  /** Hướng dẫn nghiệp vụ bổ sung (nếu có, ví dụ lưu ý về danh mục cha) */
  extraNotes?: React.ReactNode
  /** Hàm tải file template từ BE */
  onDownloadTemplate: () => Promise<Blob>
  /** Hàm gửi file multipart lên BE nhận jobId */
  onSubmitFile: (file: File) => Promise<{ jobId: string }>
  /** Hàm lấy tiến độ job theo jobId */
  onFetchProgress: (jobId: string) => Promise<CatalogImportJob>
  /** Hàm tải file báo cáo lỗi/kết quả */
  onDownloadReport: (jobId: string) => Promise<Blob>
  /** Callback gọi khi kết thúc import có ít nhất 1 dòng thành công */
  onSuccess?: () => void
  /** Callback đóng modal */
  onClose: () => void
}

type DialogStep = 'idle' | 'uploading' | 'processing' | 'finished'

export function CatalogImportDialog({
  title,
  entityName,
  templateFileName,
  reportFileName,
  headers,
  extraNotes,
  onDownloadTemplate,
  onSubmitFile,
  onFetchProgress,
  onDownloadReport,
  onSuccess,
  onClose,
}: CatalogImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<DialogStep>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileError, setFileError] = useState('')
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const [isDownloadingReport, setIsDownloadingReport] = useState(false)

  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<CatalogImportJob | null>(null)
  const [generalError, setGeneralError] = useState('')

  // Hiển thị dialog modal
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [])

  // Polling tiến độ khi đang ở bước processing
  useEffect(() => {
    if (step !== 'processing' || !jobId) return

    let isMounted = true
    let timerId: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const currentJob = await onFetchProgress(jobId!)
        if (!isMounted) return
        setJob(currentJob)

        const isTerminal =
          currentJob.status === 'COMPLETED' ||
          currentJob.status === 'COMPLETED_WITH_ERRORS' ||
          currentJob.status === 'FAILED'

        if (isTerminal) {
          setStep('finished')
          if (currentJob.createdRows > 0) {
            onSuccess?.()
          }
        } else {
          timerId = setTimeout(poll, 1000)
        }
      } catch (err) {
        if (!isMounted) return
        setGeneralError(getCatalogErrorState(err).message)
        timerId = setTimeout(poll, 2000)
      }
    }

    void poll()

    return () => {
      isMounted = false
      if (timerId) clearTimeout(timerId)
    }
  }, [step, jobId, onFetchProgress, onSuccess])

  function validateFile(file: File): string | null {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx')) {
      return 'Chỉ chấp nhận file định dạng Excel (.xlsx).'
    }
    if (file.size === 0) {
      return 'File đã chọn không có nội dung (0 bytes).'
    }
    if (file.size > MAX_FILE_BYTES) {
      return 'Dung lượng file vượt quá giới hạn tối đa 5 MiB.'
    }
    return null
  }

  function handleFileSelected(file: File) {
    const error = validateFile(file)
    if (error) {
      setFileError(error)
      setSelectedFile(null)
    } else {
      setFileError('')
      setSelectedFile(file)
      setGeneralError('')
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelected(files[0]!)
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelected(files[0]!)
    }
  }

  async function handleDownloadTemplate() {
    setIsDownloadingTemplate(true)
    try {
      const blob = await onDownloadTemplate()
      downloadBlobAsFile(blob, templateFileName)
      toast.success('Đã tải file mẫu thành công.')
    } catch (err) {
      toast.error(getCatalogErrorState(err).message || 'Không thể tải file mẫu.')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  async function handleDownloadReport() {
    if (!jobId) return
    setIsDownloadingReport(true)
    try {
      const blob = await onDownloadReport(jobId)
      downloadBlobAsFile(blob, reportFileName)
      toast.success('Đã tải báo cáo kết quả thành công.')
    } catch (err) {
      toast.error(getCatalogErrorState(err).message || 'Không thể tải báo cáo kết quả.')
    } finally {
      setIsDownloadingReport(false)
    }
  }

  async function handleStartImport() {
    if (!selectedFile) return
    const error = validateFile(selectedFile)
    if (error) {
      setFileError(error)
      return
    }

    setStep('uploading')
    setGeneralError('')
    try {
      const res = await onSubmitFile(selectedFile)
      setJobId(res.jobId)
      setStep('processing')
    } catch (err) {
      setStep('idle')
      setGeneralError(getCatalogErrorState(err).message || 'Không thể gửi yêu cầu import.')
    }
  }

  function handleReset() {
    setStep('idle')
    setSelectedFile(null)
    setFileError('')
    setGeneralError('')
    setJobId(null)
    setJob(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isBusy = step === 'uploading' || step === 'processing'

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40"
      onCancel={(e) => {
        if (isBusy) {
          e.preventDefault()
        } else {
          onClose()
        }
      }}
    >
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">
                Nhập hàng loạt {entityName} nhanh chóng từ bảng tính Excel
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Thông báo lỗi tổng quát nếu có */}
          {generalError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div className="space-y-1">
                <p className="font-medium">Có lỗi xảy ra</p>
                <p>{generalError}</p>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 1: CHUẨN BỊ & CHỌN FILE (idle) */}
          {step === 'idle' && (
            <div className="space-y-5">
              {/* Card tải template và hướng dẫn */}
              <div className="flex flex-col gap-3 rounded-lg border border-sky-100 bg-sky-50/60 p-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-900">1. Tải về file mẫu Excel</p>
                  <p className="text-xs text-slate-600">
                    File mẫu chứa sẵn cấu trúc header chuẩn:{' '}
                    <code className="rounded bg-sky-100 px-1 py-0.5 font-mono text-sky-900">
                      {headers.join(', ')}
                    </code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadTemplate()}
                  disabled={isDownloadingTemplate}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800 shadow-xs hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50"
                >
                  {isDownloadingTemplate ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Tải file mẫu
                </button>
              </div>

              {/* Vùng chọn / kéo thả file */}
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">2. Chọn file cần nhập</p>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                    isDragging
                      ? 'border-sky-500 bg-sky-50/50'
                      : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB — Bấm để chọn file khác
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-slate-800">
                          Kéo thả file .xlsx vào đây, hoặc{' '}
                          <span className="font-semibold text-sky-700">chọn từ máy tính</span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Dung lượng tối đa 5 MiB (tối đa 10.000 dòng dữ liệu)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {fileError && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600" role="alert">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              {/* Hướng dẫn nghiệp vụ */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600 space-y-1.5">
                <p className="font-semibold text-slate-800">Quy tắc nhập dữ liệu:</p>
                <ul className="list-inside list-disc space-y-1 text-slate-600">
                  <li>Sheet đầu tiên chứa dữ liệu; dòng 1 là tiêu đề cột bắt buộc.</li>
                  <li>
                    Mã (code) viết hoa không dấu, chỉ gồm chữ hoa, số và gạch dưới (1–50 ký tự).
                  </li>
                  <li>Tên không quá 100 ký tự; Mô tả không quá 5000 ký tự.</li>
                  <li>Trạng thái chỉ nhận ACTIVE hoặc INACTIVE (để trống mặc định là ACTIVE).</li>
                  <li>
                    Các dòng trùng mã hoặc tên đã có trong hệ thống hoặc lặp lại trong file sẽ được tự
                    động bỏ qua.
                  </li>
                  {extraNotes}
                </ul>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 2: ĐANG UPLOAD / XỬ LÝ (uploading | processing) */}
          {(step === 'uploading' || step === 'processing') && (
            <div className="space-y-6 py-4" aria-live="polite">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {step === 'uploading'
                    ? 'Đang tải file lên máy chủ...'
                    : job?.status === 'QUEUED'
                      ? 'Đang xếp hàng chờ xử lý...'
                      : 'Đang tiến hành xử lý dữ liệu...'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {step === 'uploading'
                    ? 'Vui lòng giữ nguyên kết nối mạng.'
                    : 'Hệ thống đang kiểm tra từng dòng và ghi vào cơ sở dữ liệu.'}
                </p>
              </div>

              {/* Thanh tiến độ */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Tiến độ thực hiện</span>
                  <span>{job?.percentage != null ? `${job.percentage}%` : 'Đang chuẩn bị...'}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-sky-600 transition-all duration-300"
                    style={{ width: `${job?.percentage ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Bảng số liệu chi tiết */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                  <p className="text-xs text-slate-500">Tổng số dòng</p>
                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {job?.totalRows != null ? job.totalRows : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                  <p className="text-xs text-emerald-700 font-medium">Thành công</p>
                  <p className="mt-1 text-lg font-bold text-emerald-800">
                    {job?.createdRows ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium">Bỏ qua (Trùng)</p>
                  <p className="mt-1 text-lg font-bold text-amber-800">
                    {job?.skippedRows ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-center">
                  <p className="text-xs text-rose-700 font-medium">Lỗi</p>
                  <p className="mt-1 text-lg font-bold text-rose-800">{job?.errorRows ?? 0}</p>
                </div>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 3: KẾT THÚC (finished) */}
          {step === 'finished' && job && (
            <div className="space-y-6 py-2">
              {/* Kết quả */}
              {job.status === 'COMPLETED' && (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Nhập dữ liệu thành công hoàn toàn!
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Toàn bộ {job.createdRows} {entityName} hợp lệ đã được thêm vào hệ thống.
                  </p>
                </div>
              )}

              {job.status === 'COMPLETED_WITH_ERRORS' && (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Đã hoàn tất với một số lưu ý
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Đã tạo thành công {job.createdRows} {entityName}. Một số dòng đã bị bỏ qua do
                    trùng lặp ({job.skippedRows}) hoặc phát hiện lỗi dữ liệu ({job.errorRows}).
                  </p>
                </div>
              )}

              {job.status === 'FAILED' && (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <XCircle className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">Nhập dữ liệu thất bại</h3>
                  <p className="mt-1 text-xs text-rose-700">
                    {translateImportJobReason(job.message)}
                  </p>
                </div>
              )}

              {/* Thống kê chi tiết */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-center">
                  <p className="text-xs text-slate-500">Tổng số dòng</p>
                  <p className="mt-1 text-lg font-bold text-slate-800">
                    {job.totalRows ?? job.processedRows}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-center">
                  <p className="text-xs text-emerald-700 font-medium">Thành công</p>
                  <p className="mt-1 text-lg font-bold text-emerald-800">{job.createdRows}</p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium">Bỏ qua (Trùng)</p>
                  <p className="mt-1 text-lg font-bold text-amber-800">{job.skippedRows}</p>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 text-center">
                  <p className="text-xs text-rose-700 font-medium">Lỗi</p>
                  <p className="mt-1 text-lg font-bold text-rose-800">{job.errorRows}</p>
                </div>
              </div>

              {/* Nút tải báo cáo chi tiết */}
              {(job.status === 'COMPLETED_WITH_ERRORS' ||
                job.errorRows > 0 ||
                job.skippedRows > 0 ||
                job.status === 'FAILED') && (
                <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 sm:flex-row">
                  <div>
                    <p className="font-medium text-slate-900">Báo cáo chi tiết từng dòng</p>
                    <p className="text-slate-500">
                      Tải file Excel để tra cứu cụ thể số dòng, lý do lỗi hoặc lý do trùng lặp.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDownloadReport()}
                    disabled={isDownloadingReport}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50"
                  >
                    {isDownloadingReport ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Tải báo cáo (.xlsx)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          {step === 'idle' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!selectedFile}
                onClick={() => void handleStartImport()}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-xs font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                Bắt đầu nhập
              </button>
            </>
          )}

          {isBusy && (
            <p className="text-xs text-slate-500 italic">
              Vui lòng không đóng trình duyệt trong khi đang xử lý...
            </p>
          )}

          {step === 'finished' && (
            <>
              {job?.status === 'FAILED' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Thử lại với file khác
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-9 items-center justify-center rounded-md bg-sky-700 px-4 text-xs font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
