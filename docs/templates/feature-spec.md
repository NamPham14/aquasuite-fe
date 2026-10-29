# <WORK-ID> — Feature Specification

> Dùng cho công việc Risk L hoặc khi cần thống nhất nghiệp vụ, UI hay contract. Risk S/M thông thường ghi trực tiếp trong Delivery Brief tại `.agent/work/<WORK-ID>.md`. Chỉ giữ các mục áp dụng; ghi `N/A` khi cần.

## Metadata

- **Work ID / Feature**: `<ID / tên>`
- **Owner / Owning Feature**: `<người hoặc nhóm / feature FE>`
- **Risk Reasons**: `<lý do>`
- **Design Review**: `<PENDING | APPROVED | CHANGES_REQUESTED>`
- **Tài liệu liên quan**: `<yêu cầu, thiết kế, contract BE>`

## 1. Mục tiêu và phạm vi

- **Vấn đề và kết quả mong muốn**: `<mô tả ngắn>`
- **Trong phạm vi**: `<chức năng hoặc hành vi>`
- **Ngoài phạm vi**: `<nội dung không thực hiện>`

## 2. Người dùng, quyền và quy tắc

| Actor | Thao tác / quyền | Quy tắc và giới hạn dữ liệu |
| --- | --- | --- |
| `<actor>` | `<thao tác, role / permission>` | `<quy tắc áp dụng>` |

- **Luồng chính và ngoại lệ**: `<các bước, validation và hành vi khi thất bại>`
- **Dữ liệu nhạy cảm**: `<hiển thị, lưu trữ, logging hoặc N/A>`

## 3. UI và contract

- **Màn hình / điều hướng**: `<màn hình, route, thiết kế tham chiếu>`
- **Trạng thái UI**: `<loading, empty, error, success; responsive và accessibility khi áp dụng>`

| API / nguồn contract | Request / quyền | Success | Lỗi và xử lý FE |
| --- | --- | --- | --- |
| `<method / path, link BE>` | `<params / body, permission>` | `<response>` | `<lỗi và phản hồi UI>` |

Chỉ mô tả API liên quan; ghi phân trang, cache hoặc thay đổi tương thích khi cần. Chưa xác nhận contract thì ghi vào quyết định mở, không tự suy đoán.

## 4. Acceptance Criteria và kiểm chứng

| AC | Kết quả quan sát được | Cách kiểm chứng |
| --- | --- | --- |
| AC-01 | `<điều kiện, thao tác và kết quả mong đợi>` | `<test hoặc kiểm tra thủ công>` |

Ghi kiểm tra lỗi và quyền liên quan; kết quả chạy thực tế, giới hạn và review được cập nhật trong Delivery Brief.

## 5. Quyết định mở

| Quyết định / phụ thuộc | Owner | Cần trước | Trạng thái / kết luận |
| --- | --- | --- | --- |
| `<nội dung>` | `<người hoặc nhóm>` | `<design review / triển khai / release>` | `<OPEN / RESOLVED; kết luận>` |

Không phê duyệt design review khi còn quyết định cản trở triển khai an toàn.
