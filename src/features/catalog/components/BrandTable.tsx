import type { Brand } from '../types/brand.types'

interface BrandTableProps {
  brands: Brand[]
  onEdit?: (brand: Brand) => void
  onDelete?: (brand: Brand) => void
}

export function BrandTable({ brands, onEdit, onDelete }: BrandTableProps) {
  if (brands.length === 0) {
    return <p>Chưa có thương hiệu nào.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Tên thương hiệu</th>
          <th>Slug</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {brands.map((brand) => (
          <tr key={brand.id}>
            <td>{brand.name}</td>
            <td>{brand.slug}</td>
            <td>{brand.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td>
            <td>
              {onEdit && <button onClick={() => onEdit(brand)}>Sửa</button>}
              {onDelete && <button onClick={() => onDelete(brand)}>Xóa</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

