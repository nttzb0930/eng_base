# Tổng quan tính năng English Base

Tài liệu này mô tả trạng thái hiện tại và hướng phát triển tiếp theo của các
tính năng học tập chính trong English Base. Trạng thái được đối chiếu với mã
nguồn, wire contract, Prisma schema và các ADR đang được chấp nhận tại ngày
30/07/2026.

Tài liệu không coi một giao diện minh họa hoặc dữ liệu hard-code là một tính
năng đã hoàn thành. Một tính năng chỉ được đánh dấu **Đã triển khai** khi luồng
Learner, nghiệp vụ API và dữ liệu cần thiết đã kết nối end-to-end.

## Quy ước trạng thái

| Trạng thái                 | Ý nghĩa                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Đã triển khai**          | Luồng chính hoạt động end-to-end và có dữ liệu thật.                                        |
| **Đã triển khai một phần** | Đã có nền tảng hoặc một số luồng hoạt động, nhưng còn giới hạn rõ ràng.                     |
| **UI prototype**           | Giao diện đã xuất hiện nhưng còn dùng dữ liệu giả hoặc chưa có nghiệp vụ backend tương ứng. |
| **Chưa triển khai**        | Chưa có luồng Learner và backend phục vụ tính năng.                                         |

## Tổng quan nhanh

| Mục  | Tính năng             | Trạng thái hiện tại        | Hướng tiếp theo                                                                 |
| ---- | --------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| 6.1  | Học từ vựng theo CEFR | **Đã triển khai một phần** | Mở rộng dữ liệu thật sang Topics/Flashcards; chỉ thêm C1–C2 khi catalog hỗ trợ. |
| 6.2  | Hỗ trợ Anh - Việt     | **Đã triển khai**          | Hoàn thiện độ phủ bản dịch và loại bỏ chuỗi JSX chưa qua i18n.                  |
| 6.3  | Quiz hai chiều        | **Đã triển khai**          | Mở rộng coverage và analytics theo từng hướng.                                  |
| 6.5  | Đáp án nhiễu          | **Đã triển khai một phần** | Đưa Topic practice về backend và nâng chất lượng distractor.                    |
| 6.6  | Reading theo level    | **Đã triển khai một phần** | Mở rộng A2–B2; thêm highlight/dictionary và triển khai migration vận hành.      |
| 6.7  | AI sửa Writing        | **Chưa triển khai**        | Xây Writing workflow và AI feedback có cấu trúc.                                |
| 6.8  | Audio phát âm         | **Đã triển khai**          | Kiểm soát coverage, fallback và chất lượng audio.                               |
| 6.9  | Ôn tập cá nhân hóa    | **Đã triển khai một phần** | Phát triển từ scheduler theo luật sang kế hoạch thích ứng theo mục tiêu.        |
| 6.10 | AI Learning Assistant | **Chưa triển khai**        | Xây assistant có grounding từ course, vocabulary và learner progress.           |

Mục **6.4** không nằm trong danh sách yêu cầu hiện tại nên được giữ trống để
không tự suy diễn thêm phạm vi sản phẩm.

## Nền tảng đã có

Các tính năng trong chương 6 được xây trên những capability đã tồn tại:

- đăng ký, đăng nhập, refresh session và đăng xuất cho Learner;
- onboarding lần đầu, chọn ngôn ngữ hệ thống, ngôn ngữ học, trình độ, mục tiêu
  và cường độ học;
- Course → Unit → Lesson → Challenge → Challenge Option;
- placement test và xác nhận cấp độ bắt đầu;
- canonical vocabulary catalog, 103 Topic và nội dung Anh - Việt;
- saved words, flashcards, daily review, weak-word practice;
- fill-blank, listening và dictation practice;
- lưu tiến độ lesson, vocabulary progress, điểm, tim và practice session;
- dashboard, leaderboard và Course Management trong Admin.

Ngôn ngữ hệ thống `vi`/`en` là lựa chọn presentation của Web và được lưu tại
localStorage. Ngôn ngữ này không phải learner progress và không được ghi vào
PostgreSQL.

