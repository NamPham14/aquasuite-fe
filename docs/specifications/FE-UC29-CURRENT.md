# UC-29 — Wireframe theo FE hiện tại

[File draw.io chỉnh sửa được](FE-UC29-CURRENT.drawio), đối chiếu mã nguồn ngày 08/11/2026: `DepositManagement.tsx`, `ReservationDetails.tsx`, `ManagementTable.tsx`, `ManagementDialog.tsx` và `ManagementLayout.tsx`.

Theo hai ảnh FE người dùng cung cấp, bản vẽ gồm đúng 2 trang:

1. Danh sách Cọc và Giữ hàng: chỉ các đơn thuộc danh sách nghiệp vụ này, tìm kiếm, số liệu cọc, phân trang và nút Xem cọc & giữ hàng.
2. Popup thông tin: mở trên nền danh sách được làm tối, gồm tổng hợp tiền, trạng thái, kho, bảng hàng, khoản thu và nút đến thanh toán đơn hàng. Đóng popup quay lại danh sách.

Các nút Xem trong draw.io có liên kết sang trang popup; nút × liên kết trở lại danh sách. Dữ liệu minh họa theo ảnh, tên khách và mã giao dịch được thay bằng nhãn mẫu. Các thành phần đều là hình và chữ chỉnh sửa được, không phải ảnh chụp nhúng. Danh sách vẫn gồm đơn chưa đủ cọc như ảnh; không bổ sung điều kiện chỉ hiện đơn đã đủ cọc.

## Screen fields

| Field Name | Description |
| --- | --- |
| Tìm đơn hàng | Nhập mã đơn hoặc số điện thoại khách, bấm **Tìm kiếm**. Tìm mới trở về trang đầu. |
| Tải lại | Tải lại danh sách; bị khóa khi đang tải. |
| Về bảng điều khiển | Có trong header chung; điều hướng đến `/app/dashboard`. |
| Danh sách đơn | Các cột: Mã đơn, Khách hàng, Tổng đơn, Cọc thỏa thuận, Đã xác minh, Chờ xác minh, Thiếu cọc, Trạng thái cọc, Trạng thái đơn, Thao tác. |
| Thiếu cọc | `max(depositRequired - verifiedPaid, 0)`. Khoản chờ xác minh chưa làm giảm số thiếu. |
| Xem cọc & giữ hàng | Mở dialog của đơn có sẵn; không tạo đơn tại UC-29. |
| Phân trang | Trang hiện tại, tổng trang và tổng đơn; nút Trước/Sau bị khóa tại biên hoặc khi tải. |
| Tải lại từ máy chủ | Tải lại đơn, giữ hàng và khoản thu trong dialog. |
| Khách hàng / trạng thái đơn | Chỉ đọc từ đơn đã chọn. |
| Tổng hợp tiền | Sáu ô: Tổng đơn, Giá trị yêu cầu giữ, Cọc thỏa thuận, Đã xác minh, Chờ xác minh, Còn phải thu toàn đơn. Đọc từ response; không tự tính 20% phần hàng chọn. |
| Thông báo đủ cọc | Hiển thị đủ cọc, chưa có mức cọc hoặc còn thiếu tiền. Tiền PENDING chưa tính đã thu hoặc trừ số còn phải thu. |
| Giữ hàng / Cọc / Phân bổ / Lỗi | Hiển thị trực tiếp các chuỗi trạng thái và mã lỗi server trả về. |
| Mã kho giữ hàng | Khi chưa có kho từ server, ô mặc định trống. Chữ in hoa, số, gạch ngang/gạch dưới; tối đa 50 ký tự. Khóa kho khi đã có mã kho và phạm vi đã chốt. |
| Phần hàng yêu cầu giữ | Các cột: Sản phẩm (tên, biến thể, SKU), Mua, Yêu cầu giữ, Đang giữ, Chờ bổ sung. FE hiện chưa hiển thị trạng thái riêng mỗi dòng. |
| Yêu cầu giữ | Trước khi chốt: nhập số lượng trên dòng đơn có sẵn, mặc định 0; ít nhất một dòng dương, tối đa số mua và 2 chữ số thập phân. Sau chốt: chỉ đọc. |
| Chốt yêu cầu giữ hàng | Hiện khi chưa có yêu cầu giữ. Đơn cần CONFIRMED/PROCESSING và mọi dòng có variantId. |
| Đồng bộ bổ sung hàng giữ | Hiện khi đã chốt; khóa nếu chưa đủ cọc. Giữ nguyên kho/phạm vi đã chốt. |
| Thử lại tác vụ phân bổ | Chỉ hiện khi allocationStatus = FAILED và có allocationId. Chạy lại đúng tác vụ; không thu hoặc xác minh cọc lần nữa. |
| Gửi lại yêu cầu giữ hàng | Khi chưa xác định kết quả, giữ nguyên request và mã chống trùng. Khóa sửa, đóng dialog và điều hướng thanh toán cho đến khi có kết quả xác định. |
| Khoản thu của đơn | Chỉ đọc: số tiền, mã giao dịch, phương thức, trạng thái; tham chiếu/lý do từ chối nếu có. Có loading, error và empty riêng. |
| Đến thanh toán đơn hàng | Mở `/app/orders/{orderId}`. Màn UC-29 hiện không có form ghi nhận cọc hoặc nút xác minh. |

## Kiểm tra và giới hạn

Đã đối chiếu nhãn, thứ tự khối, các cột và điều kiện nút với mã hiện tại; kiểm tra XML, khung trang và chữ trên các bản dựng PNG. Đây là wireframe từ mã nguồn, chưa phải ảnh chụp phiên ứng dụng với dữ liệu BE thật. Không thay đổi FE/BE hoặc Google Docs trong lần vẽ này.

Lần chỉnh cuối dùng hai ảnh FE làm tham chiếu trực tiếp về phạm vi màn và cách mở popup. Các trạng thái khác trong bảng Screen fields mô tả khả năng của code hiện tại, không được tách thành màn riêng trong bản vẽ hai trang.
