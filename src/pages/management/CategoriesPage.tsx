import { useMemo, useState, type FormEvent } from 'react'
import { FolderTree, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ManagementPageHeader, ManagementFilterBar, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions'

type Category = { code: string; name: string; parent: string; status: 'ACTIVE' | 'INACTIVE'; description: string; updated: string }
type Mode = 'create' | 'edit' | 'view' | 'delete'
const initialCategories: Category[] = [
  { code: 'SANITARY', name: 'Thiết bị vệ sinh', parent: '', status: 'ACTIVE', description: '', updated: '2026-10-28' },
  { code: 'TOILET', name: 'Bồn cầu', parent: 'SANITARY', status: 'ACTIVE', description: 'Danh mục sản phẩm bồn cầu', updated: '2026-10-20' },
  { code: 'BASIN', name: 'Chậu rửa', parent: 'SANITARY', status: 'ACTIVE', description: '', updated: '2026-10-19' },
  { code: 'FAUCET', name: 'Vòi nước', parent: '', status: 'ACTIVE', description: '', updated: '2026-10-18' },
  { code: 'SHOWER', name: 'Sen tắm', parent: '', status: 'ACTIVE', description: '', updated: '2026-10-17' },
  { code: 'ACCESSORY', name: 'Phụ kiện', parent: '', status: 'INACTIVE', description: '', updated: '2026-10-15' },
]
const blank: Category = { code: '', name: '', parent: '', status: 'ACTIVE', description: '', updated: '' }
const button = 'inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600'

function CategoryForm({ mode, item, categories, onClose, onSave }: { mode: 'create' | 'edit' | 'view'; item: Category; categories: Category[]; onClose: () => void; onSave: (item: Category) => void }) {
  const [form, setForm] = useState(item)
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({})
  const readOnly = mode === 'view'
  const forbidden = new Set([item.code])
  let changed = true
  while (changed) {
    changed = false
    for (const category of categories) if (category.parent && forbidden.has(category.parent) && !forbidden.has(category.code)) { forbidden.add(category.code); changed = true }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    const code = form.code.trim().toUpperCase()
    const name = form.name.trim()
    const next = { code: !code ? 'Vui lòng nhập mã danh mục.' : mode === 'create' && categories.some((category) => category.code === code) ? 'Mã danh mục đã tồn tại.' : undefined, name: !name ? 'Vui lòng nhập tên danh mục.' : name.length > 100 ? 'Tên danh mục tối đa 100 ký tự.' : undefined }
    setErrors(next)
    if (next.code || next.name) return
    onSave({ ...form, code, name, description: form.description.trim(), updated: new Date().toISOString().slice(0, 10) })
  }
  return <ManagementDialog title={mode === 'create' ? 'Thêm danh mục' : mode === 'edit' ? 'Sửa danh mục' : 'Chi tiết danh mục'} onClose={onClose}>
    <ManagementForm onSubmit={submit} onClose={onClose} readOnly={readOnly} submitLabel={mode === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField id="category-code" label="Mã danh mục *" error={errors.code} hint={mode === 'create' ? 'Mã sẽ được chuyển thành chữ hoa.' : undefined}><input id="category-code" className={managementFieldClass} value={form.code} disabled={mode !== 'create'} onChange={(e) => setForm({ ...form, code: e.target.value })} aria-invalid={!!errors.code} aria-describedby={errors.code ? 'category-code-error' : mode === 'create' ? 'category-code-hint' : undefined} /></ManagementFormField>
        <ManagementFormField id="category-name" label="Tên danh mục *" error={errors.name}><input id="category-name" className={managementFieldClass} value={form.name} disabled={readOnly} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'category-name-error' : undefined} /></ManagementFormField>
        <ManagementFormField id="category-parent" label="Danh mục cha" hint="Để trống nếu là danh mục gốc."><select id="category-parent" className={managementFieldClass} value={form.parent} disabled={readOnly} onChange={(e) => setForm({ ...form, parent: e.target.value })} aria-describedby="category-parent-hint"><option value="">Danh mục gốc</option>{categories.filter((category) => readOnly || !forbidden.has(category.code)).map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}</select></ManagementFormField>
        <ManagementFormField id="category-state" label="Trạng thái *"><select id="category-state" className={managementFieldClass} value={form.status} disabled={readOnly} onChange={(e) => setForm({ ...form, status: e.target.value as Category['status'] })}><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></ManagementFormField>
      </div>
      <ManagementFormField id="category-description" label="Mô tả" hint="Không bắt buộc, tối đa 5000 ký tự."><textarea id="category-description" className={managementFieldClass} rows={4} maxLength={5000} value={form.description} disabled={readOnly} onChange={(e) => setForm({ ...form, description: e.target.value })} aria-describedby="category-description-hint" /></ManagementFormField>
    </ManagementForm>
  </ManagementDialog>
}

export function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('code')
  const [direction, setDirection] = useState('asc')
  const pageSize = 20
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<{ mode: Mode; item: Category } | null>(null)
  const filtered = useMemo(() => categories.filter((item) => `${item.code} ${item.name}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')) && (!status || item.status === status)).sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name, 'vi') : a.code.localeCompare(b.code)) * (direction === 'asc' ? 1 : -1)), [categories, search, status, sort, direction])
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pages)
  const rows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const columns: ManagementTableColumn<Category>[] = [
    { key: 'code', header: 'Mã danh mục', cell: (item) => item.code },
    { key: 'name', header: 'Tên danh mục', cell: (item) => item.name },
    { key: 'parent', header: 'Danh mục cha', cell: (item) => categories.find((parent) => parent.code === item.parent)?.name || 'Danh mục gốc' },
    { key: 'status', header: 'Trạng thái', cell: (item) => <span className={`rounded px-2 py-1 ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{item.status === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'}</span> },
    { key: 'updated', header: 'Ngày cập nhật', cell: (item) => item.updated.split('-').reverse().join('/') },
    { key: 'actions', header: 'Thao tác', cell: (item) => <ManagementRowActions actions={[
      { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.name}`, onClick: () => setDialog({ mode: 'view', item }) },
      { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.name}`, onClick: () => setDialog({ mode: 'edit', item }) },
      { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.name}`, onClick: () => setDialog({ mode: 'delete', item }) },
    ]} /> },
  ]
  const hasChildren = dialog?.mode === 'delete' && categories.some((category) => category.parent === dialog.item.code)
  return <div className="space-y-5">
    <ManagementPageHeader title="Quản lý Danh mục" description="Quản lý danh mục sản phẩm đa cấp" breadcrumb="Danh mục" group="Quản lý danh mục" icon={<FolderTree className="h-6 w-6" />} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Dữ liệu mẫu — thay đổi sẽ mất khi rời trang hoặc tải lại.</p><button type="button" className={primary} onClick={() => setDialog({ mode: 'create', item: blank })}><Plus className="h-4 w-4" aria-hidden="true" />Thêm danh mục</button></div>
    <ManagementFilterBar>
      <ManagementSearch id="category-search" label="Tìm kiếm" value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Tìm theo mã hoặc tên..." />
      <ManagementSelect id="category-filter" label="Trạng thái" value={status} onChange={(value) => { setStatus(value); setPage(1) }}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></ManagementSelect>
      <ManagementSelect id="category-sort" label="Sắp xếp theo" value={sort} onChange={setSort}><option value="code">Mã</option><option value="name">Tên</option></ManagementSelect>
      <ManagementSelect id="category-direction" label="Thứ tự" value={direction} onChange={setDirection}><option value="asc">Tăng dần</option><option value="desc">Giảm dần</option></ManagementSelect>
      <button type="button" className={button} onClick={() => { setSearch(''); setStatus(''); setSort('code'); setDirection('asc'); setPage(1) }}>Làm mới</button>
    </ManagementFilterBar>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><h2 id="category-list" className="px-4 py-4 text-base font-semibold text-slate-900">Danh sách danh mục</h2><ManagementTable columns={columns} rows={rows} rowKey={(item) => item.code} labelledBy="category-list" emptyMessage="Không tìm thấy danh mục phù hợp." /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm text-slate-600"><div className="flex items-center gap-3"><button className={button} type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Trước</button><span>Trang {currentPage} / {pages}</span><button className={button} type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Tiếp</button></div><span>Tổng số: {filtered.length} danh mục mẫu</span></div></section>
    {dialog && dialog.mode !== 'delete' && <CategoryForm key={`${dialog.mode}-${dialog.item.code}`} mode={dialog.mode} item={dialog.item} categories={categories} onClose={() => setDialog(null)} onSave={(item) => { setCategories((previous) => dialog.mode === 'create' ? [...previous, item] : previous.map((category) => category.code === item.code ? item : category)); setDialog(null); toast.success(dialog.mode === 'create' ? 'Đã tạo danh mục.' : 'Đã cập nhật danh mục.') }} />}
    {dialog?.mode === 'delete' && <ManagementDialog title="Xác nhận xóa danh mục" onClose={() => setDialog(null)}><div className="space-y-4 p-6"><p className="font-medium">{dialog.item.code} — {dialog.item.name}</p><p className={`rounded-md p-3 text-sm ${hasChildren ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{hasChildren ? 'Không thể xóa danh mục đang có danh mục con.' : 'Danh mục mẫu này sẽ bị xóa khỏi danh sách trong phiên hiện tại.'}</p><div className="flex justify-end gap-2"><button type="button" className={button} onClick={() => setDialog(null)}>Hủy</button><button type="button" disabled={!!hasChildren} className={`${button} text-red-700`} onClick={() => { setCategories((previous) => previous.filter((item) => item.code !== dialog.item.code)); setDialog(null); toast.success('Đã xóa danh mục.') }}>Xóa danh mục</button></div></div></ManagementDialog>}
  </div>
}
