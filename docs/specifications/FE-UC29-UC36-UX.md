# Thiết kế đề xuất — Cọc, hàng giữ và lịch sử giải phóng

STATUS: IMPLEMENTED — người dùng chốt thiết kế ngày 11/11/2026; đã triển khai FE, chưa triển khai môi trường/kiểm tra BE thật.
Ngày: 11/11/2026. Phạm vi: dialog tại `/app/deposits` và phần hàng giữ trong `/app/orders/:id`.

## 1. Kết luận

Giữ chung ngữ cảnh một đơn hàng, chia thành hai tab **Hàng giữ** và **Lịch sử & giải phóng**. Tab Hàng giữ mở mặc định. Không cần chia hai route riêng hoặc trình bày tên UC trong giao diện nghiệp vụ.

Màn phải trả lời được bốn câu hỏi: đơn đã đủ cọc chưa; sản phẩm nào còn đang giữ; có quyết định cần giải phóng không; ai đã thực hiện thay đổi gì.

## 2. Vấn đề hiện tại

Đánh giá baseline trước khi triển khai từ code `ReservationDetails`, `ReservationHistoryPanel`, `OrderDetailPage` và contract UC29/36. Tại lúc phân tích chưa có kiểm chứng screenshot, screen reader hoặc kiểm thử người dùng. Skill design-review trong máy thiếu các tài liệu rubric/checklist tham chiếu; bảng dưới là đánh giá sơ bộ baseline từ code, không phải chứng nhận WCAG hay điểm của giao diện đã triển khai.

| Chiều đánh giá | Trọng số | Điểm sơ bộ /10 | Nhận xét |
| --- | ---: | ---: | --- |
| Phân cấp thông tin | 20% | 4 | Nhiều nhóm tiền, trạng thái, bảng hàng và lịch sử có độ nổi tương đương |
| Nhất quán | 20% | 6 | Đã dùng UI chung; vẫn trộn mã trạng thái BE và ngôn ngữ nghiệp vụ |
| Khả năng tiếp cận | 20% | 6 | Có labels, dialog, bảng semantic; độ dài nội dung làm tăng công tìm kiếm; chưa audit thực tế |
| Khả năng sử dụng | 20% | 4 | Trạng thái hiện tại lẫn với yêu cầu ban đầu; tác vụ giải phóng nằm sâu |
| Responsive | 10% | 6 | Có grid và cuộn bảng, nhưng bảng nhiều ID/cột và thẻ lịch sử dài |
| Hiệu năng | 10% | 6 | History và receipts được tải trong ngữ cảnh dày thông tin; chưa đo runtime |
| **Tổng có trọng số** | **100%** | **5,2** | Điểm định hướng ưu tiên thiết kế |

| Ưu tiên | Mức độ | Phát hiện | Hướng xử lý | Heuristic |
| --- | --- | --- | --- | --- |
| 1 | Major | Hàng còn giữ và phạm vi yêu cầu ban đầu nằm ở hai bảng, khó so sánh | Một bảng vận hành với tên sản phẩm/SKU; tách rõ trạng thái hiện tại và phạm vi gốc | H1, H6 |
| 2 | Major | Mọi quyết định/nhật ký mở đầy đủ; tác vụ quan trọng bị đẩy xuống | Tab riêng, quyết định chờ giải phóng đứng trước; chi tiết thu gọn | H7, H8 |
| 3 | Major | `waitingQty` lịch sử dễ bị hiểu thành thiếu hàng hiện tại sau hủy/giảm | Không dùng chờ hàng ban đầu để nhắc nhập/giữ thêm; đặt trong chi tiết phạm vi gốc | H2, H5 |
| 4 | Minor | Thông tin tiền lặp với thanh toán của đơn, reservationValue dễ nhầm cọc | Chỉ giữ tóm tắt cọc; thông tin bổ sung mở khi cần | H2, H8 |
| 5 | Minor | UUID/mã trạng thái chiếm vị trí của tên sản phẩm và hành động | Dịch nhãn trạng thái; dùng tên actor; ID đưa vào Chi tiết kỹ thuật | H2, H6 |

