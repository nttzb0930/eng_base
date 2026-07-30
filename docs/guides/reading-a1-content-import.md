# Reading A1 Content Import

Tài liệu này hướng dẫn kiểm tra và đưa bộ 12 bài Reading A1 canonical vào một
môi trường đã được chọn. Dataset nằm tại
`data/reading/a1/passages.json`. Importer chỉ tạo hoặc cập nhật bản nháp; không
tự publish nội dung.

## Nguyên tắc an toàn

- Validation và test offline không kết nối database.
- Migration và import là thao tác vận hành riêng, chỉ chạy khi đã xác nhận rõ
  môi trường đích và có quyền thay đổi môi trường đó.
- Không dùng `db:push`, seed tổng, hoặc chạy importer trong startup, build hay
  CI.
- Không paste `DATABASE_URL`, mật khẩu hoặc output chứa credential vào ticket,
  log hay chat.
- Passage đang `PUBLISHED` được importer bỏ qua hoàn toàn. Muốn đồng bộ lại một
  passage đã publish, Admin phải chủ động unpublish trước, chạy lại importer,
  review và publish lại.

## 1. Kiểm tra offline

Từ repository root, chạy:

```powershell
pnpm --filter @repo/api exec tsx --test scripts/reading/content/reading-content.test.ts
```

Test xác nhận:

- đúng 12 passage A1 và đúng Topic slug canonical;
- mỗi body có 80–120 từ;
- mỗi passage có bốn câu hỏi, mỗi câu có ba lựa chọn và đúng một đáp án chính
  xác;
- slug, prompt và option không trùng sau khi chuẩn hóa;
- answer key, word count và vocabulary audit đã review không đổi ngoài ý muốn.

Vocabulary audit là cảnh báo biên tập. Catalog hiện không phải wordlist A1 hoàn
chỉnh nên từ riêng, biến thể số nhiều/chia động từ và một số từ thông dụng có
thể xuất hiện trong `unknownWords`. Cảnh báo không tự sửa prose và không gọi AI
provider.

## 2. Preflight môi trường đích

Trước mọi operating action:

1. Ghi rõ tên môi trường, owner phê duyệt, commit/version sẽ deploy và thời
   điểm thực hiện.
2. Kiểm tra cấu hình secret bằng công cụ quản lý môi trường; không in giá trị
   credential ra terminal.
3. Qua DB client được phê duyệt, xác nhận `current_database()`,
   `current_schema()` và `current_user` đúng với change request.
4. Xác nhận backup/restore policy và migration
   `20260730090000_add_reading_a1` chưa bị drift.
5. Xác nhận Topic taxonomy canonical đã có trong database; importer sẽ dừng
   trước transaction nếu thiếu bất kỳ Topic nào.

## 3. Apply và import

Các lệnh sau thay đổi database. Chỉ chạy trong terminal đã được cấu hình cho
môi trường vừa xác nhận:

```powershell
pnpm --filter @repo/api db:migrate:deploy
pnpm --filter @repo/api data:import-reading-a1
```

Importer validate và audit toàn bộ pack trước khi ghi. Tất cả 12 passage được
đồng bộ trong một transaction:

- slug chưa tồn tại: tạo `DRAFT`;
- slug đang `DRAFT`: cập nhật passage và thay toàn bộ question/option;
- slug đang `PUBLISHED`: giữ nguyên và đưa vào `skipped`.

Output thành công có hai JSON record. Ví dụ rút gọn theo các field quan trọng:

```json
{
  "action": "audit-reading-a1-content",
  "unknownWordCount": 199,
  "aboveA1WordCount": 33
}
```

```json
{
  "action": "import-reading-a1-drafts",
  "created": [],
  "updated": [],
  "skipped": []
}
```

Các mảng chứa slug thực tế và được sắp xếp để dễ đối chiếu. Lần chạy đầu trên
database chưa có Reading content dự kiến có 12 slug trong `created`. Chạy lại
không tạo duplicate: draft chuyển sang `updated`, còn published nằm trong
`skipped`.

Nếu importer báo thiếu Topic hoặc một write thất bại, pack không được ghi một
phần. Sửa nguyên nhân rồi chạy lại cùng command; không chèn thủ công question
hay option để vượt qua validation.

## 4. Review và publish

1. Mở Admin `/reading-passages`.
2. Review từng passage ở trạng thái draft: title, topic, level, body, thời gian
   đọc, bốn câu hỏi, ba option và đáp án đúng.
3. Kiểm tra câu trả lời có thể suy ra trực tiếp từ passage, distractor không mơ
   hồ và nội dung phù hợp A1.
4. Publish từng passage riêng sau khi được duyệt. Importer không có thao tác
   publish hàng loạt.

## 5. Smoke test Learner

Kiểm tra cả hai locale bằng tài khoản Learner:

1. Mở `/en/reading` và `/vi/reading`; danh sách chỉ hiển thị passage đã
   publish.
2. Mở một passage, đọc nội dung và chọn đủ bốn đáp án.
3. Submit một lần, kiểm tra điểm, đáp án đúng/sai và bản result.
4. Refresh result và kiểm tra attempt vẫn giữ nguyên.
5. Quay lại lịch sử Reading, mở lại attempt vừa tạo.
6. Xác nhận Reading không thay đổi Practice session, Vocabulary progress hoặc
   mastery counter.

Ghi lại slug đã smoke test, locale, account test, attempt ID và kết quả trong
change record; không ghi token hoặc dữ liệu xác thực.