## 6.1. Học từ vựng theo CEFR

**Trạng thái: Đã triển khai một phần.**

### Mục tiêu

Learner học, luyện tập và ôn từ vựng theo cấp độ CEFR phù hợp thay vì nhận một
danh sách từ không phân tầng.

### Đã thực hiện

- Vocabulary item có `cefrLevel`; persistence lưu `cefr_level`.
- Shared hiện định nghĩa bốn cấp được hỗ trợ chính thức: `A1`, `A2`, `B1`,
  `B2`.
- Course, Unit và Lesson tạo lộ trình học có thứ tự.
- Placement Test ước lượng level ban đầu và đánh dấu các lesson trước level đã
  xác nhận là hoàn thành.
- Practice hỗ trợ chọn level cho fill-blank, listening và dictation.
- Flashcard hỗ trợ deck theo A1–B2.
- Flashcard summary trả overview, system deck, CEFR deck và Topic deck từ
  vocabulary progress thật; accuracy không có attempt được trả về `null`.
- Flashcard Topic session dùng identity rõ ràng
  `source=topic&slug=<topic-slug>` và không fallback deck sai về `due`.
- Dashboard tổng hợp total, learned, mastered, accuracy và due theo level.
- Topic detail có thể lọc vocabulary theo level.
- Unit sở hữu `cefr_level` nullable rõ ràng; migration backfill A1–B2 theo dữ
  liệu Course hiện tại, có guard, constraint và index. Admin có thể gán hoặc
  bỏ gán CEFR khi quản lý Unit.
- `GET /progress/cefr-levels` tổng hợp `totalWords`, `learnedWords`,
  `masteredWords`, `completedLessons`, `totalLessons` và `unlocked` cho đúng
  user đang đăng nhập.
- Backend luôn mở A1, mở level Placement đã xác nhận cùng các level thấp hơn,
  và mở level tiếp theo khi level trước có catalog khác rỗng đạt ít nhất 80%
  mastered words.
- Learn và Learn Level chỉ render A1–B2 từ summary backend, liên kết Unit qua
  field persisted, dùng Dashboard cho overview và có skeleton/error/empty state
  riêng. UI không còn suy từ Unit title/order hoặc dùng số liệu CEFR mẫu.

### Giới hạn hiện tại

- Migration Unit CEFR đã được version hóa nhưng chưa được chạy trong quá trình
  triển khai feature; môi trường đích phải áp dụng migration theo deployment
  workflow trước khi dùng endpoint mới.
- Catalog chính thức mới có A1–B2; chưa có dữ liệu C1/C2 đã review.

### Hướng tiếp tục

1. Áp dụng migration bằng deployment workflow đã được review; không dùng
   `db:push` hoặc backfill ad hoc.
2. Bổ sung integration coverage cho Course có nhiều Unit cùng CEFR và learner
   chuyển active Course.
3. Giữ A1–B2 là phạm vi chính thức cho đến khi catalog có C1/C2 đã được review.

### Tiêu chí hoàn thành

- Không còn số từ hoặc phần trăm CEFR giả trên learner UI.
- Web, API và Shared thống nhất cùng một tập level.
- Refresh trang không thay đổi trạng thái khóa/mở hoặc tiến độ.
- C1/C2 chỉ xuất hiện khi catalog, query và test cùng hỗ trợ.

## 6.2. Hỗ trợ Anh - Việt

**Trạng thái: Đã triển khai.**

### Mục tiêu

Cung cấp nội dung học tiếng Anh có giải thích tiếng Việt và cho phép sử dụng
giao diện hệ thống bằng tiếng Việt hoặc tiếng Anh.

### Đã thực hiện

- Vocabulary item lưu `word`, `meaningVi`, `primaryMeaningVi`, `posVi` và ví dụ
  Anh - Việt.