Các nguyên tắc còn lại: H3 giữ hủy/xác nhận rõ ràng, H4 dùng component chung, H9 lỗi kèm cách thử lại, H10 giải thích tại chỗ. Không dùng màu làm dấu hiệu duy nhất.

## 3. Bố cục đề xuất

```text
Đơn DH-... · Khách hàng ...                   [Tải lại] [Đóng]
Kho: ...              Cọc: Đã đủ / Chưa đủ

Cọc thỏa thuận        Đã xác minh             Còn thiếu cọc
...                   ...                    ...
Nếu có tiền chờ: “... đang chờ xác minh, chưa tính vào cọc.”

[ Hàng giữ ]  [ Lịch sử & giải phóng · 1 chờ xử lý ]

HÀNG GIỮ — tab mặc định
Sản phẩm / SKU | Kho | Yêu cầu ban đầu | Còn giữ | Đã xuất | Đã giải phóng
Tên sản phẩm thật, số lượng hiện tại, dòng nào cần xem thêm thì mở chi tiết.

[Xem chi tiết tiền cọc]             [Kiểm tra và giữ thêm hàng] khi hợp lệ

LỊCH SỬ & GIẢI PHÓNG — tab còn lại
1. Cần giải phóng: tóm tắt quyết định đã duyệt, lý do, tên người duyệt
   [Xem quyết định] [Thực hiện giải phóng] chỉ Shop Owner
2. Nhật ký thao tác: ngày giờ · tên người · hành động · sản phẩm
   [Xem chi tiết] để xem số lượng trước/sau và ID tham chiếu
```

### Header và tiền cọc

- Mã đơn, khách hàng, kho và nhãn cọc luôn nhìn thấy ở đầu vùng làm việc. Trong chi tiết đơn chính, dùng lại thông tin header hiện có, không tạo thêm một bản header đơn hàng.
- Dialog Cọc & giữ hàng: ba số tiền chính là `depositRequired`, `verifiedPaid`, và thiếu cọc hiển thị `max(depositRequired - verifiedPaid, 0)`.
- Nhãn số xác minh ghi “Đã xác minh cho đơn”, vì tiền có thể gồm nhiều khoản thu; không khẳng định đó là riêng tiền cọc.
- Cổng đủ cọc luôn theo `depositSatisfied` từ Finance, không suy diễn từ ba con số hiển thị.
- Khi `pendingAmount > 0`, hiển thị một dòng chờ xác minh, không trừ khỏi thiếu cọc.
- `totalAmount`, `remaining`, `reservationValue` và lịch sử khoản thu nằm trong “Chi tiết tiền cọc”. Không đặt sáu ô tiền ngang hàng ở phần đầu.
- `reservationValue` dùng nhãn “Giá trị phần hàng yêu cầu giữ (tham khảo)”. Có thể bỏ khỏi tóm tắt mặc định vì không quyết định đủ cọc.
- Trong chi tiết đơn chính, panel hàng giữ chỉ cần nhãn đủ/chưa đủ cọc và liên kết tới phần thanh toán đang có; không lặp các ô tiền/lịch sử Finance.

### Tab Hàng giữ — UC29

