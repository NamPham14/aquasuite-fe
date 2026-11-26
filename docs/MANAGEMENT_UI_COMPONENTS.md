# Component dùng chung & Design System cho trang quản lý

Tài liệu này giúp thành viên và coding agent sử dụng đúng **Design Tokens (Tailwind CSS 4)** và các **React component dùng chung** trong `src/shared/ui/` trước khi xây dựng hoặc nâng cấp giao diện Management Dashboard (`/app/*`). Các component này chỉ chịu trách nhiệm trình bày, bố cục và khả năng tiếp cận (accessibility); dữ liệu, nghiệp vụ, phân quyền và gọi API thuộc về `pages/` và `features/`.

Xem thêm [cấu trúc frontend](FRONTEND_PACKAGE_STRUCTURE.md) và `AGENTS.md` trước khi tích hợp dữ liệu thật. Không để `src/shared/` phụ thuộc vào `src/features/` hay `src/pages/`.

## 1. Design Tokens & Styles toàn cục (Tailwind CSS 4)

Hệ thống style dùng Tailwind CSS 4 làm chuẩn, tổ chức tập trung thành 3 file:

| File | Vai trò |
| --- | --- |
| `src/assets/styles/tokens.css` | Khai báo semantic design tokens bằng `@theme` (`--color-aqs-*`, `--radius-card/control/chip`, `--shadow-aqs-float`, `--font-aqs-sans`, `--ease-aqs*`) và bridge `--ux-*` cho Lucian UX/UI. |
| `src/assets/styles/motion.css` | Keyframes và micro-interaction dùng chung (Lucian `#090/#092/#244/#436`, Sakuga primary action ticks, spinner/skeleton, `@media (prefers-reduced-motion: reduce)`). |
| `src/index.css` | Entry point global styles: `@import "tailwindcss"`, import `tokens.css` và `motion.css`, base font và style Storefront. |

Quy tắc bắt buộc:
- Lấy `ProductsPage` và Sidebar sáng (`src/layouts/ManagementLayout.tsx`) làm chuẩn UI/UX cho toàn bộ Management Dashboard (`/app/*`).
- Ưu tiên Tailwind utilities gắn với semantic tokens đã khai báo trong `tokens.css` (`bg-aqs-page`, `bg-aqs-surface`, `text-aqs-ink`, `text-aqs-ink-muted`, `border-aqs-border`, `border-aqs-divider`, `bg-aqs-accent`, `rounded-card`, `rounded-control`, v.v.).
- Không tạo file CSS phân tán cho từng page hoặc từng feature, không duplicate component đã có trong `src/shared/ui/` và không xây dựng hệ thống UI song song.
- Không lạm dụng `!important` (chỉ dùng cho khối `@media (prefers-reduced-motion: reduce)` và phần Storefront cũ nếu cần).

## 2. Danh mục Shared UI (`src/shared/ui/`)

| Nhu cầu | Component / Export | File |
| --- | --- | --- |
| Nút bấm, icon button, tooltip, primary CTA có micro-interaction Sakuga | `Button`, `IconButton`, `Tooltip`, `SakugaActionButton` | `src/shared/ui/Button.tsx` |
| Nhãn trạng thái, mã định danh (code chip), thông báo inline | `StatusBadge`, `CodeChip`, `Notice` | `src/shared/ui/Badge.tsx` |
| Trạng thái rỗng (`#092`), lỗi có retry (`#090`), tóm tắt lỗi form (`#244`), class toast | `EmptyState`, `ErrorState`, `ValidationSummary`, `OPERATIONAL_TOAST_CLASS` | `src/shared/ui/FeedbackStates.tsx` |
| Khung trang, header + breadcrumb, card bộ lọc, ô tìm kiếm, select, panel, stat card | `ManagementPageShell`, `ManagementPageHeader`, `ManagementFilterCard`, `ManagementFilterChip`, `ManagementFilterBar`, `ManagementSearch`, `ManagementSelect`, `ManagementPanel`, `ManagementStatCard`, `filterControlClass` | `src/shared/ui/ManagementPage.tsx` |
| Bảng dữ liệu, skeleton tải dữ liệu, danh sách mobile, phân trang | `ManagementTable`, `ManagementTableColumn<T>`, `ManagementTableSkeleton`, `ManagementMobileList`, `ManagementPagination` | `src/shared/ui/ManagementTable.tsx` |
| Nhóm nút thao tác từng dòng (Xem/Sửa/Xóa/Gán quyền/Gỡ quyền) | `ManagementRowActions`, `ManagementActionButton` | `src/shared/ui/ManagementRowActions.tsx` |
| Hộp thoại native `<dialog>`, form, trường nhập liệu, hộp thoại xác nhận xóa (`#436`) | `ManagementDialog`, `ManagementForm`, `ManagementFormField`, `managementFieldClass`, `DeleteConfirmDialog` | `src/shared/ui/ManagementDialog.tsx` |

Các trang mẫu chuẩn đang sử dụng đầy đủ hệ thống này:
- [Sản phẩm](../src/pages/management/ProductsPage.tsx)
- [Tài khoản người dùng](../src/pages/management/UsersPage.tsx)
- [Vai trò](../src/pages/management/RolesPage.tsx)
- [Quyền](../src/pages/management/PermissionsPage.tsx)

