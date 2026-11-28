import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * Dialog chuẩn Quiet-Luxury Showroom dành cho các quy trình khách hàng (/profile/warranties, /profile/warranty-tickets).
 */
export function CustomerEditorialModal({
  eyebrow = 'Dịch vụ & Bảo hành',
  title,
  onClose,
  children,
  closeDisabled = false,
  maxWidthClass = 'w-[min(94vw,660px)]',
}: {
  eyebrow?: string
  title: string
  onClose: () => void
  children: ReactNode
  closeDisabled?: boolean
  maxWidthClass?: string
}) {
  const titleId = useId()
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
      dialog.showModal()
    }
    return () => {
      if (dialog?.open && typeof dialog.close === 'function') {
        dialog.close()
      }
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === ref.current && !closeDisabled) onClose()
      }}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!closeDisabled) onClose()
      }}
      className={`m-auto max-h-[92vh] ${maxWidthClass} overflow-y-auto border border-[#D6D1C7] bg-white p-0 text-[#171614] shadow-2xl backdrop:bg-[#171614]/55`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[#E6E2DA] bg-[#FAF9F6] px-6 py-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#8C6D46]">{eyebrow}</p>
          <h2 id={titleId} className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
            {title}
          </h2>
        </div>
        <button
          type="button"
          disabled={closeDisabled}
          onClick={onClose}
          aria-label="Đóng"
          className="cursor-pointer p-1.5 text-[#78736A] hover:text-[#171614] disabled:opacity-45 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export const editorialFieldClass =
  'mt-1.5 w-full border border-[#D6D1C7] bg-[#FAF9F6] px-3 py-2 text-xs sm:text-sm text-[#171614] placeholder:text-[#8C867C] focus:border-[#171614] focus:bg-white focus:outline-none disabled:bg-[#F2EFE9] disabled:text-[#78736A]'
