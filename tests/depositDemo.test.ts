import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDemoDepositRepository } from '../src/features/sales/api/demoDepositRepository.ts'
import { demoCustomers, totals } from '../src/features/sales/lib/deposit.ts'

const input = { depositRequired: 2000000, customer: demoCustomers[2], warehouse: 'Kho chính', deliveryDate: '', note: '', lines: [{ skuId: 'basin', quantity: 10, requested: 4, held: 999 }] }

test('new order starts unpaid; agreed deposit is independent of selected quantity, pending funds never reserve stock', async () => {
  const port = createDemoDepositRepository()
  const order = await port.create(input)
  assert.equal(totals(order).total, 25000000)
  assert.equal(totals(order).required, 2000000)
  assert.equal(totals(order).verified, 0)
  assert.equal(order.lines[0].held, 0)
  await port.pay(order.id, { amount: 2000000, method: 'CASH', reference: '' })
  await assert.rejects(port.synchronize(order.id), /Chưa đủ cọc/)
  const pending = (await port.list()).find((row) => row.id === order.id)!
  await port.verify(order.id, pending.payments[0].id, 'VERIFIED')
  assert.equal((await port.list()).find((row) => row.id === order.id)!.lines[0].held, 0)
  await port.synchronize(order.id)
  await port.synchronize(order.id)
  assert.equal((await port.list()).find((row) => row.id === order.id)!.lines[0].held, 4)
})

test('shared finite stock produces waiting quantity without duplicate allocations', async () => {
  const port = createDemoDepositRepository()
  async function paidOrder() {
    const order = await port.create({ ...input, depositRequired: 5000000, lines: [{ skuId: 'basin', quantity: 10, requested: 10, held: 0 }] })
    await port.pay(order.id, { amount: 5000000, method: 'CASH', reference: '' })
    const payment = (await port.list()).find((row) => row.id === order.id)!.payments[0]
    await port.verify(order.id, payment.id, 'VERIFIED')
    return order.id
  }
  const first = await paidOrder(); const second = await paidOrder()
  await port.synchronize(first); await port.synchronize(second); await port.synchronize(first)
  const rows = await port.list()
  assert.equal(rows.find((row) => row.id === first)!.lines[0].held, 8)
  assert.equal(rows.find((row) => row.id === second)!.lines[0].held, 0)
  assert.equal(totals(rows.find((row) => row.id === first)!).required, 5000000)
})

test('invalid quantity, past date, duplicate reference and overcollection are rejected', async () => {
  const port = createDemoDepositRepository()
  await assert.rejects(port.create({ ...input, depositRequired: 5000000, lines: [{ ...input.lines[0], requested: 11 }] }))
  await assert.rejects(port.create({ ...input, deliveryDate: '2020-01-01' }))
  const order = await port.create(input)
  await assert.rejects(port.pay(order.id, { amount: 1, method: 'BANK_TRANSFER', reference: 'DEMO-001' }), /đã được sử dụng/)
  await assert.rejects(port.pay(order.id, { amount: 1, method: 'BANK_TRANSFER', reference: '' }), /tham chiếu/)
  await port.pay(order.id, { amount: 25000000, method: 'CASH', reference: '' })
  await assert.rejects(port.pay(order.id, { amount: 1, method: 'CASH', reference: '' }), /không vượt/)
  const payment = (await port.list()).find((row) => row.id === order.id)!.payments[0]
  await port.verify(order.id, payment.id, 'REJECTED')
  await assert.rejects(port.verify(order.id, payment.id, 'VERIFIED'), /đã xử lý/)
  await port.pay(order.id, { amount: 1, method: 'CASH', reference: '' })
  await assert.rejects(port.synchronize(order.id), /Chưa đủ cọc/)
})
