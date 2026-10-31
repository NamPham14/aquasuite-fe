# WORK-012 — Màn hình quản lý vai trò và quyền

## Metadata

- **Owning feature**: FE IAM / trang quản lý
- **Risk**: L — thay đổi cấu hình phân quyền và gọi API protected.
- **Design Review**: PENDING.
- **Nguồn khảo sát**: BE `docs/specifications/UC-IAM-MANAGE-ROLES-PERMISSIONS.md`, `IamRoleController`, `IamPermissionController`, request/response DTO và service tương ứng trong sibling `aquasuite-be`. Sibling là nguồn tham khảo tại workspace này, không phải đường dẫn bắt buộc cho mọi máy.

## 1. Mục tiêu và phạm vi

Thay hai trang giữ chỗ bằng màn hình xem vai trò/quyền và quản lý mapping, permission theo implementation BE hiện tại, theo quyết định của owner. Dùng bảng, header và dialog chung hiện có. Không tạo/xóa/sửa role, gán role cho user hoặc sửa BE. Chỉ sửa tối thiểu xử lý `AUTH_008` sau retry trong reauth hiện có như §9; không mở rộng auth MVP.

## 2. Actor và quy tắc

BE source bảo vệ hai controller bằng `hasRole('SHOP_OWNER')`. FE không dùng ẩn nút hoặc route guard như bằng chứng phân quyền; server quyết định từng request. Non-owner phải nhận và nhìn thấy trạng thái không đủ quyền khi server trả 403, không tự suy ra danh sách permission từ `/me`.

- Role: danh sách canonical và chi tiết read-only; cho phép gán/gỡ từng permission theo endpoint, không tạo/xóa/sửa role.
- Permission: tạo code được trim/uppercase, 1–150 ký tự, `^[A-Z][A-Z0-9_]*$`, không bắt đầu `ROLE_`; description tùy chọn tối đa 500 ký tự sau trim, blank thành null. Code duy nhất không phân biệt hoa thường và bất biến. DTO BE không có `displayName`; khi sửa chỉ gửi `description`, không gửi code hay displayName. PATCH thiếu hoặc null description cũng xóa mô tả theo service hiện tại, nên form gửi giá trị có chủ ý. Xóa có xác nhận; 409 `IAM_006` giữ nguyên dữ liệu và giải thích quyền đang được gán.
- Gán/gỡ là idempotent phía BE; mỗi thao tác cần xác nhận như §10. FE vô hiệu hóa thao tác đang pending, không xác nhận thành công trước response, làm mới dữ liệu sau success. Xử lý 404/409 và dữ liệu thay đổi bởi người khác bằng cách hiển thị lỗi và tải lại khi phù hợp.

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
- 403 `AUTH_002` và `AUTH_008` được xử lý theo thiết kế cụ thể §8–9; khi logout/đổi session, bỏ qua response cũ và xóa cache. Không optimistic update hay kết luận thành công trước response.
- Automated: kiểm request/DTO/envelope, pagination/filter, validation/null/unknown fields, CRUD permission theo scope, 401/403/404/409 phân biệt code, mapping idempotent, invalidation, pending, race đổi session và kết quả mạng không chắc chắn. Browser: desktop/mobile, keyboard/focus, dialogs, loading/error/empty và navigation. Live BE: xác minh owner/non-owner, mapping và delete conflict với tài khoản/dữ liệu test an toàn nếu có; ghi NOT_RUN khi thiếu môi trường. Lint/build/test FE ghi kết quả thực tế, không suy ra từ test BE.
- Design review tập trung self-lockout hoặc thay đổi quyền gây tác động người dùng khác, cập nhật authority, race/session/cache và contract deployment. Chưa xác minh tác động đầy đủ mọi endpoint khi permission thay đổi; không tuyên bố có audit trail hoặc rollback tự động.

## 8. IAM Authorization and Cache Isolation