- Trạng thái đã có yêu cầu: đọc là chính. Không giữ một form mã kho và nút chốt luôn hiện như đang tạo mới.
- Tên sản phẩm, biến thể, SKU là cột nhận diện chính. Ghép qua `orderItemId`/`variantId` với dòng đơn; ID không ghép được không được gán nhầm sản phẩm. Hiển thị “Dòng hàng không còn trong đơn” và cho xem mã tham chiếu.
- `heldQty`, `consumedQty`, `releasedQty` từ history reservations là nguồn cho “Còn giữ”, “Đã xuất”, “Đã giải phóng”. Không dùng requestedQty làm số đang giữ.
- Có thể nhiều reservation/kho cho một dòng; giữ được sự phân biệt kho và reservation khi xem chi tiết, không cộng mù các trạng thái khác nhau.
- Cột “Yêu cầu ban đầu” có nhãn rõ. `requestedQty` và `waitingQty` lịch sử phản ánh phạm vi gốc; sau hủy/giảm không suy ra nhu cầu hiện tại từ các trường này. “Chờ hàng ban đầu” đặt trong chi tiết mở rộng, không làm cảnh báo nhập thêm hàng.
- Chưa có yêu cầu: hiển thị empty state “Đơn chưa có yêu cầu giữ hàng”, nút “Chọn hàng cần giữ” mở phần nhập kho/số lượng UC29 hiện tại trong cùng tab.
- Yêu cầu đã chốt và đủ cọc: nút hiện có `synchronize` trình bày là “Kiểm tra và giữ thêm hàng”. Không hứa chắc đã giữ được hàng khi nhấn.
- Chưa đủ cọc: bảng vẫn đọc được, ghi rõ lý do chưa phân bổ; liên kết tới thanh toán đơn.
- Allocation FAILED: khối cảnh báo nhỏ, có “Thử lại phân bổ”. Thông báo thành công chỉ theo response thực tế.
- Trường hợp UC26 hủy/giảm: thao tác phân bổ có thể bị BE chặn vì selection cũ. Hiển thị lỗi cần đối chiếu, không tự sửa phạm vi/quantity hoặc tự mở nút bỏ qua.

### Tab Lịch sử & giải phóng — UC36

- Hai mục trong tab: “Quyết định cần xử lý” và “Nhật ký hàng giữ”. Không lặp lại toàn bộ bảng số dư reservation của tab đầu.
- Badge tab đếm quyết định `PENDING_RELEASE`, không đếm mọi event lịch sử. Nhãn “1 chờ giải phóng” vẫn nhìn thấy khi ở tab Hàng giữ.
- Quyết định `PENDING_RELEASE` đứng trước; `PENDING_APPROVAL`/`PENDING_UC26_COMPLETION` ghi “Chờ hoàn tất tại luồng hủy/đổi”, không có nút thực hiện.
- Một dòng quyết định tóm tắt: loại hủy/đổi, trạng thái, lý do, người duyệt, ngày duyệt. Thông tin người yêu cầu, ghi chú, mã quyết định và các dòng đã xử lý nằm trong phần mở rộng.
- Shop Owner có “Thực hiện giải phóng” và xác nhận lại. Các vai trò được xem chỉ thấy trạng thái, không thấy nút ghi bị vô hiệu như một lời mời thao tác.
- Xác nhận ghi rõ “Thực hiện theo quyết định hủy/đổi đã được duyệt; không phải duyệt lại và không xác nhận hoàn tiền”. Giữ cơ chế retry cùng decisionId.
- Không hứa trước số lượng sẽ giải phóng: endpoint hiện không có preview/dry-run và server tính lượng hợp lệ. Sau khi thực hiện mới hiển thị lượng thực tế từ response, kể cả bằng 0.
- Nhật ký sắp mới nhất trước, mỗi event một dòng: thời điểm, tên người, hành động tiếng Việt và sản phẩm. Mở rộng để xem trước/sau, kho, lý do, ID tham chiếu.
- Không cộng tổng số lượng giữa các SKU/đơn vị khác nhau để tạo số “Tổng hàng giữ”. Có thể đếm số dòng/SKU có heldQty > 0 nếu cần chỉ báo.
- Dùng `actorNames` từ BE; không thay người thực hiện bằng người đang đăng nhập.

## 4. Các trạng thái và tương tác

