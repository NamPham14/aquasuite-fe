import { demoCustomers, demoSkus, localToday, totals } from '../lib/deposit.ts'
import type { DepositOrder, DepositRepository, NewDepositOrder } from '../types/deposit.types.ts'

export function createDemoDepositRepository(): DepositRepository {
  let counter = 3
  const orders: DepositOrder[] = [
    { payment: { orderId: 'DH-DEMO-001', totalAmount: 25000000, depositRequired: 7500000, verifiedPaid: 0, pendingAmount: 5000000, remaining: 25000000, depositSatisfied: false }, id: 'DH-DEMO-001', customer: demoCustomers[0], warehouse: 'Kho chính', deliveryDate: '', note: '', lines: [{ skuId: 'basin', quantity: 10, requested: 10, held: 0 }], payments: [{ id: 'PAY-1', amount: 5000000, method: 'BANK_TRANSFER', reference: 'DEMO-001', status: 'PENDING' }], history: ['Tạo đơn mới, chưa thanh toán.', 'Ghi nhận khoản cọc demo, chờ xác minh.'] },
    { payment: { orderId: 'DH-DEMO-002', totalAmount: 34000000, depositRequired: 6800000, verifiedPaid: 6800000, pendingAmount: 0, remaining: 27200000, depositSatisfied: true }, id: 'DH-DEMO-002', customer: demoCustomers[1], warehouse: 'Kho chính', deliveryDate: '', note: 'Giao nhiều đợt theo thỏa thuận.', lines: [{ skuId: 'toilet', quantity: 5, requested: 5, held: 3 }], payments: [{ id: 'PAY-2', amount: 6800000, method: 'CASH', reference: '', status: 'VERIFIED' }], history: ['Tạo đơn và xác minh khoản cọc demo.', 'Giữ 3 sản phẩm; 2 sản phẩm chờ bổ sung.'] },
  ]
  const copy = <T,>(value: T): T => structuredClone(value)
  const get = (id: string) => { const order = orders.find((item) => item.id === id); if (!order) throw new Error('Không tìm thấy đơn demo.'); return order }
  const record = (order: DepositOrder, action: string) => order.history.push(`${new Date().toLocaleString('vi-VN')} — ${action}`)
  function allocate(order: DepositOrder) {
    if (!order.payment.depositSatisfied) throw new Error('Chưa đủ cọc theo thỏa thuận trên đơn.')
    for (const line of order.lines) {
      const used = orders.filter((other) => other.id !== order.id && other.warehouse === order.warehouse).flatMap((other) => other.lines).filter((other) => other.skuId === line.skuId).reduce((sum, other) => sum + other.held, 0)
      line.held = Math.min(line.requested, Math.max(0, demoSkus.find((sku) => sku.id === line.skuId)!.available - used))
    }
  }
  return {
    async list() { return copy(orders) },
    async create(input: NewDepositOrder) {
      if (!demoCustomers.includes(input.customer) || !['Kho chính', 'Kho phụ'].includes(input.warehouse)) throw new Error('Chọn khách hàng và kho hợp lệ.')
      if (input.deliveryDate && input.deliveryDate < localToday()) throw new Error('Ngày giao không được ở quá khứ.')
      if (!input.lines.length || !input.lines.some((line) => line.requested > 0) || new Set(input.lines.map((line) => line.skuId)).size !== input.lines.length || input.lines.some((line) => !demoSkus.some((sku) => sku.id === line.skuId) || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 9999 || !Number.isSafeInteger(line.requested) || line.requested < 0 || line.requested > line.quantity)) throw new Error('Chọn ít nhất một dòng giữ; số lượng giữ phải từ 0 đến số lượng mua (tối đa 9.999).')
      const totalAmount = input.lines.reduce((sum, line) => sum + demoSkus.find((sku) => sku.id === line.skuId)!.price * line.quantity, 0)
      if (!Number.isSafeInteger(input.depositRequired) || input.depositRequired < 0 || input.depositRequired > totalAmount) throw new Error('Cọc thỏa thuận phải từ 0 đến tổng đơn.')
      const order: DepositOrder = { ...copy(input), payment: { orderId: `DH-DEMO-${String(counter).padStart(3, '0')}`, totalAmount, depositRequired: input.depositRequired, verifiedPaid: 0, pendingAmount: 0, remaining: totalAmount, depositSatisfied: false }, lines: input.lines.map((line) => ({ ...line, held: 0 })), id: `DH-DEMO-${String(counter++).padStart(3, '0')}`, payments: [], history: ['Tạo đơn mới; số đã thanh toán = 0. Yêu cầu giữ chưa khóa tồn.'] }
      orders.unshift(order); return copy(order)
    },
    async pay(id, input) {
      const order = get(id); const t = totals(order)
      if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > t.total - t.verified - t.pending) throw new Error('Số tiền phải là số nguyên dương và không vượt phần còn có thể thu (đã trừ khoản chờ xác minh).')
      if (!['CASH', 'BANK_TRANSFER'].includes(input.method) || (input.method === 'BANK_TRANSFER' && !input.reference.trim())) throw new Error('Chuyển khoản cần mã tham chiếu.')
      if (input.reference.trim() && orders.some((item) => item.payments.some((payment) => payment.reference === input.reference.trim()))) throw new Error('Mã tham chiếu đã được sử dụng.')
      order.payment.pendingAmount += input.amount
      order.payments.push({ ...input, reference: input.reference.trim(), id: crypto.randomUUID(), status: 'PENDING' }); record(order, 'Ghi nhận khoản cọc demo, chờ xác minh; chưa giữ thêm hàng.')
    },
    async verify(id, paymentId, status) {
      const order = get(id); const payment = order.payments.find((item) => item.id === paymentId)
      if (!payment || payment.status !== 'PENDING') throw new Error('Khoản thu đã xử lý hoặc không tồn tại.')
      order.payment.pendingAmount -= payment.amount
      if (status === 'VERIFIED') order.payment.verifiedPaid += payment.amount
      order.payment.remaining = Math.max(0, order.payment.totalAmount - order.payment.verifiedPaid)
      order.payment.depositSatisfied = order.payment.depositRequired > 0 && order.payment.verifiedPaid >= order.payment.depositRequired
      payment.status = status; record(order, status === 'VERIFIED' ? 'Mô phỏng kế toán xác minh tiền.' : 'Mô phỏng kế toán từ chối tiền.')
    },
    async synchronize(id) { const order = get(id); allocate(order); record(order, 'Đồng bộ giữ hàng demo; phần thiếu chờ bổ sung. Không giảm tồn vật lý.') },
  }
}
