import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useGetQuotationQuery, QuotationEditor } from '../../features/sales'
import { Button } from '../../shared/ui/Button'

export function QuotationEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: quotation, isLoading, isError, error } = useGetQuotationQuery(id as string, {
    skip: !id,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-aqs-accent motion-reduce:animate-none" />
        <p className="text-sm font-medium text-aqs-ink-muted">Đang tải thông tin báo giá...</p>
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-aqs-danger-soft text-aqs-danger">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="mb-1 text-base font-bold text-aqs-ink">
          Không tìm thấy báo giá yêu cầu
        </h3>
        <p className="mb-4 text-xs text-aqs-ink-muted">
          {(error as any)?.data?.message || 'Báo giá này không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <Button variant="secondary" onClick={() => navigate('/app/quotations')}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại danh sách báo giá
        </Button>
      </div>
    )
  }

  const quotationData = (quotation as any)?.data || quotation

  return (
    <div className="mx-auto max-w-7xl py-2 px-2 sm:px-4">
      <QuotationEditor initialData={quotationData} isEditMode={true} />
    </div>
  )
}

