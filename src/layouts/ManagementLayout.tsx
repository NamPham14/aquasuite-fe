import { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, NavLink, Link, useLocation, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Layers,
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
  ChevronDown,
  UsersRound,
  KeyRound,
  HandCoins,
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  WalletCards,
  LifeBuoy,
  ClipboardCheck,
  BadgeCheck,
  ReceiptText,
  PackageCheck,
  ClipboardList,
  ScrollText,
  UserCog,
  Store,
} from 'lucide-react'
import { useAuth } from '../features/iam/hooks/useAuth'
import { useProfileSync } from '../features/iam/hooks/useProfileSync'
import { isCustomerRole } from '../features/iam/types/auth.types'

interface NavItem {
  name: string
  to: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  exact?: boolean
  /** Đường dẫn con tách thành mục menu riêng nên không tô sáng mục cha khi đang ở đường dẫn đó. */
  excludePrefix?: string
  /** Nếu có, chỉ hiển thị mục này cho người dùng có một trong các vai trò liệt kê. */
  roles?: string[]
}

const NAV_ITEMS: { group: string; pinned?: boolean; items: NavItem[] }[] = [
  {
    group: 'Tổng quan',
    pinned: true,
    items: [
      {
        name: 'Bảng điều khiển',
        to: '/app/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    group: 'Bán hàng & Đơn hàng',
    items: [
      {
        name: 'Đơn hàng',
        to: '/app/orders',
        icon: ShoppingCart,
        roles: ['SALES_STAFF', 'ACCOUNTANT', 'SHOP_OWNER'],
      },
      {
        name: 'Báo giá',
        to: '/app/quotations',
        icon: FileSpreadsheet,
        roles: ['SALES_STAFF', 'SHOP_OWNER'],
      },
      {
        name: 'Đặt cọc & Giữ hàng',
        to: '/app/deposits',
        icon: HandCoins,
        roles: ['SALES_STAFF', 'SHOP_OWNER'],
      },
      {
        name: 'Yêu cầu đổi / hủy đơn',
        to: '/app/order-modification-requests',
        icon: ClipboardCheck,
        roles: ['SALES_STAFF', 'ACCOUNTANT', 'SHOP_OWNER'],
      },
    ],
  },
  {
    group: 'Tài chính & Công nợ',
    items: [
      {
        name: 'Xác minh thanh toán',
        to: '/app/payment-verifications',
        icon: BadgeCheck,
        roles: ['ACCOUNTANT', 'SHOP_OWNER'],
      },
      {
        name: 'Phân bổ tiền thu',
        to: '/app/payment-allocations',
        icon: ReceiptText,
        roles: ['ACCOUNTANT'],
      },
      {
        name: 'Công nợ khách hàng',
        to: '/app/customer-debts',
        icon: WalletCards,
        excludePrefix: '/app/customer-debts/credit-approvals',
        roles: ['ACCOUNTANT', 'SHOP_OWNER'],
      },
      {
        name: 'Duyệt hạn mức tín dụng',
        to: '/app/customer-debts/credit-approvals',
        icon: ShieldCheck,
        roles: ['SHOP_OWNER'],
      },
      {
        name: 'Thu & bàn giao COD',
        to: '/app/cod-collections',
        icon: HandCoins,
        roles: ['SHIPPER', 'ACCOUNTANT', 'SALES_STAFF', 'SHOP_OWNER'],
      },
    ],
  },
  {
    group: 'Kho vận & Cung ứng',
    items: [
      {
        name: 'Tồn kho',
        to: '/app/inventory',
        icon: Warehouse,
        roles: ['SHOP_OWNER', 'ACCOUNTANT'],
      },
      {
        name: 'Phiếu xuất kho',
        to: '/app/issue-notes',
        icon: PackageCheck,
        roles: ['ACCOUNTANT', 'SHOP_OWNER'],
      },
      {
        name: 'Quản lý giao hàng',
        to: '/app/deliveries',
        icon: Truck,
        roles: ['ACCOUNTANT', 'SHOP_OWNER'],
      },
      {
        name: 'Đơn giao của tôi',
        to: '/app/my-deliveries',
        icon: Truck,
        roles: ['SHIPPER'],
      },
      {
        name: 'Đơn mua hàng (PO)',
        to: '/app/purchase-orders',
        icon: ClipboardList,
        roles: ['SHOP_OWNER', 'ACCOUNTANT', 'SALES_STAFF'],
      },
    ],
  },
  {
    group: 'Sản phẩm & Danh mục',
    items: [
      { name: 'Sản phẩm', to: '/app/products', icon: Package, roles: ['SHOP_OWNER'] },
      { name: 'Combo', to: '/app/combos', icon: Layers, roles: ['SHOP_OWNER'] },
      { name: 'Danh mục', to: '/app/categories', icon: FolderTree, roles: ['SHOP_OWNER'] },
      { name: 'Thương hiệu', to: '/app/brands', icon: Tags, roles: ['SHOP_OWNER'] },
    ],
  },
  {
    group: 'Bảo hành',
    items: [
      {
        name: 'Thẻ bảo hành điện tử',
        to: '/app/warranty-records',
        icon: ShieldCheck,
        roles: ['SHOP_OWNER', 'SALES_STAFF'],
      },
      {
        name: 'Yêu cầu bảo hành',
        to: '/app/warranty-tickets',
        icon: LifeBuoy,
        roles: ['SHOP_OWNER'],
      },
      {
        name: 'Chính sách bảo hành',
        to: '/app/warranty-policies',
        icon: ScrollText,
        roles: ['SHOP_OWNER'],
      },
    ],
  },
  {
    group: 'Hệ thống & Phân quyền',
    items: [
      { name: 'Tài khoản người dùng', to: '/app/users', icon: UsersRound, roles: ['SHOP_OWNER'] },
      { name: 'Vai trò', to: '/app/roles', icon: UserCog, roles: ['SHOP_OWNER'] },
      { name: 'Quyền', to: '/app/permissions', icon: KeyRound, roles: ['SHOP_OWNER'] },
    ],
  },
]

function NavList({ navId, onItemClick }: { navId: string; onItemClick?: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const roles = user?.roles ?? []
  const canSee = (item: NavItem) => !item.roles || item.roles.some((r) => roles.includes(r))
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }))
  }

  const visibleSections = NAV_ITEMS.map((section) => ({ section, visible: section.items.filter(canSee) }))
    .filter(({ visible }) => visible.length > 0)

  return (
    <nav className="space-y-3 px-3 py-4" aria-label="Menu điều hướng chính" id={navId}>
      {visibleSections.map(({ section, visible }, index) => {
        const hasActiveItem = visible.some((item) => {
          if (item.excludePrefix && location.pathname.startsWith(item.excludePrefix)) return false
          return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
        })
        const isCollapsed = !section.pinned && !hasActiveItem && Boolean(collapsedGroups[section.group])

        return (
          <div
            key={section.group}
            className={index > 0 ? 'border-t border-aqs-border pt-3' : ''}
          >
            {!section.pinned && (
              <button
                type="button"
                onClick={() => toggleGroup(section.group)}
                aria-expanded={!isCollapsed}
                className={`mb-1.5 flex w-full cursor-pointer items-center justify-between rounded px-2.5 py-1 text-left text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-aqs-focus ${
                  hasActiveItem
                    ? 'text-aqs-accent-hover hover:text-aqs-ink'
                    : 'text-aqs-ink-faint hover:text-aqs-ink'
                }`}
              >
                <span>{section.group}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                  aria-hidden="true"
                />
              </button>
            )}

            {!isCollapsed && (
              <div className="space-y-1">
                {visible.map((item) => {
                  const Icon = item.icon
                  const shouldEndMatch = Boolean(
                    item.exact || (item.excludePrefix && location.pathname.startsWith(item.excludePrefix)),
                  )
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={shouldEndMatch}
                      onClick={onItemClick}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-aqs-focus ${
                          isActive
                            ? 'bg-aqs-accent-soft font-semibold text-aqs-accent-hover'
                            : 'text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive ? 'text-aqs-accent' : 'text-aqs-ink-faint group-hover:text-aqs-ink'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="truncate">{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function ManagementLayout() {
  const { user, logout } = useAuth()
  // Đồng bộ vai trò khi tab được focus lại để sidebar cập nhật động theo phân quyền mới.
  useProfileSync()
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

  // Khách hàng không có quyền truy cập khu vực quản trị nội bộ.
  // Đặt sau toàn bộ hook để giữ thứ tự hook nhất quán giữa các lần render.
  if (isCustomerRole(user?.roles)) {
    return <Navigate to="/storefront" replace />
  }

  return (
    <div className="flex min-h-screen bg-aqs-page">
      {/* Desktop Sidebar (fixed width, hidden on mobile) */}
      <aside
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-aqs-border bg-aqs-surface md:flex"
        aria-label="Sidebar điều hướng desktop"
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-aqs-border px-5">
          <Link
            to="/app/dashboard"
            className="-ml-1 flex items-center gap-2.5 rounded-lg p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-aqs-focus"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center text-aqs-accent">
              <Droplets className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight text-aqs-ink">
                AquaSuite
              </span>
              <span className="mt-0.5 text-[10px] font-medium text-aqs-ink-faint">
                HỆ THỐNG QUẢN LÝ
              </span>
            </div>
          </Link>
        </div>

        {/* Sidebar Nav Items (Unique ID: desktop-sidebar-navigation) */}
        <div className="flex-1 overflow-y-auto">
          <NavList navId="desktop-sidebar-navigation" />
        </div>

        {/* Sidebar Footer User Info & System Info Link (NO Logout here) */}
        {user && (
          <Link
            to="/app/system-info"
            aria-label="Hồ sơ cá nhân"
            className="flex shrink-0 items-center gap-3 border-t border-aqs-border p-4 transition-colors hover:bg-aqs-surface-subtle focus:outline-none focus:ring-2 focus:ring-inset focus:ring-aqs-focus"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aqs-accent-soft text-xs font-semibold text-aqs-accent-hover">
              {user.username ? user.username.slice(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-aqs-ink">{user.username}</p>
              <p className="truncate text-xs text-aqs-ink-faint">{user.email}</p>
            </div>
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
                    <p className="truncate text-xs font-semibold text-aqs-ink">{user.username}</p>
                    <p className="truncate text-[11px] text-aqs-ink-faint">{user.email}</p>
                  </div>
                </div>

                <Link
                  to="/app/system-info"
                  onClick={closeMobileDrawer}
                  className="mt-3 flex w-full items-center justify-between rounded-control border border-aqs-border bg-aqs-surface px-2.5 py-1.5 text-[11px] font-medium text-aqs-ink-muted transition-colors hover:border-aqs-accent-border hover:bg-aqs-surface-subtle hover:text-aqs-accent-hover focus:outline-none focus:ring-2 focus:ring-aqs-focus"
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
        <header className="sticky top-0 z-30 border-b border-aqs-border bg-aqs-surface">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
              {/* Nhân viên có thể mở trang cửa hàng (homepage) mà không cần đăng xuất. */}
              <Link
                to="/storefront"
                aria-label="Xem trang cửa hàng"
                title="Xem trang cửa hàng"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-h-[40px] min-w-[40px] border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                <Store className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Cửa hàng</span>
              </Link>

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
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        {/* Global Footer */}
        <footer className="border-t border-aqs-border bg-aqs-surface py-4 text-center text-xs text-aqs-ink-faint">
          AquaSuite — Hệ thống quản lý đại lý thiết bị vệ sinh
        </footer>
      </div>
    </div>
  )
}
