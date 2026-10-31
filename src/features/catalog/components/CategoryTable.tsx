import type { Category } from '../types/category.types'

interface CategoryTableProps {
  categories: Category[]
  onEdit?: (category: Category) => void
  onDelete?: (category: Category) => void
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  if (categories.length === 0) {
    return <p>Chưa có danh mục nào.</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Tên danh mục</th>
          <th>Slug</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {categories.map((category) => (
          <tr key={category.id}>
            <td>{category.name}</td>
            <td>{category.slug}</td>
            <td>{category.active ? 'Đang hoạt động' : 'Ngừng hoạt động'}</td>
            <td>
              {onEdit && <button onClick={() => onEdit(category)}>Sửa</button>}
              {onDelete && <button onClick={() => onDelete(category)}>Xóa</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

