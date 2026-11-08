import { useState } from 'react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import type { useBundleManagement } from '../hooks/useBundleManagement'
import { bundleButtonClass, bundleDangerClass, bundlePrimaryClass } from '../lib/bundle'
import { BundleForm } from './BundleForm'
import { BundleDetails } from './BundleDetails'

const labels = { create: 'Tạo combo', edit: 'Sửa combo', view: 'Chi tiết combo', delete: 'Xóa combo', publish: 'Công bố combo', unpublish: 'Ngừng công bố combo' }
export function BundleDialog({ management: m }: { management: ReturnType<typeof useBundleManagement> }) {
  const [openedAt] = useState(() => Date.now())
  const dialog = m.dialog
  if (!dialog) return null
  const bundle = dialog.mode === 'create' ? undefined : dialog.bundle
  const publishedEdit = dialog.mode === 'edit' && bundle?.publicationStatus === 'PUBLISHED'
  const invalidPublish = dialog.mode === 'publish' && bundle && (bundle.productStatus !== 'ACTIVE' || !bundle.validFrom || !bundle.validUntil || Date.parse(bundle.validUntil) <= openedAt || Boolean(bundle.priceIssue) || bundle.items.some((item) => !item.sellable))
  const invalidUnpublish = dialog.mode === 'unpublish' && bundle?.publicationStatus !== 'PUBLISHED'
  return <ManagementDialog size={dialog.mode === 'create' || dialog.mode === 'edit' ? 'wide' : 'default'} title={labels[dialog.mode]} onClose={m.close} closeDisabled={m.pending || m.loadingDetail}>
    {(dialog.mode === 'create' || dialog.mode === 'edit') && !publishedEdit ? <>
      {m.blocked && bundle && <div className="space-y-2 px-5 pt-4 text-sm"><p>Tải lại sẽ thay nội dung đang nhập bằng dữ liệu mới trên máy chủ.</p><button type="button" className={bundleButtonClass} disabled={m.loadingDetail} onClick={() => void m.reloadDialog()}>{m.loadingDetail ? 'Đang tải...' : 'Bỏ bản đang nhập và tải lại'}</button></div>}
      <BundleForm key={`${bundle?.bundleId ?? 'new'}-${m.revision}`} bundle={bundle} pending={m.pending || m.loadingDetail} blocked={m.blocked} error={m.error} fieldErrors={m.fields} onSubmit={m.save} onClose={m.close} />
    </> : <div className="space-y-5 p-5 sm:p-6">
      {bundle && <BundleDetails bundle={bundle} />}
      {m.error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{m.error}</p>}
      {publishedEdit && <p role="alert" className="text-sm text-amber-900">Combo đang công bố. Đóng hộp thoại và chọn “Ngừng công bố” trước khi sửa nội dung.</p>}
      {invalidPublish && <p role="alert" className="text-sm text-amber-900">Chưa thể công bố: combo cần hoạt động, có lịch chưa kết thúc, giá hợp lệ và tất cả SKU còn kinh doanh.</p>}
      {invalidUnpublish && <p role="alert" className="text-sm text-amber-900">Combo hiện không được công bố. Hãy tải lại danh sách.</p>}
      {dialog.mode === 'delete' && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">Xác nhận xóa combo này? Combo sẽ bị ẩn; mã không thể tái sử dụng. Dữ liệu giao dịch cũ được giữ nguyên.</p>}
      {dialog.mode === 'publish' && !invalidPublish && <p className="text-sm text-slate-700">Công bố combo theo lịch đã đặt? Máy chủ sẽ kiểm tra lại giá, thành phần và phiên bản.</p>}
      {dialog.mode === 'unpublish' && <p className="text-sm">Ngừng hiển thị combo ở các kênh đọc combo đã công bố?</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={bundleButtonClass} disabled={m.pending || m.loadingDetail} onClick={m.close}>Đóng</button>
        {m.blocked && bundle && <button type="button" className={bundleButtonClass} disabled={m.loadingDetail} onClick={() => void m.reloadDialog()}>Tải lại dữ liệu</button>}
        {!['view', 'edit'].includes(dialog.mode) && <button type="button" className={dialog.mode === 'delete' ? bundleDangerClass : bundlePrimaryClass} disabled={m.pending || m.loadingDetail || m.blocked || Boolean(invalidPublish) || invalidUnpublish} onClick={() => void m.confirm()}>{m.pending ? 'Đang xử lý...' : labels[dialog.mode]}</button>}
      </div>
    </div>}
  </ManagementDialog>
}
