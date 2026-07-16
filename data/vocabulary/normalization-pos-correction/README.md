# POS correction pipeline

Pipeline này xử lý riêng 834 vocabulary records từng có cờ `POS_MISMATCH`. Mọi bước trước `apply` chỉ tạo file để kiểm tra và không cập nhật database.

## Provider synchronous

`test` và `run-sync` hỗ trợ hai provider:

- `gemini`: gọi trực tiếp Google bằng `@google/genai` và `GEMINI_API_KEY`.
- `openai-compatible`: gọi proxy OpenAI-compatible qua `/v1/chat/completions` nhưng model phía sau vẫn có thể là Gemini.

Cấu hình proxy local Antigravity trong `.env`:

```dotenv
VOCAB_AI_PROVIDER=openai-compatible
OPENAI_BASE_URL=http://127.0.0.1:8045/v1
OPENAI_API_KEY=KEY_MOI_TU_ANTIGRAVITY_TOOLS
OPENAI_COMPATIBLE_JSON_MODE=true
```

Không dùng lại key đã lộ trong terminal, chat hoặc log. `OPENAI_BASE_URL` phải là root `/v1`; runner tự nối `/chat/completions`. Nếu proxy không hỗ trợ `response_format: json_object`, đặt `OPENAI_COMPATIBLE_JSON_MODE=false`; validator JSON/schema của pipeline vẫn chạy sau khi nhận response.

Provider OpenAI-compatible không hỗ trợ các lệnh Gemini Batch API `submit`, `status`, `collect` và `run`. Hãy dùng `test` hoặc `run-sync`.

## 1. Prepare input sạch

```powershell
pnpm --filter @repo/api data:prepare-vocab-pos-correction
```

Input chỉ giữ `id`, `word`, `normalized_word`, `pos`, `cefr_level`, `phonetic`, risk flags và nhãn `pos_vi` đúng. Nghĩa/ví dụ cũ được để trống nhằm tránh model bị neo vào dữ liệu sai. `bear` được đặt trong `batch-001` để kiểm tra đầu tiên.

Danh sách audit đầy đủ của 834 candidates được ghi tại `data/vocabulary/vocab-pos-correction-candidates.json`.

## 2. Test batch-001

Đây là request Gemini có tính phí và phải do người dùng tự chạy:

```powershell
pnpm --filter @repo/api data:correct-vocab-pos-gemini -- test batch-001
```

Sau khi chạy, kiểm tra `normalization-pos-correction/output/batch-001.json`. Record `bear` bắt buộc có:

- `pos = noun`
- `quiz_meaning_vi = con gấu`
- `meaning_vi_clean` chỉ có đúng một nghĩa chính
- cả 10 ví dụ dùng `bear` như danh từ
- `pos_verification` có đủ ba boolean bằng `true`

## 3. Chạy toàn bộ correction

Chỉ chạy sau khi batch test đạt:

```powershell
pnpm --filter @repo/api data:correct-vocab-pos-gemini -- run-sync --workers 2 --rpm 4
```

Runner tự bỏ qua output hợp lệ đã có. Batch bị reject nằm trong `normalization-pos-correction/rejected` và có thể chạy lại bằng cùng lệnh.

## 4. Merge proposal correction

```powershell
pnpm --filter @repo/api data:merge-vocab-pos-correction
```

Kết quả:

- `vocab-pos-correction-proposal.json`
- `vocab-pos-correction-validation.json`
- `vocab-pos-correction-report.csv`

Merge chỉ thành công khi đủ 834 record, không có output thiếu/reject, không có record `review_required`, và mọi `pos_verification` hợp lệ.

## 5. Dry-run DB chỉ cho 834 ID

```powershell
pnpm --filter @repo/api data:sync-vocab-pos-correction -- plan
pnpm --filter @repo/api data:sync-vocab-pos-correction -- dry-run
```

Dry-run đối chiếu 834 record với trạng thái DB sau lần normalization đầu tiên. Nó không ghi DB và xác nhận 2.166 vocabulary item còn lại nằm ngoài phạm vi cập nhật.

## 6. Apply có xác nhận

Chỉ chạy sau khi dry-run đạt:

```powershell
pnpm --filter @repo/api data:sync-vocab-pos-correction -- apply --confirm APPLY_834_POS_CORRECTIONS
```

Apply tạo backup riêng của 834 record, cập nhật trong transaction, thay đúng 8.340 ví dụ và hậu kiểm sau commit. Database không được cập nhật bởi bất kỳ lệnh nào khác trong pipeline này.
