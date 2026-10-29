# Bản đồ tài liệu AquaSuite Frontend

## Tài liệu

- [Cấu trúc frontend](FRONTEND_PACKAGE_STRUCTURE.md): kiến trúc đích, trách nhiệm các khu vực và ranh giới feature.
- [Workflow phát triển](workflow/feature-delivery.md): phân loại rủi ro, Delivery Brief và quy trình plan, triển khai, review.
- [Mẫu feature spec](templates/feature-spec.md): đặc tả cho công việc rủi ro cao hoặc cần thống nhất nghiệp vụ/contract.
- `specifications/`: đặc tả được chia sẻ khi công việc cần tài liệu bền vững; tạo khi cần.
- [AGENTS.md](../AGENTS.md): quy tắc cốt lõi cho agent trong repo.

## Cách sử dụng

Đọc tài liệu liên quan đến công việc, sau đó kiểm tra mã đang chạy và spec/contract được thống nhất. Code thể hiện hiện trạng, còn spec và kiến trúc mô tả hành vi hoặc hướng đích; không coi khác biệt là cho phép tự ý thay đổi contract. Ghi nhận mâu thuẫn có ảnh hưởng và làm rõ trước khi triển khai phần phụ thuộc.

Repo BE là repo riêng. Khi tích hợp, tham khảo contract, spec và implementation BE tương ứng nếu có quyền truy cập; đường dẫn sibling trên một máy không phải yêu cầu bắt buộc cho mọi thành viên. Nếu thiếu nguồn xác nhận contract, ghi rõ giới hạn và hỏi người phụ trách.

`.agent/work/` là ghi chú cục bộ, không đồng bộ qua Git. Quyết định và đặc tả cần cả nhóm sử dụng phải được ghi vào tài liệu chia sẻ hoặc PR phù hợp.
