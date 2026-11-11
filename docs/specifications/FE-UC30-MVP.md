# UC30 MVP — Thu và bàn giao COD

Route: `/app/cod-collections`, có thể lọc trước bằng `?orderId=<UUID>` từ chi tiết đơn.

## Phạm vi

- SHIPPER khai thu tiền mặt bằng ID delivery thật, số VND nguyên dương, thời điểm thu và ghi chú; không yêu cầu ảnh. Backend xác nhận ownership và điều kiện delivery.
- ACCOUNTANT đối chiếu số khai thu với shipper và chấp nhận/bác (bắt buộc lý do); không tự duyệt hoặc nhận khoản của mình.
- Nhận tiền cho 1..20 khoản trên trang hiện tại, cùng shipper, đã ACCEPTED. Có thể nhận một phần, nhiều lần; tổng tự tính từ từng khoản thực nhận. Backend hỗ trợ tối đa 50 dòng, FE giới hạn theo trang 20 dòng cho MVP.
- SALES_STAFF/SHOP_OWNER chỉ xem; SHIPPER xem khoản của mình theo kiểm soát BE. Chỉ vai trò được phép mới gửi request đọc.
- Chi tiết có lịch sử phiếu/transaction, số dư đơn cho kế toán/bán hàng/chủ shop. Chi tiết đơn liên kết danh sách COD theo orderId.
- Công nợ hỗ trợ COD_REVIEW, hiển thị tiền shipper giữ/khách còn phải trả; tạm khóa thao tác nhắc nợ, cuộc gọi, kiểm tra tín dụng và sao kê trong màn chi tiết khi đang đối soát. Backend tiếp tục thực thi quyền và chặn nghiệp vụ.

## Contract đã đối chiếu

Nguồn read-only: repo `aquasuite-be`, `docs/contracts/uc30-mvp.md`, `docs/specifications/UC-30-cod-mvp.md`, `CodController`, `CodPayload`, `CodRepository` ngày 10/11/2026.

Base `/api/v1/finance/cod`, dùng baseApi hiện có (base URL đã có `/api/v1`). API JSON bọc `ApiResponse<T>`; trang COD dùng `items`, không dùng `content`. Collection chứa version; duyệt/bác và nhận tiền gửi expectedVersion. Trạng thái bàn giao: null, PENDING_REMITTANCE, PARTIAL_REMITTANCE, SETTLED.

POST collections gửi body `application/json` gồm deliveryId, amount, collectedAt, note, idempotencyKey; không gửi file. POST remittances dùng idempotencyKey, shipperId, amount, items, note. Lỗi mạng/5xx/408 khóa chỉnh sửa và đóng dialog; gửi lại nguyên payload/key. Sau lỗi 4xx nhận bàn giao, đóng và tải lại danh sách để chọn lại dữ liệu mới. Giữ tab mở khi chưa rõ kết quả; request retry chỉ lưu trong bộ nhớ, không bền qua reload.

Theo quyết định bỏ ảnh, UC30 không upload, xem, kiểm tra ảnh hoặc gọi endpoint proof. Kế toán vẫn xác nhận/bác khai thu thủ công với expectedVersion; bác bắt buộc lý do.

ACCEPTED chỉ xác nhận khách đã giao shipper, chưa tạo thanh toán. Chỉ tiền thực nhận từ remittance tạo RECEIPT VERIFIED. UI dùng số dư BE, không tự cộng tiền shipper giữ vào đã thanh toán.

## Cấu trúc

- `features/finance/api/codApi.ts`: RTK Query endpoints.
- `features/finance/types/cod.types.ts`: contract.
- `features/finance/lib/cod.ts`: kiểm tra và lập phân bổ.
- `features/finance/components/Cod*`, `OrderCodPanel`: nghiệp vụ UI.
- `pages/management/CodCollectionsPage.tsx`: ghép feature qua public export.
- `app/router.tsx`, `layouts/ManagementLayout.tsx`: route và menu.

Không bổ sung dependency hay sửa BE. Tái sử dụng ManagementPageHeader/FilterBar/Select/Table/Dialog/Form/Field và style hiện có. Có loading/error/retry/empty, phân trang server, labels, dialog focus/Escape, bảng cuộn ngang trên màn nhỏ.

## Giới hạn MVP

Chưa có API liệt kê delivery/shipper nên nhập UUID thật, không tạo dữ liệu giao hàng giả. Không CRUD UC41, xuất PDF, đảo phiếu, phí, tiền thừa hay legacy. Cần delivery DELIVERED có COD hợp lệ để kiểm tra end-to-end với BE.
