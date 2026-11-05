export interface DemoSku { id: string; code: string; name: string; price: number; available: number }
export interface DepositLine { skuId: string; quantity: number; requested: number; held: number }
export interface DepositPayment { id: string; amount: number; method: 'CASH' | 'BANK_TRANSFER'; reference: string; status: 'PENDING' | 'VERIFIED' | 'REJECTED' }
export interface DepositOrder {
  id: string; customer: string; warehouse: string; deliveryDate: string; note: string
  lines: DepositLine[]; payments: DepositPayment[]; history: string[]
}
export interface NewDepositOrder { customer: string; warehouse: string; deliveryDate: string; note: string; lines: DepositLine[] }
// UI data port, not a proposed backend HTTP contract.
export interface DepositRepository {
  list(): Promise<DepositOrder[]>
  create(input: NewDepositOrder): Promise<DepositOrder>
  pay(orderId: string, payment: Omit<DepositPayment, 'id' | 'status'>): Promise<void>
  verify(orderId: string, paymentId: string, status: 'VERIFIED' | 'REJECTED'): Promise<void>
  synchronize(orderId: string): Promise<void>
}
