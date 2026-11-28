import type { WarrantyDisplayStatus, WarrantyRecordListItem } from '../types/warranty.types'

export interface OrderWarrantyGroup {
  groupKey: string
  orderId: string | null
  orderCode: string | null
  isAdHoc: boolean
  customerName: string | null
  phoneNumber: string | null
  records: WarrantyRecordListItem[]
  statusCounts: Record<WarrantyDisplayStatus, number>
}

export function groupWarrantyRecordsByOrder(
  items: readonly WarrantyRecordListItem[],
): OrderWarrantyGroup[] {
  const groups = new Map<string, OrderWarrantyGroup>()

  for (const item of items) {
    const isAdHoc = !item.orderId && !item.orderCode
    const groupKey = item.orderId
      ? `order:${item.orderId}`
      : item.orderCode
        ? `orderCode:${item.orderCode}`
        : `adhoc:${item.warrantyRecordId}`

    let group = groups.get(groupKey)
    if (!group) {
      group = {
        groupKey,
        orderId: item.orderId ?? null,
        orderCode: item.orderCode ?? null,
        isAdHoc,
        customerName: item.customerName ?? null,
        phoneNumber: item.phoneNumber ?? null,
        records: [],
        statusCounts: {
          ACTIVE: 0,
          CLAIMED: 0,
          EXPIRED: 0,
          VOIDED: 0,
        },
      }
      groups.set(groupKey, group)
    }

    group.records.push(item)
    const st: WarrantyDisplayStatus = item.displayStatus ?? 'ACTIVE'
    group.statusCounts[st] = (group.statusCounts[st] ?? 0) + 1
  }

  return Array.from(groups.values())
}
