# Component dùng chung cho trang quản lý

Tài liệu này giúp thành viên và coding agent tìm các **React component** đang có trước khi tạo giao diện quản lý mới. Các component nằm trong `src/shared/ui/`; chúng cung cấp giao diện và cấu trúc, còn dữ liệu, nghiệp vụ và xử lý API thuộc trang hoặc feature sử dụng chúng.

Các file và export dưới đây là hiện trạng code, không phải một thư viện CRUD hoàn chỉnh. Xem [cấu trúc frontend](FRONTEND_PACKAGE_STRUCTURE.md) và contract/spec liên quan trước khi tích hợp dữ liệu thật.

## Chọn component nào?

| Nhu cầu | Component | File |
| --- | --- | --- |
| Tiêu đề, breadcrumb và liên kết về dashboard | `ManagementPageHeader` | `src/shared/ui/ManagementPage.tsx` |
| Nhóm ô tìm kiếm và bộ lọc | `ManagementFilterBar` | `src/shared/ui/ManagementPage.tsx` |
| Ô tìm kiếm có nhãn | `ManagementSearch` | `src/shared/ui/ManagementPage.tsx` |
| Bộ chọn lọc có nhãn | `ManagementSelect` | `src/shared/ui/ManagementPage.tsx` |
| Bảng với cột và ô do trang tự định nghĩa | `ManagementTable`, `ManagementTableColumn<T>` | `src/shared/ui/ManagementTable.tsx` |
| Nút thao tác phân biệt theo ý nghĩa của từng dòng | `ManagementRowActions`, `ManagementActionButton` | `src/shared/ui/ManagementRowActions.tsx` |
| Hộp thoại mở phía trên trang | `ManagementDialog` | `src/shared/ui/ManagementDialog.tsx` |
| Khung form và các nút đóng/lưu | `ManagementForm` | `src/shared/ui/ManagementDialog.tsx` |
| Nhãn, gợi ý hoặc lỗi cho một trường | `ManagementFormField` | `src/shared/ui/ManagementDialog.tsx` |
| Style chung cho input/select/textarea trong form | `managementFieldClass` | `src/shared/ui/ManagementDialog.tsx` |

Trong TypeScript/React đây là function component, type và hằng style; không phải class. Các trang [Danh mục](../src/pages/management/CategoriesPage.tsx), [Thương hiệu](../src/pages/management/BrandsPage.tsx), [Sản phẩm](../src/pages/management/ProductsPage.tsx) và [Vai trò/Quyền](../src/pages/management/AccessPlaceholderPage.tsx) là ví dụ đang dùng các thành phần này. Danh mục và Thương hiệu đã kết nối CRUD thật qua `features/catalog`, gồm phân trang/lọc phía server, form và trạng thái loading/error/empty; contract vẫn được xác định bởi BE và spec WORK-013, không phải bởi component trình bày. Không coi việc hiện hoặc ẩn nút trên FE là chính sách thực thi phân quyền.

## Tiêu đề, tìm kiếm và lọc

`ManagementPageHeader` nhận `title`, `description`, `breadcrumb`, `icon` và `group` tùy chọn. Component luôn có liên kết về `/app/dashboard`; dùng khi hành vi đó phù hợp với trang. `ManagementFilterBar` chỉ sắp xếp các control trong vùng tìm kiếm. `ManagementSearch` và `ManagementSelect` là controlled component: trang giữ `value`, truyền `onChange`, tự lọc hoặc gọi API.

```tsx
import { useState } from 'react'
import { Package } from 'lucide-react'
import {
  ManagementPageHeader, ManagementFilterBar, ManagementSearch, ManagementSelect,
} from '../../shared/ui/ManagementPage'

export function ExamplePage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  return <>
    <ManagementPageHeader title="Quản lý sản phẩm" description="Danh sách sản phẩm"
      breadcrumb="Sản phẩm" group="Danh mục" icon={<Package />} />
    <ManagementFilterBar>
      <ManagementSearch id="product-query" label="Tìm kiếm" value={search}
        onChange={setSearch} placeholder="Tìm theo mã hoặc tên" />
      <ManagementSelect id="product-status" label="Trạng thái" value={status} onChange={setStatus}>
        <option value="">Tất cả</option>
        <option value="ACTIVE">Hoạt động</option>
      </ManagementSelect>
    </ManagementFilterBar>
  </>
}
```

Mỗi `id` phải duy nhất trên trang và `label` mô tả đúng control. Chỉ thêm những bộ lọc có ích cho nghiệp vụ: không bắt buộc mọi trang dùng cùng số lượng filter. Với dữ liệu thật, trang cần xử lý loading, lỗi, rỗng, phân trang và đồng bộ filter theo contract; các component này không tự thực hiện việc đó.

## Bảng: `ManagementTable<T>`

Khai báo kiểu dữ liệu từng dòng và mảng `ManagementTableColumn<T>`. Mỗi cột có `key` duy nhất, `header`, hàm `cell(row)`, `align` tùy chọn (`left`, `center`, `right`) và `cellClassName` tùy chọn. `cell` có thể trả về text, số hoặc JSX như badge/nút. Trang quyết định các trường và hành vi của nút.

