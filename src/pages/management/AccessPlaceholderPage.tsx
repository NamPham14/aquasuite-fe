import { ShieldCheck } from 'lucide-react'
import { ManagementPageHeader } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'

type AccessRow = { code: string; name: string; description: string }
const columns: ManagementTableColumn<AccessRow>[] = [
  { key: 'code', header: 'Mã', cell: (row) => row.code },
  { key: 'name', header: 'Tên', cell: (row) => row.name },
  { key: 'description', header: 'Mô tả', cell: (row) => row.description },
]

export function AccessPlaceholderPage({ kind }: { kind: 'roles' | 'permissions' }) {
  const name = kind === 'roles' ? 'Vai trò' : 'Quyền'
  return <div className="space-y-6"><ManagementPageHeader title={`Quản lý ${name}`} description="Thông tin quản lý truy cập" breadcrumb={name} icon={<ShieldCheck className="h-6 w-6" />} /><section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="p-4"><h2 id="access-list" className="font-semibold text-slate-900">Danh sách {name.toLocaleLowerCase('vi-VN')}</h2><p className="mt-2 text-sm text-slate-600">Trang đang được chuẩn bị. Chưa kết nối dữ liệu hoặc thao tác quản lý.</p></div><ManagementTable columns={columns} rows={[]} rowKey={(row) => row.code} labelledBy="access-list" emptyMessage="Chưa có dữ liệu để hiển thị." /></section></div>
}
