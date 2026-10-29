import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Warehouse,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Droplets,
  ShieldCheck,
  ChevronRight,
  UsersRound,
  KeyRound,
} from 'lucide-react'
import { useAuth } from '../features/iam/hooks/useAuth'

interface NavItem {
  name: string
  to: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  exact?: boolean
}

const NAV_ITEMS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Tổng quan',
    items: [
      {
        name: 'Bảng điều khiển',
        to: '/app/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    group: 'Quản lý danh mục',
    items: [
      {
        name: 'Sản phẩm',
        to: '/app/products',
        icon: Package,
      },
      {
        name: 'Danh mục',
        to: '/app/categories',
        icon: FolderTree,
      },
      {
        name: 'Thương hiệu',
        to: '/app/brands',
        icon: Tags,
      },
      {
        name: 'Tồn kho',
        to: '/app/inventory',
        icon: Warehouse,
      },
    ],
  },
  {
    group: 'Quản lý truy cập',
    items: [
      { name: 'Vai trò', to: '/app/roles', icon: UsersRound },
      { name: 'Quyền', to: '/app/permissions', icon: KeyRound },
    ],
  },
]

function NavList({ navId, onItemClick, dark = false }: { navId: string; onItemClick?: () => void; dark?: boolean }) {
  return (
    <nav className="space-y-1 px-3 py-4" aria-label="Menu điều hướng chính" id={navId}>
      {NAV_ITEMS.map((section) => (
        <div key={section.group}>

          <div className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onItemClick}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      isActive
                        ? dark ? 'bg-sky-700 text-white font-semibold' : 'bg-sky-100 text-sky-800 font-semibold'
                        : dark ? 'text-slate-100 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? (dark ? 'text-white' : 'text-sky-600') : (dark ? 'text-slate-300' : 'text-slate-500')
                        }`}
                        aria-hidden="true"
                      />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function ManagementLayout() {
  const { user, logout } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const openButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLDivElement | null>(null)

  const closeMobileDrawer = useCallback(() => {
    setIsMobileOpen(false)
    // Restore focus to trigger button only if it is connected
    if (openButtonRef.current && openButtonRef.current.isConnected) {
      openButtonRef.current.focus()
    }
  }, [])

  // Automatically close mobile drawer and clean up when viewport transitions to desktop (>= 768px)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const handleViewportChange = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        setIsMobileOpen(false)
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleViewportChange)
    } else if ('addListener' in mediaQuery) {
      // Fallback for older browsers
      (mediaQuery as { addListener: (listener: (e: MediaQueryListEvent) => void) => void }).addListener(handleViewportChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleViewportChange)
      } else if ('removeListener' in mediaQuery) {
        (mediaQuery as { removeListener: (listener: (e: MediaQueryListEvent) => void) => void }).removeListener(handleViewportChange)
      }
    }
  }, [])

  const handleOpenMobileDrawer = () => {
    // Prevent opening drawer if viewport is desktop (>= 768px)
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 768px)').matches) {
      return
    }
    setIsMobileOpen(true)
  }

  // Manage initial focus and keyboard navigation (Escape, Tab focus trap) in mobile drawer
  useEffect(() => {
    if (!isMobileOpen) return

    // Initial focus on close button
    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus()
      }
    }, 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMobileDrawer()
        return
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileOpen, closeMobileDrawer])

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar (fixed width, hidden on mobile) */}
      <aside
        className="hidden md:flex flex-col w-56 bg-slate-900 border-r border-slate-800 shrink-0 sticky top-0 h-screen overflow-y-auto"
        aria-label="Sidebar điều hướng desktop"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-700 shrink-0">
          <Link
            to="/app/dashboard"
            className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg p-1 -ml-1 transition-colors"
          >
            <div className="w-8 h-8 text-sky-400 flex items-center justify-center shrink-0">
              <Droplets className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight leading-none">
                AquaSuite
              </span>
              <span className="text-[9px] font-medium text-slate-300 mt-0.5">
                HỆ THỐNG QUẢN LÝ
              </span>
            </div>
          </Link>
        </div>

        {/* Sidebar Nav Items (Unique ID: desktop-sidebar-navigation) */}
        <div className="flex-1 overflow-y-auto">
          <NavList navId="desktop-sidebar-navigation" dark />
        </div>

        {/* Sidebar Footer User Info & System Info Link (NO Logout here) */}
        {user && (
          <Link to="/app/system-info" aria-label="Hồ sơ cá nhân" className="p-4 border-t border-slate-700 flex items-center gap-3 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-400 shrink-0">
            <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-900 flex items-center justify-center shrink-0 text-xs font-semibold">
              {user.username ? user.username.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" aria-hidden="true" />}
            </div>
            <div className="min-w-0"><p className="text-sm font-semibold text-white truncate">{user.username}</p><p className="text-xs text-slate-300 truncate">{user.email}</p></div>
          </Link>
        )}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/50 z-40 transition-opacity"
            onClick={closeMobileDrawer}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng di động"
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl flex flex-col"
          >
            <div className="h-16 flex items-center justify-between px-6 bg-slate-900 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <span className="text-base font-bold text-white tracking-tight">
                  AquaSuite
                </span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMobileDrawer}
                aria-label="Đóng menu điều hướng"
                className="p-2 text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Mobile Nav Items (Unique ID: mobile-sidebar-navigation) */}
            <div className="flex-1 overflow-y-auto">
              <NavList navId="mobile-sidebar-navigation" onItemClick={closeMobileDrawer} />
            </div>

            {/* Mobile Drawer Footer User Info & System Info Link (NO Logout here) */}
            {user && (
              <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 text-xs font-semibold">
                    {user.username ? user.username.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">{user.username}</p>
                    <p className="text-2xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <Link
                  to="/app/system-info"
                  onClick={closeMobileDrawer}
                  className="mt-3 w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-2xs font-medium text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 hover:text-sky-700 hover:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" />
                    <span>Hồ sơ cá nhân</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Left: Mobile Toggle & Mobile Logo */}
            <div className="flex items-center gap-3">
              <button
                ref={openButtonRef}
                type="button"
                onClick={handleOpenMobileDrawer}
                aria-label="Mở menu điều hướng"
                aria-expanded={isMobileOpen}
                aria-controls="mobile-sidebar-navigation"
                className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>

              <div className="hidden items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-600 text-white flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <span className="text-base font-bold text-white tracking-tight">
                  AquaSuite
                </span>
              </div>
            </div>

            {/* Right: User Status, System Info link & Single Logout Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <Link
                  to="/app/system-info"
                  aria-label="Hồ sơ cá nhân"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                    {user.username ? user.username.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                  <span className="hidden sm:block text-xs text-slate-700 order-first">Xin chào, <strong>{user.username}</strong>!</span>
                </Link>
              )}

              {/* The SINGLE Logout Button */}
              <button
                onClick={() => void logout()}
                type="button"
                aria-label="Đăng xuất"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] min-w-[40px] border border-slate-200 hover:border-red-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500">
          AquaSuite — Hệ thống quản lý đại lý thiết bị vệ sinh
        </footer>
      </div>
    </div>
  )
}
