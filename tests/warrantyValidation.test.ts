import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createWarrantyFromOrderSchema,
  createAdHocWarrantySchema,
  voidWarrantySchema,
  warrantyPhoneFilterSchema,
} from '../src/features/servicedesk/schemas/warrantySchemas.ts'

const VALID_UUID = 'a0000000-0000-0000-0000-000000000001'
const VALID_UUID_2 = 'b0000000-0000-0000-0000-000000000002'

test('createWarrantyFromOrderSchema: chấp thuận dữ liệu hợp lệ', () => {
  const parsed = createWarrantyFromOrderSchema.safeParse({
    orderId: VALID_UUID,
    orderItemId: VALID_UUID_2,
    serialTracking: true,
    serialNumber: 'SN-2026-TEST',
    startDate: '2026-11-12',
  })
  assert.equal(parsed.success, true)
})

test('createWarrantyFromOrderSchema: bắt buộc serial khi serialTracking = true', () => {
  const parsed = createWarrantyFromOrderSchema.safeParse({
    orderId: VALID_UUID,
    orderItemId: VALID_UUID_2,
    serialTracking: true,
    serialNumber: '   ',
    startDate: '2026-11-12',
  })
  assert.equal(parsed.success, false)
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path[0] === 'serialNumber')
    assert.ok(issue)
    assert.match(issue.message, /bắt buộc nhập số serial/i)
  }
})

test('createWarrantyFromOrderSchema: cho phép để trống serial khi serialTracking = false', () => {
  const parsed = createWarrantyFromOrderSchema.safeParse({
    orderId: VALID_UUID,
    orderItemId: VALID_UUID_2,
    serialTracking: false,
    serialNumber: '',
    startDate: '2026-11-12',
  })
  assert.equal(parsed.success, true)
})

test('createAdHocWarrantySchema: kiểm tra UUID và ngày kích hoạt hợp lệ', () => {
  const parsed = createAdHocWarrantySchema.safeParse({
    customerId: VALID_UUID,
    variantId: VALID_UUID_2,
    serialTracking: false,
    startDate: '2026-11-12',
  })
  assert.equal(parsed.success, true)
})

test('voidWarrantySchema: yêu cầu lý do hủy tối thiểu 3 ký tự, tối đa 500 ký tự', () => {
  const tooShort = voidWarrantySchema.safeParse({ reason: ' ' })
  assert.equal(tooShort.success, false)

  const valid = voidWarrantySchema.safeParse({ reason: 'Khách hàng hoàn trả sản phẩm' })
  assert.equal(valid.success, true)

  const tooLong = voidWarrantySchema.safeParse({ reason: 'x'.repeat(501) })
  assert.equal(tooLong.success, false)
})

test('warrantyPhoneFilterSchema: chỉ cho phép chữ số, dấu +, dấu -', () => {
  assert.equal(warrantyPhoneFilterSchema.safeParse('0901234567').success, true)
  assert.equal(warrantyPhoneFilterSchema.safeParse('+84901234567').success, true)
  assert.equal(warrantyPhoneFilterSchema.safeParse('').success, true)
  assert.equal(warrantyPhoneFilterSchema.safeParse('090123abcd').success, false)
})

