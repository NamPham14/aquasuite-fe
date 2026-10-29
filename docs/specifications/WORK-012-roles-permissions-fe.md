# WORK-012 — Màn hình quản lý vai trò và quyền

## Metadata

- **Owning feature**: FE IAM / trang quản lý
- **Risk**: L — thay đổi cấu hình phân quyền và gọi API protected.
- **Design Review**: PENDING.
- **Nguồn khảo sát**: BE `docs/specifications/UC-IAM-MANAGE-ROLES-PERMISSIONS.md`, `IamRoleController`, `IamPermissionController`, request/response DTO và service tương ứng trong sibling `aquasuite-be`. Sibling là nguồn tham khảo tại workspace này, không phải đường dẫn bắt buộc cho mọi máy.

## 1. Mục tiêu và phạm vi

Thay hai trang giữ chỗ bằng màn hình xem vai trò/quyền và quản lý mapping, permission theo implementation BE hiện tại, theo quyết định của owner. Dùng bảng, header và dialog chung hiện có. Không tạo/xóa/sửa role, gán role cho user, sửa auth hoặc BE.

## 2. Actor và quy tắc

BE source bảo vệ hai controller bằng `hasRole('SHOP_OWNER')`. FE không dùng ẩn nút hoặc route guard như bằng chứng phân quyền; server quyết định từng request. Non-owner phải nhận và nhìn thấy trạng thái không đủ quyền khi server trả 403, không tự suy ra danh sách permission từ `/me`.

- Role: danh sách canonical và chi tiết read-only; cho phép gán/gỡ từng permission theo endpoint, không tạo/xóa/sửa role.
- Permission: tạo code được trim/uppercase, 1–150 ký tự, `^[A-Z][A-Z0-9_]*$`, không bắt đầu `ROLE_`; description tùy chọn tối đa 500 ký tự sau trim, blank thành null. Code duy nhất không phân biệt hoa thường và bất biến. DTO BE không có `displayName`; khi sửa chỉ gửi `description`, không gửi code hay displayName. PATCH thiếu hoặc null description cũng xóa mô tả theo service hiện tại, nên form gửi giá trị có chủ ý. Xóa có xác nhận; 409 `IAM_006` giữ nguyên dữ liệu và giải thích quyền đang được gán.
- Gán/gỡ là idempotent phía BE; FE vô hiệu hóa thao tác đang pending, không xác nhận thành công trước response, làm mới dữ liệu sau success. Xử lý 404/409 và dữ liệu thay đổi bởi người khác bằng cách hiển thị lỗi và tải lại khi phù hợp.

## 3. UI và contract khảo sát từ source BE

Routes giữ `/app/roles`, `/app/permissions`; dùng `ManagementTable`, `ManagementDialog` và control phù hợp. Mỗi trang cần loading, empty, lỗi/mạng, 403, retry, responsive và keyboard. Permission list dùng page zero-based, size 20 mặc định, search theo code/description, sort `code`, `description`, `id` và direction `asc`/`desc`. Role list là array, không phân trang. Đầu ra trong `ApiResponse.data`; ID là UUID.

| Method/path sau `/api/v1` | Request | Thành công theo source | Lỗi chính |
| --- | --- | --- | --- |
| GET `/iam/roles` | Không query | `RoleResponse[]`: id, code, description, active, permissions[] | 401, 403, 409 dữ liệu không nhất quán |
| GET `/iam/roles/{id}` | UUID | `RoleResponse` | 403, 404 |
| PUT/DELETE `/iam/roles/{id}/permissions/{permissionId}` | Hai UUID, không body | `RoleResponse` sau cập nhật | 403, 404, lỗi dữ liệu |
| GET `/iam/permissions` | page, size, search, sortBy, direction | `PageResponse<PermissionResponse>`: items/page/size/totalElements/totalPages | 403, 400 query |
| GET `/iam/permissions/{id}` | UUID | id, code, description | 403, 404 |
| POST `/iam/permissions` | code, description | 201, permission | 400 format/reserved, 409 duplicate |
| PATCH `/iam/permissions/{id}` | description | permission | 400 payload, 403, 404 |
| DELETE `/iam/permissions/{id}` | UUID | 200 envelope, data có thể không có | 403, 404, 409 đang được gán |

Mutation có thể làm thay đổi quyền từ request protected tiếp theo; không giả định JWT/session bị thay thế. Không gán hàng loạt theo các trang chưa tải và không optimistic update làm sai trạng thái thực.

## 4. Acceptance criteria và kiểm chứng

| AC | Kết quả | Bằng chứng dự kiến |
| --- | --- | --- |
| 01 | Role list/detail, gán/gỡ permission đúng response server | Mock API đúng envelope, test request, success, lỗi và pending. |
| 02 | Permission search/page/create/edit/delete theo quy tắc | Test validation, params, body, 404/409, zero-based page, rỗng. |
| 03 | Non-owner/anonymous không được giả lập quyền | Test guard và response 401/403, BE thực khi có môi trường. |
| 04 | Không rò dữ liệu cũ sau đổi session, invalidation nhất quán | Test auth generation/cache và thao tác đồng thời; review bảo mật. |
| 05 | Khả dụng trên desktop/mobile và bàn phím | Browser test focus dialog, nút, loading/error; nếu không có thì ghi NOT_RUN. |

## 5. Quyết định mở

