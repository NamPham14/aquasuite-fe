import { useState } from 'react'
import { Package } from 'lucide-react'
import { ManagementFilterBar, ManagementPageHeader, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { filterProducts } from './productFilters'

const products = [
  { id: 'SP-001', name: 'Bộ lọc nước RO AquaPure 5 lõi', category: 'Máy lọc nước', price: '4.500.000 ₫', status: 'Đang kinh doanh' },
  { id: 'SP-002', name: 'Lõi lọc số 1 sợi bông PP 5 micron', category: 'Lõi lọc & Phụ kiện', price: '85.000 ₫', status: 'Đang kinh doanh' },
  { id: 'SP-003', name: 'Bình áp nhựa chứa nước tinh khiết 3.2G', category: 'Lõi lọc & Phụ kiện', price: '450.000 ₫', status: 'Sắp hết hàng' },
]

type Product = (typeof products)[number]
const columns: ManagementTableColumn<Product>[] = [
  { key: 'id', header: 'Mã SP', cell: (product) => product.id, cellClassName: 'font-medium text-gray-900' },
  { key: 'name', header: 'Tên sản phẩm', cell: (product) => product.name, cellClassName: 'font-medium text-gray-800' },
  { key: 'category', header: 'Danh mục', cell: (product) => product.category },
  { key: 'price', header: 'Giá niêm yết', cell: (product) => product.price, align: 'right', cellClassName: 'tabular-nums' },
  { key: 'status', header: 'Trạng thái', align: 'center', cell: (product) => <span className={`rounded px-2 py-0.5 text-xs font-medium ${product.status === 'Sắp hết hàng' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{product.status}</span> },
]

export function ProductsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const filteredProducts = filterProducts(products, search, category, status)

  function resetFilters() {
    setSearch('')
    setCategory('')
    setStatus('')
  }

  return (
    <div className="space-y-6">
      <ManagementPageHeader title="Quản lý Sản phẩm" description="Danh mục sản phẩm, bảng giá và phân loại mặt hàng" breadcrumb="Sản phẩm" group="Quản lý danh mục" icon={<Package className="h-6 w-6" />} />

      <ManagementFilterBar>
        <ManagementSearch id="product-search" label="Tìm kiếm" value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc mã sản phẩm..." />
        <ManagementSelect id="product-category" label="Danh mục" value={category} onChange={setCategory}>
          <option value="">Tất cả danh mục</option>
          <option value="Máy lọc nước">Máy lọc nước</option>
          <option value="Lõi lọc & Phụ kiện">Lõi lọc &amp; Phụ kiện</option>
        </ManagementSelect>
        <ManagementSelect id="product-status" label="Trạng thái" value={status} onChange={setStatus}>
          <option value="">Tất cả trạng thái</option>
          <option value="Đang kinh doanh">Đang kinh doanh</option>
          <option value="Sắp hết hàng">Sắp hết hàng</option>
        </ManagementSelect>
        <button type="button" onClick={resetFilters} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600">Xóa bộ lọc</button>
      </ManagementFilterBar>

      <section aria-labelledby="products-heading" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 id="products-heading" className="text-base font-semibold text-gray-900">Danh sách sản phẩm minh họa</h2><p className="text-xs text-gray-500">Tìm kiếm và lọc trên dữ liệu mẫu, chưa kết nối API nghiệp vụ.</p></div>
          <span className="self-start rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 sm:self-auto">Dữ liệu mẫu</span>
        </div>
        <ManagementTable columns={columns} rows={filteredProducts} rowKey={(product) => product.id} labelledBy="products-heading" emptyMessage="Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa hoặc bộ lọc khác." />
        <p aria-live="polite" className="border-t border-gray-100 px-4 py-3 text-xs text-slate-600">Hiển thị {filteredProducts.length} / {products.length} sản phẩm mẫu</p>
      </section>
    </div>
  )
}
