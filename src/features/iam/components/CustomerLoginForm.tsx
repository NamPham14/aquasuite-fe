import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { normalizeApiError } from '../../../shared/api/apiError'
import { customerLoginSchema, type CustomerLoginFormData } from '../schemas/customerLogin.schema'
import { useAuth } from '../hooks/useAuth'

export function CustomerLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const submitting = useRef(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<CustomerLoginFormData>({
    resolver: zodResolver(customerLoginSchema),
    defaultValues: { phone: '', password: '' },
  })

  async function onSubmit(data: CustomerLoginFormData) {
    if (submitting.current) return
    submitting.current = true
    setMessage(null)
    try {
      if (await login(data)) navigate('/app/dashboard', { replace: true })
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (apiError.code === 'AUTH_003') setMessage('Số điện thoại hoặc mật khẩu không chính xác.')
      else if (apiError.code === 'AUTH_008') setMessage('Tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa.')
      else if (apiError.code === 'AUTH_009' || apiError.status === 'FETCH_ERROR' || (typeof apiError.status === 'number' && apiError.status >= 500)) {
        setMessage('Dịch vụ đăng nhập tạm thời không khả dụng. Vui lòng thử lại sau.')
      } else {
        setMessage(apiError.message || 'Đăng nhập không thành công. Vui lòng thử lại.')
        for (const detail of apiError.errors ?? []) {
          if (detail.field === 'phone' || detail.field === 'password') {
            setError(detail.field, { type: 'server', message: detail.message })
          }
        }
      }
    } finally {
      submitting.current = false
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 disabled:opacity-60'
  return (
    <form onSubmit={(event) => { void handleSubmit(onSubmit)(event) }} noValidate aria-label="Đăng nhập khách hàng" aria-busy={isSubmitting} className="space-y-5">
      {message && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{message}</p>}
      <div>
        <label htmlFor="customer-phone" className="mb-2 block text-sm font-medium text-slate-800">Số điện thoại</label>
        <input id="customer-phone" type="tel" inputMode="tel" autoComplete="username" placeholder="Nhập số điện thoại đã đăng ký" disabled={isSubmitting}
          aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'customer-phone-error' : undefined} {...register('phone')} className={inputClass} />
        {errors.phone && <p id="customer-phone-error" className="mt-2 text-sm text-red-700">{errors.phone.message}</p>}
      </div>
      <div>
        <label htmlFor="customer-password" className="mb-2 block text-sm font-medium text-slate-800">Mật khẩu</label>
        <div className="relative">
          <input id="customer-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" disabled={isSubmitting}
            aria-invalid={!!errors.password} aria-describedby={errors.password ? 'customer-password-error' : undefined} {...register('password')} className={`${inputClass} pr-20`} />
          <button type="button" disabled={isSubmitting} aria-controls="customer-password" aria-pressed={showPassword} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700">{showPassword ? 'Ẩn' : 'Hiện'}</button>
        </div>
        {errors.password && <p id="customer-password-error" className="mt-2 text-sm text-red-700">{errors.password.message}</p>}
      </div>
      <button type="submit" disabled={isSubmitting} className="min-h-12 w-full rounded-lg bg-teal-800 px-4 py-3 font-semibold text-white hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-wait disabled:opacity-60">
        {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
      <p role="status" className="sr-only">{isSubmitting ? 'Đang xác thực tài khoản, vui lòng chờ.' : ''}</p>
    </form>
  )
}