| Quyết định | Owner | Cần trước | Trạng thái |
| --- | --- | --- | --- |
| BE spec ghi `READY_FOR_SPEC_REVIEW`, implementation `NOT_STARTED`, nhưng source đã có controller/service/test. Owner chọn implementation hiện tại làm contract cho WORK-012; không suy ra trạng thái tài liệu BE đã thay đổi. Version BE thực tế triển khai chưa xác minh. | BE IAM / deployment owner | Kiểm chứng tích hợp thực | OPEN cho version môi trường; không sửa trạng thái BE. |
| Review thiết kế, session race, cache/invalidation và authorization của UI | IAM/security reviewer | Triển khai Risk L | PENDING; không tự phê duyệt. |
| Môi trường backend và tài khoản test phù hợp cho 401/403/owner | Owner / BE | Kiểm chứng thực | OPEN; không đưa credential vào tài liệu. |

## 6. Contract Evidence and Limits

- Baseline được đọc: BE sibling tại `D:/DO_AN/Aquasuite/aquasuite-be`, HEAD `b68b713bb56e14cb673e048835e76123a47078db`; `git status --short` trống khi khảo sát. Đây là bằng chứng source local, không xác nhận BE đang triển khai có cùng revision.
- `IamRoleController` và `IamPermissionController` dùng `@PreAuthorize("hasRole('SHOP_OWNER')")`; `AuthSecurityConfig` bật method security và yêu cầu authenticated. Security handler trả 401 `AUTH_001` mặc định, 403 `AUTH_002` khi từ chối; phải giữ riêng `AUTH_008` và các lỗi auth khác theo WORK-001. Source `AccessAuthenticationConverter` tải authorities hiện hành từ DB; không giả định frontend hay JWT tự áp quyền.
- `RoleResponse`: UUID `id`, `code`, `description`, `active`, `permissions` gồm `PermissionResponse` (`id`, `code`, `description`). Role service trả đúng thứ tự `SHOP_OWNER`, `SALES_STAFF`, `ACCOUNTANT`, `TECHNICAL_STAFF`, `SHIPPER`, `CUSTOMER`, lỗi integrity khi thiếu canonical. Không dùng `GET /iam/roles?assignable` cho danh sách canonical; controller có mapping riêng cho tham số này và use case gán role cho user ngoài scope.
- `PageQuery` mặc định page 0, size 20, direction asc; service cho page >= 0, size 1–100, sort `code`, `description`, `id`, direction asc/desc; search trim và tìm case-insensitive trong code/description. Envelope `success`, `code`, `message`, `timestamp`, `data` khi khác null; DELETE success 200 không có `data`. Không suy đoán shape của lỗi ngoài `ApiResponse` và code đã đối chiếu.
- Lỗi theo source: `IAM_001`/`IAM_002` 400 code sai/reserved; `IAM_003`/`IAM_004` 404 role/permission thiếu; `IAM_005`/`IAM_006` 409 duplicate/đang gán; `SYS_003` 400 validation. `GlobalExceptionHandler` xử lý payload JSON không đọc được; cần hiển thị fallback cho lỗi khác và không coi mọi 409 là đang được gán.
- Service khóa permission trước role khi gán/gỡ; thao tác idempotent, description last-write-wins, không version. Không khẳng định dữ liệu trong cache là mới sau response trễ hoặc lỗi mạng: kết quả mutation không chắc chắn phải được đọc lại, không tự retry mutation hoặc báo thành công.
- Đã đối chiếu source test `IamRolesAndPermissionsControllerIntegrationTest`: có các test danh sách/chi tiết, phân trang, validation, update, delete, assign/unassign, owner/non-owner và anonymous. Chỉ xác nhận nội dung test, **chưa chạy test BE**, chưa chứng minh test pass, live BE, DB migration, concurrency thực hoặc phiên bản triển khai. Đối chiếu tiếp trước tích hợp nếu môi trường/revision khác.

## 7. Executable UI and Verification

- Role list hiển thị code, description, active và số lượng từ `permissions` trả về; chi tiết hiển thị permission đã gán. Danh mục permission để gán phải có search/page từ server, so sánh theo UUID với danh sách đã gán; không coi trang chưa tải là không tồn tại. Gán/gỡ từng item với trạng thái pending, khóa thao tác trùng; sau success cập nhật/refetch role và danh sách liên quan theo dữ liệu server.
- Permission list/search/sort/page dùng query BE, đổi search/sort về trang 0; có trạng thái loading, empty, lỗi/retry. Create code và description, edit chỉ description; delete xác nhận và để BE quyết định quyền có đang gán, xử lý `IAM_006` không tự gỡ. Dialog có label, validation, focus, Escape khi an toàn, trạng thái pending và trả focus.
- 403 `AUTH_002` hiển thị không đủ quyền và không giữ nội dung nhạy cảm từ cache; 401 và `AUTH_008` theo auth hiện hữu. Khi logout/đổi session, hủy hoặc bỏ qua response cũ và xóa cache; xử lý permission thay đổi đồng thời bằng refetch, không optimistic update hay kết luận thành công trước response.
- Automated: kiểm request/DTO/envelope, pagination/filter, validation/null/unknown fields, CRUD permission theo scope, 401/403/404/409 phân biệt code, mapping idempotent, invalidation, pending, race đổi session và kết quả mạng không chắc chắn. Browser: desktop/mobile, keyboard/focus, dialogs, loading/error/empty và navigation. Live BE: xác minh owner/non-owner, mapping và delete conflict với tài khoản/dữ liệu test an toàn nếu có; ghi NOT_RUN khi thiếu môi trường. Lint/build/test FE ghi kết quả thực tế, không suy ra từ test BE.
- Design review tập trung self-lockout hoặc thay đổi quyền gây tác động người dùng khác, cập nhật authority, race/session/cache và contract deployment. Chưa xác minh tác động đầy đủ mọi endpoint khi permission thay đổi; không tuyên bố có audit trail hoặc rollback tự động.
