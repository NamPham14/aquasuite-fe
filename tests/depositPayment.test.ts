import assert from 'node:assert/strict'
import test from 'node:test'
import { createDemoDepositRepository } from '../src/features/sales/api/demoDepositRepository.ts'
import { orderStatus, totals } from '../src/features/sales/lib/deposit.ts'

test('UC29 reads payment and gates solely on Finance depositSatisfied', async () => {
  const repo = createDemoDepositRepository()
  const [order] = await repo.list()
  assert.equal(totals(order).required, 7500000)
  assert.equal(totals(order).pending, 5000000)
  assert.equal(totals(order).outstanding, 25000000)
  await assert.rejects(repo.synchronize(order.id))
  await repo.verify(order.id, 'PAY-1', 'VERIFIED')
  let current = (await repo.list())[0]
  assert.equal(current.payment.depositSatisfied, false)
  assert.equal(current.payment.remaining, 20000000)
  await repo.pay(order.id, { amount: 2500000, method: 'CASH', reference: '' })
  current = (await repo.list())[0]
  assert.equal(current.payment.depositSatisfied, false)
  assert.equal(current.payment.remaining, 20000000)
  await repo.verify(order.id, current.payments[1].id, 'VERIFIED')
  current = (await repo.list())[0]
  assert.equal(current.payment.depositSatisfied, true)
  assert.equal(current.payment.remaining, 17500000)
  await repo.synchronize(order.id)
  current = (await repo.list())[0]
  assert.equal(current.lines[0].held, 8)
  current.payment.depositSatisfied = false
  assert.equal(orderStatus(current), 'Chưa đủ cọc')
  current.payment.verifiedPaid = 99999999
  assert.equal(totals(current).outstanding, 17500000)
  assert.equal(orderStatus(current), 'Chưa đủ cọc')
})

test('zero deposit never permits holding and rejected receipts do not count', async () => {
  const repo = createDemoDepositRepository()
  const order = await repo.create({ customer: (await repo.list())[0].customer, warehouse: 'Kho chính', deliveryDate: '', note: '', depositRequired: 0, lines: [{ skuId: 'basin', quantity: 1, requested: 1, held: 0 }] })
  await repo.pay(order.id, { amount: 2500000, method: 'CASH', reference: '' })
  let current = (await repo.list())[0]
  await repo.verify(order.id, current.payments[0].id, 'REJECTED')
  current = (await repo.list())[0]
  assert.equal(current.payment.pendingAmount, 0)
  assert.equal(current.payment.verifiedPaid, 0)
  assert.equal(current.payment.remaining, 2500000)
  await repo.pay(order.id, { amount: 2500000, method: 'CASH', reference: '' })
  current = (await repo.list())[0]
  await repo.verify(order.id, current.payments[1].id, 'VERIFIED')
  current = (await repo.list())[0]
  assert.equal(current.payment.remaining, 0)
  assert.equal(current.payment.depositSatisfied, false)
  await assert.rejects(repo.synchronize(order.id))
})