- Vocabulary examples hỗ trợ `exampleEn` và `exampleVi`.
- Topic có title, description và group được địa phương hóa theo locale.
- Web dùng route có locale `/vi/...` và `/en/...` qua `next-intl`.
- Sign up/onboarding cho phép chọn ngôn ngữ hệ thống trước ngôn ngữ sẽ học.
- Lựa chọn ngôn ngữ hệ thống mặc định là English và được nhớ bằng localStorage.
- Quiz và review có thể hiển thị câu hỏi theo hướng Anh → Việt hoặc Việt → Anh.

### Giới hạn hiện tại

- Một số chuỗi tiếng Việt vẫn viết trực tiếp trong JSX, đặc biệt ở Flashcards
  và Topic Detail. Copy được chạm tới trong Learn/Learn Level đã có key Anh -
  Việt tương ứng.
- Một số example translation có thể là `null` trong dữ liệu chưa enrich đủ.
- Nội dung domain do Admin nhập chưa có workflow bắt buộc đủ cả hai locale.

### Hướng tiếp tục

1. Chuyển toàn bộ presentation copy sang `messages/vi.json` và
   `messages/en.json`.
2. Thêm báo cáo coverage cho `meaningVi`, `exampleVi` và Topic localization.
3. Quy định fallback rõ ràng: giữ nội dung tiếng Anh khi bản dịch chưa tồn tại,
   không tự tạo bản dịch giả ở client.
4. Nếu Admin cần quản lý nội dung song ngữ, mở rộng form và validation tại
   capability sở hữu nội dung đó.

### Tiêu chí hoàn thành

- Hai locale không phát sinh `MISSING_MESSAGE` trên mọi route chính.
- Không còn chuỗi presentation tiếng Việt hard-code trong learner view.
- Nội dung thiếu bản dịch có fallback nhất quán và được đo bằng report.

## 6.3. Quiz hai chiều

**Trạng thái: Đã triển khai.**

### Mục tiêu

Kiểm tra cả khả năng nhận biết nghĩa và khả năng gọi lại từ vựng:

- `EN_TO_VI`: từ tiếng Anh → chọn nghĩa tiếng Việt;
- `VI_TO_EN`: nghĩa tiếng Việt → chọn từ tiếng Anh.

### Đã thực hiện

- Shared định nghĩa challenge type `SELECT`, `ASSIST` và hai direction
  `EN_TO_VI`, `VI_TO_EN`.
- Lesson lưu challenge và challenge option trong PostgreSQL.
- Saved-word review luôn tạo hai core challenge cho mỗi từ: `SELECT` và
  `ASSIST`.
- Placement Test cũng sử dụng hai direction để đánh giá đầu vào.
- Learning Session dùng chung lifecycle chọn đáp án, feedback đúng/sai, retry
  và hoàn thành.
- Lesson completion và vocabulary progress được ghi bền vững; retry lesson
  completion không cộng điểm hai lần.

### Hướng tiếp tục

1. Theo dõi accuracy riêng cho `EN_TO_VI` và `VI_TO_EN`.
2. Ưu tiên hướng learner yếu hơn khi tạo review session.
3. Bổ sung typed-answer cho recall chủ động thay vì luôn multiple choice.
4. Kiểm tra accessibility bàn phím và screen reader cho mọi challenge type.

### Tiêu chí hoàn thành mở rộng

- Dashboard thể hiện accuracy theo direction.
- Review composer có thể tăng tỷ trọng hướng yếu mà không thay đổi wire shape
  của challenge.
- Mỗi lần trả lời chỉ ghi một progress attempt hợp lệ.

## 6.5. Đáp án nhiễu

**Trạng thái: Đã triển khai một phần.**

### Mục tiêu

Tạo các lựa chọn sai đủ hợp lý để kiểm tra kiến thức thật, đồng thời tránh đáp
án trùng hoặc có nghĩa quá gần đáp án đúng.

### Đã thực hiện

- Lesson challenge sử dụng các Challenge Option được lưu trong Course Content.
- Review capability tạo distractor từ vocabulary pool trong PostgreSQL.
- Vocabulary challenge builder loại trừ:
  - chính vocabulary item đang hỏi;
  - từ hoặc primary meaning trùng nhau;
  - candidate có meaning overlap rõ ràng.
