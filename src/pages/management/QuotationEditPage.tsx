import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useGetQuotationQuery, QuotationEditor } from '../../features/sales'

export function QuotationEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: quotation, isLoading, isError, error } = useGetQuotationQuery(id as string, {
    skip: !id,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Đang tải thông tin báo giá...</p>
      </div>
    )
  }

  if (isError || !quotation) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-3 text-rose-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Không tìm thấy báo giá yêu cầu
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          {(error as any)?.data?.message || 'Báo giá này không tồn tại hoặc bạn không có quyền truy cập.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/quotations')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại danh sách báo giá</span>
        </button>
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