| Trạng thái | Nội dung chính | Thao tác |
| --- | --- | --- |
| Đang tải | Skeleton ở nhóm đang tải, giữ header đã có | Khóa thao tác ghi phụ thuộc dữ liệu |
| Lỗi dữ liệu hàng giữ | Thông báo và Thử lại ngay tại tab | Không hiển thị 0 thay dữ liệu chưa biết |
| Chưa có yêu cầu | Empty state giải thích | Chọn hàng cần giữ nếu đơn hợp lệ |
| Chưa đủ cọc | Thiếu cọc và tiền chờ tách biệt | Xem thanh toán; chưa phân bổ |
| Còn giữ, không có quyết định | Bảng hàng hiện tại | Tra cứu lịch sử hoặc synchronize nếu hợp lệ |
| Có quyết định chờ giải phóng | Badge tab và thông báo ngắn | Shop Owner mở tab để thực hiện |
| Đang gửi/chưa rõ kết quả UC29 | Giữ request/key và form gốc | Khóa đóng/chuyển tab làm mất state; cho retry đúng yêu cầu |
| Giải phóng thất bại/chưa rõ | Giữ ngữ cảnh quyết định | Tải lại; nếu còn pending thì retry cùng quyết định |
| Đã giải phóng | Kết quả thực tế và tên người thực hiện | Đọc lịch sử, không hiện nút thực hiện lại |

## 5. Đồng bộ giao diện và accessibility

- Giữ font hiện có: bảng `text-xs`, nội dung/nhãn/giá trị `text-sm`, title theo ManagementDialog/PageHeader. Không tạo bộ font hoặc scale riêng.
- Dùng `text-slate-700` cho nhãn và `text-slate-900` cho giá trị, `font-medium/semibold` và khoảng cách để tạo phân cấp. Sky cho hành động chính; amber cho trạng thái cần kiểm tra; rose cho lỗi. Có nhãn văn bản cho mọi trạng thái.
- Tabs có tablist/tab/tabpanel, aria-selected/controls, focus hiển thị và điều hướng phím mũi tên/Home/End theo pattern dự án khi triển khai.
- Disclosure dùng button/details có accessible name; không dùng click cả thẻ không có semantics. Dialog giữ Escape/focus theo shared component và khóa hợp lệ khi request đang chạy.
- Mobile: hai tab luôn đọc được, badge ngắn; các trường header xếp dọc. Bảng cuộn trong vùng riêng; nhật ký/decision là các dòng có thể xuống hàng, không để UUID kéo rộng viewport.
- Tránh card lồng nhiều tầng: một header, một tóm tắt, một tab panel. Chỉ decision có trạng thái cần xử lý mới có vùng nhấn mạnh.

## 6. Cấu trúc triển khai đề nghị

- `pages/management/DepositsPage` và `OrderDetailPage` tiếp tục chỉ ghép feature qua public export.
- Một workspace hàng giữ thuộc `features/sales/components`, dùng chung hai điểm vào; dialog vẫn do ReservationDetails/ManagementDialog quản lý. Workspace hỗ trợ ngữ cảnh dialog và chi tiết đơn để tránh lặp phần tiền.
- UC29 hooks/commands và UC36 history/release API giữ nguyên. Dữ liệu history nên được lấy một lần tại workspace và chia cho bảng số dư/tab history; không để hai bảng tự gọi và trình bày hai bản số dư độc lập.
- ReservationHistoryPanel tập trung quyết định và nhật ký. Form chốt giữ chỉ mount ở trạng thái cần nhập; state request chưa rõ kết quả phải nằm ở chủ sở hữu bền trong workspace, không mất khi đổi tab.
- Tái sử dụng ManagementTable/Dialog/FormField, không đổi cỡ chữ/shared UI toàn repo. Không thêm dependency.
- Không cần đổi BE cho phân chia bố cục này. Tên/SKU thiếu cho dòng lịch sử đã bị xóa là giới hạn dữ liệu cần fallback rõ ràng; không suy đoán tên.
- Danh sách `/app/deposits` hiện lọc đơn CONFIRMED/PROCESSING có cọc; không coi đó là danh sách tất cả reservation hoặc toàn bộ đơn đã hủy. Lịch sử UC36 của đơn không còn trong danh sách cọc vẫn truy cập từ chi tiết đơn. Nếu cần danh sách quản lý reservation xuyên mọi trạng thái đơn, đó là phạm vi contract/list riêng, không âm thầm đổi filter UC29.

