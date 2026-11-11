import type { CodCollection, CodRemit } from '../types/cod.types.ts'

export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const isVndAmount = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= 9_999_999_999_999
export const canRemitCod = (item: CodCollection, actorId: string) => item.reviewStatus === 'ACCEPTED' && item.heldAmount > 0 && item.shipperId !== actorId
export const codStatusLabel = (value: string | null) => ({ SUBMITTED: 'Chờ kiểm tra', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã bác', PENDING_REMITTANCE: 'Chưa bàn giao', PARTIAL_REMITTANCE: 'Đã nộp một phần', SETTLED: 'Đã nộp đủ' } as Record<string, string>)[value ?? ''] ?? value ?? 'Chưa áp dụng'

export function buildCodRemittance(items: CodCollection[], amounts: string[], actorId: string, note: string, key: string): CodRemit {
  if (!items.length || items.length > 50 || new Set(items.map((x) => x.collectionId)).size !== items.length) throw new Error('Chọn từ 1 đến 50 khoản khác nhau.')
  if (items.some((x) => !canRemitCod(x, actorId) || x.shipperId !== items[0]!.shipperId)) throw new Error('Chỉ nhận khoản đã duyệt của cùng shipper và không phải chính mình.')
  const allocations = items.map((x, i) => {
    const amount = Number(amounts[i])
    if (!isVndAmount(amount) || amount > x.heldAmount) throw new Error('Số thực nhận phải là VND nguyên dương, không vượt khoản còn giữ.')
    return { collectionId: x.collectionId, amount, expectedVersion: x.version }
  })
  const amount = allocations.reduce((sum, x) => sum + x.amount, 0)
  if (!isVndAmount(amount)) throw new Error('Tổng thực nhận vượt giới hạn cho phép.')
  return { idempotencyKey: key, shipperId: items[0]!.shipperId, amount, items: allocations, note: note.trim() }
}

export const codButton = 'min-h-9 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50'

// Retry uncertain results with the same key and payload; a definite 4xx did not commit.
export function isUncertainCodError(error: unknown) {
  const status = (error as { status?: unknown })?.status
  return typeof status !== 'number' || status >= 500 || status === 408
}
