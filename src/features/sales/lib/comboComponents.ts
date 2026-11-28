import type { CatalogItemOption } from '../types/salesCatalog.types.ts'

export const SPEC_LABELS: Record<string, string> = {
  flushingType: 'Hệ thống xả',
  roughInDimension: 'Tâm xả tiêu chuẩn',
  glazeTechnology: 'Công nghệ men sứ',
  warrantyTerms: 'Chính sách bảo hành',
  installationManualPdf: 'Hướng dẫn lắp đặt',
  cadBlueprints: 'Bản vẽ kỹ thuật CAD',
  material: 'Chất liệu',
  standardDiameter: 'Đường kính ren',
  application: 'Ứng dụng thực tế',
  maxPressure: 'Áp lực tối đa',
  dimension: 'Kích thước',
  capacity: 'Dung tích',
  type: 'Kiểu lắp đặt',
  technology: 'Công nghệ tích hợp',
  showerHeadSize: 'Kích thước bát sen',
  pressureRange: 'Áp lực nước',
  height: 'Chiều cao',
  glassThickness: 'Độ dày kính',
  protection: 'Chuẩn chống nước',
  hoseLength: 'Chiều dài dây',
  standardPipe: 'Đường kính ống thoát',
  length: 'Chiều dài',
  connector: 'Đầu nối tiêu chuẩn',
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export interface ParsedComboComponent {
  raw: string
  index: number
  displayName: string
  sku: string | null
  quantity: number
  catalogItem: CatalogItemOption | null
}

/**
 * Phân tích danh sách chuỗi thành phần Combo dạng "<Tên> (<SKU>) x<SL>" do BE trả về
 * và ánh xạ sang dữ liệu chi tiết sản phẩm thực tế trong catalog API.
 */
export function parseComboComponents(
  components: string[] | undefined,
  catalogItems: CatalogItemOption[],
): ParsedComboComponent[] {
  if (!components || components.length === 0) return []

  const itemBySku = new Map<string, CatalogItemOption>()
  for (const item of catalogItems) {
    if (!item.sku) continue
    const key = item.sku.trim().toLowerCase()
    const existing = itemBySku.get(key)
    if (!existing || (existing.isCombo && !item.isCombo)) {
      itemBySku.set(key, item)
    }
  }

  return components.map((rawComp, idx) => {
    const raw = rawComp.trim()
    const fullMatch = raw.match(/^(.*?)\s+\(([^()]+)\)\s+x(\d+)\s*$/i)
    if (fullMatch) {
      const displayName = fullMatch[1].trim()
      const sku = fullMatch[2].trim()
      const quantity = Math.max(1, Number.parseInt(fullMatch[3], 10) || 1)
      return {
        raw: rawComp,
        index: idx,
        displayName,
        sku,
        quantity,
        catalogItem: itemBySku.get(sku.toLowerCase()) ?? null,
      }
    }

    const skuOnlyMatch = raw.match(/^(.*?)\s+\(([^()]+)\)\s*$/)
    if (skuOnlyMatch) {
      const displayName = skuOnlyMatch[1].trim()
      const sku = skuOnlyMatch[2].trim()
      return {
        raw: rawComp,
        index: idx,
        displayName,
        sku,
        quantity: 1,
        catalogItem: itemBySku.get(sku.toLowerCase()) ?? null,
      }
    }

    const qtyMatch = raw.match(/^(.*?)\s+x(\d+)\s*$/i)
    if (qtyMatch) {
      const maybeNameOrSku = qtyMatch[1].trim()
      const quantity = Math.max(1, Number.parseInt(qtyMatch[2], 10) || 1)
      return {
        raw: rawComp,
        index: idx,
        displayName: maybeNameOrSku,
        sku: null,
        quantity,
        catalogItem: itemBySku.get(maybeNameOrSku.toLowerCase()) ?? null,
      }
    }

    return {
      raw: rawComp,
      index: idx,
      displayName: raw,
      sku: null,
      quantity: 1,
      catalogItem: itemBySku.get(raw.toLowerCase()) ?? null,
    }
  })
}
