import type { DemoSku, DepositOrder } from '../types/deposit.types.ts'

export const demoCustomers = ['Nguyễn Minh Anh', 'Công ty Xây dựng An Phát', 'Trần Quốc Huy']
export const demoSkus: DemoSku[] = [
  { id: 'basin', code: 'LVB-001', name: 'Lavabo đặt bàn trắng', price: 2500000, available: 8 },
  { id: 'shower', code: 'SEN-002', name: 'Sen tắm nóng lạnh', price: 3200000, available: 5 },
  { id: 'toilet', code: 'BC-003', name: 'Bồn cầu một khối', price: 6800000, available: 3 },
]
export const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
export const secondaryButton = 'inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50'
export const primaryButton = 'inline-flex min-h-10 items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50'
export function totals(order: DepositOrder) {
  const total = order.lines.reduce((sum, line) => sum + demoSkus.find((sku) => sku.id === line.skuId)!.price * line.quantity, 0)
  const requested = order.lines.reduce((sum, line) => sum + demoSkus.find((sku) => sku.id === line.skuId)!.price * line.requested, 0)
  const verified = order.payments.filter((payment) => payment.status === 'VERIFIED').reduce((sum, payment) => sum + payment.amount, 0)
  const pending = order.payments.filter((payment) => payment.status === 'PENDING').reduce((sum, payment) => sum + payment.amount, 0)
  return { total, requested, required: Math.ceil(requested * 20 / 100), verified, pending, outstanding: Math.max(0, total - verified) }
}
export function orderStatus(order: DepositOrder) {
  const t = totals(order)
  if (t.verified < t.required) return t.pending ? 'Chờ xác minh' : t.verified ? 'Chưa đủ cọc' : 'Chờ đặt cọc'
  if (order.lines.some((line) => line.held < line.requested)) return 'Chờ bổ sung hàng'
  return 'Đã giữ đủ hàng'
}
export function localToday() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()) }