## 7. Tiêu chí nghiệm thu khi triển khai

1. Mở từ danh sách cọc hoặc chi tiết đơn đều mặc định nhìn thấy Hàng giữ, không bị chuỗi thẻ lịch sử đẩy nội dung chính xuống.
2. Nhận biết được sản phẩm nào còn giữ, đã xuất và đã giải phóng; không nhầm yêu cầu ban đầu với tồn giữ hiện tại.
3. Có quyết định pending thì badge luôn thấy; chỉ chủ shop thực hiện theo quyết định đã duyệt.
4. Đủ/chưa đủ cọc theo Finance; pending không bị tính vào verified hoặc trừ thiếu cọc.
5. Tên actor đúng người; dữ liệu thiếu có fallback, không lộ UUID thành nội dung chính.
6. Mất kết quả request, retry, xác nhận giải phóng, zero-release và quyền vẫn được bảo toàn.
7. Tabs, disclosure, dialog dùng được bằng bàn phím; không tràn toàn trang ở 390px.
8. Hai điểm vào dùng cùng nguồn hàng giữ, không nhân đôi lịch sử/tiền; tests hiện có và kiểm tra tương tác mới đạt.

## 8. Bản mẫu

Prototype HTML local-only tại `.agent/work/uc29-uc36-design.html`, dữ liệu minh họa để thử bố cục và tab. Không kết nối API, không phải màn đang chạy, không chứng nhận nghiệp vụ hoặc kết quả kiểm tra browser.

## 9. Triển khai

- `ReservationWorkspace` sở hữu query hàng giữ/history và state thao tác, dùng chung dialog và chi tiết đơn. `ReservationDetails` chỉ bọc ManagementDialog và khóa đóng khi có request đang xử lý/chưa rõ kết quả.
- `ReservationHistoryContent` trình bày quyết định và nhật ký, nhận history cùng nguồn với bảng số dư. `ReservationHistoryPanel` còn giữ wrapper đọc độc lập để tương thích caller hiện có.
- Chi tiết đơn truyền dữ liệu đơn hiện có vào workspace; không tải trùng chi tiết đơn, không lặp khối tiền. Kế toán và đơn đã hủy/hoàn tất dùng chế độ xem history, không gọi UC29 GET không hợp lệ.
- Query UC29 có tag OrderPayment/SalesOrder để đọc lại cọc/hàng giữ khi khoản thu hoặc quyết định thay đổi. Receipt chỉ tải khi mở Chi tiết tiền cọc.
- Không đổi endpoint, body, role hay BE. Dùng `PENDING_UC26_COMPLETION` theo projection BE hiện có; label tiếng Việt.
- Kiểm tra: lint/build, toàn bộ 194 test FE; Chrome headless trên bản build với API giả lập ở 1366px và 390px, fonts 14px/12px, tab/confirm, không tràn trang/panel. Ảnh tại `.agent/work/reservation-workspace-browser/`. Chưa kiểm tra E2E với BE/DB thật hoặc screen reader.


## ?i?u ch?nh ph?m vi m?n h?nh ? 11/11/2026

Theo y?u c?u m?i nh?t, ph?n h?ng gi? v? l?ch s?/gi?i ph?ng ch? hi?n th? trong m?n C?c & gi? h?ng (`/app/deposits`). ?? b? workspace kh?i chi ti?t ??n (`/app/orders/:id`); n?i dung tr??c ?? m? t? ?i?m v?o t? chi ti?t ??n kh?ng c?n ?p d?ng. Chi ti?t ??n ti?p t?c c? thanh to?n v? COD. B? l?c danh s?ch gi? h?ng hi?n c? kh?ng thay ??i.
