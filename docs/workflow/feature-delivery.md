# AquaSuite Frontend — Lean Feature Delivery

Workflow này theo mô hình BE: một Delivery Brief cho mỗi work item được theo dõi; không tạo plan, handoff hoặc review artifact riêng. Các Quick Command là global và giữ nguyên cấu hình của chúng.

## Phân loại công việc

| Risk | Ví dụ FE | Mức chuẩn bị |
| --- | --- | --- |
| S | Sửa UI hoặc lỗi nhỏ, tài liệu, refactor nội bộ không đổi hành vi | Brief ngắn với goal, AC, scope và verification; triển khai khi đủ rõ. |
| M | CRUD hoặc màn hình có tích hợp API, thay đổi nghiệp vụ giới hạn | Brief đầy đủ; thống nhất scope và AC với owner khi chưa được yêu cầu xác định rõ. |
| L | Authentication/authorization, thanh toán, tồn kho, dữ liệu nhạy cảm hoặc thay đổi contract/tác động xuyên feature | Feature spec khi cần, design review tập trung rủi ro và quyết định trước triển khai. |

Phân loại theo tác động và mức không chắc chắn, không theo số file. Chỉ dừng phần phụ thuộc khi thiếu quyết định quan trọng; tiếp tục phần độc lập nếu có thể. Với việc rất nhỏ không cần bàn giao hoặc theo dõi, có thể làm trực tiếp nếu yêu cầu cho phép.

## Một nguồn trạng thái

Mỗi work item được theo dõi dùng `.agent/work/<WORK_ID>.md`. Các trạng thái tương thích BE: `DRAFT`, `DESIGN_REVIEW`, `READY`, `IN_PROGRESS`, `REVIEW`, `CHANGES_REQUESTED`, `BLOCKED`, `DONE`, `CANCELLED`. `CANCELLED` chỉ dùng khi người dùng hủy. Không tạo thêm thư mục workflow; bảo toàn artifact đã có.

```markdown
# <WORK_ID> — <Title>

STATUS: DRAFT
RISK: S | M | L
OWNER_MODULE: <feature hoặc khu vực>
SPEC: <path | NOT_REQUIRED>
DESIGN_REVIEW: NOT_REQUIRED | PENDING | APPROVED | CHANGES_REQUESTED

## Goal
## Acceptance Criteria
- [ ] ...
## Scope
### In
### Out
## Decisions and Constraints
## Contract / Schema Impact
## Implementation Notes
## Verification
- [ ] Lint/build hoặc lý do chưa chạy
- [ ] Test và kiểm tra UI/API phù hợp hoặc lý do chưa chạy
## Review Findings
## Completion
- Files/components changed:
- Known limitations:
```

`CODEX_PLAN` phân tích và ghi kế hoạch trong brief; `ANTI_DEV` triển khai và cập nhật tiến độ; `CODEX_REVIEW` đánh giá thay đổi và ghi finding trong cùng brief. Đây là cách dùng trong dự án, không thay đổi nội dung các Quick Command global. Risk L dùng `DESIGN_REVIEW: PENDING`/`STATUS: DESIGN_REVIEW`, sau review đạt chuyển `APPROVED`/`READY`; nếu cần sửa dùng `CHANGES_REQUESTED`. Risk S/M dùng `NOT_REQUIRED`.

## Triển khai, review và hoàn thành

1. Kiểm tra yêu cầu, mã hiện tại và contract BE; xác định AC, phạm vi, trạng thái UI và cách kiểm chứng.
2. Triển khai từng phần trong phạm vi, kiểm tra hành vi liên quan và cập nhật brief. Không tự ý thay đổi contract hoặc mở rộng refactor.
3. Khi sẵn sàng, chuyển `REVIEW`. Review AC, contract, bảo mật/phân quyền, UI, accessibility, regression và kết quả kiểm tra. Ghi finding cụ thể; nếu cần sửa, chuyển `CHANGES_REQUESTED`, sửa và review lại.
4. Chuyển `DONE` khi AC đạt, kiểm tra phù hợp đã có bằng chứng và không còn finding bắt buộc. Ghi rõ kiểm tra chưa chạy, giới hạn hoặc blocker; không tuyên bố pass khi chưa kiểm tra.

Các lệnh hiện có: `npm run lint`, `npm run build`. Repo chưa khai báo test script; nếu cần kiểm thử tự động, xác định cách bổ sung trong phạm vi công việc. Kiểm tra UI thủ công hoặc browser khi phù hợp. Không giả định CI hay test suite đã tồn tại.

`.agent/` được ignore và không chia sẻ qua Git. Không lưu secret; không sửa artifact của công việc khác. Quy tắc Git và ranh giới repo trong `AGENTS.md` luôn áp dụng.
