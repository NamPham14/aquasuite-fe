import { useState, type FormEvent } from 'react'
import { ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import type { AssignableRole, UserAccount, UserAccountFormValues } from '../types/userAccount.types.ts'

const strongTemporaryPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

function initialValues(account?: UserAccount): UserAccountFormValues {
  return {
    username: account?.username ?? '',
    email: account?.email ?? '',
    phone: account?.phone ?? '',
    roleIds: account?.roles.map((role) => role.id) ?? [],
    avatarUrl: account?.avatarUrl ?? '',
    autoGenerateTemporaryPassword: true,
    temporaryPassword: '',
    confirmTemporaryPassword: '',
  }
}

export function UserAccountForm({
  account,
  roles,
  rolesLoading,
  pending,
  apiError,
  apiFieldErrors = {},
  onClose,
  onSubmit,
}: {
  account?: UserAccount
  roles: AssignableRole[]
  rolesLoading: boolean
  pending: boolean
  apiError: string
  apiFieldErrors?: Record<string, string>
  onClose: () => void
  onSubmit: (values: UserAccountFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<UserAccountFormValues>(() => initialValues(account))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const editing = account !== undefined

  function update<K extends keyof UserAccountFormValues>(field: K, value: UserAccountFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function toggleRole(roleId: string) {
    update('roleIds', values.roleIds.includes(roleId)
      ? values.roleIds.filter((id) => id !== roleId)
      : [...values.roleIds, roleId])
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (!values.username.trim()) next.username = 'Vui lòng nhập tên người dùng.'
    if (!values.email.trim()) next.email = 'Vui lòng nhập email.'
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Email không hợp lệ.'
    if (!/^0\d{9}$/.test(values.phone)) next.phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'
    if (values.roleIds.length === 0) next.roleIds = 'Chọn ít nhất một vai trò.'
    if (!editing && !values.autoGenerateTemporaryPassword) {
      if (!strongTemporaryPassword.test(values.temporaryPassword)) {
        next.temporaryPassword = 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'
      }
      if (values.temporaryPassword !== values.confirmTemporaryPassword) next.confirmTemporaryPassword = 'Xác nhận mật khẩu chưa khớp.'
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    await onSubmit({ ...values, username: values.username.trim(), email: values.email.trim(), phone: values.phone.trim(), avatarUrl: values.avatarUrl.trim() })
  }

  const fieldError = (name: string) => errors[name] || apiFieldErrors[name]
  return (
    <ManagementForm onSubmit={submit} onClose={onClose} submitLabel={editing ? 'Lưu tài khoản' : 'Tạo tài khoản'} submitDisabled={pending || rolesLoading} closeDisabled={pending}>
      {apiError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{apiError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField id="user-account-username" label="Tên người dùng *" error={fieldError('username')}>
          <input id="user-account-username" className={managementFieldClass} value={values.username} onChange={(event) => update('username', event.target.value)} aria-invalid={Boolean(fieldError('username'))} aria-describedby={fieldError('username') ? 'user-account-username-error' : undefined} autoComplete="username" disabled={pending} />
        </ManagementFormField>
        <ManagementFormField id="user-account-avatar-url" label="URL ảnh đại diện" error={fieldError('avatarUrl')}>
          <input id="user-account-avatar-url" className={managementFieldClass} value={values.avatarUrl} onChange={(event) => update('avatarUrl', event.target.value)} aria-invalid={Boolean(fieldError('avatarUrl'))} aria-describedby={fieldError('avatarUrl') ? 'user-account-avatar-url-error' : undefined} placeholder="https://..." type="url" disabled={pending} />
        </ManagementFormField>
        <ManagementFormField id="user-account-email" label="Email *" error={fieldError('email')}>
          <input id="user-account-email" className={managementFieldClass} value={values.email} onChange={(event) => update('email', event.target.value)} aria-invalid={Boolean(fieldError('email'))} aria-describedby={fieldError('email') ? 'user-account-email-error' : undefined} type="email" autoComplete="email" disabled={pending} />
        </ManagementFormField>
        <ManagementFormField id="user-account-phone" label="Số điện thoại *" hint="Nhập 10 chữ số nội địa, bắt đầu bằng 0." error={fieldError('phone')}>
          <input id="user-account-phone" className={managementFieldClass} value={values.phone} onChange={(event) => update('phone', event.target.value)} aria-invalid={Boolean(fieldError('phone'))} aria-describedby={fieldError('phone') ? 'user-account-phone-error' : 'user-account-phone-hint'} inputMode="numeric" autoComplete="tel" disabled={pending} />
        </ManagementFormField>
      </div>
      <fieldset aria-describedby={fieldError('roleIds') ? 'user-account-roles-error' : undefined} aria-invalid={Boolean(fieldError('roleIds'))} className="rounded-md border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Vai trò *</legend>
        {rolesLoading ? <p className="text-sm text-slate-500">Đang tải vai trò...</p> : roles.length === 0 ? <p role="alert" className="text-sm text-rose-700">Không có vai trò đang hoạt động để gán.</p> : <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {roles.map((role) => <label key={role.id} className="flex items-start gap-2 rounded-md p-1 text-sm text-slate-700 hover:bg-slate-50">
            <input type="checkbox" checked={values.roleIds.includes(role.id)} onChange={() => toggleRole(role.id)} disabled={pending} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500" />
            <span><span className="font-medium">{role.code}</span>{role.description ? <span className="block text-xs text-slate-500">{role.description}</span> : null}</span>
          </label>)}
        </div>}
        {fieldError('roleIds') && <p id="user-account-roles-error" role="alert" className="mt-2 text-xs text-red-700">{fieldError('roleIds')}</p>}
      </fieldset>
      {!editing && <>
        <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={values.autoGenerateTemporaryPassword} onChange={(event) => update('autoGenerateTemporaryPassword', event.target.checked)} disabled={pending} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-500" />
          <span><span className="font-medium">Tự tạo mật khẩu tạm</span><span className="mt-0.5 block text-xs text-slate-500">Hệ thống gửi thông tin đăng nhập qua email sau khi tạo.</span></span>
        </label>
        {!values.autoGenerateTemporaryPassword && <div className="grid gap-4 sm:grid-cols-2">
          <ManagementFormField id="user-account-password" label="Mật khẩu tạm *" error={fieldError('temporaryPassword')}>
            <input id="user-account-password" className={managementFieldClass} value={values.temporaryPassword} onChange={(event) => update('temporaryPassword', event.target.value)} aria-invalid={Boolean(fieldError('temporaryPassword'))} aria-describedby={fieldError('temporaryPassword') ? 'user-account-password-error' : undefined} type="password" autoComplete="new-password" disabled={pending} />
          </ManagementFormField>
          <ManagementFormField id="user-account-confirm-password" label="Nhập lại mật khẩu *" error={fieldError('confirmTemporaryPassword')}>
            <input id="user-account-confirm-password" className={managementFieldClass} value={values.confirmTemporaryPassword} onChange={(event) => update('confirmTemporaryPassword', event.target.value)} aria-invalid={Boolean(fieldError('confirmTemporaryPassword'))} aria-describedby={fieldError('confirmTemporaryPassword') ? 'user-account-confirm-password-error' : undefined} type="password" autoComplete="new-password" disabled={pending} />
          </ManagementFormField>
        </div>}
      </>}
    </ManagementForm>
  )
}
