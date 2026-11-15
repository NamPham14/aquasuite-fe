import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createWarrantyTicketSchema,
  cancelWarrantyTicketSchema,
} from '../src/features/servicedesk/schemas/warrantyTicketSchemas.ts'

const VALID_UUID = 'a0000000-0000-0000-0000-000000000001'

test('createWarrantyTicketSchema: chấp thuận dữ liệu hợp lệ', () => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const parsed = createWarrantyTicketSchema.safeParse({
    warrantyRecordId: VALID_UUID,
    issueDescription: 'Vòi xịt bị rò rỉ nước liên tục khi bật nguồn',
    preferredDate: todayStr,
    preferredSlot: 'MORNING',
    siteAddress: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  })
  assert.equal(parsed.success, true)
})

test('createWarrantyTicketSchema: mô tả sự cố dưới 10 ký tự bị từ chối', () => {
  const parsed = createWarrantyTicketSchema.safeParse({
    warrantyRecordId: VALID_UUID,
    issueDescription: 'Hỏng vòi',
    siteAddress: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  })
  assert.equal(parsed.success, false)
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path[0] === 'issueDescription')
    assert.ok(issue)
    assert.match(issue.message, /tối thiểu 10 ký tự/i)
  }
})

test('createWarrantyTicketSchema: ngày hẹn quá 60 ngày hoặc trong quá khứ bị từ chối', () => {
  const pastDate = '2020-01-01'
  const parsedPast = createWarrantyTicketSchema.safeParse({
    warrantyRecordId: VALID_UUID,
    issueDescription: 'Vòi xịt bị rò rỉ nước liên tục khi bật nguồn',
    preferredDate: pastDate,
    siteAddress: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  })
  assert.equal(parsedPast.success, false)

  const farFuture = new Date()
  farFuture.setDate(farFuture.getDate() + 70)
  const farFutureStr = farFuture.toISOString().split('T')[0]
  const parsedFuture = createWarrantyTicketSchema.safeParse({
    warrantyRecordId: VALID_UUID,
    issueDescription: 'Vòi xịt bị rò rỉ nước liên tục khi bật nguồn',
    preferredDate: farFutureStr,
    siteAddress: '123 Nguyễn Văn Cừ, Quận 5, TP.HCM',
  })
  assert.equal(parsedFuture.success, false)
})

test('createWarrantyTicketSchema: địa chỉ xử lý dưới 5 ký tự bị từ chối', () => {
  const parsed = createWarrantyTicketSchema.safeParse({
    warrantyRecordId: VALID_UUID,
    issueDescription: 'Vòi xịt bị rò rỉ nước liên tục khi bật nguồn',
    siteAddress: 'HN',
  })
  assert.equal(parsed.success, false)
})

test('cancelWarrantyTicketSchema: cho phép lý do rỗng hoặc tối đa 500 ký tự', () => {
  const emptyReason = cancelWarrantyTicketSchema.safeParse({})
  assert.equal(emptyReason.success, true)

  const validReason = cancelWarrantyTicketSchema.safeParse({ reason: 'Khách hàng tự xử lý được' })
  assert.equal(validReason.success, true)

  const tooLong = cancelWarrantyTicketSchema.safeParse({ reason: 'a'.repeat(501) })
  assert.equal(tooLong.success, false)
})

