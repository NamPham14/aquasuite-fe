import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, Pencil, Plus, ShieldOff, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../shared/api/apiError'
import { ManagementDialog, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog'
import { ManagementFilterBar, ManagementPageHeader, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import {
  useCreateWarrantyPolicyMutation,
  useDeactivateWarrantyPolicyMutation,
  useDeleteWarrantyPolicyMutation,
  useGetWarrantyPoliciesQuery,
  useGetWarrantyPolicyAuditLogsQuery,
  useGetWarrantyPolicyQuery,
  useGetWarrantyPolicyReferenceDataQuery,
  useUpdateWarrantyPolicyMutation,
  type UpsertWarrantyPolicyRequest,
  type WarrantyPolicy,
  type WarrantyPolicyStatus,
} from '../../features/servicedesk'

type DialogMode = 'create' | 'edit' | 'view' | 'deactivate' | 'delete' | null
const emptyForm: UpsertWarrantyPolicyRequest = { policyName: '', brandId: '', categoryId: '', warrantyPeriodMonths: 24, coverageConditions: '', status: 'ACTIVE' }
const secondary = 'inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50'

function policyStatus(status: WarrantyPolicyStatus) {
  return status === 'ACTIVE'
    ? <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">● Đang áp dụng</span>
    : <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">● Đã ngừng</span>
}

/** UC-44 page. All mutations remain authorised by the backend's SHOP_OWNER guard. */
export function WarrantyPoliciesPage() {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<WarrantyPolicyStatus | ''>('')
  const [page, setPage] = useState(0)
  const [dialog, setDialog] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<WarrantyPolicy | null>(null)
  const [form, setForm] = useState<UpsertWarrantyPolicyRequest>(emptyForm)
  const [formError, setFormError] = useState('')
  const policies = useGetWarrantyPoliciesQuery({ keyword: keyword || undefined, status: status || undefined, page, size: 10 })
  const references = useGetWarrantyPolicyReferenceDataQuery()
  const detail = useGetWarrantyPolicyQuery(selected?.policyId ?? '', { skip: dialog !== 'view' || !selected })
  const audit = useGetWarrantyPolicyAuditLogsQuery()
  const [createPolicy, createState] = useCreateWarrantyPolicyMutation()
  const [updatePolicy, updateState] = useUpdateWarrantyPolicyMutation()
  const [deactivatePolicy, deactivateState] = useDeactivateWarrantyPolicyMutation()
  const [deletePolicy, deleteState] = useDeleteWarrantyPolicyMutation()
  const pending = createState.isLoading || updateState.isLoading || deactivateState.isLoading || deleteState.isLoading

  useEffect(() => setPage(0), [keyword, status])
  useEffect(() => {
    const total = policies.data?.totalPages ?? 0
    if (total > 0 && page >= total) setPage(total - 1)
  }, [page, policies.data?.totalPages])

  const rows = policies.data?.items ?? []
  const currentDetail = detail.data
  const listError = policies.isError ? normalizeApiError(policies.error).message : ''

  function open(mode: Exclude<DialogMode, null>, policy?: WarrantyPolicy) {
    setFormError('')
    setSelected(policy ?? null)
    setForm(policy ? {
      policyName: policy.policyName, brandId: policy.brandId, categoryId: policy.categoryId,
      warrantyPeriodMonths: policy.warrantyPeriodMonths, coverageConditions: policy.coverageConditions, status: policy.status,
    } : emptyForm)
    setDialog(mode)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    if (!form.policyName.trim() || !form.brandId || !form.categoryId || form.warrantyPeriodMonths <= 0 || !form.coverageConditions.trim()) {
      setFormError('Hãy nhập đủ tên, hãng, nhóm hàng, thời hạn lớn hơn 0 và điều kiện bảo hành.')
      return
    }
    try {
      const payload = { ...form, policyName: form.policyName.trim(), coverageConditions: form.coverageConditions.trim() }
      if (dialog === 'create') await createPolicy(payload).unwrap()
      if (dialog === 'edit' && selected) await updatePolicy({ policyId: selected.policyId, body: payload }).unwrap()
      toast.success(dialog === 'create' ? 'Warranty policy created successfully.' : 'Warranty policy updated successfully.')
      setDialog(null)
    } catch (error) { setFormError(normalizeApiError(error).message) }
  }

  async function deactivate() {
    if (!selected) return
    try { await deactivatePolicy(selected.policyId).unwrap(); toast.success('Đã ngừng áp dụng chính sách.'); setDialog(null) }
    catch (error) { setFormError(normalizeApiError(error).message) }
  }

  async function remove() {
    if (!selected) return
    try { await deletePolicy(selected.policyId).unwrap(); toast.success('Đã xóa chính sách.'); setDialog(null) }
    catch (error) { setFormError(normalizeApiError(error).message) }
  }

  const columns: ManagementTableColumn<WarrantyPolicy>[] = useMemo(() => [
    { key: 'policy', header: 'Tên chính sách', cell: (item) => <div><p className="font-semibold text-slate-900">{item.policyName}</p><p className="text-xs text-slate-500">{item.policyCode}</p></div> },
    { key: 'brand', header: 'Hãng', cell: (item) => item.brandName },
    { key: 'category', header: 'Nhóm hàng', cell: (item) => item.categoryName },
    { key: 'period', header: 'Thời hạn', cell: (item) => `${item.warrantyPeriodMonths} tháng` },
    { key: 'coverage', header: 'Điều kiện (tóm tắt)', cellClassName: 'max-w-64 truncate', cell: (item) => <span title={item.coverageConditions}>{item.coverageConditions}</span> },
    { key: 'status', header: 'Trạng thái', cell: (item) => policyStatus(item.status) },
    { key: 'references', header: 'Số variant', align: 'center', cell: (item) => item.variantReferenceCount },
    { key: 'actions', header: 'Hành động', cell: (item) => <div className="flex flex-wrap gap-1.5">
      <button className={secondary} onClick={() => open('view', item)}><Eye className="h-4 w-4" />Xem</button>
      <button className={secondary} onClick={() => open('edit', item)}><Pencil className="h-4 w-4" />Sửa</button>
      <button className={secondary} disabled={item.status === 'INACTIVE'} onClick={() => open('deactivate', item)}><ShieldOff className="h-4 w-4" />Ngừng áp dụng</button>
      <button className="inline-flex min-h-9 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100" onClick={() => open('delete', item)}><Trash2 className="h-4 w-4" />Xóa</button>
    </div> },
  ], [])

  return <div className="space-y-5">
    <ManagementPageHeader title="Chính sách bảo hành" description="UC-44 · Quản lý chính sách bảo hành" breadcrumb="Chính sách bảo hành" group="Bảo hành" icon={<Wrench className="h-6 w-6" />} />
    <ManagementFilterBar>
      <ManagementSearch id="warranty-policy-search" label="Tìm kiếm" value={keyword} onChange={setKeyword} placeholder="Tên chính sách, hãng, nhóm hàng..." disabled={policies.isFetching} />
      <ManagementSelect id="warranty-policy-status" label="Trạng thái" value={status} onChange={(value) => setStatus(value as WarrantyPolicyStatus | '')} disabled={policies.isFetching}>
        <option value="">Tất cả</option><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Đã ngừng</option>
      </ManagementSelect>
      <button className={secondary} type="button" onClick={() => { setKeyword(''); setStatus(''); setPage(0) }}>Đặt lại</button>
      <button className={`${primary} sm:ml-auto`} type="button" onClick={() => open('create')}><Plus className="h-4 w-4" />Tạo chính sách</button>
    </ManagementFilterBar>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-busy={policies.isFetching}>
      <div className="flex items-center justify-between px-4 py-4"><h2 id="warranty-policy-list" className="text-base font-semibold text-slate-900">Danh sách chính sách</h2><span className="text-sm text-slate-500">{policies.data?.totalElements ?? 0} chính sách</span></div>
      {listError && <div role="alert" className="mx-4 mb-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{listError}</div>}
      <ManagementTable columns={columns} rows={rows} rowKey={(item) => item.policyId} labelledBy="warranty-policy-list" emptyMessage={policies.isLoading ? 'Đang tải chính sách...' : 'Không tìm thấy chính sách phù hợp.'} />
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-600"><span>Trang {page + 1}/{Math.max(policies.data?.totalPages ?? 0, 1)}</span><div className="flex gap-2"><button className={secondary} disabled={page === 0 || policies.isFetching} onClick={() => setPage(page - 1)}>Trước</button><button className={secondary} disabled={!policies.data || page + 1 >= policies.data.totalPages || policies.isFetching} onClick={() => setPage(page + 1)}>Sau</button></div></div>
    </section>
    <section className="rounded-lg border border-slate-200 bg-white p-4"><h2 className="text-base font-semibold text-slate-900">Nhật ký hoạt động</h2><div className="mt-3 divide-y divide-slate-100">{(audit.data?.content ?? []).map((entry) => <div key={entry.id} className="py-3 text-sm text-slate-700"><span className="mr-3 text-slate-500">{new Date(entry.createdAt).toLocaleString('vi-VN')}</span><strong>{entry.actorName ?? 'Chủ cửa hàng'}</strong><span className="ml-2">{entry.action}</span><span className="ml-2 text-slate-500">{String(entry.newData?.policyName ?? entry.oldData?.policyName ?? '')}</span></div>)}{audit.isLoading && <p className="py-3 text-sm text-slate-500">Đang tải nhật ký...</p>}{audit.isError && <p className="py-3 text-sm text-rose-700">Không thể tải nhật ký hoạt động.</p>}</div></section>
    {(dialog === 'create' || dialog === 'edit') && <ManagementDialog title={dialog === 'create' ? 'Tạo chính sách bảo hành' : 'Sửa chính sách bảo hành'} onClose={() => setDialog(null)} closeDisabled={pending}><form className="space-y-4 p-5 sm:p-6" onSubmit={submit} noValidate>
      {formError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
      <ManagementFormField id="policy-name" label="Tên chính sách *"><input id="policy-name" className={managementFieldClass} value={form.policyName} disabled={pending} onChange={(event) => setForm({ ...form, policyName: event.target.value })} /></ManagementFormField>
      <div className="grid gap-4 sm:grid-cols-2"><ManagementFormField id="policy-brand" label="Hãng *"><select id="policy-brand" className={managementFieldClass} value={form.brandId} disabled={pending || references.isLoading} onChange={(event) => setForm({ ...form, brandId: event.target.value })}><option value="">— Chọn hãng —</option>{references.data?.brands.map((brand) => <option key={brand.brandId} value={brand.brandId}>{brand.brandName}</option>)}</select></ManagementFormField><ManagementFormField id="policy-category" label="Nhóm hàng *"><select id="policy-category" className={managementFieldClass} value={form.categoryId} disabled={pending || references.isLoading} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">— Chọn nhóm hàng —</option>{references.data?.categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}</select></ManagementFormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><ManagementFormField id="policy-period" label="Thời hạn bảo hành (tháng) *"><input id="policy-period" type="number" min="1" className={managementFieldClass} value={form.warrantyPeriodMonths} disabled={pending} onChange={(event) => setForm({ ...form, warrantyPeriodMonths: Number(event.target.value) })} /><div className="mt-2 flex gap-2">{[24, 60, 120].map((months) => <button className="rounded-full border border-sky-200 px-3 py-1 text-xs text-sky-700 hover:bg-sky-50" type="button" key={months} onClick={() => setForm({ ...form, warrantyPeriodMonths: months })}>{months} tháng</button>)}</div></ManagementFormField><ManagementFormField id="policy-status" label="Trạng thái *"><select id="policy-status" className={managementFieldClass} value={form.status} disabled={pending} onChange={(event) => setForm({ ...form, status: event.target.value as WarrantyPolicyStatus })}><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Đã ngừng</option></select></ManagementFormField></div>
      <ManagementFormField id="policy-coverage" label="Điều kiện bảo hành *" hint="Thay đổi chỉ áp dụng cho phiếu lập sau."><textarea id="policy-coverage" className={managementFieldClass} rows={4} value={form.coverageConditions} disabled={pending} onChange={(event) => setForm({ ...form, coverageConditions: event.target.value })} /></ManagementFormField>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondary} type="button" disabled={pending} onClick={() => setDialog(null)}>Hủy</button><button className={primary} type="submit" disabled={pending}>{pending ? 'Đang lưu...' : 'Lưu chính sách'}</button></div>
    </form></ManagementDialog>}
    {dialog === 'view' && selected && <ManagementDialog title="Chi tiết chính sách" onClose={() => setDialog(null)}><div className="space-y-5 p-5 sm:p-6">{detail.isLoading ? <p>Đang tải chi tiết...</p> : currentDetail ? <><dl className="grid gap-3 text-sm sm:grid-cols-2"><Detail label="Mã chính sách" value={currentDetail.policy.policyCode} /><Detail label="Tên chính sách" value={currentDetail.policy.policyName} /><Detail label="Hãng" value={currentDetail.policy.brandName} /><Detail label="Nhóm hàng" value={currentDetail.policy.categoryName} /><Detail label="Thời hạn bảo hành" value={`${currentDetail.policy.warrantyPeriodMonths} tháng`} /><Detail label="Trạng thái" value={currentDetail.policy.status === 'ACTIVE' ? 'Đang áp dụng' : 'Đã ngừng'} /></dl><div><p className="mb-1 text-sm font-medium">Điều kiện bảo hành</p><p className="whitespace-pre-wrap text-sm text-slate-700">{currentDetail.policy.coverageConditions}</p></div><div><h3 className="mb-2 text-sm font-semibold">Variant đang áp dụng chính sách này</h3><div className="overflow-x-auto rounded-md border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Tên variant</th><th className="px-3 py-2">SKU</th></tr></thead><tbody>{currentDetail.variants.map((variant) => <tr className="border-t border-slate-100" key={variant.variantId}><td className="px-3 py-2">{variant.variantName}</td><td className="px-3 py-2">{variant.sku}</td></tr>)}{currentDetail.variants.length === 0 && <tr><td className="px-3 py-3 text-slate-500" colSpan={2}>Chưa có variant tham chiếu.</td></tr>}</tbody></table></div></div><p className="rounded-md bg-sky-50 p-3 text-sm text-sky-800">Đổi chính sách chỉ áp dụng cho phiếu lập sau; phiếu đã phát hành giữ nguyên điều khoản.</p></> : <p className="text-rose-700">Không thể tải chi tiết chính sách.</p>}<div className="flex justify-end gap-2"><button className={secondary} onClick={() => setDialog(null)}>Đóng</button><button className={primary} onClick={() => open('edit', selected)}>Sửa</button></div></div></ManagementDialog>}
    {dialog === 'deactivate' && selected && <ConfirmDialog title="Ngừng áp dụng chính sách" pending={pending} error={formError} onClose={() => setDialog(null)} onConfirm={() => void deactivate()} confirmLabel="Ngừng áp dụng"><p>Ngừng áp dụng chính sách này? Phiếu đã phát hành không bị ảnh hưởng.</p><p className="text-sm text-slate-500">{selected.policyCode} · {selected.policyName}</p></ConfirmDialog>}
    {dialog === 'delete' && selected && <ConfirmDialog title={selected.variantReferenceCount > 0 ? 'Không thể xóa chính sách' : 'Xóa chính sách'} pending={pending} error={formError} onClose={() => setDialog(null)} onConfirm={() => selected.variantReferenceCount > 0 ? void deactivate() : void remove()} confirmLabel={selected.variantReferenceCount > 0 ? 'Ngừng áp dụng thay thế' : 'Xác nhận xóa'}><p>{selected.variantReferenceCount > 0 ? `Chính sách ${selected.policyCode} đang được ${selected.variantReferenceCount} variant áp dụng nên không thể xóa.` : `Xóa vĩnh viễn chính sách ${selected.policyCode} “${selected.policyName}”? Thao tác này không thể hoàn tác.`}</p>{selected.variantReferenceCount > 0 && <p className="text-sm text-slate-500">Muốn ngừng dùng chính sách này, hãy ngừng áp dụng thay vì xóa.</p>}</ConfirmDialog>}
  </div>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div> }
function ConfirmDialog({ title, children, pending, error, onClose, onConfirm, confirmLabel }: { title: string; children: ReactNode; pending: boolean; error: string; onClose: () => void; onConfirm: () => void; confirmLabel: string }) { return <ManagementDialog title={title} onClose={onClose} closeDisabled={pending}><div className="space-y-4 p-5 sm:p-6">{children}{error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="flex justify-end gap-2"><button className={secondary} disabled={pending} onClick={onClose}>Hủy</button><button className={primary} disabled={pending} onClick={onConfirm}>{pending ? 'Đang xử lý...' : confirmLabel}</button></div></div></ManagementDialog> }
