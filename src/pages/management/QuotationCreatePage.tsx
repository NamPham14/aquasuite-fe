import { QuotationEditor } from '../../features/sales'

export function QuotationCreatePage() {
  return (
    <div className="mx-auto max-w-7xl py-2 px-2 sm:px-4">
      <QuotationEditor isEditMode={false} />
    </div>
  )
}

