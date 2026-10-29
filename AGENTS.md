# Hướng dẫn Agent — AquaSuite Frontend

## Phạm vi và tài liệu

- Repo này là `aquasuite-fe`; BE là repository riêng. Không sửa BE trừ khi người dùng yêu cầu rõ ràng.
- Đọc [bản đồ tài liệu](docs/README.md), [cấu trúc frontend](docs/FRONTEND_PACKAGE_STRUCTURE.md) và [workflow](docs/workflow/feature-delivery.md) theo phạm vi công việc. Đọc spec liên quan nếu có.
- Code hiện tại là bằng chứng về hành vi đang có; spec và contract đã thống nhất là mục tiêu. Kiến trúc trong tài liệu là định hướng, không mặc định mọi thư mục đã tồn tại. Nếu có mâu thuẫn ảnh hưởng nghiệp vụ hoặc contract, ghi nhận và làm rõ trước khi thay đổi phần phụ thuộc.

## Quy tắc frontend

- Tổ chức code theo `app`, `pages`, `layouts`, `features`, `shared` khi phù hợp với công việc; không tái cấu trúc toàn dự án ngoài phạm vi yêu cầu. `shared` không phụ thuộc `features`; tránh circular dependency và dùng public exports khi giao tiếp giữa feature.
- Ưu tiên React, TypeScript, Vite và các thư viện đã có trong `package.json`. Chỉ thêm dependency khi có lý do rõ ràng và trong phạm vi được yêu cầu.
- Kiểm tra contract thực tế của BE và spec liên quan trước khi tích hợp endpoint, dữ liệu, phân trang, lỗi hoặc xác thực; không tự suy đoán contract. Cơ chế refresh token hiện tại là mẫu tạm, chưa phải contract xác thực được xác nhận.
- Route guard và ẩn nút chỉ hỗ trợ trải nghiệm; BE chịu trách nhiệm thực thi phân quyền. Không đưa secret vào mã frontend, biến `VITE_`, tài liệu hay artifact; dữ liệu `VITE_` có thể xuất hiện trong bundle.
- Với UI liên quan, xem xét loading, empty, error, validation, responsive và khả năng sử dụng bằng bàn phím. Không làm thay đổi hành vi ngoài phạm vi.

## Workflow và kiểm tra

- Mỗi work item cần theo dõi dùng một Delivery Brief tại `.agent/work/<WORK_ID>.md` theo [workflow](docs/workflow/feature-delivery.md). Plan, tiến độ và review nằm trong cùng file; không tạo các thư mục workflow khác.
- Quick Command `CODEX_PLAN`, `ANTI_DEV`, `CODEX_REVIEW` là cấu hình global; không sửa hoặc sao chép prompt của chúng vào repo. Áp dụng vai trò và các trạng thái theo workflow dự án.
- Trước thay đổi, kiểm tra `git status` và bảo toàn mọi thay đổi chưa commit. Không tự commit, push hoặc chạy lệnh hủy thay đổi/lịch sử Git khi chưa được yêu cầu rõ.
- Kiểm tra phù hợp với thay đổi: `npm run lint`, `npm run build`, và kiểm tra luồng liên quan khi khả thi. Repo hiện chưa khai báo script test; không báo test đã chạy nếu chưa có. Ghi rõ kết quả, lỗi có sẵn và phần chưa kiểm tra.
- Review ưu tiên tính đúng đắn, contract API, phân quyền, regression, trạng thái UI, accessibility và bằng chứng kiểm tra. Báo finding có vị trí và tác động cụ thể.

## Quản lý tài liệu

- `AGENTS.md` và `docs/` là quy tắc/tài liệu chia sẻ qua Git; `.agent/` là trạng thái local-only và được ignore. Không ghi secret hoặc dữ liệu nhạy cảm vào các file này.
- Không tự sửa hoặc xóa work artifact không liên quan. Chỉ thay đổi phạm vi đã được giao.
