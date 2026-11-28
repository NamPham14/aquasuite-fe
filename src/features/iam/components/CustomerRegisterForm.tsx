import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { normalizeApiError } from '../../../shared/api/apiError'
import { registerCustomerApi, resendRegistrationApi } from '../api/authApi'
import { customerRegisterSchema, registrationOtpSchema, type CustomerRegisterData } from '../schemas/customerRegister.schema'
import { useAuth } from '../hooks/useAuth'

const inputClass = 'mt-1.5 w-full border border-[#E6E2DA] bg-[#F9F8F6] px-3.5 py-2.5 text-sm text-[#171614] transition-colors placeholder:text-[#9E988E] focus:border-[#171614] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171614]/15 disabled:opacity-60'
const buttonClass = 'min-h-11 w-full cursor-pointer bg-[#171614] px-4 py-2.5 text-sm font-medium tracking-[0.04em] text-white transition-colors hover:bg-[#2C2A27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171614] disabled:cursor-wait disabled:opacity-60'
const errorMessages: Record<string, string> = {
  REG_001: 'Email hoặc số điện thoại đã được sử dụng. Vui lòng đăng nhập.',
  REG_002: 'Mã OTP không chính xác. Vui lòng kiểm tra lại email.',
  REG_003: 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.',
  REG_004: 'Đã đạt giới hạn yêu cầu. Vui lòng chờ trước khi thử lại.',
  REG_006: 'Đăng ký đang được xử lý hoặc tài khoản đã tồn tại. Vui lòng chờ hoặc đăng nhập.',
  REG_007: 'Chưa gửi được email xác minh. Bạn có thể yêu cầu gửi lại mã.',
  REG_008: 'Dịch vụ đăng ký tạm thời không khả dụng. Vui lòng thử lại sau.',
  REG_009: 'Tài khoản đã được kích hoạt. Vui lòng đăng nhập để tiếp tục.',
}