## 3. Khung trang, tiêu đề, bộ lọc và panel

- `ManagementPageShell`: bọc nội dung trang quản lý với khoảng cách chuẩn (`space-y-5`).
- `ManagementPageHeader`: nhận `title`, `description`, `breadcrumb`, `group`, `icon` và `actions` tùy chọn. Luôn hiển thị breadcrumb liên kết về `/app/dashboard`.
- `ManagementFilterCard`: card bộ lọc chuẩn với `title`, `description`, `chips`, `resultSummary`, `onReset` và `children`.
- `ManagementFilterBar`, `ManagementSearch`, `ManagementSelect`: controlled components; trang tự quản lý state và đồng bộ API/filter theo contract.
- `ManagementPanel`: card chứa bảng hoặc khu vực nội dung phụ (`title`, `subtitle`, `actions`, `flush`, `footer`).
- `ManagementStatCard`: thẻ KPI có trạng thái active để lọc nhanh (ví dụ trên `UsersPage`).

```tsx
import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementFilterCard,
  ManagementPanel,
  filterControlClass,
} from '../../shared/ui/ManagementPage'
import { SakugaActionButton } from '../../shared/ui/Button'

export function ExamplePage() {
  const [search, setSearch] = useState('')

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý sản phẩm"
        description="Kiểm soát thông tin định danh và trạng thái kinh doanh."
        breadcrumb="Sản phẩm"
        group="Quản lý danh mục"
        actions={
          <SakugaActionButton onClick={() => {}}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo sản phẩm
          </SakugaActionButton>
        }
      />
      <ManagementFilterCard title="Tìm và lọc" resultSummary="12 kết quả">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã hoặc tên..."
          className={filterControlClass}
        />
      </ManagementFilterCard>
      <ManagementPanel title="Danh sách" flush>
        {/* ManagementTable */}
      </ManagementPanel>
    </ManagementPageShell>
  )
}
```

## 4. Bảng, Skeleton, Mobile List và Phân trang

- `ManagementTable<T>`: khai báo `columns: ManagementTableColumn<T>[]` với `key`, `header`, `cell(row)`, `align` (`left` | `center` | `right`), `cellClassName`, `headerClassName` và prop `compact` tùy chọn. `rowKey` phải ổn định và duy nhất; `labelledBy` trỏ đến `id` của tiêu đề bảng.
- `ManagementTableSkeleton`: hiển thị skeleton trong khi tải bảng.
- `ManagementMobileList<T>`: danh sách dạng thẻ cho màn hình `< 768px`.
- `ManagementPagination`: thanh phân trang chuẩn (`page`, `totalPages`, `totalElements`, `displayedCount`, `itemLabel`, `onPageChange`, `disabled`).
- `ManagementRowActions` / `ManagementActionButton`: nhóm nút thao tác ngữ nghĩa (`view`, `edit`, `delete`, `assign`, `revoke`). Component chỉ trình bày nút, không tự gọi API hay xác nhận thao tác nguy hiểm.

## 5. Dialog, Form và Trạng thái phản hồi

- `ManagementDialog`: dùng thẻ HTML `<dialog>` + `showModal()`, hỗ trợ `size="default"` (640px) và `size="wide"` (960px), `closeDisabled`, phím `Escape` và trả focus về phần tử kích hoạt khi đóng. Không render nhiều `ManagementDialog` đồng thời.
- `ManagementForm`: khung `<form noValidate>` chuẩn với nút Hủy/Đóng và Lưu (`submitLabel`, `submitDisabled`, `closeDisabled`, `readOnly`, `submitVariant`).
- `ManagementFormField`: gắn `label` qua `id`, ưu tiên hiển thị `error` trước `hint`. Input bên trong nên dùng `managementFieldClass` và gắn `aria-invalid`, `aria-describedby` tương ứng.
- `DeleteConfirmDialog`: hộp thoại xác nhận xóa/hành động nguy hiểm chuẩn (port từ Lucian `#436`, giữ license MIT), hỗ trợ cả mode nút bấm thường và `asForm`.
- `EmptyState` (`#092`), `ErrorState` (`#090`), `ValidationSummary` (`#244`): các trạng thái phản hồi thống nhất, có recovery action và focus về trường lỗi.
- `StatusBadge`, `CodeChip`, `Notice`: hiển thị trạng thái (`success`, `warning`, `danger`, `neutral`, `info`), mã code tabular và banner cảnh báo inline.

## 6. Quy tắc cho coding agent

> Đọc `AGENTS.md`, `docs/README.md`, `docs/FRONTEND_PACKAGE_STRUCTURE.md` và `docs/MANAGEMENT_UI_COMPONENTS.md`. Kiểm tra `src/shared/ui/` trước khi tạo component mới. Dùng lại tokens từ `src/assets/styles/tokens.css` và các shared component phù hợp; mỗi feature tự xử lý dữ liệu, mapping trạng thái và validation nghiệp vụ. Không suy đoán contract API hoặc quyền; không đưa business logic vào `src/shared/ui/`.

Khi bổ sung hoặc thay đổi API của shared component, cập nhật tài liệu này và kiểm tra toàn bộ consumer đang dùng.
