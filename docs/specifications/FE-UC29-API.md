# UC29 — Đặt cọc & Giữ hàng qua API thật

Route `/app/deposits` sử dụng API thật qua RTK Query và hạ tầng xác thực hiện có. Không dùng repository, SKU, khách hàng hoặc tồn kho demo. Không sửa BE.

## Contract đã đối chiếu

Nguồn BE: `docs/contracts/uc29-basic.md`, `OrderStockReservationController`, `SalesOrderController`, `OrderPaymentController`, `OrderReceivableApiImpl` và các request/response DTO tương ứng.

- `GET /sales/orders?depositReservationOnly=true&keyword=...&page=0&size=20`: Spring Page với `content`, `totalPages`, `totalElements`. BE lọc đơn CONFIRMED/PROCESSING có `payment.depositRequired > 0` trước phân trang, kể cả đơn lịch sử chưa lưu cờ/selection giữ hàng. Không lọc trạng thái cọc ở client. Mỗi dòng có `payment` và `depositStatus`: AWAITING_DEPOSIT (Chưa đủ cọc), SATISFIED (Đủ cọc). Hiển thị mức cọc, verifiedPaid, pendingAmount và thiếu cọc `max(depositRequired - verifiedPaid, 0)`; không trừ tiền PENDING vào thiếu cọc.
- `GET /sales/orders/{id}`: khách hàng, dòng đơn và số lượng mua.
- `GET /sales/orders/{id}/stock-reservations`: nguồn chính cho payment, yêu cầu đã chốt, số giữ/chờ và trạng thái tác vụ.
- `POST .../stock-reservations/requests`: chốt kho và dòng/số lượng trên đơn có sẵn; không tạo đơn, giá hoặc mức cọc.
- `POST .../stock-reservations/synchronize`: cùng kho/phạm vi đã chốt, requestId mới để bổ sung hàng; chỉ mở khi `payment.depositSatisfied`.
- `POST .../stock-reservations/allocations/{allocationId}/retry`: thử lại đúng tác vụ lỗi, không tạo thu tiền mới.
- `GET/POST /finance/orders/{id}/payments`: lịch sử và ghi khoản thu. POST gồm `idempotencyKey`, `amount`, `paymentMethod`, `referenceNo`. CASH được BE xác minh ngay, BANK_TRANSFER là PENDING; xác minh/từ chối thuộc UC70, không có nút mô phỏng trong UC29.

Các đường dẫn trên được nối với base URL `/api/v1` hoặc cấu hình Vite hiện có.

Bộ lọc `depositReservationOnly` theo contract BE cập nhật ngày 08/11/2026. Cần triển khai BE tương ứng và chạy migration V22 trên database ứng dụng; FE không thực hiện migration hoặc restart BE.

## Tiền và giữ hàng

Khi chuyển báo giá có `depositPercent > 0`, BE tự bật `reserveStockAfterDeposit` và đăng ký toàn bộ dòng đơn tại `WH_MAIN`. FE giữ request chuyển đơn hiện có, không yêu cầu nhập lại dòng/kho cho trường hợp này. Chỉ phân bổ sau khi Finance xác nhận đủ cọc. Đơn lịch sử xuất hiện trong danh sách không đồng nghĩa đã có selection; GET stock-reservations quyết định phần giao diện chốt thủ công hay đồng bộ.

Đọc trực tiếp `payment.depositRequired`, `verifiedPaid`, `pendingAmount`, `remaining`, `totalAmount`, `depositSatisfied`. Không tự cộng receipt hoặc tính 20% phần chọn. Số thiếu cọc chỉ phục vụ hiển thị: `max(depositRequired - verifiedPaid, 0)`. `remaining` chưa trừ PENDING; giới hạn khoản thu theo `remaining` như Finance hiện tại, BE kiểm tra cuối cùng.

Đơn CONFIRMED/PROCESSING và các dòng có variantId mới đủ điều kiện giữ theo service hiện tại. BE thực thi quyền owner/admin hoặc nhân viên phụ trách đơn; nút ghi khoản thu chỉ dành SALES_STAFF/SHOP_OWNER. BE tự phân bổ sau xác minh đủ cọc. FE tải lại để xem kết quả mới, hiển thị lỗi phân bổ và cho retry. HELD/đủ cọc không phải quyền xuất kho.

Kho nhập bằng mã kho thật, không tự chọn kho demo. Khi chốt, phạm vi/kho bị khóa theo response; không mở sửa/hủy/hoàn cọc ngoài contract. Kho legacy không đối chiếu được có thể trả INV_RES_005; hiển thị lỗi máy chủ, không sửa tồn để bỏ qua.

## Retry và giới hạn

Lỗi mạng/5xx giữ nguyên payload và key trong bộ nhớ; khóa sửa nội dung và đóng dialog, cho gửi lại cùng yêu cầu. Sau kết quả xác định mới mở thao tác khác. Không lưu dữ liệu tiền vào local/session storage. Không tự retry khoản thu bằng key mới. Tải lại toàn bộ trang sẽ mất pending key; người dùng được nhắc không tải lại khi chưa xác định kết quả.

Loading, empty, lỗi HTTP/quyền, phân trang, validation số lượng/tiền, bảng cuộn ngang và dialog bàn phím dùng component chung hiện có. Chưa tích hợp upload chứng từ hoặc màn kế toán UC70. Spec và wireframe demo cũ chỉ là tài liệu lịch sử, không mô tả luồng API hiện tại.


## Cập nhật: bỏ ghi nhận khoản thu trong Cọc và giữ hàng

Theo yêu cầu người dùng, màn hình này chỉ đọc tổng hợp và lịch sử khoản thu; bỏ form nhập tiền, mutation ghi thu và kiểu request riêng. Dùng nút “Đến thanh toán đơn hàng” mở `/app/orders/{orderId}`. Nút điều hướng bị khóa khi yêu cầu giữ hàng đang xử lý hoặc chưa rõ kết quả để bảo toàn mã chống trùng. Nội dung này thay thế hướng dẫn nhập khoản thu tại đây ở các mục trước.

Backend không có endpoint ghi thu riêng dưới stock-reservations. Giữ API Finance chung dùng tại đơn hàng và sự kiện xác minh tiền để tự giữ hàng; không xóa khoản thu đã lưu.