export function CustomerRegisterForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const lock = useRef(false)
  const otpInput = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(0)
  const [expired, setExpired] = useState(false)
  const [activated, setActivated] = useState(false)
  const { register, handleSubmit, setError, reset, formState: { errors } } = useForm<CustomerRegisterData>({
    resolver: zodResolver(customerRegisterSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', passwordConfirmation: '', termsAccepted: false },
  })
  useEffect(() => { if (email) otpInput.current?.focus() }, [email])
  useEffect(() => {
    if (!email) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [email])
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000))

  function beginVerification(address: string) {
    setEmail(address)
    reset()
    setResendAt(Date.now() + 60000)
    setNow(Date.now())
  }

  async function run(action: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setMessage('')
    setNotice('')
    try { await action() } catch (error) {
      const apiError = normalizeApiError(error)
      setMessage(errorMessages[apiError.code ?? ''] ?? apiError.message ?? 'Không thể kết nối. Vui lòng thử lại.')
      if (apiError.code === 'REG_003') setExpired(true)
      if (apiError.code === 'REG_009') setActivated(true)
      for (const detail of apiError.errors ?? []) {
        if (detail.field && Object.hasOwn(customerRegisterSchema.shape, detail.field)) {
          setError(detail.field as keyof CustomerRegisterData, { type: 'server', message: detail.message })
        }
      }
    } finally { lock.current = false; setBusy(false) }
  }

  async function submit(data: CustomerRegisterData) {
    await run(async () => {
      try {
        await registerCustomerApi(data)
        beginVerification(data.email)
        setNotice('Đã gửi mã xác minh tới email của bạn.')
      } catch (error) {
        if (normalizeApiError(error).code === 'REG_007') beginVerification(data.email)
        throw error
      }
    })
  }

  return <div>
    {message && <p role="alert" className="mb-5 border border-[#DFC4C4] bg-[#FDF6F6] p-3.5 text-sm text-[#8F2D2D]">{message}</p>}
    <p role="status" className="mb-4 text-sm text-[#087f8c]">{notice}</p>
    {email ? <form aria-label="Xác minh email" aria-busy={busy} className="space-y-4" onSubmit={event => {
      event.preventDefault()
      const result = registrationOtpSchema.safeParse(otp)
      if (!result.success) { setMessage('Mã OTP gồm 6 chữ số.'); otpInput.current?.focus(); return }
      void run(async () => {
        try { if (await login({ email, otp })) navigate('/profile', { replace: true }) }
        catch (error) {
          // Verification may have created the account before session completion failed.
          if (!normalizeApiError(error).code?.startsWith('REG_')) setActivated(true)
          throw error
        }
      })
    }}>
      <p className="break-words text-sm leading-6 text-[#6B6760]">Nhập mã OTP gửi tới <strong className="text-[#171614]">{email}</strong>. Phiên có hiệu lực 5 phút từ lúc đăng ký; gửi lại mã không gia hạn phiên.</p>
      {!expired && !activated && <>
        <div><label htmlFor="registration-otp" className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F3D39]">Mã xác minh</label>
          <input ref={otpInput} id="registration-otp" value={otp} onChange={event => setOtp(event.target.value)} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={busy} className={`${inputClass} tracking-[0.4em]`} />
        </div>
        <button disabled={busy} className={buttonClass}>{busy ? 'Đang xử lý…' : 'Xác minh và tạo tài khoản'}</button>
        <button type="button" disabled={busy || wait > 0} className="min-h-11 w-full cursor-pointer text-sm font-medium text-[#171614] underline decoration-[#C7C1B5] underline-offset-4 hover:text-[#087f8c] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#171614]" onClick={() => {
          void run(async () => {
            await resendRegistrationApi(email)
            setOtp('')
            setResendAt(Date.now() + 60000)
            setNow(Date.now())
            setNotice('Đã gửi mã mới. Mã trước đó không còn hiệu lực.')
          })
        }}>{wait > 0 ? `Gửi lại mã sau ${wait}s` : 'Gửi lại mã OTP'}</button>
      </>}
      {activated ? <Link to="/login" className="block text-sm font-medium text-[#171614] underline underline-offset-4 hover:text-[#087f8c]">Đăng nhập tài khoản</Link> : <button type="button" disabled={busy} className="min-h-11 w-full cursor-pointer text-sm text-[#6B6760] underline underline-offset-4 hover:text-[#171614]" onClick={() => { setEmail(''); setOtp(''); setMessage(''); setNotice(''); setExpired(false) }}>Đăng ký lại / đổi email</button>}
    </form> : <form noValidate aria-label="Đăng ký khách hàng" aria-busy={busy} className="space-y-4" onSubmit={event => { void handleSubmit(submit)(event) }}>
      <fieldset disabled={busy} className="space-y-4">
        {([
          ['fullName', 'Họ và tên', 'text', 'name'],
          ['email', 'Email', 'email', 'email'],
          ['phone', 'Số điện thoại', 'tel', 'tel'],
          ['password', 'Mật khẩu', showPassword ? 'text' : 'password', 'new-password'],
          ['passwordConfirmation', 'Xác nhận mật khẩu', showPassword ? 'text' : 'password', 'new-password'],
        ] as const).map(([name, label, type, autoComplete]) => <div key={name}>
          <label htmlFor={`register-${name}`} className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F3D39]">{label}</label>
          <input id={`register-${name}`} type={type} autoComplete={autoComplete} {...register(name)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `register-${name}-error` : name === 'password' ? 'password-help' : undefined} className={inputClass} />
          {name === 'password' && <p id="password-help" className="mt-1.5 text-xs leading-5 text-[#6B6760]">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Tối đa 72 byte UTF-8.</p>}
          {errors[name] && <p id={`register-${name}-error`} className="mt-1.5 text-xs text-[#982438]">{errors[name].message}</p>}
        </div>)}
        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-[#3F3D39]"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} className="size-4 accent-[#171614]" />Hiện mật khẩu</label>
        <div><label className="flex min-h-10 cursor-pointer items-start gap-3 text-sm leading-6 text-[#3F3D39]"><input type="checkbox" {...register('termsAccepted')} aria-invalid={!!errors.termsAccepted} aria-describedby={errors.termsAccepted ? 'terms-error' : undefined} className="mt-1 size-4 shrink-0 accent-[#171614]" />Tôi đồng ý với điều khoản sử dụng của AquaSuite.</label>
          {errors.termsAccepted && <p id="terms-error" className="mt-1.5 text-xs text-[#982438]">{errors.termsAccepted.message}</p>}
        </div>
        <button type="submit" className={buttonClass}>{busy ? 'Đang gửi mã…' : 'Đăng ký và nhận mã OTP'}</button>
      </fieldset>
    </form>}
  </div>
}
