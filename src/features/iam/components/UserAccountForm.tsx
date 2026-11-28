import { useMemo, useState, type FormEvent } from 'react'
import { ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { Notice } from '../../../shared/ui/Badge'
import { ValidationSummary, type ValidationIssue } from '../../../shared/ui/FeedbackStates'
import type { AssignableRole, UserAccount, UserAccountFormValues } from '../types/userAccount.types.ts'

const strongTemporaryPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

const ROLE_META: Record<string, { label: string; desc: string }> = {
  SHOP_OWNER: { label: 'Chủ cửa hàng', desc: 'Quản trị toàn bộ hệ thống và tài khoản nội bộ' },
  STORE_OWNER: { label: 'Chủ cửa hàng', desc: 'Quản trị toàn bộ hệ thống và tài khoản nội bộ' },
  SALES_STAFF: { label: 'Nhân viên bán hàng', desc: 'Bán hàng, tạo đơn và chăm sóc khách hàng' },
  SHIPPER: { label: 'Shipper', desc: 'Giao hàng và xác nhận bàn giao' },
  ACCOUNTANT: { label: 'Kế toán', desc: 'Hóa đơn, thanh toán và công nợ' },
  CUSTOMER: { label: 'Khách hàng', desc: 'Tài khoản mua hàng của khách' },
  ROLE_CUSTOMER: { label: 'Khách hàng', desc: 'Tài khoản mua hàng của khách' },
}

function isCustomerRole(role: AssignableRole) {
  const code = role.code.trim().toUpperCase()
  return code === 'CUSTOMER' || code === 'ROLE_CUSTOMER'
}

const USER_FIELD_META: Record<string, { id: string; label: string }> = {
  username: { id: 'user-account-username', label: 'Tên người dùng' },
  avatarUrl: { id: 'user-account-avatar-url', label: 'URL ảnh đại diện' },
  email: { id: 'user-account-email', label: 'Email' },
  phone: { id: 'user-account-phone', label: 'Số điện thoại' },
  roleIds: { id: 'user-account-roles-fieldset', label: 'Vai trò' },
  temporaryPassword: { id: 'user-account-password', label: 'Mật khẩu tạm' },
  confirmTemporaryPassword: { id: 'user-account-confirm-password', label: 'Nhập lại mật khẩu' },
}

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
  currentUserId,
}: {
  account?: UserAccount
  roles: AssignableRole[]
  rolesLoading: boolean
  pending: boolean
  apiError: string
  apiFieldErrors?: Record<string, string>
  onClose: () => void
  onSubmit: (values: UserAccountFormValues) => Promise<void>
  /** ID của người dùng đang đăng nhập, dùng để khóa checkbox vai trò Chủ cửa hàng khi tự chỉnh sửa. */
  currentUserId?: string
}) {
  const [values, setValues] = useState<UserAccountFormValues>(() => initialValues(account))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const editing = account !== undefined
  // Khi chỉnh sửa tài khoản của chính mình, không cho phép bỏ vai trò Chủ cửa hàng
  const isSelf = editing && (account.currentUser === true || (currentUserId != null && account.id === currentUserId))

  function update<K extends keyof UserAccountFormValues>(field: K, value: UserAccountFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }

  function toggleRole(roleId: string) {
    update(
      'roleIds',
      values.roleIds.includes(roleId)
        ? values.roleIds.filter((id) => id !== roleId)
        : [...values.roleIds, roleId],
    )
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Record<string, string> = {}
    const normalizedPhone = values.phone.replace(/[\s.]/g, '')
    if (!values.username.trim()) next.username = 'Vui lòng nhập tên người dùng.'
    if (!values.email.trim()) next.email = 'Vui lòng nhập email.'
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) next.email = 'Email không hợp lệ.'
    if (!/^0\d{9}$/.test(normalizedPhone)) next.phone = 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'
    if (values.roleIds.length === 0) next.roleIds = 'Chọn ít nhất một vai trò.'
    if (!editing && !values.autoGenerateTemporaryPassword) {
      if (!strongTemporaryPassword.test(values.temporaryPassword)) {
        next.temporaryPassword = 'Mật khẩu tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'
      }
      if (values.temporaryPassword !== values.confirmTemporaryPassword) {
        next.confirmTemporaryPassword = 'Xác nhận mật khẩu chưa khớp.'
      }
    }
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    await onSubmit({
      ...values,
      username: values.username.trim(),
      email: values.email.trim(),
      phone: normalizedPhone,
      avatarUrl: values.avatarUrl.trim(),
    })
  }

  const fieldError = (name: string) => errors[name] || apiFieldErrors[name]
  const roleError = fieldError('roleIds')
  const existingCustomerRoleIds = new Set(account?.roles.filter(isCustomerRole).map((role) => role.id) ?? [])
  const availableRoles = roles.filter(
    (role) => !isCustomerRole(role) || existingCustomerRoleIds.has(role.id),
  )

  const validationIssues = useMemo<ValidationIssue[]>(() => {
    const combined = { ...errors, ...apiFieldErrors }
    return Object.entries(combined).flatMap(([field, message]) => {
      const meta = USER_FIELD_META[field]
      return meta && message ? [{ fieldId: meta.id, label: meta.label, message }] : []
    })
  }, [errors, apiFieldErrors])

  return (
    <ManagementForm
      onSubmit={submit}
      onClose={onClose}
      submitLabel={pending ? 'Đang lưu...' : editing ? 'Lưu tài khoản' : 'Tạo tài khoản'}
      submitDisabled={pending || rolesLoading}
      closeDisabled={pending}
      submitLoading={pending}
    >
      <ValidationSummary issues={validationIssues} />

      {apiError && (
        <Notice tone="danger" role="alert" title="Không thể lưu tài khoản">
          {apiError}
        </Notice>
      )}

      {existingCustomerRoleIds.size === 0 && (
        <Notice tone="info" title="Tạo tài khoản khách hàng">
          Khách hàng cần đăng ký và xác minh email để hệ thống tạo hồ sơ mua hàng. Không thể gán vai trò Khách hàng tại màn quản lý tài khoản.
        </Notice>
      )}

      <div className="grid gap-3.5 sm:grid-cols-2">
        <ManagementFormField id="user-account-username" label="Tên người dùng *" error={fieldError('username')}>
          <input
            id="user-account-username"
            className={managementFieldClass}
            value={values.username}
            onChange={(event) => update('username', event.target.value)}
            aria-invalid={Boolean(fieldError('username'))}
            aria-describedby={fieldError('username') ? 'user-account-username-error' : undefined}
            autoComplete="username"
            disabled={pending}
          />
        </ManagementFormField>
        <ManagementFormField id="user-account-avatar-url" label="URL ảnh đại diện" error={fieldError('avatarUrl')}>
          <input
            id="user-account-avatar-url"
            className={managementFieldClass}
            value={values.avatarUrl}
            onChange={(event) => update('avatarUrl', event.target.value)}
            aria-invalid={Boolean(fieldError('avatarUrl'))}
            aria-describedby={fieldError('avatarUrl') ? 'user-account-avatar-url-error' : undefined}
            placeholder="https://..."
            type="url"
            disabled={pending}
          />
        </ManagementFormField>
        <ManagementFormField id="user-account-email" label="Email *" error={fieldError('email')}>
          <input
            id="user-account-email"
            className={managementFieldClass}
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            aria-invalid={Boolean(fieldError('email'))}
            aria-describedby={fieldError('email') ? 'user-account-email-error' : undefined}
            type="email"
            autoComplete="email"
            disabled={pending}
          />
        </ManagementFormField>
        <ManagementFormField
          id="user-account-phone"
          label="Số điện thoại *"
          hint="Nhập 10 chữ số nội địa, bắt đầu bằng 0."
          error={fieldError('phone')}
        >
          <input
            id="user-account-phone"
            className={managementFieldClass}
            value={values.phone}
            onChange={(event) => update('phone', event.target.value)}
            aria-invalid={Boolean(fieldError('phone'))}
            aria-describedby={fieldError('phone') ? 'user-account-phone-error' : 'user-account-phone-hint'}
            inputMode="numeric"
            autoComplete="tel"
            disabled={pending}
          />
        </ManagementFormField>
      </div>

      <fieldset
        id="user-account-roles-fieldset"
        tabIndex={-1}
        aria-describedby={roleError ? 'user-account-roles-error' : undefined}
        aria-invalid={Boolean(roleError)}
        className={`rounded-card border px-3.5 pb-3.5 pt-2.5 ${
          roleError ? 'border-aqs-danger' : 'border-aqs-border'
        }`}
      >
        <legend className="px-1.5 text-[13px] font-bold text-aqs-ink">
          Vai trò <span className="text-aqs-danger">*</span>
        </legend>
        {rolesLoading ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2" aria-label="Đang tải vai trò">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-control border border-aqs-border p-3">
                <span className="aqs-animate-skeleton block h-3 w-3/4 rounded bg-aqs-skeleton" />
              </div>
            ))}
          </div>
        ) : roles.length === 0 ? (
          <Notice tone="danger" role="alert">
            Không có vai trò đang hoạt động để gán.
          </Notice>
        ) : (
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {availableRoles.map((role) => {
              const meta = ROLE_META[role.code]
              const displayLabel = meta?.label ?? role.code
              const displayDesc = role.description || meta?.desc
              const checked = values.roleIds.includes(role.id)
              // Khóa checkbox vai trò Chủ cửa hàng khi đang sửa chính tài khoản của mình
              const isShopOwnerCheckbox = role.code === 'SHOP_OWNER' || role.code === 'STORE_OWNER'
              const disabledForSelf = isSelf && isShopOwnerCheckbox
              return (
                <label
                  key={role.id}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-control border px-3 py-2.5 transition-colors ${
                    checked
                      ? 'border-aqs-accent bg-aqs-accent-soft'
                      : 'border-aqs-border bg-aqs-surface hover:bg-aqs-surface-subtle'
                  } ${disabledForSelf ? 'opacity-80' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(role.id)}
                    disabled={pending || disabledForSelf}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-aqs-accent"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-aqs-ink">{displayLabel}</span>
                    {displayDesc ? (
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-aqs-ink-muted">
                        {displayDesc}
                      </span>
                    ) : null}
                    {disabledForSelf && (
                      <span className="mt-1 block text-[11.5px] font-medium text-aqs-warning">
                        Không thể tự bỏ vai trò Chủ cửa hàng của chính mình.
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        )}
        {roleError && (
          <p id="user-account-roles-error" role="alert" className="mt-2 text-xs font-semibold text-aqs-danger">
            {roleError}
          </p>
        )}
      </fieldset>

      {!editing && (
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-start gap-2.5 rounded-control border px-3 py-2.5 transition-colors ${
              values.autoGenerateTemporaryPassword
                ? 'border-aqs-accent bg-aqs-accent-soft'
                : 'border-aqs-border bg-aqs-surface hover:bg-aqs-surface-subtle'
            }`}
          >
            <input
              type="checkbox"
              checked={values.autoGenerateTemporaryPassword}
              onChange={(event) => update('autoGenerateTemporaryPassword', event.target.checked)}
              disabled={pending}
              className="mt-0.5 h-4 w-4 shrink-0 accent-aqs-accent"
            />
            <span>
              <span className="block text-[13.5px] font-semibold text-aqs-ink">Tự tạo mật khẩu tạm</span>
              <span className="mt-0.5 block text-xs text-aqs-ink-muted">
                Hệ thống gửi thông tin đăng nhập qua email sau khi tạo.
              </span>
            </span>
          </label>
          {!values.autoGenerateTemporaryPassword && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <ManagementFormField
                id="user-account-password"
                label="Mật khẩu tạm *"
                hint="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
                error={fieldError('temporaryPassword')}
              >
                <input
                  id="user-account-password"
                  className={managementFieldClass}
                  value={values.temporaryPassword}
                  onChange={(event) => update('temporaryPassword', event.target.value)}
                  aria-invalid={Boolean(fieldError('temporaryPassword'))}
                  aria-describedby={
                    fieldError('temporaryPassword') ? 'user-account-password-error' : 'user-account-password-hint'
                  }
                  type="password"
                  autoComplete="new-password"
                  disabled={pending}
                />
              </ManagementFormField>
              <ManagementFormField
                id="user-account-confirm-password"
                label="Nhập lại mật khẩu *"
                error={fieldError('confirmTemporaryPassword')}
              >
                <input
                  id="user-account-confirm-password"
                  className={managementFieldClass}
                  value={values.confirmTemporaryPassword}
                  onChange={(event) => update('confirmTemporaryPassword', event.target.value)}
                  aria-invalid={Boolean(fieldError('confirmTemporaryPassword'))}
                  aria-describedby={
                    fieldError('confirmTemporaryPassword') ? 'user-account-confirm-password-error' : undefined
                  }
                  type="password"
                  autoComplete="new-password"
                  disabled={pending}
                />
              </ManagementFormField>
            </div>
          )}
        </div>
      )}
    </ManagementForm>
  )
}
