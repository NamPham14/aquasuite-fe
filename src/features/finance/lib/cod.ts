import type { CodCollection } from '../types/cod.types.ts'

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const isVndAmount = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= 9_999_999_999_999
export const canReceiveCod = (item: CodCollection, actorId: string) => item.status === 'PENDING' && item.shipperId !== actorId
export const codStatusLabel = (value: string | null) => ({ PENDING: 'Chờ bàn giao tiền', VERIFIED: 'Đã nhận tiền', REJECTED: 'Đã từ chối' } as Record<string, string>)[value ?? ''] ?? value ?? 'Chưa áp dụng'

export const codButton = 'inline-flex h-10 items-center justify-center rounded-control border border-aqs-border bg-aqs-surface px-3.5 text-sm font-medium text-aqs-ink transition-colors hover:border-slate-300 hover:bg-aqs-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:opacity-50'

// Retry uncertain results with the same key and payload; a definite 4xx did not commit.
export function isUncertainCodError(error: unknown) {
  const status = (error as { status?: unknown })?.status
  return typeof status !== 'number' || status >= 500 || status === 408
}
