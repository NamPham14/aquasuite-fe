import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Search, X } from 'lucide-react'

export interface CommandPaletteRouteItem {
  label: string
  group: string
  to: string
  keywords?: string
  roles?: string[]
}

function normalizeVietnamese(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function AdminCommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean
  onClose: () => void
  items: readonly CommandPaletteRouteItem[]
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dialogRef = useRef<HTMLDialogElement | null>(null)

  const filtered = useMemo(() => {
    const q = normalizeVietnamese(query.trim())
    if (!q) return items
    return items.filter((item) => {
      const hay = normalizeVietnamese(`${item.label} ${item.group} ${item.to} ${item.keywords ?? ''}`)
      return hay.includes(q)
    })
  }, [items, query])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    setQuery('')
    setActiveIndex(0)
    if (!dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(timer)
      if (dialog.open) dialog.close()
    }
  }, [open])

  if (!open) return null

  const safeActive = filtered.length ? Math.min(activeIndex, filtered.length - 1) : 0

  function selectItem(item: CommandPaletteRouteItem) {
    onClose()
    navigate(item.to)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Tìm nhanh chức năng quản trị"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
      className="m-auto mt-16 w-[min(94vw,560px)] overflow-hidden rounded-card border border-aqs-border bg-aqs-surface p-0 font-aqs-sans text-aqs-ink shadow-aqs-float backdrop:bg-[#122b31]/40"
    >
      <div className="flex items-center gap-2.5 border-b border-aqs-border px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-aqs-accent" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && filtered.length) {
              e.preventDefault()
              setActiveIndex((prev) => (prev + 1) % filtered.length)
            } else if (e.key === 'ArrowUp' && filtered.length) {
              e.preventDefault()
              setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
            } else if (e.key === 'Enter' && filtered[safeActive]) {
              e.preventDefault()
              selectItem(filtered[safeActive])
            }
          }}
          placeholder="Gõ tên màn hình hoặc nghiệp vụ (vd: POS, Tồn kho, Công nợ, Bảo hành)..."
          aria-label="Tìm nhanh màn hình quản trị"
          className="w-full bg-transparent text-sm text-aqs-ink placeholder:text-aqs-ink-faint focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hộp thoại tìm nhanh"
          className="cursor-pointer rounded-control p-1.5 text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="max-h-[360px] overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-aqs-ink-muted">
            Không tìm thấy chức năng khớp với &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <ul role="listbox" aria-label="Kết quả chức năng" className="space-y-0.5">
            {filtered.map((item, idx) => {
              const selected = idx === safeActive
              return (
                <li key={item.to} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem(item)}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'bg-aqs-accent-soft text-aqs-accent-hover'
                        : 'text-aqs-ink hover:bg-aqs-surface-subtle'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                      <p className="truncate text-[11px] text-aqs-ink-faint">{item.group}</p>
                    </div>
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 ${
                        selected ? 'text-aqs-accent' : 'text-aqs-ink-faint'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-aqs-divider bg-aqs-surface-subtle px-4 py-2 text-[11px] text-aqs-ink-faint">
        <span>Mẹo: dùng ↑ ↓ để chọn, Enter để mở nhanh</span>
        <span>Esc để đóng</span>
      </div>
    </dialog>
  )
}