- Candidate được ưu tiên theo CEFR level và part of speech trước khi fallback
  sang pool rộng hơn.
- Listening và fill-blank tái sử dụng cùng distractor policy.
- Builder nhận random source khi test nên có thể kiểm tra deterministically.

### Giới hạn hiện tại

- Chưa có metric đo độ khó hoặc tỷ lệ distractor bị loại theo từng level.

### Hướng tiếp tục

1. Ghi diagnostic không chứa nội dung nhạy cảm về kích thước candidate pool và
   fallback strategy.

### Tiêu chí hoàn thành

- Không còn challenge/distractor nghiệp vụ được tạo trong route-level view.
- Mỗi câu có tối đa một đáp án đúng và không có option trùng.
- Cùng một random source trong test tạo cùng một kết quả.

## 6.6. Reading theo level

**Trạng thái: Đã triển khai một phần — vertical slice A1.**

### Đã triển khai

- Persistence và migration cho passage, question, option, publication status,
  attempt và immutable answer snapshot.
- Shared wire contract dùng chung cho API, Admin và Web.
- Admin tạo/sửa passage A1, quản lý câu hỏi–đáp án lồng nhau và
  publish/unpublish.
- Learner xem danh sách passage đã publish, đọc toàn văn, chọn đáp án và xem
  kết quả/lịch sử được backend chấm.
- Submission idempotent theo learner/submission key; Reading attempt độc lập
  với Practice session và Vocabulary progress.
- Giao diện Anh–Việt, điều khiển cỡ chữ/giãn dòng lưu localStorage, keyboard
  focus và skeleton riêng cho list/session/result.
- Bộ nội dung canonical gồm 12 passage A1 quốc tế, 48 câu hỏi và answer key đã
  review được version hóa tại `data/reading/a1/passages.json`.
- Validator/audit offline và importer explicit hỗ trợ tạo/cập nhật draft
  idempotent; passage đã publish được giữ nguyên để tránh thay đổi nội dung đang
  phục vụ Learner ngoài quy trình review.

### Nền tảng có thể tái sử dụng

- CEFR A1–B2 và learner progress.
- Vocabulary examples Anh - Việt.
- Fill-blank practice và Learning Session lifecycle.
- Course/Unit/Lesson cho nội dung có thứ tự.
- Topic taxonomy để chọn chủ đề passage.

Topic có slug `reading` chỉ là một nhóm vocabulary; nó không phải Reading
Comprehension capability.

### Thiết kế định hướng

Reading nên là capability riêng, không nhét passage vào vocabulary example.
Một reading activity tối thiểu gồm:

```text
Reading Passage
  ├─ CEFR level
  ├─ title và body
  ├─ optional Topic
  ├─ estimated reading time
  └─ comprehension questions
       └─ answer options / expected answer
```

Các goal interface hiện có:

- lấy danh sách passage theo CEFR level;
- bắt đầu reading session;
- nộp câu trả lời;
- hoàn thành session và ghi kết quả;
- xem lịch sử/accuracy theo level.

### Phạm vi còn lại

1. Trên từng môi trường vận hành: áp dụng migration đã review, chạy importer
   A1, review draft trong Admin, publish từng passage và smoke test. Dataset và
   importer trong repository không chứng minh database nào đã được cập nhật.
2. Mở rộng content/policy và learner filter từ A1 sang A2–B2.
3. Thêm vocabulary highlight/dictionary sau khi core comprehension ổn định.
4. Bổ sung analytics tổng hợp accuracy theo level/topic; lịch sử attempt thô đã
   có nhưng chưa có dashboard phân tích.

### Tiêu chí hoàn thành

- Learner nhận đúng passage A1 đã publish; A2–B2 vẫn là phạm vi tiếp theo.
- Câu hỏi comprehension được chấm bởi backend.
- Kết quả Reading được ghi riêng, không làm sai vocabulary review counters.
- Admin có thể tạo, sửa, publish và unpublish passage.

## 6.7. AI sửa Writing

