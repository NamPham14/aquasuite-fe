import { useRef, useState, type FormEvent } from 'react'
import { useStore } from 'react-redux'
import { KeyRound, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { usePermissionsQuery, useCreatePermissionMutation, useUpdatePermissionMutation, useDeletePermissionMutation, type IamPermission, type PermissionQuery } from '../../features/iam'
import type { RootState } from '../../app/store'
import { ManagementPageHeader, ManagementFilterBar, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../shared/api/apiError'
import { IamAccessGate } from './IamAccessGate'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions'

const btn = 'rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50'
type Dialog = { mode: 'create' } | { mode: 'edit' | 'delete' | 'view'; item: IamPermission }
export function PermissionsPage() { return <IamAccessGate><PermissionsContent /></IamAccessGate> }

function PermissionsContent() {
  const store = useStore<RootState>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [sortBy, setSort] = useState<PermissionQuery['sortBy']>('code')
  const [direction, setDirection] = useState<PermissionQuery['direction']>('asc')
  const list = usePermissionsQuery({ page, size: 20, search: search.trim() || undefined, sortBy, direction })
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [invalidField, setInvalidField] = useState<'code' | 'description' | null>(null)
  const [needsReload, setNeedsReload] = useState(false)
  const [create, createState] = useCreatePermissionMutation()
  const [update, updateState] = useUpdatePermissionMutation()
  const [remove, removeState] = useDeletePermissionMutation()
  const inFlight = useRef(false)
  const pending = createState.isLoading || updateState.isLoading || removeState.isLoading
  const open = (next: Dialog) => { setError(''); setInvalidField(null); setCode(next.mode === 'create' ? '' : next.item.code); setDescription(next.mode === 'create' ? '' : next.item.description ?? ''); setDialog(next) }
  const columns: ManagementTableColumn<IamPermission>[] = [
    { key: 'code', header: 'Mã quyền', cell: (item) => item.code },
    { key: 'description', header: 'Mô tả', cellClassName: 'whitespace-normal min-w-48', cell: (item) => item.description || '—' },
    { key: 'actions', header: 'Thao tác', cell: (item) => <ManagementRowActions actions={[
      { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.code}`, disabled: needsReload, onClick: () => open({ mode: 'view', item }) },
      { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.code}`, disabled: needsReload, onClick: () => open({ mode: 'edit', item }) },
      { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.code}`, disabled: needsReload, onClick: () => open({ mode: 'delete', item }) },
    ]} /> },
  ]
  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!dialog || dialog.mode === 'view' || inFlight.current) return
    const normalized = code.trim().toUpperCase()
    if (dialog.mode === 'create' && (!/^[A-Z][A-Z0-9_]*$/.test(normalized) || normalized.length > 150 || normalized.startsWith('ROLE_'))) { setInvalidField('code'); setError('Mã phải bắt đầu bằng chữ cái, chỉ gồm chữ hoa, số, dấu gạch dưới, tối đa 150 ký tự và không bắt đầu ROLE_.'); return }
    if (description.trim().length > 500) { setInvalidField('description'); setError('Mô tả tối đa 500 ký tự.'); return }
    setError(''); setInvalidField(null); inFlight.current = true
    const before = store.getState()
    try {
      const result = dialog.mode === 'create' ? await create({ code: normalized, description: description.trim() || null }).unwrap() : dialog.mode === 'edit' ? await update({ id: dialog.item.id, description: description.trim() || null }).unwrap() : await remove(dialog.item.id).unwrap()
      const current = store.getState()
      if (current.auth.sessionGeneration !== before.auth.sessionGeneration || current.iamAccess.epoch !== before.iamAccess.epoch) return
      if (!result.success || (dialog.mode !== 'delete' && !result.data)) throw Object.assign(new Error('Phản hồi không hợp lệ'), { status: 'PARSING_ERROR' })
      setDialog(null)
      toast.success(dialog.mode === 'create' ? 'Đã tạo quyền.' : dialog.mode === 'edit' ? 'Đã cập nhật quyền.' : 'Đã xóa quyền.')
    } catch (err) {
      const current = store.getState()
      if (current.auth.sessionGeneration !== before.auth.sessionGeneration || current.iamAccess.epoch !== before.iamAccess.epoch) return
      const parsed = normalizeApiError(err)
      if (parsed.status === 'FETCH_ERROR' || parsed.status === 'TIMEOUT_ERROR' || parsed.status === 'PARSING_ERROR' || (typeof parsed.status === 'number' && parsed.status >= 500)) { setDialog(null); setNeedsReload(true); toast.warning('Chưa xác định kết quả. Hãy tải lại dữ liệu trước khi thao tác tiếp.') }
      else {
        const message = parsed.code === 'IAM_006' ? 'Không thể xóa quyền đang được gán cho vai trò.' : parsed.code === 'IAM_005' ? 'Mã quyền đã tồn tại.' : parsed.message
        setError(message)
        toast.error(message)
        if (parsed.status === 404 || parsed.status === 409) void list.refetch()
      }
    } finally { inFlight.current = false }
  }
  return <div className="space-y-5">
    <ManagementPageHeader title="Quản lý Quyền" description="Danh mục quyền trong hệ thống" breadcrumb="Quyền" icon={<KeyRound className="h-6 w-6" />} />
    <div className="flex justify-end"><button disabled={needsReload} className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={() => open({ mode: 'create' })}><Plus className="h-4 w-4" />Thêm quyền</button></div>
    <ManagementFilterBar><ManagementSearch id="permission-search" label="Tìm kiếm" value={search} onChange={(value) => { setSearch(value); setPage(0) }} placeholder="Tìm mã hoặc mô tả" /><ManagementSelect id="permission-sort" label="Sắp xếp theo" value={sortBy} onChange={(value) => { setSort(value as PermissionQuery['sortBy']); setPage(0) }}><option value="code">Mã</option><option value="description">Mô tả</option><option value="id">ID</option></ManagementSelect><ManagementSelect id="permission-direction" label="Thứ tự" value={direction} onChange={(value) => { setDirection(value as PermissionQuery['direction']); setPage(0) }}><option value="asc">Tăng dần</option><option value="desc">Giảm dần</option></ManagementSelect></ManagementFilterBar>
    {needsReload && <button className={btn} onClick={() => { void list.refetch().unwrap().then(() => { setNeedsReload(false); toast.success('Đã tải lại dữ liệu. Vui lòng kiểm tra trước khi tiếp tục.') }).catch(() => toast.error('Không tải lại được dữ liệu. Vui lòng thử lại.')) }}>Tải lại dữ liệu</button>}
    <section className="rounded-lg border border-slate-200 bg-white"><h2 id="permission-list" className="p-4 font-semibold">Danh sách quyền</h2>{list.isLoading ? <p role="status" className="p-4">Đang tải...</p> : list.isError ? <div className="p-4"><p role="alert">Không tải được danh sách quyền. {normalizeApiError(list.error).message}</p><p className="mt-1 text-xs text-slate-600">Mã lỗi: {normalizeApiError(list.error).code || String(normalizeApiError(list.error).status || 'không xác định')}</p><button className={`${btn} mt-3`} onClick={() => void list.refetch()}>Thử lại</button></div> : <><ManagementTable columns={columns} rows={list.data?.data?.items ?? []} rowKey={(item) => item.id} labelledBy="permission-list" emptyMessage="Không tìm thấy quyền." /><div className="flex flex-wrap items-center gap-3 border-t border-slate-100 p-4 text-sm"><button className={btn} disabled={page === 0} onClick={() => setPage(page - 1)}>Trước</button><span>Trang {page + 1} / {Math.max(1, list.data?.data?.totalPages ?? 0)}</span><button className={btn} disabled={page + 1 >= (list.data?.data?.totalPages ?? 0)} onClick={() => setPage(page + 1)}>Tiếp</button><span>Tổng số: {list.data?.data?.totalElements ?? 0}</span></div></>}</section>
    {dialog && <ManagementDialog title={dialog.mode === 'create' ? 'Thêm quyền' : dialog.mode === 'edit' ? 'Sửa quyền' : dialog.mode === 'view' ? 'Chi tiết quyền' : 'Xác nhận xóa quyền'} closeDisabled={pending} onClose={() => { if (!inFlight.current) setDialog(null) }}>
      <ManagementForm onSubmit={submit} onClose={() => { if (!inFlight.current) setDialog(null) }} readOnly={dialog.mode === 'view'} submitDisabled={pending} closeDisabled={pending} submitLabel={pending ? 'Đang xử lý...' : dialog.mode === 'delete' ? 'Xóa quyền' : 'Lưu'}>
        {dialog.mode === 'delete' ? <p>Bạn muốn xóa quyền {dialog.item.code}? Quyền đang được gán cho vai trò sẽ không thể xóa.</p> : <><ManagementFormField id="iam-permission-code" label="Mã quyền" hint="Chữ cái, chữ số và dấu gạch dưới; không bắt đầu ROLE_." error={invalidField === 'code' ? error : undefined}><input id="iam-permission-code" className={managementFieldClass} value={code} disabled={dialog.mode !== 'create' || pending} onChange={(event) => setCode(event.target.value)} aria-invalid={invalidField === 'code'} aria-describedby={invalidField === 'code' ? 'iam-permission-code-error' : 'iam-permission-code-hint'} /></ManagementFormField><ManagementFormField id="iam-permission-description" label="Mô tả" hint="Không bắt buộc, tối đa 500 ký tự." error={invalidField === 'description' ? error : undefined}><textarea id="iam-permission-description" className={managementFieldClass} rows={4} value={description} disabled={dialog.mode === 'view' || pending} onChange={(event) => setDescription(event.target.value)} aria-invalid={invalidField === 'description'} aria-describedby={invalidField === 'description' ? 'iam-permission-description-error' : 'iam-permission-description-hint'} /></ManagementFormField></>}
        {error && !invalidField && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </ManagementForm>
    </ManagementDialog>}
  </div>
}
