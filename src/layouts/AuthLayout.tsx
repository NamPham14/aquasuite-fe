import { ArrowLeft, ArrowUpRight, Droplets } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#F9F8F6] font-store-sans text-[#171614] lg:grid lg:grid-cols-12">
      {/* Cột trái: Ảnh showroom kiến trúc & thông điệp thương hiệu */}
      <aside
        aria-label="Không gian thương hiệu AquaSuite"
        className="relative hidden overflow-hidden bg-[#171614] text-white lg:col-span-6 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:col-span-7 xl:p-16"
      >
        <img
          src="/images/hero-sanctuary.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#171614] via-[#171614]/55 to-[#171614]/45"
        />

        <header className="relative z-10 flex items-center justify-between">
          <Link
            to="/storefront"
            className="inline-flex items-center gap-3 text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <span className="flex h-9 w-9 items-center justify-center border border-white/25 bg-white/10 backdrop-blur-xs">
              <Droplets className="h-4 w-4 text-[#9FD8DE]" aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <span className="font-editorial text-xl tracking-[0.06em] uppercase">AquaSuite</span>
              <span className="text-[10px] uppercase tracking-[0.24em] text-white/70">
                Architectural Bathware
              </span>
            </span>
          </Link>

          <Link
            to="/storefront"
            className="inline-flex items-center gap-1.5 border border-white/25 bg-white/5 px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-white/90 transition-colors hover:border-white hover:bg-white hover:text-[#171614] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span>Khám phá Showroom</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </header>

        <div className="relative z-10 max-w-xl space-y-6">
          <p className="text-[11px] uppercase tracking-[0.26em] text-[#B9DFE3]">
            Showroom Thiết bị Vệ sinh &amp; Quản lý Đại lý
          </p>
          <h1 className="font-editorial text-4xl leading-[1.15] font-normal tracking-[-0.02em] text-white xl:text-[44px]">
            Không gian phòng tắm tinh tuyển, vận hành chuẩn xác.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            Trải nghiệm mua sắm thiết bị vệ sinh chính hãng cho gia chủ, chủ đầu tư và nền tảng điều
            hành bán hàng, kho vận, công nợ dành cho đội ngũ đại lý AquaSuite.
          </p>

          <div className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-xs">
            <div>
              <p className="font-medium text-white">Showroom Trực tuyến</p>
              <p className="mt-1 text-[11px] text-white/65">Danh mục &amp; combo đồng bộ</p>
            </div>
            <div>
              <p className="font-medium text-white">Bảo hành Điện tử</p>
              <p className="mt-1 text-[11px] text-white/65">Tra cứu &amp; tiếp nhận 24/7</p>
            </div>
            <div>
              <p className="font-medium text-white">Vận hành Nội bộ</p>
              <p className="mt-1 text-[11px] text-white/65">POS, Kho vận &amp; Công nợ</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Cột phải: Khu vực form đăng nhập / đăng ký tối giản */}
      <main className="flex min-h-screen flex-col justify-between px-5 py-7 sm:px-10 lg:col-span-6 lg:px-12 xl:col-span-5 xl:px-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/storefront"
            className="inline-flex items-center gap-2 text-[#171614] lg:hidden"
          >
            <Droplets className="h-5 w-5 text-[#087f8c]" aria-hidden="true" />
            <span className="font-editorial text-lg font-medium tracking-[0.04em] uppercase">
              AquaSuite
            </span>
          </Link>

          <Link
            to="/storefront"
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[#6B6760] transition-colors hover:text-[#171614] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171614]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Về Showroom</span>
          </Link>
        </div>

        <section className="mx-auto my-auto w-full max-w-[440px] py-8">
          <div className="border border-[#E6E2DA] bg-white px-6 py-8 shadow-[0_20px_50px_-34px_rgba(23,22,20,0.22)] sm:px-9 sm:py-10">
            <Outlet />
          </div>
        </section>

        <footer className="text-center text-xs text-[#78736A]">
          &copy; 2026 AquaSuite · Bảo mật thông tin phiên làm việc.
        </footer>
      </main>
    </div>
  )
}
