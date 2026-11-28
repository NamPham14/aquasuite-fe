import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { normalizeApiError } from '../../../shared/api/apiError'
import { loginSchema, type LoginFormData } from '../schemas/login.schema'
import { useAuth } from '../hooks/useAuth'
import { isCustomerRole } from '../types/auth.types'

/** Form đăng nhập: validate bằng loginSchema, gọi useAuth.login và hiển thị lỗi phù hợp. */
export function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Sau validation, chờ login hoàn tất rồi điều hướng theo vai trò; không điều hướng khi kết quả đã cũ.
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await login({
        email: data.email,
        password: data.password,
      })

      if (result) {
        // Khách hàng về trang cửa hàng, nhân viên về dashboard quản trị.
        const targetPath = isCustomerRole(result.user?.roles) ? '/storefront' : '/app/dashboard'
        navigate(targetPath, { replace: true })
      }
    } catch (err: unknown) {
      const apiError = normalizeApiError(err)
      if (apiError.code === 'AUTH_003') {
        setErrorMessage('Email hoặc mật khẩu không chính xác.')
      } else if (apiError.code === 'AUTH_008') {
        setErrorMessage('Tài khoản của bạn đã bị vô hiệu hóa hoặc không ở trạng thái hoạt động.')
      } else if (apiError.code === 'AUTH_009' || apiError.status === 'FETCH_ERROR') {
        setErrorMessage('Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.')
      } else {
        setErrorMessage(apiError.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.')
      }
    } finally {
      setIsSubmitting(false)
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
      aria-label="Form đăng nhập"
    >
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="border border-[#DFC4C4] bg-[#FDF6F6] p-3.5 text-sm text-[#8F2D2D]"
        >
          {errorMessage}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F3D39]"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
          className={`w-full border bg-[#F9F8F6] px-3.5 py-2.5 text-sm text-[#171614] transition-colors placeholder:text-[#9E988E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171614]/15 disabled:opacity-60 ${
            errors.email
              ? 'border-[#B72F42] focus:border-[#B72F42]'
              : 'border-[#E6E2DA] focus:border-[#171614]'
          }`}
          placeholder="ten@aquasuite.vn"
        />
        {errors.email && (
          <p id="email-error" className="mt-1.5 text-xs text-[#982438]">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F3D39]"
        >
          Mật khẩu
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
            className={`w-full border bg-[#F9F8F6] py-2.5 pl-3.5 pr-11 text-sm text-[#171614] transition-colors placeholder:text-[#9E988E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#171614]/15 disabled:opacity-60 ${
              errors.password
                ? 'border-[#B72F42] focus:border-[#B72F42]'
                : 'border-[#E6E2DA] focus:border-[#171614]'
            }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isSubmitting}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-[#78736A] transition-colors hover:text-[#171614] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#171614] disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="mt-1.5 text-xs text-[#982438]">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-11 w-full cursor-pointer items-center justify-center bg-[#171614] px-4 py-2.5 text-sm font-medium tracking-[0.04em] text-white transition-colors hover:bg-[#2C2A27] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171614] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent motion-reduce:animate-none" />
            Đang đăng nhập...
          </span>
        ) : (
          'Đăng nhập'
        )}
      </button>
    </form>
  )
}
