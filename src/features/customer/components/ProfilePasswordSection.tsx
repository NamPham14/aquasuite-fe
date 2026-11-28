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
      className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-6"
    >
      <div className="flex items-start gap-3.5 pb-4 border-b border-[#E6E2DA]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]">
          <KeyRound className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            An toàn tài khoản
          </p>
          <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
            Đổi mật khẩu đăng nhập
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Sử dụng mật khẩu mạnh để bảo vệ thông tin đơn hàng và hồ sơ bảo hành của bạn.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4 text-xs">
          <div>
            <label
              htmlFor="pwd-current"
              className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
            >
              Mật khẩu hiện tại <span className="text-[#991B1B]">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
              <input
                id="pwd-current"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] pl-9 pr-10 text-xs sm:text-sm text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                aria-label="Ẩn/hiện mật khẩu hiện tại"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78736A] hover:text-[#171614] cursor-pointer"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="pwd-new"
              className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
            >
              Mật khẩu mới <span className="text-[#991B1B]">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
              <input
                id="pwd-new"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] pl-9 pr-10 text-xs sm:text-sm text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                aria-label="Ẩn/hiện mật khẩu mới"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78736A] hover:text-[#171614] cursor-pointer"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="pwd-confirm"
              className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
            >
              Xác nhận mật khẩu mới <span className="text-[#991B1B]">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
              <input
                id="pwd-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] pl-9 pr-10 text-xs sm:text-sm text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label="Ẩn/hiện xác nhận mật khẩu"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78736A] hover:text-[#171614] cursor-pointer"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Checklist tiêu chuẩn mật khẩu */}
        <div className="lg:col-span-5 border border-[#E6E2DA] bg-[#FAF9F6] p-5 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#8C6D46]" aria-hidden="true" />
            <span>Tiêu chuẩn mật khẩu</span>
          </p>
          <ul className="space-y-2.5">
            {rules.map((rule) => (
              <li key={rule.label} className="flex items-center gap-2.5 text-xs">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                    rule.ok
                      ? 'border-[#245C42] bg-[#245C42] text-white'
                      : 'border-[#D6D1C7] bg-white text-[#8C867C]'
                  }`}
                >
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
                <span className={rule.ok ? 'font-medium text-[#245C42]' : 'text-[#6B6760]'}>
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-4 flex justify-end border-t border-[#E6E2DA]">
        <button
          type="submit"
          disabled={isLoading || !allRulesValid}
          className="h-10 inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <KeyRound className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
          <span>{isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
        </button>
      </div>
    </form>
  )
}