- Hiện tại hai route dùng `AccessPlaceholderPage`, `baseApi` là một RTK Query slice chung, `reauthBaseQuery` chỉ kiểm `sessionGeneration`, và RTK Query có thể giữ data cũ sau lỗi refetch. Không dùng invalidate tag làm cơ chế bảo mật.
- Chọn một `iamAccessApi` RTK Query slice riêng cho toàn bộ query/mutation role/permission, dùng `reauthBaseQuery` được bọc tại feature IAM; đăng ký reducer và middleware riêng trong store. Không reset `baseApi` hay cache feature khác khi chỉ mất quyền IAM. Phạm vi slice gồm list, detail, page, mutation và probe; không đưa dữ liệu nhạy cảm vào state UI dài hạn khác.
- Tạo state IAM access với `epoch` tăng đơn điệu, trạng thái `unknown`, `allowed`, `denied`, `checking`, gắn với `sessionGeneration`. Mọi request IAM chụp cả generation và epoch trước gọi; wrapper so sánh sau mọi response, trước trả kết quả cho RTK Query và trước side effect, kể cả mutation và probe. Nếu không khớp, trả lỗi stale không chứa data; không hiển thị toast success/error cũ.
- Khi request IAM hiện hành trả 403 `AUTH_002`, đồng bộ chuyển `denied`, tăng epoch, đóng dialog, ngừng render mọi data/copy/controls IAM, bỏ subscription và reset **toàn bộ iamAccessApi**, kể cả mutation cache. Chặn query/mutation thường khi denied/checking. Không xóa auth hoặc cache feature khác. Request đồng thời của epoch cũ, gồm lỗi 403, không được đổi trạng thái mới, ghi cache, cập nhật UI hay gây thông báo trùng; hủy request khi khả thi chỉ là bổ sung, epoch là bảo vệ bắt buộc.
- Khi denied, nút “Kiểm tra lại quyền” chạy một probe GET `/iam/roles` trực tiếp qua wrapper chung xác thực, force network và không tái sử dụng cache cũ; chỉ một probe đang chạy, với epoch/generation hiện tại. Trong `checking` dữ liệu và thao tác vẫn ẩn. Chỉ response 200 hợp lệ của probe hiện hành xác nhận `allowed`, tăng epoch và reset slice để mọi trang query mới; 403 vẫn denied, 401/AUTH_008 theo WORK-001, network/5xx giữ denied và cho retry. Probe cũ hoặc response cũ không thể phục hồi quyền. Không dùng `/me` roles hay dữ liệu cache làm bằng chứng khôi phục.
- `clearAuthLocal` và `startSession` phải đồng bộ reset trạng thái IAM sang unknown, tăng epoch và reset slice qua middleware/listener tại store; generation cũ không được ghi hoặc xóa cache phiên mới. Đối chiếu thứ tự dispatch/reset và thử race thực với RTK Query: không dựa vào việc reset tự hủy mạng. Mọi cách truy cập UI kể cả direct URL phải qua cùng gate. Chỉ xác nhận mất quyền khi BE trả `AUTH_002`; trước đó không thể biết việc thu hồi từ xa.

## 9. AUTH_008 on Retry

- BE `AuthErrorCode` và `AccessAuthenticationConverter` xác định `AUTH_008` là tài khoản không hoạt động, HTTP 403. `reauthBaseQuery` hiện xóa refresh storage và dispatch `clearAuthLocal` với response đầu, nhưng sau 401 → refresh thành công → retry chỉ kiểm generation rồi return, bỏ sót AUTH_008.
- Thay đổi tối thiểu: trích một nhánh xử lý 403 dùng chung sau kiểm generation cho response đầu và response retry; khi code `AUTH_008` và generation còn khớp, gọi `tokenStorage.clearRefreshToken()` rồi `clearAuthLocal()` đúng một lần. Listener store theo §8 reset cả `baseApi` và `iamAccessApi` khi clear auth; ProtectedRoute hiện có chuyển `/login`. Dedupe bằng generation: các response cũ trở thành stale và không xóa phiên mới hay phát toast lặp. Không refresh lại 403, không gọi logout/revoke giả định, giữ xử lý thất bại storage/tombstone hiện hữu và báo giới hạn nếu storage không thể xóa.
- `AUTH_002` retry không kết thúc phiên: wrapper IAM xử lý denied theo §8. Response retry thành công giữ hành vi hiện có; stale sau đổi generation bị bỏ trước xử lý auth. Không thêm duplicate-tab, F5 đồng thời hoặc recovery refresh nâng cao.

## 10. Assignment Confirmation

- Mỗi gán/gỡ mở duy nhất một `ManagementDialog`, nêu action, role code/description và permission code/description, cảnh báo thay đổi có thể ảnh hưởng mọi tài khoản mang role đó, kể cả người thao tác. Hủy/Escape không gửi request; xác nhận chỉ gửi một PUT/DELETE cho cặp UUID và khóa submit khi pending. Không đóng hoặc gửi lại khi đang pending; nếu mất quyền đóng dialog và loại kết quả cũ.
- Thành công chỉ sau response hợp lệ cùng epoch/generation, thông báo ngắn và refetch detail/list liên quan; 404/409 hiển thị lỗi và đọc lại khi cần; 403 `AUTH_002` chuyển denied; network/timeout ghi kết quả chưa xác định, không tự retry, đóng/khóa thao tác cho tới khi đọc lại server. Không khẳng định unassign permission làm mất quyền quản trị IAM: controller kiểm role `SHOP_OWNER`.
- BE local `AccessAuthenticationConverter`/`CurrentAuthoritiesService` tải user, active roles và permissions từ DB cho request xác thực tiếp theo; sau transaction commit, request được xử lý theo dữ liệu đọc tại thời điểm đó. Không bảo đảm request đang chạy, môi trường khác, độ trễ commit hay tác động mọi endpoint; kiểm bằng live integration trước khi kết luận deployment.

## 11. Shared Components and Screen Design

