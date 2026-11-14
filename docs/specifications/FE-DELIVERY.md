# Giao hàng — Frontend

Phạm vi gồm UC39 tạo nháp/xác nhận xuất kho và luồng giao hàng WORK-025.
Nguồn đối chiếu: BE `docs/contracts/WORK-025-simple-delivery-api.md`,
`docs/specifications/WORK-025-simple-delivery.md` và `DeliveryView.java`.
Đường dẫn checkout BE là tham chiếu, không phải dependency build.

## Màn hình

| Route | Vai trò | Hành vi |
| --- | --- | --- |
| `/app/deliveries` | ACCOUNTANT, SHOP_OWNER | Lọc trạng thái, shipper, ngày hẹn; phân trang; chọn nhiều phiếu trong trang để phân công/đổi shipper |
| `/app/my-deliveries` | SHIPPER | Danh sách của người đăng nhập, lọc trạng thái/ngày; dạng bảng trên desktop và danh sách trên điện thoại |
| `/app/deliveries/:id` | ACCOUNTANT, SHOP_OWNER hoặc SHIPPER được gán | Người nhận, hàng, COD, shipper, ghi chú, trạng thái và ảnh; DRAFT có xác nhận xuất/hủy nháp |

Chi tiết đơn hiện có thêm tab **Giao hàng** cho ACCOUNTANT/SHOP_OWNER, dùng danh sách
lọc theo orderId và dẫn đến chi tiết từng đợt. Không gọi endpoint quản lý cho vai trò khác.

## Tạo nháp và xác nhận xuất kho (UC39)

Đối chiếu trực tiếp BE `DeliveryIssueController`, `DeliveryIssueRequest`,
`DeliveryIssueService`, `DeliveryController` và contract `uc39-order-delivery-api.md`.
Trong tab Giao hàng, bấm **Tạo đợt giao** để mở popup. Popup đọc
`GET /fulfillment/sales-invoices/{invoiceId}/delivery-candidates`: mã đơn, địa chỉ,
eligible, salesInvoiceId/invoiceCode và các dòng với orderedQty/issuedQty/remainingQty/heldQty/availableQty.
Không dùng tồn khả dụng thay số còn được xuất hoặc cộng hàng giữ hai lần.

- Chỉ ACCOUNTANT/SHOP_OWNER. Đơn phải PROCESSING, không có thay đổi chưa giải quyết
  hoặc legacy chưa đối chiếu; eligible chỉ mang tính tham khảo, BE kiểm tra lại khi ghi.
- Kho cố định WH_MAIN; người nhận <=255 ký tự, điện thoại <=32, địa chỉ <=2000;
  ngày giờ hẹn giao không bắt buộc, nhập theo giờ Việt Nam và gửi offset +07:00.
- Chọn 1–100 dòng không trùng, số lượng từ 0.01, tối đa 10 chữ số nguyên/2 thập phân,
  không vượt remainingQty. Nhập 0 để không chọn dòng. Hàng serial chưa được BE hỗ trợ.
- COD là số nguyên VND 0..9999999999999, ghi chú <=1000 ký tự. Không chặn theo cọc/PAID.
  BE kiểm tra khả năng thu COD khi confirm, không phải khi tạo nháp.
- POST `/fulfillment/sales-invoices/{invoiceId}/deliveries` tạo UUID một lần mỗi form;
  khi lỗi mạng/5xx/408, giữ nguyên UUID và payload, khóa sửa/đóng, cho gửi lại chính request.
  Snapshot chỉ ở bộ nhớ, giữ tab mở khi chưa rõ kết quả; không lưu thông tin người nhận vào localStorage.
- Tạo nháp chưa trừ/giữ thêm tồn. Thành công điều hướng sang chi tiết Delivery.
- Tên/SĐT người nhận điền ban đầu từ customerName/customerPhone của GET sales/orders/{orderId};
  địa chỉ ưu tiên candidates.deliveryAddress (BE lấy từ cùng Order), thiếu thì order.deliveryAddress.
  Invoice hiện không có recipient snapshot riêng. Kế toán được sửa các trường cho từng Delivery;
  refetch nguồn không ghi đè dữ liệu đang nhập, không ghi ngược vào Order/Invoice.
  Thiếu dữ liệu hoặc lỗi tải Order thì cho nhập tay; không dùng tên khách vãng lai/phone giả làm recipient.
- DRAFT có popup **Xác nhận xuất kho** và **Hủy nháp**, gọi POST
  `/deliveries/{id}/confirm-issue` hoặc `/cancel-draft` không body.
  Confirm giải thích tác động trừ tồn và tiêu thụ reservation; BE xử lý transaction.
  Hủy chỉ áp dụng nháp, không tác động tồn. Không tự giả lập đổi trạng thái.
