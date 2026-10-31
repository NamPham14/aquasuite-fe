import { useState, type FormEvent } from 'react'
import { Tags, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ManagementPageHeader, ManagementFilterBar, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions'

type Brand = { code: string; name: string; status: 'ACTIVE' | 'INACTIVE'; description: string }
type Mode = 'create' | 'edit' | 'view' | 'delete'
const initialBrands: Brand[] = [
  { code: 'BRAND-A', name: 'Thương hiệu A', status: 'ACTIVE', description: '' },
  { code: 'BRAND-B', name: 'Thương hiệu B', status: 'ACTIVE', description: '' },
  { code: 'BRAND-C', name: 'Thương hiệu C', status: 'INACTIVE', description: '' },
]
const blank: Brand = { code: '', name: '', status: 'ACTIVE', description: '' }
const button = 'inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600'
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600'

function BrandForm({ mode, item, brands, onClose, onSave }: { mode: 'create' | 'edit' | 'view'; item: Brand; brands: Brand[]; onClose: () => void; onSave: (item: Brand) => void }) {
  const [form, setForm] = useState(item)
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})
  const readOnly = mode === 'view'
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = form.code.trim().toUpperCase()
    const name = form.name.trim()
    const next = { code: !code ? 'Vui lòng nhập mã thương hiệu.' : mode === 'create' && brands.some((brand) => brand.code === code) ? 'Mã thương hiệu đã tồn tại.' : undefined, name: !name ? 'Vui lòng nhập tên thương hiệu.' : name.length > 100 ? 'Tên thương hiệu tối đa 100 ký tự.' : undefined }
    setErrors(next)
    if (!next.code && !next.name) onSave({ ...form, code, name, description: form.description.trim() })
  }
  return <ManagementDialog title={mode === 'create' ? 'Thêm thương hiệu' : mode === 'edit' ? 'Sửa thương hiệu' : 'Chi tiết thương hiệu'} onClose={onClose}>
    <ManagementForm onSubmit={submit} onClose={onClose} readOnly={readOnly} submitLabel={mode === 'create' ? 'Tạo thương hiệu' : 'Lưu thay đổi'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField id="brand-code" label="Mã thương hiệu *" error={errors.code} hint={mode === 'create' ? 'Mã sẽ được chuyển thành chữ hoa.' : undefined}><input id="brand-code" className={managementFieldClass} value={form.code} disabled={mode !== 'create'} onChange={(event) => setForm({ ...form, code: event.target.value })} aria-invalid={!!errors.code} aria-describedby={errors.code ? 'brand-code-error' : mode === 'create' ? 'brand-code-hint' : undefined} /></ManagementFormField>
        <ManagementFormField id="brand-name" label="Tên thương hiệu *" error={errors.name}><input id="brand-name" className={managementFieldClass} value={form.name} disabled={readOnly} onChange={(event) => setForm({ ...form, name: event.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'brand-name-error' : undefined} /></ManagementFormField>
        <ManagementFormField id="brand-state" label="Trạng thái *"><select id="brand-state" className={managementFieldClass} value={form.status} disabled={readOnly} onChange={(event) => setForm({ ...form, status: event.target.value as Brand['status'] })}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></ManagementFormField>
      </div>
      <ManagementFormField id="brand-description" label="Mô tả" hint="Không bắt buộc, tối đa 5000 ký tự."><textarea id="brand-description" className={managementFieldClass} rows={4} maxLength={5000} value={form.description} disabled={readOnly} onChange={(event) => setForm({ ...form, description: event.target.value })} aria-describedby="brand-description-hint" /></ManagementFormField>
    </ManagementForm>
  </ManagementDialog>
}

export function BrandsPage() {
  const [brands, setBrands] = useState(initialBrands)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState<{ mode: Mode; item: Brand } | null>(null)
  const rows = brands.filter((item) => `${item.code} ${item.name}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')) && (!status || item.status === status))
  const columns: ManagementTableColumn<Brand>[] = [
    { key: 'code', header: 'Mã thương hiệu', cell: (item) => item.code },
    { key: 'name', header: 'Tên thương hiệu', cell: (item) => item.name },
    { key: 'status', header: 'Trạng thái', cell: (item) => <span className={`rounded px-2 py-1 ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{item.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}</span> },
    { key: 'actions', header: 'Thao tác', cell: (item) => <ManagementRowActions actions={[
      { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.name}`, onClick: () => setDialog({ mode: 'view', item }) },
      { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.name}`, onClick: () => setDialog({ mode: 'edit', item }) },
      { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.name}`, onClick: () => setDialog({ mode: 'delete', item }) },
    ]} /> },
  ]
  return <div className="space-y-5">
    <ManagementPageHeader title="Quản lý Thương hiệu" description="Quản lý các thương hiệu sản phẩm" breadcrumb="Thương hiệu" group="Quản lý danh mục" icon={<Tags className="h-6 w-6" />} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Dữ liệu mẫu — thay đổi sẽ mất khi rời trang hoặc tải lại.</p><button type="button" className={primary} onClick={() => setDialog({ mode: 'create', item: blank })}><Plus className="h-4 w-4" aria-hidden="true" />Thêm thương hiệu</button></div>
    <ManagementFilterBar><ManagementSearch id="brand-search" label="Tìm kiếm" value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên..." /><ManagementSelect id="brand-filter" label="Trạng thái" value={status} onChange={setStatus}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></ManagementSelect><button type="button" className={button} onClick={() => { setSearch(''); setStatus('') }}>Làm mới</button></ManagementFilterBar>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><h2 id="brand-list" className="px-4 py-4 text-base font-semibold text-slate-900">Danh sách thương hiệu</h2><ManagementTable columns={columns} rows={rows} rowKey={(item) => item.code} labelledBy="brand-list" emptyMessage="Không tìm thấy thương hiệu phù hợp." /><p className="border-t border-slate-100 p-4 text-sm text-slate-600">Tổng số: {rows.length} thương hiệu mẫu</p></section>
    {dialog && dialog.mode !== 'delete' && <BrandForm key={`${dialog.mode}-${dialog.item.code}`} mode={dialog.mode} item={dialog.item} brands={brands} onClose={() => setDialog(null)} onSave={(item) => { setBrands((previous) => dialog.mode === 'create' ? [...previous, item] : previous.map((brand) => brand.code === item.code ? item : brand)); setDialog(null); toast.success(dialog.mode === 'create' ? 'Đã tạo thương hiệu.' : 'Đã cập nhật thương hiệu.') }} />}
    {dialog?.mode === 'delete' && <ManagementDialog title="Xác nhận xóa thương hiệu" onClose={() => setDialog(null)}><div className="space-y-4 p-6"><p className="font-medium">{dialog.item.code} — {dialog.item.name}</p><p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">Thương hiệu mẫu này sẽ bị xóa khỏi danh sách trên trang.</p><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setDialog(null)}>Hủy</button><button type="button" className={`${button} text-red-700`} onClick={() => { setBrands((previous) => previous.filter((item) => item.code !== dialog.item.code)); setDialog(null); toast.success('Đã xóa thương hiệu.') }}>Xóa thương hiệu</button></div></div></ManagementDialog>}
  </div>
}
