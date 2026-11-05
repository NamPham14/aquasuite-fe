# UC 29 — Đặt cọc & Giữ hàng (FE demo)

## Phạm vi

Theo yêu cầu ngày 04/11/2026: dựng FE bằng dữ liệu demo trước, thay API sau; tuân thủ layout và cấu trúc hiện có. Route `/app/deposits` nằm trong ManagementLayout và ProtectedRoute hiện có. Không thêm dependency, không gọi API UC 29 hoặc sửa BE.

Tham chiếu nghiệp vụ: BE `docs/specifications/UC-29-project-deposit-reservation.md` v0.5 ngày 03/11/2026. API demo BE cũ không được coi là contract production. [Wireframe diagrams.net](FE-UC29-DEMO.drawio) có các trang danh sách desktop, tạo đơn, chi tiết, mobile và trạng thái.

## Luồng

1. Danh sách có tìm mã đơn/tên khách và lọc trạng thái. Hai đơn mẫu minh họa chờ xác minh và thiếu hàng.
2. Tạo yêu cầu: chọn khách demo, kho, sản phẩm, số mua, số giữ, ngày giao dự kiến và ghi chú. Có thể giữ một phần; phải có ít nhất một dòng yêu cầu giữ. Tạo một đơn mới chưa thanh toán, chưa phân bổ tồn; không yêu cầu công trình.
3. Chi tiết hiển thị tổng đơn, giá trị phần yêu cầu giữ, cọc tối thiểu 20%, tiền đã xác minh/chờ xác minh và nợ toàn đơn. Giá mẫu cố định, không cho nhập đơn giá.
4. Ghi khoản cọc tiền mặt hoặc chuyển khoản; chuyển khoản cần mã tham chiếu. Khoản thu mới luôn PENDING. Không thu vượt tổng đơn khi cộng cả tiền VERIFIED và PENDING. Có thể thu nhiều lần/bổ sung.
5. Nút **Mô phỏng xác minh/từ chối** chỉ phục vụ demo FE, không thể hiện quyền kế toán được cấp cho nhân viên bán hàng. Xác minh không tự phân bổ hàng.
6. Đồng bộ chỉ khả dụng khi VERIFIED đạt 20% phần yêu cầu giữ. Tồn demo hữu hạn dùng chung theo SKU/kho; giữ tối đa khả dụng, báo phần thiếu; lặp lại không cộng trùng. Không giảm tồn vật lý, không tự hết hạn theo ngày giao, không cho phép xuất hàng.

## Cấu trúc và thay API

- `pages/management/DepositsPage.tsx`: chỉ compose feature.
- `features/sales/components`: danh sách, form tạo đơn và chi tiết/cọc.
- `features/sales/hooks/useDepositManagement.ts`: trạng thái tải, lỗi và khóa gửi lặp.
- `features/sales/types/deposit.types.ts`: view model và `DepositRepository`, là data port của FE, **không phải contract HTTP đề xuất**.
- `features/sales/api/demoDepositRepository.ts`: repository bộ nhớ riêng cho mỗi lần mount; dữ liệu không lưu storage và mất khi tải lại/rời trang. `list()` trả bản sao để UI không sửa kho dữ liệu trực tiếp.
- `features/sales/lib/deposit.ts`: fixture và tính toán/trình bày demo.
- Dùng ManagementPageHeader, FilterBar, Search, Select, Table, RowActions, Dialog, Form và FormField. Mobile dùng danh sách dọc; bảng dòng hàng trong dialog cuộn ngang có focus.

Khi có API production: xác nhận contract/permission trước, thay repository và ánh xạ response vào view model, lấy tiền/giá/trạng thái từ server thay phép tính demo. Bổ sung idempotency key, version/concurrency theo contract thật; bỏ các nút mô phỏng khỏi luồng nghiệp vụ và nối xác minh qua module finance. Không đưa cọc thật vào fixture hoặc client storage. Không dùng data port để suy ra endpoint mới.

## Giới hạn có chủ đích

Demo hiển thị rõ nhãn dữ liệu mô phỏng. Danh sách nhỏ chưa phân trang; chọn từ 3 SKU/3 khách, 2 kho, giá VND nguyên, một ngày giao dự kiến mỗi đơn. Cả hai kho dùng cùng mức tồn mẫu ban đầu nhưng phân bổ độc lập. Chưa có lịch nhiều đợt, sửa/hủy yêu cầu đã chốt, hoàn tiền, bổ sung tồn hoặc vận hành UC 36. Không áp quyền UC 29 chưa được chốt; chỉ dùng guard đăng nhập sẵn có và dữ liệu giả. Khi tích hợp thật, BE phải thực thi quyền và điều kiện cọc.

Loading, empty theo bộ lọc, lỗi thao tác và validation được xử lý. Repository demo hoạt động ngay nên loading ngắn; lỗi mạng thực tế và recovery sau response mất cần kiểm tra khi nối API.
