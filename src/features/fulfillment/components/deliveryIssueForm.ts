import { normalizeApiError } from '../../../shared/api/apiError'
import type { DeliveryCandidates } from '../types/deliveryIssue.types'

export const canManageDeliveries = (roles: readonly string[]) => roles.some((r) => r === 'ACCOUNTANT' || r === 'SHOP_OWNER')
export function isUncertainDeliveryError(error: unknown) {
  const status = normalizeApiError(error).status
  return typeof status !== 'number' || status >= 500 || status === 408
}
export function deliveryErrorText(error: unknown) {
  const normalized = normalizeApiError(error)
  return [normalized.message, ...(normalized.errors?.map((field) => field.message) ?? [])].join('\n')
}
export function validateDeliveryLines(candidates: DeliveryCandidates, quantities: Record<string, string>) {
  const chosen = candidates.items.filter((line) => quantities[line.orderItemId]?.trim() && Number(quantities[line.orderItemId]) !== 0)
  if (!chosen.length || chosen.length > 100) return 'Chọn từ 1 đến 100 dòng hàng.'
  if (chosen.some((line) => line.serialTracking)) return 'Chưa hỗ trợ xuất giao hàng quản lý serial. Vui lòng bỏ dòng serial khỏi đợt giao này.'
  if (chosen.some((line) => {
    const raw = quantities[line.orderItemId].trim(), qty = Number(raw)
    return !/^\d{1,10}(\.\d{1,2})?$/.test(raw) || qty < 0.01 || !Number.isFinite(line.dispatchableQty) || qty > Number(line.dispatchableQty)
  })) return 'Số lượng phải từ 0,01, tối đa 2 số thập phân và không vượt lượng hiện có thể giao.'
  return ''
}