**Trạng thái: Chưa triển khai.**

### Phân biệt với AI hiện có

Repository đã dùng Gemini/OpenAI-compatible provider trong các script offline
để chuẩn hóa, phân loại và mở rộng vocabulary. Các script này không chạy trong
request của Learner và không phải AI Writing feedback.

### Thiết kế định hướng

Writing workflow nên giữ bản gốc của learner và nhận feedback có cấu trúc:

```ts
type WritingFeedback = {
  overallScore: number;
  cefrEstimate: string;
  correctedText: string;
  grammarIssues: Array<{
    original: string;
    replacement: string;
    explanationVi: string;
  }>;
  vocabularySuggestions: Array<{
    original: string;
    suggestion: string;
    reasonVi: string;
  }>;
  nextExercise: string;
};
```

Provider output phải được runtime-validate trước khi trả cho Web. Provider là
một adapter phía sau seam của Writing capability; controller và UI không biết
Gemini hay OpenAI-compatible đang được dùng.

### Thứ tự thực hiện

1. Xác định rubric cho từng CEFR level và giới hạn độ dài bài viết.
2. Xây non-AI Writing draft/attempt persistence trước.
3. Thêm provider adapter, timeout, retry có giới hạn và structured-output
   validation.
4. Lưu prompt version, model identifier, feedback đã chuẩn hóa và usage metadata;
   không lưu API key hoặc raw provider log.
5. Xây UI so sánh original/corrected text và giải thích Anh - Việt.
6. Thêm rate limit, quota và cơ chế báo lỗi khi provider không khả dụng.

### An toàn và chất lượng

- Không gửi access token, email hoặc learner profile không cần thiết cho model.
- Không tự động thay thế bài viết; learner phải thấy rõ suggestion.
- Feedback phải phân biệt lỗi chắc chắn và gợi ý phong cách.
- Prompt injection trong nội dung bài viết không được phép thay đổi system
  instruction hoặc output contract.

### Tiêu chí hoàn thành

- Provider lỗi không làm mất writing draft.
- Mọi response AI vượt qua schema validation.
- Feedback tham chiếu đúng đoạn văn learner đã gửi.
- Có test bằng fake adapter; test mặc định không gọi provider thật.

## 6.8. Audio phát âm

**Trạng thái: Đã triển khai.**

### Đã thực hiện

- Vocabulary item lưu `audioUrl` và `audioSource`.
- Vocabulary data pipeline hỗ trợ enrich pronunciation audio.
- Vocabulary Card có nút phát âm thanh.
- Listening Practice tạo challenge audio → chọn từ.
- Dictation Practice tạo challenge audio → nhập từ nghe được.
- Saved-word review có thể thêm `LISTEN_SELECT` khi từ có audio.
- UI xử lý trạng thái đang phát và lỗi playback cơ bản.

### Giới hạn hiện tại

- Không phải vocabulary item nào cũng có audio.
- Topic Detail còn có fallback browser Speech Synthesis riêng, tạo hai hành vi
  phát âm khác nhau.
- Chưa có report coverage theo CEFR, accent và nguồn audio.
- Chưa có tốc độ phát chậm hoặc chọn accent.

### Hướng tiếp tục

1. Tạo report audio coverage theo level và source.
2. Gom playback/fallback vào một Web audio module dùng chung.
3. Quy định fallback: audio đã review → browser TTS → trạng thái unavailable.
4. Thêm slow playback nếu source cho phép mà không biến đổi âm thanh quá mức.
5. Bổ sung preloading có giới hạn cho listening session.

### Tiêu chí hoàn thành mở rộng

- Mọi vị trí phát âm dùng cùng một interface và error state.
- Missing audio không làm session bị kẹt.
- Listening/Dictation chỉ chọn item có nguồn audio hợp lệ.

## 6.9. Ôn tập cá nhân hóa

**Trạng thái: Đã triển khai một phần.**

### Đã thực hiện

- `user_vocabulary_progress` lưu correct/wrong/review count, mastery level,
  ease factor, interval, repetition, last review và next review.
