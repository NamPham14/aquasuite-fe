# Hướng dẫn Claude Code — AquaSuite Frontend

Quy tắc dự án dùng chung với Codex nằm ở `AGENTS.md` và được import nguyên văn bên dưới. Không lặp lại hoặc ghi đè các quy tắc đó tại đây.

@AGENTS.md

## Graphify trong Claude Code

- Áp dụng mục **Graphify** trong `AGENTS.md`: dùng graph chung `graphify-out/`, ưu tiên truy vấn graph cho tìm kiếm code, kiến trúc, lập kế hoạch, audit, review và phạm vi ảnh hưởng, luôn xác minh lại bằng source thực tế.
- Trong Claude Code có thể dùng skill `/graphify query "<câu hỏi>"`, `/graphify path "A" "B"`, `/graphify explain "X"` hoặc chạy CLI `graphify query|path|explain`.
- Cập nhật incremental: `graphify update .` sau khi code đổi, `/graphify . --update` khi tài liệu/ảnh đổi. Không chạy `/graphify .` (build toàn bộ) nếu graph đã có và còn dùng được.