- Confirm tải lại Delivery, Inventory và SalesOrder/reservation cache. Không ghi tiền,
  không hoàn tất đơn và không tự phân công. DISPATCHED mới có phân công.
- BE mới, V36 và reconciliation migration liên quan phải được triển khai trước khi chạy thật.
  FE không tự restart BE hoặc áp dụng migration lên DB.

### Invoice source — 13/11/2026

Mỗi Delivery có một hóa đơn nguồn. Chọn đơn bằng ngữ cảnh chi tiết đơn, sau đó chọn
hóa đơn trước khi tải candidates; không dùng `storeInvoiceId` hoặc order compatibility API
để tự chọn hóa đơn. `remainingQty` từ BE là lượng còn giao được theo cả hóa đơn và đơn;
`orderedQty`/`issuedQty` vẫn là số của đơn, không tự suy diễn thành tổng hóa đơn.
FE kiểm tra candidates.orderId và salesInvoiceId trùng ngữ cảnh đã chọn, đổi invoice
sẽ tạo form mới. Trong lúc retry kết quả chưa rõ, khóa bộ chọn hóa đơn và giữ nguyên URL/payload/UUID.

FE lấy danh sách trực tiếp qua `GET /fulfillment/orders/{orderId}/delivery-invoices`
cho ACCOUNTANT/SHOP_OWNER. Response là ApiResponse chứa mảng InvoiceSummary, không phân trang;
mỗi phần tử gồm invoiceId/invoiceCode/orderId/type/status. Chỉ dùng ISSUED thuộc đúng order.
Popup có loading/error/retry/empty; không tự chọn khi chỉ có một hóa đơn.
Không cần truyền options từ OrderDetailPage. Chưa có ISSUED thì không tạo được Delivery;
người phụ trách Order thực hiện phát hành hóa đơn, FE giao hàng không tự đổi trạng thái invoice.

Detail hiển thị salesInvoiceId từ Delivery Summary. BE chưa trả invoiceCode trong detail,
nên ghi rõ ID hóa đơn, không tự tạo mã/link. Phiếu legacy null hiện “Chưa có thông tin hóa đơn nguồn”.
BE invoice source cần V37; FE không áp migration hoặc restart. Confirm/cancel và phân công giữ nguyên.

Các thao tác phụ dùng ManagementDialog: phân công, thu hồi, nhận hàng,
hoàn thành có ảnh và thất bại có lý do. Ảnh bằng chứng mở trong trình xem ảnh.
FE hỗ trợ điều hướng bàn phím, focus modal, loading, empty, error và retry.
Chi tiết có timeline dọc “Theo dõi tiến độ” với giờ xuất kho, phân công gần nhất,
nhận hàng và giao thành công; mốc hiện tại theo trạng thái phiếu. Thiếu timestamp thì
hiện chưa ghi nhận, không dùng updatedAt để suy ra giờ tạo/thất bại. Đây là các mốc hiện có,
chưa phải lịch sử bất biến của mọi lần đổi shipper hoặc giao lại.
BE thực thi quyền trên từng bản ghi và kiểm tra trạng thái khi ghi.

## Contract và giới hạn

- API dùng baseApi có bearer/refresh hiện có. Không thay đổi contract xác thực.
- Danh sách dùng Spring Page `content`, page bắt đầu từ 0, size 20.
  Bộ lọc ngày áp dụng theo ngày hẹn giao (múi giờ Việt Nam), không phải ngày tạo phiếu.
- Phân công gửi một request cho toàn bộ lựa chọn; chỉ cho chọn DISPATCHED/ASSIGNED,
  chưa startedAt. BE kiểm tra xác nhận xuất kho, shipper ACTIVE và xử lý atomic.
- Popup phân công đọc `GET /iam/users/shippers?keyword=&page=0&size=20`
  cho ACCOUNTANT/SHOP_OWNER. Server chỉ trả shipper ACTIVE; response AccountPageResponse
  gồm content/page/size/totalElements/totalPages. FE tìm kiếm (keyword tối đa 100),
  phân trang và chọn bằng username/phone/email; giữ lựa chọn qua trang và gửi id đã chọn.
  Có loading/error/retry/empty, khóa khi gửi; BE vẫn kiểm tra lại trạng thái khi phân công.
  Không gọi API user-list quản trị hoặc tạo danh sách giả. Bộ lọc danh sách giao hàng
  vẫn hỗ trợ nhập shipper UUID, độc lập với popup chọn phân công.