- Progress write chạy trong serializable transaction, advisory lock theo
  learner/vocabulary và atomic counter increments.
- Flashcard rating `again`/`good` cập nhật lịch ôn.
- Scheduler đặt lại interval khi trả lời sai và tăng interval theo repetition
  cùng ease factor khi trả lời đúng.
- Saved Words hỗ trợ queue `due` và `all`.
- Review composer ưu tiên due/weak words và giới hạn session.
- Dashboard hiển thị due, weak, mastered, accuracy và top weak words.
- Practice session được lưu để tổng hợp activity và mode accuracy.

### Giới hạn hiện tại

- Cá nhân hóa hiện là rule-based spaced repetition, chưa dùng AI.
- Goal, intensity và custom goal thu từ onboarding chưa ảnh hưởng trực tiếp đến
  số lượng review hoặc kế hoạch ngày.
- Chưa có learner timezone và daily target đáng tin cậy.
- Một số Topic UI còn suy trạng thái weak/mastered theo index thay vì progress
  thật.

### Hướng tiếp tục

1. Sửa Topic UI và Topic Practice để dùng vocabulary progress thật.
2. Thêm daily plan dựa trên due words, intensity và thời gian khả dụng.
3. Theo dõi accuracy theo direction/challenge type để chọn bài tập phù hợp.
4. Thêm lapse count và overdue priority nếu cần, nhưng giữ scheduler sau một
   interface ổn định.
5. Chỉ cân nhắc AI recommendation sau khi rule-based signals có dữ liệu đủ sạch.

### Tiêu chí hoàn thành mở rộng

- Hai learner có lịch sử khác nhau nhận queue khác nhau.
- Retry/concurrent answer không mất counter hoặc nhân đôi reward.
- Daily plan giải thích được vì sao một từ hoặc mode được đề xuất.
- Không dùng dữ liệu hard-code để gán weak/mastered.

## 6.10. AI Learning Assistant

**Trạng thái: Chưa triển khai.**

### Mục tiêu

Hỗ trợ learner hỏi về từ vựng, ngữ pháp, ví dụ, lỗi sai và bước học tiếp theo
dựa trên nội dung English Base, không phải chatbot trả lời chung chung.

### Thiết kế định hướng

Assistant nên được triển khai theo ba mức tăng dần:

1. **Contextual explanation**: giải thích vocabulary item hoặc challenge đang
   mở; không cần conversation persistence.
2. **Learning coach**: đọc summary đã chuẩn hóa của learner progress và đề xuất
   review/practice tiếp theo.
3. **Conversation**: chỉ thêm lịch sử hội thoại sau khi có nhu cầu rõ ràng về
   tiếp nối nhiều lượt.

Nguồn grounding hợp lệ:

- canonical vocabulary catalog và examples;
- Course, Unit, Lesson và challenge hiện tại;
- Topic taxonomy;
- learner progress summary đã tối thiểu hóa dữ liệu;
- Writing feedback đã runtime-validate nếu feature 6.7 tồn tại.

Assistant không được truy cập Prisma tùy ý hoặc nhận toàn bộ hồ sơ learner.
Capability sở hữu dữ liệu phải cung cấp context projection nhỏ, có type rõ
ràng.

### Interface dự kiến

```text
POST /learning-assistant/explain
POST /learning-assistant/recommend
POST /learning-assistant/chat   # chỉ ở giai đoạn conversation
```

Response nên gồm answer, citations tới nội dung nội bộ, suggested actions và
provider metadata an toàn. UI phải hiển thị trạng thái AI-generated và không
biến câu trả lời model thành learner progress nếu chưa có hành động xác nhận.

### Thứ tự thực hiện

1. Xây contextual vocabulary explanation bằng fake adapter và deterministic
   context builder.
2. Thêm provider adapter, schema validation, timeout, quota và rate limit.
3. Bổ sung internal citations tới vocabulary/lesson/topic.
4. Xây learning recommendation dựa trên rule-based candidate trước, dùng AI
   chỉ để giải thích hoặc sắp xếp trong giới hạn cho phép.
