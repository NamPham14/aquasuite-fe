import type { CodCollection } from '../types/cod.types.ts'

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const isVndAmount = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= 9_999_999_999_999
export const canReceiveCod = (item: CodCollection, actorId: string) => item.status === 'PENDING' && item.shipperId !== actorId
export const codStatusLabel = (value: string | null) => ({ PENDING: 'Chờ bàn giao tiền', VERIFIED: 'Đã nhận tiền', REJECTED: 'Đã từ chối' } as Record<string, string>)[value ?? ''] ?? value ?? 'Chưa áp dụng'

export const codButton = 'min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50'

// Retry uncertain results with the same key and payload; a definite 4xx did not commit.
export function isUncertainCodError(error: unknown) {
  const status = (error as { status?: unknown })?.status
  return typeof status !== 'number' || status >= 500 || status === 408
}
