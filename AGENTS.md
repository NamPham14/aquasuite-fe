# Hướng dẫn Agent — AquaSuite Frontend

## Phạm vi và tài liệu

- Repo này là `aquasuite-fe`; BE là repository riêng. Không sửa BE trừ khi người dùng yêu cầu rõ ràng.
- Đọc [bản đồ tài liệu](docs/README.md), [cấu trúc frontend](docs/FRONTEND_PACKAGE_STRUCTURE.md), [Design System & Shared UI](docs/MANAGEMENT_UI_COMPONENTS.md) và [workflow](docs/workflow/feature-delivery.md) theo phạm vi công việc. Đọc spec liên quan nếu có.
- Code hiện tại là bằng chứng về hành vi đang có; spec và contract đã thống nhất là mục tiêu. Kiến trúc trong tài liệu là định hướng, không mặc định mọi thư mục đã tồn tại. Nếu có mâu thuẫn ảnh hưởng nghiệp vụ hoặc contract, ghi nhận và làm rõ trước khi thay đổi phần phụ thuộc.

## Quy tắc frontend

- Tổ chức code theo `app`, `pages`, `layouts`, `features`, `shared` đúng [cấu trúc frontend](docs/FRONTEND_PACKAGE_STRUCTURE.md); không tái cấu trúc toàn dự án ngoài phạm vi yêu cầu. `shared` không phụ thuộc `features`; tránh circular dependency và dùng public exports khi giao tiếp giữa feature.
- **Bắt buộc tuân thủ Design System & Shared UI cho Management Dashboard (`/app/*`)**: dùng semantic tokens trong `src/assets/styles/tokens.css`, shared motion trong `src/assets/styles/motion.css` và các component dùng chung trong `src/shared/ui/` theo [MANAGEMENT_UI_COMPONENTS.md](docs/MANAGEMENT_UI_COMPONENTS.md). Lấy `ProductsPage` và Sidebar sáng (`ManagementLayout.tsx`) làm chuẩn UI/UX. **Không** tạo thêm file CSS phân tán theo trang/feature, **không** duplicate shared component và **không** dựng hệ thống UI song song trong các feature tiếp theo.
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

## Graphify (knowledge graph dùng chung)

Claude Code và Codex dùng chung một graph tại `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`). Thư mục này là artifact local, đã được ignore và không commit.

- **Ưu tiên truy vấn graph** khi tìm kiếm code, phân tích kiến trúc, lập kế hoạch, audit, review và xác định phạm vi ảnh hưởng (impact analysis) của thay đổi:
  - `graphify query "<câu hỏi>"`: ngữ cảnh rộng (BFS), thêm `--dfs` để lần theo một luồng cụ thể.
  - `graphify path "A" "B"`: đường nối ngắn nhất giữa hai thành phần.
  - `graphify explain "X"`: một node và các kết nối của nó.
  - `graphify-out/GRAPH_REPORT.md`: god nodes, communities, các kết nối bất thường và khoảng trống.
- **Luôn xác minh bằng source code thực tế** trước khi kết luận, sửa code hoặc báo finding. Graph chỉ dùng để định hướng. Code và contract BE mới là bằng chứng. Edge `INFERRED`/`AMBIGUOUS` phải được kiểm tra lại. Graph có thể cũ hơn working tree.
- **Không rebuild toàn bộ graph nếu không cần thiết.** Khi source thay đổi, cập nhật incremental bằng `graphify update .`. Lệnh này chỉ trích xuất lại code thay đổi theo AST và không tốn LLM. Thay đổi tài liệu/ảnh thì dùng `/graphify . --update`. Chỉ build lại toàn bộ (`--force`) khi graph hỏng, cấu trúc thư mục đổi lớn hoặc người dùng yêu cầu.
- Nếu chưa có graph, hoặc chỉ cần một tra cứu đơn lẻ, dùng tìm kiếm thường (`rg`) và không tự build graph khi chưa được yêu cầu.
- Không đưa nội dung graph lên dịch vụ ngoài. Graphify bỏ qua các file có tên giống nơi chứa secret. Không tắt cơ chế này để ép đưa file nhạy cảm vào graph.
