import { Link } from 'react-router-dom'
import { CustomerLoginForm } from '../../features/iam/components/CustomerLoginForm'
import { useAuth } from '../../features/iam/hooks/useAuth'

export function CustomerLoginPage() {
  const { bootstrapError } = useAuth()
  return (
    <main className="flex min-h-svh flex-col bg-stone-50 px-5 py-8 text-slate-900 sm:px-8">
      <header className="mx-auto w-full max-w-5xl border-b border-stone-200 pb-6">
        <span className="text-2xl font-bold tracking-tight text-teal-900">AquaSuite</span>
        <span className="mt-1 block text-sm text-slate-600">Không gian dành cho khách hàng</span>
      </header>
      <section aria-labelledby="customer-login-title" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-800">Tài khoản khách hàng</p>
        <h1 id="customer-login-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Chào mừng trở lại.</h1>
        <p className="mb-8 mt-3 text-sm leading-6 text-slate-600">Đăng nhập bằng số điện thoại đã đăng ký và mật khẩu của bạn.</p>
        {bootstrapError && <p role="alert" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{bootstrapError.message}</p>}
        <CustomerLoginForm />
        <p className="mt-8 border-t border-stone-200 pt-6 text-center text-sm text-slate-600">Bạn là nhân viên? <Link to="/login" className="font-medium text-teal-800 underline underline-offset-4">Đăng nhập hệ thống</Link></p>
      </section>
      <footer className="text-center text-xs text-slate-500">© 2026 AquaSuite</footer>
    </main>
  )
}
