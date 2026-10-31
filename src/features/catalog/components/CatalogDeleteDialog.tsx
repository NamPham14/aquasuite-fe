import { ManagementDialog } from '../../../shared/ui/ManagementDialog'

const secondaryButton =
  'min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const deleteButton =
  'min-h-10 rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-50'

/** Xác nhận thao tác xóa và giữ hộp thoại mở khi BE trả lỗi. */
export function CatalogDeleteDialog({
  kind,
  code,
  name,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  kind: 'danh mục' | 'thương hiệu'
  code: string
  name: string
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <ManagementDialog title={`Xác nhận xóa ${kind}`} onClose={onClose} closeDisabled={pending}>
      <div className="space-y-4 p-5 sm:p-6">
        <p className="font-medium text-slate-900">{code} — {name}</p>
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Thao tác này xóa vĩnh viễn {kind}. Máy chủ sẽ từ chối nếu dữ liệu đang được tham chiếu.
        </p>
        {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={secondaryButton} disabled={pending} onClick={onClose}>Hủy</button>
          <button type="button" className={deleteButton} disabled={pending} onClick={onConfirm}>
            {pending ? 'Đang xóa...' : `Xóa ${kind}`}
          </button>
        </div>
      </div>
    </ManagementDialog>
  )
}
