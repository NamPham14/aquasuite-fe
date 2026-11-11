# UC36 — Lịch sử và giải phóng hàng giữ

Theo BE `UC-36-approved-release.md` ngày 09/11/2026; thay draft về giữ tạm, hết hạn và Kế toán duyệt.

## Cấu trúc và điểm vào

Panel trong chi tiết đơn `/app/orders/:id` và dialog UC29 `/app/deposits`. API/types/component nằm trong `features/sales`; page dùng public export. Không tạo list, approval, scheduler hoặc luồng tiền mới.

Từ 11/11/2026, hai điểm vào dùng `ReservationWorkspace`: tab Hàng giữ xem số dư hiện tại, tab Lịch sử & giải phóng chứa `ReservationHistoryContent`. Không lặp bảng reservation trong tab lịch sử. Quyết định pending ưu tiên trước, nhật ký mới nhất trước và thu gọn chi tiết. Chế độ Kế toán/đơn đã hủy hoặc hoàn tất vẫn đọc UC36 mà không gọi GET UC29 vốn chỉ nhận đơn/actor hợp lệ. [Thiết kế và kiểm tra](FE-UC29-UC36-UX.md).

## Contract

Base `/api/v1/sales/orders/{orderId}/stock-reservations`, envelope ApiResponse:

- GET `/history`: reservations, activities, decisions; không có tiền.
- POST `/releases/{decisionId}`: không body, trả executor/time và lượng từng dòng. Retry cùng decisionId trả kết quả đã lưu, kể cả lượng giải phóng bằng 0.

FE không nhập lượng/kho, BE tính lượng và kiểm tra quyết định. Mutation invalidates SalesOrder của đơn để tải lại history; UC29 tải lại giữ hàng khi thành công.

## Quyền và trạng thái

SALES_STAFF, SHOP_OWNER, ADMIN, SUPER_ADMIN, ACCOUNTANT đọc. Chỉ SHOP_OWNER thực hiện PENDING_RELEASE, có xác nhận inline; BE thực thi phân quyền. PENDING_APPROVAL, NOT_APPLICABLE, COMPLETED chỉ xem. Có loading/empty/error, khóa request đang chạy, tải lại và thử lại cùng quyết định khi chưa xác định kết quả.

## Giới hạn

BE UC26 chưa có submission/approval đầy đủ, cần quyết định hợp lệ đã lưu để chạy end-to-end. Dòng/biến thể vẫn dùng ID nguyên bản. GET history bổ sung `actorNames` map UUID → tên hiển thị cho người yêu cầu, người duyệt, người thực hiện và người giải phóng; BE ưu tiên họ tên, sau đó tên tài khoản. FE hiển thị “Chưa có tên người dùng” nếu không có tên; không lấy người đăng nhập thay người đã thao tác và không gọi API quản trị tài khoản. Tên là thông tin hiện tại, không phải snapshot lịch sử. Requested/waiting là phạm vi chọn ban đầu; BE chặn phân bổ theo lựa chọn cũ sau hủy/giảm. UC36 không sửa số lượng đơn, tiền hoặc tồn thực.