- Summary chỉ có orderId và shipperId; không có orderCode hay shipperName.
  Danh sách ghi rõ ID; không giả mã đơn hoặc join API Sales mà shipper không được đọc.
  Chi tiết có tên/điện thoại shipper từ DTO Detail.
- Nhận hàng: ASSIGNED → IN_TRANSIT. Chỉ đúng shipper mới có thao tác.
- Hoàn thành: multipart `photos`, 1–5 ảnh, tối đa 5 MiB/ảnh.
  FE giới hạn tổng ảnh 6,5 MiB để chừa multipart overhead trong giới hạn request 7MB của BE.
  Chọn/chụp, xem trước và bỏ ảnh được thực hiện tại máy; không lưu ảnh vào localStorage.
  WebP có thể bị BE từ chối nếu thiếu decoder.
- Storage thật chưa được nối. FE gửi endpoint thật và giữ form khi có lỗi FUL_004;
  không giả trạng thái DELIVERED. Không có kế toán duyệt bằng chứng.
- Thất bại: reason đã trim, bắt buộc 1–1000 ký tự; BE nối vào note hiện có.
  Không tự hoàn kho hoặc tạo lần giao lại.
- Ảnh đã lưu được đọc qua endpoint có xác thực theo deliveryId/photoId;
  không dùng contentUrl như ảnh công khai. Blob URL được thu hồi khi không dùng.
- Không sửa paymentStatus, không ghi nhận thu tiền COD và không suy ra toàn đơn đã giao xong.

## Kiểm tra

`tests/delivery.test.ts` kiểm tra endpoint danh sách của shipper, bearer,
phân công atomic, body thất bại, multipart, lỗi storage và ma trận quyền/trạng thái UI.
`tests/deliveryIssue.test.ts` và `tests/deliveryIssueUi.test.ts` kiểm tra candidates,
validation số lượng, create/retry cùng UUID/payload, xác nhận/hủy không body,
quyền owner/accountant và khóa form khi kết quả chưa rõ.
Nghiệm thu end-to-end cần BE mới, V36, dữ liệu tồn/reservation hợp lệ và storage thật cho bước hoàn thành.

## Cập nhật 14/11/2026 — hoàn thiện giao hàng

- Chọn hóa đơn ISSUED theo order rồi tạo phiếu giao; không tạo/phát hành hóa đơn trong Delivery.
- Chi tiết hiển thị tiến độ từ confirmedAt/dispatchDate, assignedAt, startedAt và deliveredAt.
- Form giao thất bại có lý do gợi ý, gồm khách từ chối nhận và từ chối do hàng hỏng; vẫn cho nhập nội dung chi tiết.
- Phiếu FAILED hiển thị hướng dẫn bàn giao về kho kiểm tra, nhập lại hàng tốt/cách ly hàng hỏng thuộc UC37.
  Không có nút hủy qua UC26, nhập kho hay hoàn tiền trong màn giao hàng. Hoàn tiền thuộc UC64.
- Giao thành công kèm COD nhắc khai báo và bàn giao tiền riêng, không coi việc giao xong là đã thanh toán.
- Nút gửi chặn nhấn lặp trong lúc request đang xử lý. Không đổi state machine hay tự mở lại FAILED.
- Kiểm tra trình duyệt dùng component thật với fixture local-only, không ghi DB ứng dụng;
  kiểm tra nghiệp vụ xuyên luồng dùng PostgreSQL tạm phía backend.

## Chờ giao lại — quyết định bổ sung 14/11/2026

- Trở ngại tạm thời dùng RESCHEDULED/Chờ giao lại; ngày mới không bắt buộc khi chưa liên hệ/chốt được.
- Shipper nhập lý do, có thể chốt lịch sau nếu lịch còn trống, rồi tiếp tục giao trên cùng phiếu.
- Kế toán/owner có thể đổi shipper của phiếu RESCHEDULED kể cả đã nhận hàng lần đầu;
  giữ nguyên trạng thái, hàng đã xuất, COD và thời điểm nhận hàng đầu tiên. Bàn giao thực tế do nhân viên phối hợp.
- Danh sách có bộ lọc mới. Chi tiết có Tiếp tục giao hàng, Chốt lịch giao lại khi chưa có ngày,
  và đổi shipper cho kế toán. Không tạo Delivery mới hoặc trừ tồn thêm khi giao lại.
- Form FAILED chỉ dành cho khách xác nhận hủy/không nhận, bắt buộc checkbox xác nhận;
  gửi customerCancellationConfirmed=true. Các lý do tạm thời không còn nằm trong gợi ý kết thúc giao.
- Ghi nhận FAILED không tự hủy Sales order, nhập hàng hoặc hoàn tiền. Những bước đó thuộc các UC riêng.
