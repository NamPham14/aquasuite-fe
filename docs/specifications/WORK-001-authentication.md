# WORK-001 — Authentication Feature Specification

## Metadata
- **Work ID / Feature**: WORK-001 / Authentication FE
- **Owner / Owning Feature**: FE IAM; Product/Security/IAM owners cần chỉ định.
- **Risk Reasons**: authentication, authorization, xử lý credential/session và phụ thuộc nhiều module.
- **Design Review**: CHANGES_REQUESTED (verdict trước; re-review pending)
- **Related Documents**: `../workflow/feature-delivery.md`; BE `../../../aquasuite-be/docs/specifications/FEATURE-007-authentication-foundation.md` (DRAFT_FOR_REVIEW); `../../../aquasuite-be/docs/specifications/WORK-014-authenticated-user-profile.md` (Design Review APPROVED); BE source được nêu dưới đây. Đường dẫn BE là sibling trên workspace hiện tại, không phải dependency portable.

## 1. Goals and Scope
Owner chọn SIMPLIFY SCOPE — MVP: login BE thực, dashboard mockup chung, logout, F5 thông thường, refresh và protected route. Hoãn xử lý nâng cao duplicate tab, F5 chồng lấn, recovery refresh mất response và kiểm chứng deployment nâng cao. Browser session restore có thể khôi phục login theo ngoại lệ owner chấp nhận.

## 2. Actors and Flows
Login công khai; dashboard yêu cầu authenticated, không hạn chế role và không suy diễn permission. Login thành công đi dashboard; anonymous đi login; không dùng return URL tùy ý. Role rỗng hoặc ngoài sáu role hiển thị đúng response.
Bootstrap refresh rồi lấy `/me` trước khi hiện protected UI. Token invalid hoặc kết quả refresh không chắc chắn: login lại, không retry token cũ. 403 AUTH_002 báo không đủ quyền, không refresh; AUTH_008 báo account không hoạt động, kết thúc local session. Network/503 báo lỗi dịch vụ; refresh đã gửi nhưng chưa xác nhận thì login lại. Không log token hoặc credential.

## 3. UI and Contract
Màn hình login có label, validation, thông báo lỗi, trạng thái submit và điều hướng bằng bàn phím; bootstrap có loading, lỗi kết nối có lựa chọn khôi phục phù hợp; forbidden và expired session có thông báo rõ. Hỗ trợ responsive, focus và thông báo accessible. Đề xuất route login công khai và một dashboard mockup yêu cầu đăng nhập, dùng chung cho sáu canonical roles; không suy diễn permission hay hạn chế role khác khi chưa có chính sách.

| API / Source | Request / Authorization | Success | Errors and FE Handling |
| --- | --- | --- | --- |
| `POST /api/v1/auth/login` | Public; `{email,password}`; email tối đa 320, password tối đa 100, không blank; BE trim email | `ApiResponse.data`: `access_token`, `refresh_token`, `token_type`, `expires_in`, `user` gồm `id`, `username`, `email`, `roles` | 401 `AUTH_003` sai thông tin; 403 `AUTH_008` inactive; validation theo envelope; 503 `AUTH_009`/network hiển thị lỗi dịch vụ, không refresh. |
| `POST /api/v1/auth/refresh` | Public; `{refresh_token}` | `data` có cặp token mới, `token_type`, `expires_in`; strict rotation | 401 `AUTH_004/005/006/007` theo invalid/expired/replay/revoked; 403 `AUTH_008`; 503 `AUTH_009`. Không retry mù sau timeout/lost response; session có thể đã bị consume. |
| `POST /api/v1/auth/logout` | Bearer access hợp lệ; không body | `ApiResponse.data=null`; revoke session hiện tại | 401/403/503 theo nguyên nhân; failure mạng không chứng minh server đã revoke. |
| `GET /api/v1/auth/me` | Bearer access hợp lệ | `data`: `id`, `username`, `email`, `roles` array; `Cache-Control: no-store`; không có permissions | 401 `AUTH_001/007`, 403 `AUTH_008`, 503 `AUTH_009`; không hiển thị profile cũ như dữ liệu hiện hành khi failure. |

Nguồn: BE `src/main/java/com/aquasuite/ims/module/iam/internal/controller/AuthController.java`, `payload/request/LoginRequest.java`, `RefreshRequest.java`, `payload/response/LoginResponse.java`, `TokenResponse.java`, `CurrentUserResponse.java`, `error/AuthErrorCode.java`, `service/impl/AuthServiceImpl.java`; BE specs nêu trong metadata. FEATURE-007 là draft, mô tả rotation single-use, replay có thể revoke phiên và response thất lạc không phục hồi; `/me` được đặc tả riêng sau FEATURE-007. Chưa xác minh môi trường đang chạy, deployment version, CORS hoặc browser transport.

Sáu canonical roles theo BE `src/main/resources/db/migration/V1__create_aquasuite_baseline.sql` và `IamRoleServiceImpl.java`: `SHOP_OWNER`, `SALES_STAFF`, `ACCOUNTANT`, `TECHNICAL_STAFF`, `SHIPPER`, `CUSTOMER`. Đây là role được provision, không chứng minh đã có sáu tài khoản ACTIVE để test. Người dùng có thể có nhiều role hoặc không có role; hiển thị đúng response, không giả lập quyền.

