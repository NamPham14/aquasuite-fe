import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, Pencil, Plus, ShieldCheck, ShieldOff, Trash2, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../shared/api/apiError'
import { ManagementDialog, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog'
import { ManagementFilterCard, ManagementPageHeader, ManagementPageShell, ManagementPanel, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementPagination, ManagementTable, ManagementTableSkeleton, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { CodeChip, StatusBadge } from '../../shared/ui/Badge'
import { SakugaActionButton } from '../../shared/ui/Button'
import { ErrorState } from '../../shared/ui/FeedbackStates'
import {
  useCreateWarrantyPolicyMutation,
  useDeactivateWarrantyPolicyMutation,
  useDeleteWarrantyPolicyMutation,
  useGetWarrantyPoliciesQuery,
  useGetWarrantyPolicyQuery,
  useGetWarrantyPolicyReferenceDataQuery,
  useUpdateWarrantyPolicyMutation,
  type UpsertWarrantyPolicyRequest,
  type WarrantyPolicy,
  type WarrantyPolicyStatus,
} from '../../features/servicedesk'
import { ActivityLogPanel } from '../../features/audit'

type DialogMode = 'create' | 'edit' | 'view' | 'deactivate' | 'activate' | 'delete' | null
const emptyForm: UpsertWarrantyPolicyRequest = { policyName: '', brandId: '', categoryId: '', warrantyPeriodMonths: 24, coverageConditions: '', status: 'ACTIVE' }
const secondary = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-aqs-border bg-aqs-surface px-3 text-sm font-medium text-aqs-ink transition-colors hover:border-slate-300 hover:bg-aqs-surface-subtle disabled:cursor-not-allowed disabled:opacity-50'
const activateBtn = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-aqs-positive-border bg-aqs-positive-soft px-3 text-sm font-medium text-aqs-positive transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50'
const primary = 'inline-flex h-10 items-center justify-center gap-2 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover disabled:cursor-not-allowed disabled:opacity-50'

function policyStatus(status: WarrantyPolicyStatus) {
  return (
    <StatusBadge tone={status === 'ACTIVE' ? 'positive' : 'neutral'}>
      {status === 'ACTIVE' ? 'Đang áp dụng' : 'Đã ngừng'}
    </StatusBadge>
  )
}

/** Trang quản lý chính sách bảo hành. Mọi thao tác cập nhật đều được kiểm tra phân quyền Chủ cửa hàng tại Backend. */
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
      toast.success(dialog === 'create' ? 'Tạo chính sách bảo hành thành công.' : 'Cập nhật chính sách bảo hành thành công.')
      setDialog(null)
    } catch (error) { setFormError(normalizeApiError(error).message) }
  }

  async function deactivate() {
    if (!selected) return
    try { await deactivatePolicy(selected.policyId).unwrap(); toast.success('Đã ngừng áp dụng chính sách.'); setDialog(null) }
    catch (error) { setFormError(normalizeApiError(error).message) }
  }

  async function activate() {
    if (!selected) return
    try {
      await updatePolicy({
        policyId: selected.policyId,
        body: {
          policyName: selected.policyName.trim(),
          brandId: selected.brandId,
          categoryId: selected.categoryId,
          warrantyPeriodMonths: selected.warrantyPeriodMonths,
          coverageConditions: selected.coverageConditions.trim(),
          status: 'ACTIVE',
        },
      }).unwrap()
      toast.success('Đã áp dụng lại chính sách bảo hành.')
      setDialog(null)
    } catch (error) { setFormError(normalizeApiError(error).message) }
  }

  async function remove() {
    if (!selected) return
    try { await deletePolicy(selected.policyId).unwrap(); toast.success('Đã xóa chính sách.'); setDialog(null) }
    catch (error) { setFormError(normalizeApiError(error).message) }
  }

  const columns: ManagementTableColumn<WarrantyPolicy>[] = useMemo(() => [
    { key: 'policy', header: 'Tên chính sách', cell: (item) => <div><p className="font-semibold text-aqs-ink">{item.policyName}</p><div className="mt-1"><CodeChip>{item.policyCode}</CodeChip></div></div> },
    { key: 'brand', header: 'Hãng', cell: (item) => item.brandName },
    { key: 'category', header: 'Nhóm hàng', cell: (item) => item.categoryName },
    { key: 'period', header: 'Thời hạn', cell: (item) => `${item.warrantyPeriodMonths} tháng` },
    { key: 'coverage', header: 'Điều kiện (tóm tắt)', cellClassName: 'max-w-64 truncate', cell: (item) => <span title={item.coverageConditions}>{item.coverageConditions}</span> },
    { key: 'status', header: 'Trạng thái', cell: (item) => policyStatus(item.status) },
    { key: 'references', header: 'Số biến thể', align: 'center', cell: (item) => item.variantReferenceCount },
    { key: 'actions', header: 'Hành động', cell: (item) => <div className="flex flex-wrap gap-1.5">
      <button type="button" className={secondary} onClick={() => open('view', item)}><Eye className="h-4 w-4" />Xem</button>
      <button type="button" className={secondary} onClick={() => open('edit', item)}><Pencil className="h-4 w-4" />Sửa</button>
      {item.status === 'ACTIVE'
        ? <button type="button" className={secondary} onClick={() => open('deactivate', item)}><ShieldOff className="h-4 w-4" />Ngừng áp dụng</button>
        : <button type="button" className={activateBtn} onClick={() => open('activate', item)}><ShieldCheck className="h-4 w-4" />Áp dụng lại</button>}
      <button type="button" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100" onClick={() => open('delete', item)}><Trash2 className="h-4 w-4" />Xóa</button>
    </div> },
  ], [])

  return <ManagementPageShell>
    <ManagementPageHeader
      title="Chính sách bảo hành"
      description="Chính sách bảo hành áp dụng cho các sản phẩm theo hãng và nhóm hàng."
      breadcrumb="Chính sách bảo hành"
      group="Bảo hành"
      icon={<Wrench className="h-5 w-5" />}
      actions={
        <SakugaActionButton onClick={() => open('create')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo chính sách
        </SakugaActionButton>
      }
    />
    <ManagementFilterCard
      headingId="warranty-policy-filters"
      title="Tìm và lọc chính sách bảo hành"
      resultCount={`${policies.data?.totalElements ?? 0} chính sách`}
      hasActiveFilters={Boolean(keyword || status)}
      onReset={() => { setKeyword(''); setStatus(''); setPage(0) }}
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <ManagementSearch id="warranty-policy-search" label="Tìm kiếm" value={keyword} onChange={setKeyword} placeholder="Tên chính sách, hãng, nhóm hàng..." disabled={policies.isFetching} />
        <ManagementSelect id="warranty-policy-status" label="Trạng thái" value={status} onChange={(value) => setStatus(value as WarrantyPolicyStatus | '')} disabled={policies.isFetching}>
          <option value="">Tất cả</option><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Đã ngừng</option>
        </ManagementSelect>
        <button className={secondary} type="button" onClick={() => { setKeyword(''); setStatus(''); setPage(0) }}>Đặt lại</button>
      </div>
    </ManagementFilterCard>
    <ManagementPanel
      headingId="warranty-policy-list"
      title="Danh sách chính sách"
      description={`Tổng số ${policies.data?.totalElements ?? 0} chính sách bảo hành.`}
      refreshing={policies.isFetching && rows.length > 0}
      busy={policies.isFetching}
    >
      {listError ? (
        <div className="p-5">
          <ErrorState
            sectionLabel="Danh sách chính sách bảo hành"
            title="Không thể tải danh sách chính sách"
            message={listError}
            onRetry={() => void policies.refetch()}
            retrying={policies.isFetching}
          />
        </div>
      ) : policies.isLoading && !rows.length ? (
        <ManagementTableSkeleton columns={8} rows={5} />
      ) : (
        <ManagementTable columns={columns} rows={rows} rowKey={(item) => item.policyId} labelledBy="warranty-policy-list" emptyMessage="Không tìm thấy chính sách phù hợp." />
      )}
      <ManagementPagination
        page={page}
        totalPages={policies.data?.totalPages ?? 0}
        totalElements={policies.data?.totalElements ?? 0}
        noun="chính sách"
        disabled={policies.isFetching}
        onPageChange={setPage}
      />
    </ManagementPanel>
    <ActivityLogPanel operational entityType="WARRANTY_POLICY" description="Các lần tạo, cập nhật, ngừng áp dụng và xóa chính sách bảo hành." />
    {(dialog === 'create' || dialog === 'edit') && <ManagementDialog title={dialog === 'create' ? 'Tạo chính sách bảo hành' : 'Sửa chính sách bảo hành'} onClose={() => setDialog(null)} closeDisabled={pending}><form className="space-y-4 p-5 sm:p-6" onSubmit={submit} noValidate>
      {formError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
      <ManagementFormField id="policy-name" label="Tên chính sách *"><input id="policy-name" className={managementFieldClass} value={form.policyName} disabled={pending} onChange={(event) => setForm({ ...form, policyName: event.target.value })} /></ManagementFormField>
      <div className="grid gap-4 sm:grid-cols-2"><ManagementFormField id="policy-brand" label="Hãng *"><select id="policy-brand" className={managementFieldClass} value={form.brandId} disabled={pending || references.isLoading} onChange={(event) => setForm({ ...form, brandId: event.target.value })}><option value="">— Chọn hãng —</option>{references.data?.brands.map((brand) => <option key={brand.brandId} value={brand.brandId}>{brand.brandName}</option>)}</select></ManagementFormField><ManagementFormField id="policy-category" label="Nhóm hàng *"><select id="policy-category" className={managementFieldClass} value={form.categoryId} disabled={pending || references.isLoading} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">— Chọn nhóm hàng —</option>{references.data?.categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}</select></ManagementFormField></div>
      <div className="grid gap-4 sm:grid-cols-2"><ManagementFormField id="policy-period" label="Thời hạn bảo hành (tháng) *"><input id="policy-period" type="number" min="1" className={managementFieldClass} value={form.warrantyPeriodMonths} disabled={pending} onChange={(event) => setForm({ ...form, warrantyPeriodMonths: Number(event.target.value) })} /><div className="mt-2 flex gap-2">{[24, 60, 120].map((months) => <button className="rounded-full border border-sky-200 px-3 py-1 text-xs text-sky-700 hover:bg-sky-50" type="button" key={months} onClick={() => setForm({ ...form, warrantyPeriodMonths: months })}>{months} tháng</button>)}</div></ManagementFormField><ManagementFormField id="policy-status" label="Trạng thái *"><select id="policy-status" className={managementFieldClass} value={form.status} disabled={pending} onChange={(event) => setForm({ ...form, status: event.target.value as WarrantyPolicyStatus })}><option value="ACTIVE">Đang áp dụng</option><option value="INACTIVE">Đã ngừng</option></select></ManagementFormField></div>
      <ManagementFormField id="policy-coverage" label="Điều kiện bảo hành *" hint="Thay đổi chỉ áp dụng cho phiếu lập sau."><textarea id="policy-coverage" className={managementFieldClass} rows={4} value={form.coverageConditions} disabled={pending} onChange={(event) => setForm({ ...form, coverageConditions: event.target.value })} /></ManagementFormField>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondary} type="button" disabled={pending} onClick={() => setDialog(null)}>Hủy</button><button className={primary} type="submit" disabled={pending}>{pending ? 'Đang lưu...' : 'Lưu chính sách'}</button></div>
    </form></ManagementDialog>}
    {dialog === 'view' && selected && <ManagementDialog title="Chi tiết chính sách" onClose={() => setDialog(null)}><div className="space-y-5 p-5 sm:p-6">{detail.isLoading ? <p>Đang tải chi tiết...</p> : currentDetail ? <><dl className="grid gap-3 text-sm sm:grid-cols-2"><Detail label="Mã chính sách" value={currentDetail.policy.policyCode} /><Detail label="Tên chính sách" value={currentDetail.policy.policyName} /><Detail label="Hãng" value={currentDetail.policy.brandName} /><Detail label="Nhóm hàng" value={currentDetail.policy.categoryName} /><Detail label="Thời hạn bảo hành" value={`${currentDetail.policy.warrantyPeriodMonths} tháng`} /><Detail label="Trạng thái" value={currentDetail.policy.status === 'ACTIVE' ? 'Đang áp dụng' : 'Đã ngừng'} /></dl><div><p className="mb-1 text-sm font-medium">Điều kiện bảo hành</p><p className="whitespace-pre-wrap text-sm text-slate-700">{currentDetail.policy.coverageConditions}</p></div><div><h3 className="mb-2 text-sm font-semibold">Biến thể sản phẩm đang áp dụng chính sách này</h3><div className="overflow-x-auto rounded-md border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-3 py-2">Tên biến thể</th><th className="px-3 py-2">SKU</th></tr></thead><tbody>{currentDetail.variants.map((variant) => <tr className="border-t border-slate-100" key={variant.variantId}><td className="px-3 py-2">{variant.variantName}</td><td className="px-3 py-2">{variant.sku}</td></tr>)}{currentDetail.variants.length === 0 && <tr><td className="px-3 py-3 text-slate-500" colSpan={2}>Chưa có biến thể sản phẩm tham chiếu.</td></tr>}</tbody></table></div></div><p className="rounded-md bg-sky-50 p-3 text-sm text-sky-800">Đổi chính sách chỉ áp dụng cho phiếu lập sau; phiếu đã phát hành giữ nguyên điều khoản.</p></> : <p className="text-rose-700">Không thể tải chi tiết chính sách.</p>}<div className="flex flex-wrap justify-end gap-2"><button type="button" className={secondary} onClick={() => setDialog(null)}>Đóng</button>{selected.status === 'ACTIVE' ? <button type="button" className={secondary} onClick={() => open('deactivate', selected)}><ShieldOff className="h-4 w-4" />Ngừng áp dụng</button> : <button type="button" className={activateBtn} onClick={() => open('activate', selected)}><ShieldCheck className="h-4 w-4" />Áp dụng lại</button>}<button type="button" className={primary} onClick={() => open('edit', selected)}>Sửa</button></div></div></ManagementDialog>}
    {dialog === 'deactivate' && selected && <ConfirmDialog title="Ngừng áp dụng chính sách" pending={pending} error={formError} onClose={() => setDialog(null)} onConfirm={() => void deactivate()} confirmLabel="Ngừng áp dụng"><p>Ngừng áp dụng chính sách này? Phiếu đã phát hành không bị ảnh hưởng.</p><p className="text-sm text-slate-500">{selected.policyCode} · {selected.policyName}</p></ConfirmDialog>}
    {dialog === 'activate' && selected && <ConfirmDialog title="Áp dụng lại chính sách" pending={pending} error={formError} onClose={() => setDialog(null)} onConfirm={() => void activate()} confirmLabel="Áp dụng lại"><p>Kích hoạt áp dụng lại chính sách bảo hành này cho hãng <strong>{selected.brandName}</strong> · nhóm <strong>{selected.categoryName}</strong>? Các phiếu bảo hành lập mới sau thời điểm này sẽ áp dụng chính sách này.</p><p className="text-sm text-slate-500">{selected.policyCode} · {selected.policyName}</p></ConfirmDialog>}
    {dialog === 'delete' && selected && <ConfirmDialog title={selected.variantReferenceCount > 0 ? 'Không thể xóa chính sách' : 'Xóa chính sách'} pending={pending} error={formError} onClose={() => setDialog(null)} onConfirm={() => selected.variantReferenceCount > 0 ? void deactivate() : void remove()} confirmLabel={selected.variantReferenceCount > 0 ? 'Ngừng áp dụng thay thế' : 'Xác nhận xóa'}><p>{selected.variantReferenceCount > 0 ? `Chính sách ${selected.policyCode} đang được ${selected.variantReferenceCount} biến thể sản phẩm áp dụng nên không thể xóa.` : `Xóa vĩnh viễn chính sách ${selected.policyCode} “${selected.policyName}”? Thao tác này không thể hoàn tác.`}</p>{selected.variantReferenceCount > 0 && <p className="text-sm text-aqs-ink-muted">Muốn ngừng dùng chính sách này, hãy ngừng áp dụng thay vì xóa.</p>}</ConfirmDialog>}
  </ManagementPageShell>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div> }
function ConfirmDialog({ title, children, pending, error, onClose, onConfirm, confirmLabel }: { title: string; children: ReactNode; pending: boolean; error: string; onClose: () => void; onConfirm: () => void; confirmLabel: string }) { return <ManagementDialog title={title} onClose={onClose} closeDisabled={pending}><div className="space-y-4 p-5 sm:p-6">{children}{error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="flex justify-end gap-2"><button className={secondary} disabled={pending} onClick={onClose}>Hủy</button><button className={primary} disabled={pending} onClick={onConfirm}>{pending ? 'Đang xử lý...' : confirmLabel}</button></div></div></ManagementDialog> }
