// Lucian UX/UI Prompt #092 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#092
// Lucian UX/UI Prompt #090 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#090
// Lucian UX/UI Prompt #244 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#244
import { useId, useState } from 'react'
import { ArrowRight, ChevronDown, RefreshCw, RotateCcw, SearchX, X } from 'lucide-react'
import { Button } from './Button'

export const OPERATIONAL_TOAST_CLASS =
  'border border-aqs-border rounded-card bg-aqs-surface text-aqs-ink shadow-aqs-float'

export function EmptyState({
  title,
  description,
  search = '',
  hasFilters = false,
  onClearSearch,
  onResetFilters,
}: {
  title: string
  description?: string
  search?: string
  hasFilters?: boolean
  onClearSearch?: () => void
  onResetFilters?: () => void
}) {
  const trimmedSearch = search.trim()
  const hasSearch = trimmedSearch.length > 0
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-5 py-9 text-center" role="status">
      <div className="h-[92px] w-[150px]" aria-hidden="true">
        <svg viewBox="0 0 150 92" className="h-full w-full overflow-visible">
          <path
            d="M8 30h134M8 56h134M8 82h134"
            fill="none"
            stroke="var(--ux-line-2)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="2 9"
          />
          <g className="aqs-u092-lens">
            <circle
              cx="34"
              cy="38"
              r="20"
              fill="color-mix(in srgb, var(--ux-accent) 12%, transparent)"
              stroke="var(--ux-ink)"
              strokeWidth="5"
            />
            <path
              d="M24 30a12 12 0 0 1 8-5"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.7"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M48 52l14 14"
              fill="none"
              stroke="var(--ux-ink)"
              strokeWidth="7"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
      <SearchX className="hidden" aria-hidden="true" />
      <h3 className="mt-2.5 text-[17px] font-extrabold tracking-tight text-aqs-ink">{title}</h3>
      <p className="mt-1.5 max-w-[470px] text-[13px] leading-relaxed text-aqs-ink-faint">
        {description ??
          (hasSearch
            ? `Không tìm thấy kết quả cho “${trimmedSearch}”. Hãy bỏ từ khóa hoặc nới bộ lọc.`
            : 'Bộ lọc hiện tại chưa trả về dữ liệu phù hợp. Hãy nới điều kiện để xem thêm.')}
      </p>
      {(hasSearch && onClearSearch) || (hasFilters && onResetFilters) ? (
        <div
          className="mt-4 flex w-full max-w-[520px] flex-wrap justify-center gap-2"
          aria-label="Gợi ý điều chỉnh tìm kiếm"
        >
          {hasSearch && onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              className="aqs-u092-up inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control bg-aqs-surface-subtle px-3 text-[13px] font-semibold text-aqs-ink-muted transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-aqs-surface-hover hover:text-aqs-ink focus-visible:outline-2 focus-visible:outline-aqs-focus [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
              <span className="max-w-[130px] truncate line-through decoration-aqs-danger">{trimmedSearch}</span>
              <span>Xóa từ khóa</span>
              <X aria-hidden="true" />
            </button>
          )}
          {hasFilters && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="aqs-u092-up inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-control bg-aqs-surface-subtle px-3 text-[13px] font-semibold text-aqs-ink-muted transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-aqs-surface-hover hover:text-aqs-ink focus-visible:outline-2 focus-visible:outline-aqs-focus [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
              <RotateCcw aria-hidden="true" />
              <span>Xóa toàn bộ bộ lọc</span>
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  sectionLabel,
  title,
  description = 'Dữ liệu chưa thay đổi. Bạn có thể thử kết nối lại mà không mất bộ lọc hiện tại.',
  message,
  errorCode,
  retrying = false,
  onRetry,
  retryLabel = 'Thử tải lại',
  compact = false,
}: {
  sectionLabel: string
  title: string
  description?: string
  message: string
  errorCode?: string
  retrying?: boolean
  onRetry: () => void
  retryLabel?: string
  compact?: boolean
}) {
  const [expanded, setExpanded] = useState(Boolean(errorCode))
  const detailsId = useId()
  return (
    <div
      className={`mx-auto flex max-w-[560px] flex-col text-aqs-ink ${
        compact ? 'my-2 min-h-[220px] p-3' : 'my-6 min-h-[360px] p-4'
      } ${retrying ? 'aqs-u090-trying' : ''}`}
      role="alert"
    >
      <div className="flex h-9 items-center gap-2.5">
        <strong className="text-base font-extrabold">{sectionLabel}</strong>
        <span
          role="status"
          className={`ml-auto inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            retrying ? 'bg-aqs-warning-soft text-aqs-warning' : 'bg-aqs-danger-soft text-aqs-danger'
          }`}
        >
          <span className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden="true" />
          {retrying ? 'Đang kết nối lại' : 'Tải dữ liệu thất bại'}
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <svg className="h-[70px] w-[220px] overflow-visible" viewBox="0 0 220 70" aria-hidden="true">
          <g className="aqs-u090-left">
            <path d="M-14 54C24 54 40 35 72 35" fill="none" stroke="var(--ux-ink-3)" strokeWidth="4" strokeLinecap="round" />
            <path d="M100 28h14M100 42h14" stroke="var(--ux-ink-2)" strokeWidth="4.5" strokeLinecap="round" />
            <rect fill="var(--ux-ink)" x="68" y="19" width="34" height="32" rx="8" />
          </g>
          <g className="aqs-u090-right">
            <rect fill="var(--ux-ink)" x="124" y="17" width="38" height="36" rx="9" />
            <path d="M124 28h6M124 42h6" stroke="var(--ux-surface)" strokeWidth="3" strokeLinecap="round" />
            <circle className="aqs-u090-led" fill="var(--ux-danger)" cx="153" cy="25" r="3" />
            <path d="M162 35C188 35 194 16 236 16" fill="none" stroke="var(--ux-ink-3)" strokeWidth="4" strokeLinecap="round" />
          </g>
        </svg>
        <h3 className="mt-4 text-[17px] font-extrabold tracking-tight">{title}</h3>
        <p className="mt-1.5 max-w-[430px] text-[13px] leading-normal text-aqs-ink-faint">{description}</p>
        <button
          type="button"
          className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-control px-2 text-xs font-semibold text-aqs-ink-faint hover:bg-aqs-surface-subtle hover:text-aqs-ink focus-visible:outline-2 focus-visible:outline-aqs-focus"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((value) => !value)}
        >
          Chi tiết
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <div
          id={detailsId}
          className={`grid w-full transition-[grid-template-rows] duration-300 ${
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <code className="mx-auto my-2 block whitespace-normal rounded-control bg-aqs-surface-subtle px-3 py-2.5 text-left font-mono text-xs font-semibold leading-relaxed text-aqs-ink-muted">
              {message}
              {errorCode ? ` · Mã lỗi: ${errorCode}` : ''}
            </code>
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="primary"
        loading={retrying}
        icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        onClick={onRetry}
      >
        {retrying ? 'Đang thử lại' : retryLabel}
      </Button>
    </div>
  )
}

export interface ValidationIssue {
  fieldId: string
  label: string
  message: string
}

export function ValidationSummary({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) return null

  function focusField(fieldId: string) {
    const field = document.getElementById(fieldId)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    field?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    field?.focus({ preventScroll: true })
  }

  return (
    <div className="aqs-u244-enter" role="alert" aria-atomic="true">
      <div className="rounded-card border border-aqs-danger-border bg-aqs-danger-soft px-3.5 py-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-aqs-danger-ink">
          <span
            className="inline-grid h-[18px] w-[18px] place-items-center rounded-full bg-aqs-danger text-[11px] text-white"
            aria-hidden="true"
          >
            !
          </span>
          {issues.length} trường cần được kiểm tra
        </p>
        <ul className="mt-2 space-y-1 pl-6 text-xs text-aqs-danger-ink">
          {issues.map((issue) => (
            <li key={issue.fieldId}>
              <button
                type="button"
                onClick={() => focusField(issue.fieldId)}
                className="cursor-pointer bg-transparent p-0 text-left underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-aqs-focus"
              >
                <strong>{issue.label}:</strong> {issue.message}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
