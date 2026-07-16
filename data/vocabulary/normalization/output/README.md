# Vocabulary normalization outputs

Thư mục này chỉ chứa kết quả đề xuất để audit. Pipeline không kết nối hoặc cập nhật database.

Mỗi từ chỉ qua Gemini một lượt. Trong lượt đó model vừa kiểm tra và chuẩn hóa nghĩa, vừa giữ/sửa ví dụ nguồn và bổ sung đủ 10 ví dụ Anh–Việt.

## Cấu trúc pipeline

- 3.000 từ.
- 10 từ trong mỗi request con.
- 300 request con trong Gemini Batch API.
- 10 ví dụ cho mỗi từ, tương đương 30.000 cặp ví dụ khi hoàn tất.
- Không có lượt AI kiểm định thứ hai.
- Validator local chạy sau response và không phát sinh chi phí API.

## Chạy thử trước

Tạo lại 300 input batch từ DB snapshot đã export:

```powershell
pnpm --filter @repo/api data:prepare-vocab-normalization
```

Test đồng bộ đúng một batch gồm 10 từ:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- test batch-001 --force
```

Lệnh `test` gọi API đồng bộ và không hưởng cơ chế Batch API. Chỉ người dùng chạy lệnh này vì nó phát sinh chi phí. Nếu pass, output được ghi vào `batch-001.json`; lần submit tiếp theo sẽ bỏ qua batch đó.

## Gửi toàn bộ job

Gửi Gemini Batch Job rồi thoát terminal:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- submit
```

Xem trạng thái:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- status
```

Thu kết quả sau khi job hoàn tất:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- collect
```

Hoặc gửi, chờ và thu kết quả trong một tiến trình:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- run
```

## Chạy không dùng Batch API

Nếu project chưa bật billing cho Batch API, chạy các request synchronous với 10 worker:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- run-sync --workers 10 --rpm 15
```

`workers` mặc định là 10 và có thể đặt từ 1 đến 20. `rpm` mặc định là 15 để khớp quota free tier hiện tại; 10 worker vẫn chạy đồng thời nhưng dùng chung bộ giới hạn tốc độ, mỗi request mới cách nhau tối thiểu 4 giây. Runner bỏ qua output đã hợp lệ, ghi ngay từng batch pass và có thể tiếp tục sau khi terminal bị dừng. Lỗi tạm thời 429/500/503/504 được retry tối đa 5 lần với exponential backoff và tôn trọng thời gian retry do Gemini trả về. Response sai nội dung hoặc không qua validator không được tự gọi AI lần hai; nó được ghi vào `../rejected` để tránh phát sinh chi phí ngoài dự kiến.

Synchronous API tính theo giá standard, không có mức giảm giá 50% của Batch API.

## Kiểm tra không gọi API

Kiểm tra một output đã lưu bằng validator production:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- validate batch-001
```

Replay raw response đã bị reject qua validator hiện tại:

```powershell
pnpm --filter @repo/api data:normalize-vocab-gemini -- replay batch-001
```

Kết quả replay không ghi output và không cập nhật DB.

## Tổng hợp proposal

Sau khi đủ 300 output hợp lệ:

```powershell
pnpm --filter @repo/api data:merge-vocab-normalization
```

Script tạo:

- `data/vocabulary/vocab-normalized-proposal.json`
- `data/vocabulary/vocab-normalization-report.csv`
- `data/vocabulary/vocab-normalization-validation.json`

Proposal chứa cả 10 ví dụ của từng từ. Ví dụ đầu là cặp đại diện dự kiến cho `vocabulary_items.example_en/example_vi`; toàn bộ danh sách tương ứng với bảng `vocabulary_examples`. Đây chỉ là đề xuất, không có bước apply DB trong pipeline hiện tại.

## Đồng bộ database sau khi proposal hoàn chỉnh

Tạo kế hoạch hoàn toàn offline, không kết nối database:

```powershell
pnpm --filter @repo/api data:sync-vocab-normalization -- plan
```

Đối chiếu database theo chế độ chỉ đọc, không ghi dữ liệu:

```powershell
pnpm --filter @repo/api data:sync-vocab-normalization -- dry-run
```

Kết quả đạt yêu cầu được lưu riêng tại `data/vocabulary/vocab-db-dry-run.json` và không bị lệnh `plan` ghi đè.

Tạo lại bản preview DB đầy đủ từ kết quả dry-run mà không kết nối database:

```powershell
pnpm --filter @repo/api data:sync-vocab-normalization -- preview
```

Bản đầy đủ được ghi tại `data/vocabulary/vocab-db-normalized-preview.json`, gồm 3.000 từ, 30.000 ví dụ, topic links, challenges và challenge options. ID của ví dụ mới là `null` vì ID thật chỉ được database tạo khi apply.

Chỉ sau khi dry-run đạt yêu cầu và đã xác nhận cập nhật:

```powershell
pnpm --filter @repo/api data:sync-vocab-normalization -- apply --confirm APPLY_3000_VOCABULARY_RECORDS
```

Lệnh `apply` tạo bản sao lưu trước khi sửa, thực hiện toàn bộ thay đổi trong transaction, cập nhật từ vựng, 10 ví dụ mỗi từ và nội dung câu hỏi/đáp án challenge liên quan, rồi kiểm tra lại dữ liệu sau khi commit. Báo cáo được ghi vào `data/vocabulary/vocab-db-update-audit.json`. Không chạy `apply` nếu chưa kiểm tra thành công kết quả `dry-run`.
