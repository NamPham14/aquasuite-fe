# FEATURE-UC05 User Account Management Frontend

## Metadata

- **Work ID / Feature**: FEATURE-UC05 / User Account Management Frontend
- **Owner / Owning Feature**: `features/iam`, `pages/management`
- **Risk Reasons**: account lifecycle, authorization UI, credential creation, session revocation side effect
- **Design Review**: APPROVED
- **Tài liệu liên quan**: UC-05 in Report 3 v1.3, Report 4 account-management design, current IAM backend controller contract

## 1. Mục tiêu và phạm vi

- **Vấn đề và kết quả mong muốn**: Shop Owner can view account statistics and a paginated account list; create, view, edit, and change the status of internal accounts without exposing temporary passwords after submit.
- **Trong phạm vi**: `/app/users`, account statistics, server-side keyword/role/status filters, paging, detail dialog, multi-role create/edit form, status confirmation dialog, loading/error/empty states, and navigation.
- **Ngoài phạm vi**: authentication changes, role/permission administration, audit-log viewer, customer registration, email delivery implementation, and backend contract changes.

## 2. Người dùng, quyền và quy tắc

| Actor | Thao tác / quyền | Quy tắc và giới hạn dữ liệu |
| --- | --- | --- |
| Shop Owner | All UC-05 page actions | FE hides self lock/deactivate actions; backend remains the enforcement authority. |
| Sales Staff / Accountant / other roles | No UC-05 management UI | Route is not shown as a management action; backend endpoint requires `SHOP_OWNER`. |

- **Luồng chính và ngoại lệ**: stat cards set status filter; reset clears filters. Create can generate a temporary password or require a confirmed password. Edit cannot alter status. Status changes always require confirmation. API validation errors are presented at field level when supplied; duplicate identifiers show the server message.
- **Dữ liệu nhạy cảm**: temporary password exists only in form state until the request completes, is never rendered in a list/detail dialog, persisted in browser storage, logged, or shown in toast messages.

## 3. UI và contract

- **Màn hình / điều hướng**: `/app/users` under "Quản lý truy cập", based on UC-05 management design.
- **Trạng thái UI**: loading, refreshing, empty, API error with retry, pending submit/confirmation, responsive mobile cards, keyboard-operable dialogs and labelled controls.

| API / nguồn contract | Request / quyền | Success | Lỗi và xử lý FE |
| --- | --- | --- | --- |
| `GET /iam/users/stats` | Shop Owner | total/active/inactive/locked counts | page-level error/retry |
| `GET /iam/users` | `keyword`, `roleId`, `status`, `page`, `size` | paged account rows | page-level error/retry |
| `GET /iam/users/{id}` | Shop Owner | detailed account | dialog error |
| `POST /iam/users` | multi `roleIds`, temp-password mode | `201`, refresh list/stats, MSG23 | field/general server errors |
| `PATCH /iam/users/{id}` | multi `roleIds` | refresh list/stats | field/general server errors |
| `PATCH /iam/users/{id}/status` | target status, optional reason | refresh list/stats | general server error; self safety is backend-enforced |
| `GET /iam/roles?assignable` | Shop Owner | active role options | form error/retry |

The current backend contract uses `roleIds: Set<UUID>`. This intentionally supersedes the older single-dropdown wording in Report 3; the UI uses a multi-role checkbox list.

## 4. Acceptance Criteria và kiểm chứng

| AC | Kết quả quan sát được | Cách kiểm chứng |
| --- | --- | --- |
| AC-01 | Owner can open Users route and see stats/list filters/pagination | browser/API mock check |
| AC-02 | Create/edit sends exactly the current backend payload, including multiple role IDs | API contract test/build |
| AC-03 | Status dialog prevents accidental change; current user has lock/deactivate controls disabled | component/manual check |
| AC-04 | Loading, empty, validation, failure and mobile states are usable | manual UI check/build |
| AC-05 | Temporary password is not persisted or displayed after submission | code review/test |

## 5. Quyết định mở

| Quyết định / phụ thuộc | Owner | Cần trước | Trạng thái / kết luận |
| --- | --- | --- | --- |
| Backend sends audit entries but has no UC-05 audit-list endpoint for this page | Audit module | audit panel | OUT OF SCOPE; UC-07 owns the full viewer. |
