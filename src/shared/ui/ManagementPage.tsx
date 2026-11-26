import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './Button'

export function ManagementPageShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col gap-5 font-aqs-sans text-aqs-ink ${className}`}>
      {children}
    </div>
  )
}

export function ManagementPageHeader({
  title,
  description,
  breadcrumb,
  group,
  actions,
}: {
  title: string
  description: string
  breadcrumb: string
  group?: string
  /** Giữ tương thích ngược cho các trang chưa truyền actions slot */
  icon?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="grid grid-cols-1 items-end gap-4 border-b border-aqs-border pb-4 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
      <div className="min-w-0">
        <nav aria-label="Đường dẫn trang" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-aqs-ink-faint">
          <Link
            to="/app/dashboard"
            className="hover:text-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus"
          >
            Tổng quan
          </Link>
          {group && (
            <>
              <span aria-hidden="true">/</span>
              <span>{group}</span>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-aqs-ink-muted">
            {breadcrumb}
          </span>
        </nav>
        <h1 className="m-0 text-[clamp(22px,2vw,28px)] font-bold leading-tight tracking-[-0.025em] text-aqs-ink">
          {title}
        </h1>
        <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-aqs-ink-muted">{description}</p>
      </div>
      {actions && (
        <div
          className="flex flex-wrap items-center justify-start gap-2 md:justify-end"
          aria-label="Thao tác trang"
        >
          {actions}
        </div>
      )}
    </header>
  )
}

export function ManagementFilterCard({
  headingId,
  title,
  description,
  hasActiveFilters = false,
  resetLabel = 'Xóa bộ lọc',
  resetDisabled = false,
  onReset,
  summaryChips,
  resultCount,
  children,
}: {
  headingId: string
  title: string
  description?: string
  hasActiveFilters?: boolean
  resetLabel?: string
  resetDisabled?: boolean
  onReset?: () => void
  summaryChips?: ReactNode
  resultCount?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-card border border-aqs-border bg-aqs-surface p-4"
    >
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <div>
          <h2 id={headingId} className="m-0 text-[15px] font-bold text-aqs-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-aqs-ink-faint">{description}</p>}
        </div>
        {hasActiveFilters && onReset && (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            icon={<X />}
            disabled={resetDisabled}
            onClick={onReset}
          >
            {resetLabel}
          </Button>
        )}
      </div>

      {children}

      {(summaryChips || resultCount) && (
        <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2" aria-live="polite">
          {summaryChips}
          {resultCount && (
            <span className="ml-auto text-xs tabular-nums text-aqs-ink-faint">{resultCount}</span>
          )}
        </div>
      )}
    </section>
  )
}

export function ManagementFilterChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-2 py-0.5 text-xs font-semibold text-aqs-accent-hover">
      {children}
    </span>
  )
}

export function ManagementFilterBar({ children }: { children: ReactNode }) {
  return (
    <div
      role="search"
      aria-label="Tìm kiếm và lọc"
      className="flex flex-col gap-3 rounded-card border border-aqs-border bg-aqs-surface p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {children}
    </div>
  )
}

export const filterControlClass =
  'h-10 w-full rounded-control border border-aqs-border-strong bg-aqs-surface px-3 text-[13px] text-aqs-ink transition-[border-color,box-shadow] duration-150 hover:not-disabled:border-aqs-border-hover focus:border-aqs-focus focus:shadow-[0_0_0_3px_rgba(8,127,140,0.13)] focus:outline-none disabled:cursor-not-allowed disabled:bg-aqs-surface-subtle disabled:text-aqs-ink-faint'

export function ManagementSearch({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aqs-ink-faint"
          aria-hidden="true"
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${filterControlClass} pl-9`}
        />
      </div>
    </div>
  )
}

export function ManagementSelect({
  id,
  label,
  value,
  onChange,
  children,
  disabled = false,
  className = '',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={filterControlClass}
      >
        {children}
      </select>
    </div>
  )
}

export function ManagementPanel({
  headingId,
  title,
  description,
  refreshing = false,
  refreshLabel = 'Đang làm mới dữ liệu...',
  headerActions,
  busy = false,
  children,
}: {
  headingId: string
  title: string
  description?: string
  refreshing?: boolean
  refreshLabel?: string
  headerActions?: ReactNode
  busy?: boolean
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className="overflow-hidden rounded-card border border-aqs-border bg-aqs-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-aqs-border px-5 py-4">
        <div>
          <h2 id={headingId} className="m-0 text-base font-bold text-aqs-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-aqs-ink-faint">{description}</p>}
        </div>
        <div className="flex items-center gap-3">
          {refreshing && (
            <span className="inline-flex items-center gap-2 text-xs text-aqs-ink-muted" role="status">
              <span
                className="aqs-animate-status-pulse h-[7px] w-[7px] rounded-full bg-aqs-accent"
                aria-hidden="true"
              />
              {refreshLabel}
            </span>
          )}
          {headerActions}
        </div>
      </div>
      {children}
    </section>
  )
}

const statDotClasses = {
  accent: 'bg-aqs-accent',
  positive: 'bg-aqs-positive',
  warning: 'bg-aqs-warning',
  danger: 'bg-aqs-danger',
} as const

export function ManagementStatCard({
  label,
  value,
  loading = false,
  tone = 'accent',
  active = false,
  onClick,
}: {
  label: string
  value?: number
  loading?: boolean
  tone?: keyof typeof statDotClasses
  active?: boolean
  onClick?: () => void
}) {
  const baseClass = `flex w-full flex-col justify-between gap-1.5 rounded-card border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus ${
    active
      ? 'border-aqs-accent bg-aqs-accent-soft ring-1 ring-inset ring-aqs-accent'
      : 'border-aqs-border bg-aqs-surface hover:border-aqs-border-strong hover:bg-aqs-surface-subtle'
  } ${onClick ? 'cursor-pointer' : ''}`

  const content = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className={`text-[12.5px] font-semibold ${active ? 'text-aqs-accent-hover' : 'text-aqs-ink-muted'}`}>
          {label}
        </span>
        <span className={`h-2 w-2 shrink-0 rounded-full ${statDotClasses[tone]}`} aria-hidden="true" />
      </span>
      {loading ? (
        <span className="aqs-animate-skeleton inline-block h-[26px] w-12 rounded bg-aqs-skeleton" aria-hidden="true" />
      ) : (
        <strong className="text-[26px] font-bold leading-tight tracking-tight tabular-nums text-aqs-ink">
          {value != null ? value.toLocaleString('vi-VN') : '—'}
        </strong>
      )}
    </>
  )

  if (onClick) {
    return (
      <button type="button" aria-pressed={active} onClick={onClick} className={baseClass}>
        {content}
      </button>
    )
  }
  return <div className={baseClass}>{content}</div>
}
