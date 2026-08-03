# Thiết kế tài liệu hệ thống English Base dạng Word

## Mục tiêu

Tạo một tài liệu Microsoft Word duy nhất bằng tiếng Việt, trình bày dự án
English Base từ góc nhìn sản phẩm, nghiệp vụ, kỹ thuật, mã nguồn, kiểm thử, cài
đặt, triển khai và vận hành. Tài liệu phải giúp một người mới hiểu hệ thống và
tự thiết lập, chạy, kiểm thử, triển khai theo hướng dẫn.

Tệp bàn giao dự kiến:

`English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

## Yêu cầu trình bày

- Một tệp `.docx` duy nhất, không dùng Markdown làm tài liệu bàn giao.
- Nội dung chính bằng tiếng Việt.
- Khổ A4, font Times New Roman, cỡ chữ nội dung phù hợp báo cáo thông thường.
- Sử dụng hệ thống tiêu đề nhiều cấp, đánh số chương, mục lục, danh mục bảng,
  danh mục hình, header, footer và số trang.
- Tối thiểu 200 trang nội dung có ý nghĩa; không kéo dài bằng khoảng trắng, lặp
  nội dung hoặc tăng cỡ chữ bất hợp lý.
- Code được trình bày như code trong báo cáo thông thường, dùng font đơn cách và
  nền dễ phân biệt; không cần ghi commit, ngày đối chiếu hoặc metadata cạnh từng
  đoạn code.
- Không đưa secret thật, token thật hoặc nội dung `.env` đang sử dụng vào tài
  liệu.

## Nguồn thông tin

Nội dung được đối chiếu trực tiếp từ repository hiện tại, ưu tiên:

1. `CONTEXT.md`, `AGENTS.md` và các tài liệu canonical trong `docs/`.
2. Route, view, feature, hook và resource API của Web/Admin.
3. Controller, DTO, use case, service, mapper và test của API.
4. Shared types/constants và Prisma schema/migrations.
5. Package scripts, Dockerfiles, Compose và GitHub Actions workflows.
6. Các data pipeline và hướng dẫn vận hành hiện hành.

Implementation plan hoặc design lịch sử chỉ được dùng để hỗ trợ tìm kiếm, không
được coi là bằng chứng cho một chức năng đã triển khai nếu source hiện tại không
thể hiện chức năng đó.

## Cấu trúc tài liệu

### Phần đầu

- Trang bìa.
- Lời mở đầu.
- Thông tin tài liệu.
- Lịch sử chỉnh sửa.
- Mục lục.
- Danh mục bảng.
- Danh mục hình.
- Danh mục thuật ngữ và chữ viết tắt.

### Phần I — Tổng quan dự án

- Bối cảnh, mục tiêu và phạm vi English Base.
- Đối tượng sử dụng và actor.
- Bản đồ chức năng.
- Hành trình Learner và Admin.
- Công nghệ sử dụng và cấu trúc monorepo.
- Kiến trúc tổng thể và dependency direction.

### Phần II — Phân tích và đặc tả chức năng

Mỗi capability hiện có trong source được trình bày thành một chương. Phạm vi
dự kiến gồm Authentication, Onboarding, Placement Test, Courses, Lessons,
Vocabulary, Saved Words, Practice, Review, Progress, Dashboard, Reading, TOEIC
Reading, TOEIC Listening, TOEIC Grammar, Settings, Admin và các content/data
pipeline.

Mỗi chương gồm:

- Mục tiêu và phạm vi chức năng.
- Actor và quyền truy cập.
- Danh sách use case.
- Mô tả từng use case: tiền điều kiện, trigger, luồng chính, luồng thay thế,
  hậu điều kiện và business rules.
- Luồng giao diện đến API và database.
- Request/response hoặc contract tiêu biểu.
- Trích đoạn frontend/backend code cần thiết để giải thích cách hiện thực.
- Dữ liệu liên quan, xử lý lỗi, bảo mật và kiểm thử.
- Hướng dẫn chạy thử hoặc xác minh khi phù hợp.

Không tuyên bố một use case đã hoàn thành nếu source và test hiện tại không đủ
bằng chứng. Chức năng đang thiết kế hoặc chưa hoàn tất phải được mô tả đúng trạng
thái.

### Phần III — Thiết kế và hiện thực kỹ thuật

- Kiến trúc frontend Web/Admin.
- API NestJS theo capability.
- Shared Interface và wire types.
- Prisma/PostgreSQL và mapping dữ liệu.
- Authentication, session, email, rate limit và error handling.
- Localization, browser transport và query/cache flow.
- Vocabulary, Reading và TOEIC content pipeline.
- Chiến lược kiểm thử và các architecture checks.
- CI, Docker image và GHCR.

Code dùng chung được giải thích tại phần này để tránh lặp lại quá nhiều trong
từng use case.

### Phần IV — Hướng dẫn cài đặt local

Hướng dẫn theo trình tự từ máy mới:

- Cài công cụ cần thiết.
- Clone và cài dependencies.
- Tạo và cấu hình môi trường local.
- Khởi động PostgreSQL.
- Generate Prisma Client và apply migration đã commit.
- Khởi động API, Web và Admin.
- Kiểm tra health và luồng cơ bản.
- Chạy test, type check, lint, build và verification gates.
- Xử lý các lỗi local phổ biến.

Mỗi bước nêu rõ điều kiện, lệnh đầy đủ, giải thích, kết quả mong đợi, cách xác
minh và cách xử lý lỗi. Các thao tác có thể ghi database phải có cảnh báo rõ.

### Phần V — Triển khai production

- Mô hình triển khai đề xuất.
- Chuẩn bị máy chủ, Docker, SSH, firewall, DNS và HTTPS.
- Cấu hình production và quản lý secret.
- PostgreSQL, network, volume và production Compose.
- Build/publish image bằng GitHub Actions và GHCR.
- Cấu hình GitHub Variables, Secrets và Environments.
- Deploy staging, migration, health check và smoke test.
- Deploy production.
- Backup, restore, rollback và xử lý deployment failure.

Nếu repository chưa cung cấp một artifact production bắt buộc, tài liệu phải
nêu rõ khoảng trống và cung cấp mẫu code hoàn chỉnh, nhất quán với workflow hiện
tại, thay vì giả định artifact đã tồn tại.

### Phần VI — Vận hành và bảo trì

- Quy trình release.
- Quản lý log, secret và môi trường.
- Backup/restore PostgreSQL.
- Migration an toàn.
- Seed/import dữ liệu có kiểm soát.
- Vận hành vocabulary và content pipeline.
- Xử lý sự cố và checklist định kỳ.

### Phụ lục

- Danh sách API theo capability.
- Mô hình dữ liệu và bảng quan trọng.
- Danh sách biến môi trường.
- Ma trận actor, quyền và use case.
- Ma trận use case, UI, API, backend và test.
- Lệnh phát triển, kiểm thử và vận hành thường dùng.
- Checklist nghiệm thu local, staging và production.

## Chiến lược sử dụng code

Code trong tài liệu được chia theo mục đích:

1. Lệnh setup/deployment và file cấu hình người đọc phải sử dụng được viết đầy
   đủ, không dùng dấu ba chấm thay cho nội dung bắt buộc.
2. Code giải thích use case được trích ở độ dài vừa đủ để thể hiện validation,
   orchestration, business rule và data flow.
3. Code hạ tầng dùng chung chỉ giải thích một lần và được tham chiếu từ các
   chương chức năng.
4. Generated code, lockfile, dependency source và component dài không liên quan
   trực tiếp không được sao chép toàn bộ vào tài liệu.

## Phân bổ dung lượng dự kiến

Để đạt tối thiểu 200 trang bằng nội dung thực, dung lượng dự kiến được kiểm soát
theo nhóm:

| Nhóm nội dung                  | Số trang dự kiến |
| ------------------------------ | ---------------: |
| Phần đầu và tổng quan          |            15–25 |
| Chức năng và use case          |           95–130 |
| Thiết kế và hiện thực kỹ thuật |            35–50 |
| Cài đặt local và kiểm thử      |            20–30 |
| Triển khai và vận hành         |            30–45 |
| Phụ lục                        |            20–35 |
| **Tổng dự kiến**               |      **215–315** |

Số trang cuối cùng được đo sau khi render Word/PDF với đúng khổ giấy và style;
không chỉ ước lượng từ số từ.

## Kiểm tra chất lượng

Trước khi bàn giao cần kiểm tra:

- Tệp Word mở được và không báo hỏng.
- Mục lục, heading, bảng, caption, header/footer và số trang nhất quán.
- Tổng số trang render đạt ít nhất 200.
- Không còn chỉ dấu công việc chưa hoàn thiện hoặc nội dung mẫu chưa thay thế.
- Code setup/deployment không bị cắt và không chứa secret thật.
- Các lệnh, script, route, API và đường dẫn được đối chiếu với source hiện tại.
- Không trình bày plan lịch sử như chức năng đã triển khai.
- Có đủ luồng thành công, luồng lỗi, business rule và test cho các use case quan
  trọng.
- Có hướng dẫn end-to-end để người mới chạy local và triển khai theo từng bước.

## Ngoài phạm vi

- Không thay đổi behavior của ứng dụng để phục vụ việc viết tài liệu.
- Không chạy seed, migration, database reset, provider hoặc data import thật.
- Không sử dụng secret hoặc dữ liệu production.
- Không cam kết hệ thống production hoạt động nếu các artifact/configuration bắt
  buộc chưa được chủ dự án cung cấp; tài liệu sẽ mô tả rõ điều kiện và khoảng
  trống đó.