## 4. Current State and Gaps
- FE `src/shared/api/reauthBaseQuery.ts` đọc access/refresh từ localStorage, gửi `{refreshToken}`, đọc token camelCase ở top-level và refresh bất kỳ 401. BE dùng `{refresh_token}` và token snake_case trong `data`; cách hiện tại không khớp và có nguy cơ rotation đồng thời. Không có coordination, xử lý lost response hoặc state logout.
- `src/shared/api/baseApi.ts` dùng RTK Query; `types.ts` có envelope và `apiError.ts` chuẩn hóa lỗi. `package.json` có Redux Toolkit, React Redux và React Router. `src/App.tsx` hiện không có UI, `src/main.tsx` tham chiếu `store` và `Toaster` chưa import/khai báo; chưa thấy store, router, IAM feature hoặc auth pages. Đây là snapshot có thay đổi chưa commit; baseline build chưa được chạy.
- Login trả roles nhưng `/me` mới phản ánh role hiện hành; cả hai không trả permissions. Backend áp quyền hiện hành phía server. Không có cơ sở triển khai permission guard chi tiết từ `/me`; inventory endpoint và policy route cần xác nhận.
- `vite.config.ts` chưa khai báo proxy; base URL mặc định FE là `/api/v1`. Topology, CORS và deployment chưa xác nhận.

## 5. Acceptance Criteria and Verification
| AC | Observable Result | Verification |
| --- | --- | --- |
| AC-00 | Login BE thực, dashboard hiện identity/roles | Dùng tài khoản test có sẵn, ghi role chưa kiểm tra. |
| AC-01 | Validation/loading và lỗi login | Browser test đúng/sai và network. |
| AC-02 | F5 khôi phục khi phiên hợp lệ; browser restore có ngoại lệ | Kiểm tra F5 và browser restore nếu khả thi. |
| AC-03 | Refresh đổi token, không retry token cũ khi kết quả không chắc chắn | Kiểm tra success, response mất, reload sau gửi. |
| AC-04 | Logout không bị async cũ khôi phục state | Trì hoãn refresh và me, logout trước response; thử lỗi revoke và đổi account. |
| AC-05 | Protected route và 403 đúng | Truy cập trực tiếp khi anonymous, 403 không refresh. |
| AC-06 | CORS test, đánh giá XSS, HTTPS production | Ghi evidence contract thực, origin/proxy và kiểm tra log. |

## 6. Owner Decisions and Remaining Dependencies
| Decision | Owner | Required Before | Status and Evidence |
| --- | --- | --- | --- |
| MVP scope | Product | Re-review | SIMPLIFY SCOPE; chấp nhận browser restore có thể giữ login. |
| Storage và XSS | Product / Security | Review / release | Chọn memory/sessionStorage; cần đánh giá XSS, chưa có phê duyệt Security. |
| BE thực, origin và CORS | IAM / deployment | Trước tích hợp phụ thuộc | OPEN; snapshot local không chứng minh version deployment. HTTPS là gate production. |
| Duplicate tab và F5 chồng lấn | Product / Security / FE | Re-review | DEFERRED; không bảo đảm phát hiện bản sao hay ngăn refresh trùng. |
| Response refresh mất | Product / FE | Re-review | DEFERRED recovery; không retry cũ, yêu cầu login lại. |

## 7. MVP Session Design
Single-flight chỉ trong page instance. Refresh không áp dụng cho login/refresh hoặc 403. Trước khi gửi refresh, lấy token vào memory rồi xóa refresh token cũ khỏi sessionStorage; chỉ gửi nếu xóa thành công. Reload hay response mất sau đó yêu cầu login lại. Khi thành công, validate envelope và lưu refresh token mới trước khi cập nhật access token; lỗi lưu yêu cầu login lại. Không tự retry refresh token cũ. Phương án không ngăn page instance khác đã có bản sao.

Logout snapshot access token; trước mọi await, tăng session generation, đánh dấu anonymous, xóa token/profile/cache. Login, refresh và `/me` gắn generation khi bắt đầu; trước ghi storage/state/cache hoặc retry, bỏ kết quả nếu generation đã đổi. Login mới dùng generation mới. Không refresh để logout; nếu thiếu access hợp lệ hoặc logout network/503/timeout, local vẫn đăng xuất và thông báo BE revoke chưa xác nhận.

Duplicate tab và F5 chồng lấn có thể dùng cùng token và dẫn đến revoke. Browser restore có thể giữ sessionStorage và login. Refresh token đọc được bằng JavaScript nếu XSS; tránh token trong log/URL, hạn chế script và đầu vào không tin cậy, đánh giá CSP và dependencies. Security cần đánh giá residual risk.

## 8. Review Status
Disposition trong Delivery Brief là phân loại plan, không phải verdict reviewer. Chưa chạy lint, build hoặc test. CODEX_REVIEW đánh giá lại phạm vi, rủi ro và các điều kiện còn mở.