- Kiểm source: `ManagementPageHeader`, `ManagementFilterBar`, `ManagementSearch`, `ManagementSelect`, `ManagementTable`/`ManagementTableColumn<T>`, `ManagementDialog`, `ManagementForm`, `ManagementFormField` và `managementFieldClass` chỉ cung cấp cấu trúc; feature tự quản lý API, cột, validation, quyền, filter, page và mọi trạng thái. Không tạo bảng/form/theme hay CRUD library song song. Role list không thêm search/filter không có contract; permission list chỉ dùng search, sort, direction, page/size hỗ trợ.
- UUID làm rowKey ổn định; column key và input ID duy nhất; `labelledBy` trỏ heading thật. Một dialog tại một thời điểm vì title ID cố định. Feature tự đặt `disabled`/`readOnly`, chặn submit lặp cả handler, gắn `aria-invalid` và `aria-describedby` tới error/hint; kiểm modal focus, Escape và trả focus trên browser, kể cả trigger đã biến mất khi 403. Kiểm mô tả dài, cuộn ngang focus được và thao tác mobile.
- `ManagementForm` hiện không hỗ trợ disable submit: đề xuất thêm prop tùy chọn `submitDisabled` mặc định false để vô hiệu hóa nút; trang vẫn chặn handler và khóa input/close khi pending. Giữ tương thích API cũ, cập nhật `docs/MANAGEMENT_UI_COMPONENTS.md`; regression CategoriesPage, BrandsPage và mọi consumer thực tế qua tìm kiếm source, kiểm browser và test. Không mở rộng khác nếu không có bằng chứng bắt buộc.
- UI UX Pro Max: đã tra cứu `accessible data table` (cuộn ngang, accessible name), `form validation errors` (inline + error summary, focus), `confirmation destructive action` (xác nhận và feedback), `dialog keyboard focus` React (focus trap/return); bỏ gợi ý bulk action vì ngoài scope. ANTI_DEV kiểm kết quả phù hợp, áp dụng, ghi query, quyết định và bằng chứng thực tế.
- Taste app screens: inventory công việc gồm xem 6 role và quyền, tìm/tạo/sửa/xóa permission, xác nhận mapping; dữ liệu UUID/code/description/active/mapping, page và trạng thái lỗi. Màn role dùng list/detail, màn permission dùng list/filter/form; giữ shell, token, bảng/form dự án thay vì thay theme. Đã đọc `references/app-screens.md`, draw `smb-admin` seed 349798069 cho hướng Accent ladder; dùng gợi ý phân cấp và mật độ phù hợp, không thay token/behavior của dự án. ANTI_DEV ghi trước/sau, so sánh viewport, app inspector `--app` và critique, fix theo skill khi khả dụng; ưu tiên component và yêu cầu dự án khi xung đột.

## 12. Verification Matrix

| Evidence | Scenario | Expected result |
| --- | --- | --- |
| Automated | Cache IAM đã có data, refetch trả AUTH_002 và query/mutation khác cùng session đang chờ | Data biến mất, dialog đóng, cache IAM reset, auth/cache khác giữ nguyên; response muộn không render/ghi cache/success toast. |
| Automated | Probe phục hồi, đồng thời response epoch cũ; probe 403/network | Chỉ probe 200 hiện hành mở quyền, fresh query; mọi response cũ bị bỏ; lỗi vẫn denied. Test logout/đổi account và probe cũ. |
| Automated | 401 → refresh thành công → retry AUTH_008 | Storage/auth/cache được dọn một lần, guard về login; không refresh vòng lặp; stale AUTH_008 không xóa session mới. |
| Automated | Retry 200 và retry AUTH_002 | 200 giữ hành vi; AUTH_002 chỉ khóa IAM, không logout/refresh tiếp. Regression WORK-001 và single-flight. |
| Automated | Confirm mapping | Hủy không request; đúng role/permission/action, pending chống lặp, success/refetch, 403, 404 và network chưa xác định. |
| Automated | Contract, form, table | Body/query/response, UUID, code, description, phân trang, IAM_005/IAM_006, aria và component regression; `npm test`, `npm run lint`, `npx tsc -b` và `npm run build` ghi kết quả. |
| Browser | Dev và production build | Chạy app, kiểm hai route desktop/mobile, dữ liệu và states, dialog focus/Escape/return, cuộn bảng dài, keyboard, contrast; so sánh before/after theo skill, ghi viewport và môi trường. Dev và build/preview ghi riêng. |
| Integration BE | Revision và authorization | Xác minh revision BE đang chạy so với baseline, dùng tài khoản owner/non-owner và data test an toàn; kiểm 401/403/AUTH_008, CRUD permission trong scope, mapping và hiệu lực request kế tiếp, conflict. Không sửa BE. |

Chưa chạy automated, browser, production build hay live BE cho cập nhật kế hoạch này: NOT_RUN. Nếu browser hoặc môi trường bị chặn, ghi lý do; source review, DOM test hoặc screenshot không thay thế toàn bộ kiểm thử tương tác browser.
