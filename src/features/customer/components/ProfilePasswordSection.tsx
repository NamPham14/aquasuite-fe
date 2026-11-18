import { useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useChangeMyPasswordMutation } from '../api/profileApi.ts'

/**
 * Tab Đổi mật khẩu tài khoản khách hàng.
 * Kiểm tra đầy đủ chính sách mật khẩu mạnh trước khi gửi lên /api/v1/iam/password/change.
 */
export function ProfilePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [changeMyPassword, { isLoading }] = useChangeMyPasswordMutation()

  const rules = [
    { label: 'Ít nhất 8 ký tự', ok: newPassword.length >= 8 },
    { label: 'Chứa chữ hoa (A-Z) và chữ thường (a-z)', ok: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: 'Chứa ít nhất 1 chữ số (0-9)', ok: /\d/.test(newPassword) },
    { label: 'Chứa ký tự đặc biệt (!@#$...)', ok: /[^A-Za-z0-9]/.test(newPassword) },
    {
      label: 'Xác nhận mật khẩu trùng khớp',
      ok: confirmNewPassword.length > 0 && newPassword === confirmNewPassword,
    },
  ]

  const allRulesValid = currentPassword.length > 0 && rules.every((r) => r.ok)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại')
      return
    }
    if (!rules.every((r) => r.ok)) {
      toast.error('Mật khẩu mới chưa đáp ứng đủ điều kiện bảo mật')
      return
    }

    try {
      const res = await changeMyPassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      }).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      toast.success(res?.message || 'Đổi mật khẩu thành công!')
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 sm:p-7 shadow-sm space-y-6"
    >
      <div className="flex items-start gap-3 pb-4 border-b border-slate-100">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Đổi mật khẩu đăng nhập</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sử dụng mật khẩu mạnh để bảo vệ thông tin đơn hàng và hồ sơ bảo hành của bạn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4 text-xs">
          <div>
            <label htmlFor="pwd-current" className="block font-bold text-slate-700 mb-1.5">
              Mật khẩu hiện tại <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="pwd-current"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-xs sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                aria-label="Ẩn/hiện mật khẩu hiện tại"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="pwd-new" className="block font-bold text-slate-700 mb-1.5">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="pwd-new"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-xs sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                aria-label="Ẩn/hiện mật khẩu mới"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="pwd-confirm" className="block font-bold text-slate-700 mb-1.5">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="pwd-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-xs sm:text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label="Ẩn/hiện xác nhận mật khẩu"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Checklist tiêu chuẩn mật khẩu */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2.5">
          <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-sky-600" aria-hidden="true" />
            <span>Tiêu chuẩn mật khẩu an toàn</span>
          </p>
          <ul className="space-y-2">
            {rules.map((rule) => (
              <li key={rule.label} className="flex items-center gap-2 text-xs">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                    rule.ok
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
                <span className={rule.ok ? 'font-semibold text-emerald-700' : 'text-slate-600'}>
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-2 flex justify-end border-t border-slate-100">
        <button
          type="submit"
          disabled={isLoading || !allRulesValid}
          className="aqua-shine-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white hover:from-sky-500 hover:to-cyan-500 disabled:opacity-45 transition shadow-md shadow-sky-500/20 cursor-pointer disabled:cursor-not-allowed"
        >
          <KeyRound className="h-4 w-4" aria-hidden="true" />
          <span>{isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
        </button>
      </div>
    </form>
  )
}

