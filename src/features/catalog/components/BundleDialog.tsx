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
  const compactConfirmation = dialog.mode === 'delete' || dialog.mode === 'unpublish'
  return <ManagementDialog size={['create', 'edit', 'view'].includes(dialog.mode) ? 'wide' : 'default'} title={labels[dialog.mode]} onClose={m.close} closeDisabled={m.pending || m.loadingDetail}>
    {(dialog.mode === 'create' || dialog.mode === 'edit') && !publishedEdit ? <>
      {m.blocked && bundle && <div className="space-y-2 px-5 pt-4 text-sm"><p>Tải lại sẽ thay nội dung đang nhập bằng dữ liệu mới trên máy chủ.</p><button type="button" className={bundleButtonClass} disabled={m.loadingDetail} onClick={() => void m.reloadDialog()}>{m.loadingDetail ? 'Đang tải...' : 'Bỏ bản đang nhập và tải lại'}</button></div>}
      <BundleForm key={`${bundle?.bundleId ?? 'new'}-${m.revision}`} bundle={bundle} pending={m.pending || m.loadingDetail} blocked={m.blocked} error={m.error} fieldErrors={m.fields} onSubmit={m.save} onClose={m.close} />
    </> : <div className="space-y-5 p-5 sm:p-6">
      {bundle && (compactConfirmation ? <div className="space-y-4">
        <p className="text-base font-semibold text-slate-900">{dialog.mode === 'delete' ? 'Xác nhận xóa combo này?' : 'Bạn muốn ngừng công bố combo này?'}</p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="break-words font-semibold text-slate-900">{bundle.name}</p><p className="mt-1 break-all text-sm text-slate-600">Mã combo: {bundle.productCode}</p></div>
        {dialog.mode === 'delete' ? <div className="rounded-lg bg-rose-50 p-4 text-sm leading-relaxed text-rose-800">
          <p className="font-semibold">Sau khi xóa:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5"><li>Combo sẽ bị ẩn khỏi danh sách.</li><li>Mã combo không thể tái sử dụng.</li><li>Dữ liệu giao dịch cũ được giữ nguyên.</li></ul>
        </div> : <div className="rounded-lg bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <p className="font-semibold">Sau khi ngừng công bố:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5"><li>Combo không còn hiển thị trong danh sách combo đã công bố.</li><li>Combo vẫn được giữ trong trang quản lý để bạn xem và chỉnh sửa.</li><li>Bạn có thể công bố lại khi combo đáp ứng đủ điều kiện.</li></ul>
        </div>}
      </div> : <BundleDetails bundle={bundle} />)}
      {m.error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{m.error}</p>}
      {publishedEdit && <p role="alert" className="text-sm text-amber-900">Combo đang công bố. Đóng hộp thoại và chọn “Ngừng công bố” trước khi sửa nội dung.</p>}
      {invalidPublish && <p role="alert" className="text-sm text-amber-900">Chưa thể công bố: combo cần hoạt động, có lịch chưa kết thúc, giá hợp lệ và tất cả SKU còn kinh doanh.</p>}
      {invalidUnpublish && <p role="alert" className="text-sm text-amber-900">Combo hiện không được công bố. Hãy tải lại danh sách.</p>}
      {dialog.mode === 'publish' && !invalidPublish && <p className="text-sm text-slate-700">Công bố combo theo lịch đã đặt? Máy chủ sẽ kiểm tra lại giá, thành phần và phiên bản.</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        <button type="button" autoFocus={compactConfirmation} className={bundleButtonClass} disabled={m.pending || m.loadingDetail} onClick={m.close}>{compactConfirmation ? 'Hủy' : 'Đóng'}</button>
        {m.blocked && bundle && <button type="button" className={bundleButtonClass} disabled={m.loadingDetail} onClick={() => void m.reloadDialog()}>Tải lại dữ liệu</button>}
        {!['view', 'edit'].includes(dialog.mode) && <button type="button" className={dialog.mode === 'delete' ? bundleDangerClass : bundlePrimaryClass} disabled={m.pending || m.loadingDetail || m.blocked || Boolean(invalidPublish) || invalidUnpublish} onClick={() => void m.confirm()}>{m.pending ? (dialog.mode === 'delete' ? 'Đang xóa...' : dialog.mode === 'unpublish' ? 'Đang ngừng công bố...' : 'Đang xử lý...') : labels[dialog.mode]}</button>}
      </div>
    </div>}
  </ManagementDialog>
}