5. Đánh giá chất lượng, chi phí và privacy trước khi thêm conversation history.

### Tiêu chí hoàn thành

- Assistant trả lời dựa trên context được cung cấp và có citation nội bộ.
- Provider không khả dụng không chặn các luồng học chính.
- Test mặc định dùng fake adapter và không gọi mạng.
- Prompt/output version được ghi nhận để có thể tái hiện lỗi.
- Assistant không tự ý sửa điểm, mastery hoặc lịch review.

## Lộ trình đề xuất

### Giai đoạn 1 — Làm sạch dữ liệu thật đang có

- đã thay hard-code CEFR ở Learn/Learn Level bằng Dashboard và CEFR summary
  backend;
- đã persist Unit CEFR, thêm Admin management và đưa quy tắc mastery 80% về
  backend;
- đã thay hard-code learner state ở Topics và Flashcards bằng progress backend;
- đã đưa Topic Practice challenge generation về backend;
- hoàn thiện i18n Anh - Việt;
- thêm validation cho onboarding language/goal/intensity;
- thống nhất CEFR A1–B2 trên Web, API và Shared.

Kết quả: các feature 6.1, 6.2, 6.3, 6.5, 6.8 và 6.9 có nền tảng đáng tin cậy để
đo lường.

### Giai đoạn 2 — Reading theo level

- xây content model và Admin workflow;
- đã version hóa bộ 12 passage Reading A1 và importer draft-only; bước vận hành
  còn lại là apply migration, import, review, publish và smoke test trên từng
  môi trường được phê duyệt;
- sau khi result persistence ổn định mới mở A2–B2.

### Giai đoạn 3 — Writing trước, AI feedback sau

- phát hành draft/attempt/rubric không phụ thuộc AI;
- thêm một provider adapter và structured feedback;
- đo chất lượng và chi phí trước khi mở rộng model/provider.

### Giai đoạn 4 — AI Learning Assistant

- bắt đầu bằng giải thích vocabulary/challenge có grounding;
- tiếp theo là recommendation dựa trên learner progress;
- conversation persistence là bước cuối, không phải điều kiện để phát hành
  assistant ban đầu.

## Nguyên tắc triển khai các feature tiếp theo

- Web chỉ gọi authenticated HTTP qua feature resource adapter.
- Business behavior thuộc capability backend sở hữu; không tạo challenge hoặc
  tính learner status trong route-level view.
- Cross-runtime wire types nằm trong root Interface `@repo/shared`.
- AI provider nằm sau một adapter; test mặc định không gọi mạng.
- Provider response phải được runtime-validate ở runtime sở hữu.
- Không log prompt chứa dữ liệu learner, API key, token hoặc raw provider
  response có nội dung nhạy cảm.
- Mọi progress mutation phải giữ idempotency và concurrency safety.
- Prisma migration, seed và provider call là thao tác riêng cần review; không
  chạy chỉ để kiểm tra tài liệu hoặc compile.

## Tài liệu liên quan

- [Project context](../CONTEXT.md)
- [Codebase structure](architecture/codebase-structure.md)
- [Frontend architecture](architecture/frontend.md)
- [API architecture](architecture/api.md)
- [Vocabulary data pipeline](data/vocabulary-pipeline.md)
- [ADR catalog](adr/README.md)

## TOEIC Reading theo chứng chỉ

Pipeline đã inventory, tải và validate 10 đề TOEIC Reading với tổng cộng 1.000
câu Part 5-7. Repository đã có migration và importer idempotent để liên kết nội
dung với Course `toeic-600`, import trực tiếp ở trạng thái `PUBLISHED`,
bỏ qua cùng phiên bản và thay thế transactionally khi có phiên bản mới.

Migration và importer không được tự động chạy trên database. Sau khi operator
áp dụng schema và import dữ liệu, các phase tiếp theo là learner API không làm
lộ đáp án, attempt/chấm điểm, rồi UI từ thẻ **Theo chứng chỉ** đến TOEIC Reading
Part 5-7.