```tsx
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'

type Item = { id: string; name: string; quantity: number }
const columns: ManagementTableColumn<Item>[] = [
  { key: 'name', header: 'Tên', cell: (row) => row.name },
  { key: 'quantity', header: 'Số lượng', cell: (row) => row.quantity, align: 'right', cellClassName: 'tabular-nums' },
]

function ItemTable({ items }: { items: Item[] }) {
  return <section>
    <h2 id="item-list">Danh sách</h2>
    <ManagementTable columns={columns} rows={items} rowKey={(row) => row.id}
      labelledBy="item-list" emptyMessage="Không có dữ liệu." />
  </section>
}
```

`rowKey` phải ổn định và duy nhất trong danh sách. `labelledBy` phải trỏ đến `id` của tiêu đề có thật. Bảng cung cấp hàng rỗng và vùng cuộn ngang có thể focus; không tự tải dữ liệu, phân trang, tìm kiếm, sắp xếp, chọn dòng hay cấp quyền. Hiện ô mặc định `whitespace-nowrap`, nên nội dung dài có thể làm bảng cuộn ngang; xem xét nội dung và kiểm tra mobile khi dùng.

`ManagementRowActions` dùng cho nhóm hành động của từng dòng: truyền mảng action có `variant`, `label`, `ariaLabel`, `onClick` và `disabled` tùy chọn. Màu và biểu tượng thể hiện ngữ nghĩa nhất quán: Xem trung tính, Sửa xanh nhạt, Xóa đỏ nhạt. Với hành động ngoài bộ Xem/Sửa/Xóa, dùng `ManagementActionButton` trực tiếp; Gán quyền có nền xanh đậm, Gỡ quyền có nền đỏ nhạt. Component chỉ trình bày nút, không xác nhận thao tác nguy hiểm hay gọi API; trang vẫn chịu trách nhiệm xử lý nghiệp vụ và xác nhận xóa/gỡ.

## Dialog và form

`ManagementDialog` dùng thẻ HTML `<dialog>` và gọi `showModal()` khi được mount. Trang quản lý state mở/đóng bằng conditional render; nút X và Escape gọi `onClose`. `closeDisabled` tùy chọn, mặc định `false`, khóa nút X và Escape trong lúc chờ. Không render nhiều dialog này đồng thời: tiêu đề hiện dùng cùng một `id`. Kiểm tra focus, bàn phím và hành vi trình duyệt cho luồng thực tế.

`ManagementForm` tạo thẻ `<form noValidate>`, bố trí phần nội dung và nút Hủy/Đóng, Lưu. `onSubmit` và `submitLabel` là bắt buộc; `readOnly` ẩn nút submit nhưng **không tự khóa các input**. `submitDisabled` tùy chọn (mặc định `false`) vô hiệu hóa nút submit; `closeDisabled` khóa nút Hủy/Đóng. Trang vẫn phải chặn gửi lặp trong handler và quản lý state, validation, pending, lỗi, đóng dialog và xử lý lưu. Không dùng một form giả để thể hiện thao tác đã kết nối backend.

`ManagementFormField` liên kết `label` với control qua `id`, và hiển thị `error` hoặc `hint` (`error` được ưu tiên). Nó không tự gắn thuộc tính vào input: khi có lỗi, trang cần gắn `aria-invalid` và `aria-describedby` tới `${id}-error`; khi có hint, có thể gắn tới `${id}-hint`. Dùng ID riêng cho từng trường.

```tsx
import { useState, type FormEvent } from 'react'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog'

function ExampleForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) { setError('Vui lòng nhập tên.'); return }
    // Gọi xử lý lưu của feature sau khi đã xác nhận contract.
  }
  return <ManagementDialog title="Thêm mục" onClose={onClose}>
    <ManagementForm onSubmit={submit} onClose={onClose} submitLabel="Lưu">
      <ManagementFormField id="item-name" label="Tên *" error={error}>
        <input id="item-name" className={managementFieldClass} value={name}
          onChange={(event) => setName(event.target.value)} aria-invalid={!!error}
          aria-describedby={error ? 'item-name-error' : undefined} />
      </ManagementFormField>
    </ManagementForm>
  </ManagementDialog>
}
```

`ManagementForm` là khung chung; nội dung form của mỗi nghiệp vụ vẫn riêng. Không bắt buộc trường của Thương hiệu giống Danh mục. Nếu một nhu cầu chung còn thiếu, cân nhắc mở rộng component hiện có mà vẫn tương thích các trang đang dùng, thay vì sao chép một phiên bản mới.

## Khi giao việc cho coding agent

Có thể đưa yêu cầu sau vào prompt:

> Đọc `AGENTS.md`, `docs/README.md` và `docs/MANAGEMENT_UI_COMPONENTS.md`; kiểm tra các component `src/shared/ui/` và trang tương tự trước khi tạo component mới. Dùng lại bảng, form và control phù hợp; mỗi trang tự định nghĩa cột, trường và validation. Không suy đoán contract API hoặc quyền, không coi dữ liệu mẫu là dữ liệu thật.

Khi bổ sung hoặc thay đổi API component dùng chung, cập nhật tài liệu này cùng ví dụ và kiểm tra các trang đang sử dụng. Không thêm dependency, API, phân quyền hay hành vi CRUD chỉ vì ví dụ có form hoặc bảng.
