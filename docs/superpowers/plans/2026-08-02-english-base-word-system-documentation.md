# English Base Word System Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo một file Word tiếng Việt tối thiểu 200 trang, mô tả đầy đủ hệ thống English Base, tính năng/use case, code, kiến trúc, database, kiểm thử, setup, deployment và vận hành.

**Architecture:** Nội dung được kiểm kê trực tiếp từ source và tài liệu canonical, sau đó biên soạn theo các chương độc lập nhưng liên kết bằng use case và luồng request. Một công cụ cục bộ tạo `.docx` áp dụng style Word thống nhất, chèn nội dung đã biên tập, bảng, code và sơ đồ; bước kiểm định cuối render tài liệu để đo số trang và rà soát cấu trúc.

**Tech Stack:** Python 3, `python-docx`, Microsoft Word/LibreOffice headless khi khả dụng, PowerShell, TypeScript/NestJS/Next.js/Prisma source hiện tại.

## Global Constraints

- Bàn giao một file `.docx` duy nhất bằng tiếng Việt.
- Khổ A4, Times New Roman, heading nhiều cấp, mục lục, danh mục bảng/hình, header/footer và số trang.
- Tối thiểu 200 trang nội dung có ý nghĩa sau khi render.
- Không tăng trang bằng nội dung lặp, khoảng trắng hoặc cỡ chữ bất hợp lý.
- Code trình bày tự nhiên trong báo cáo; không cần metadata commit/ngày đối chiếu cạnh code.
- Không chứa secret thật hoặc nội dung `.env` thực tế.
- Không chạy migration, seed, reset, provider hoặc data import thật.
- Không thay đổi behavior của ứng dụng.

---

## File Structure

- Create: `tools/documentation/build_english_base_word_document.py` — định nghĩa style Word, helpers, nội dung chương và quy trình sinh `.docx`.
- Create: `tools/documentation/check_english_base_word_document.py` — kiểm tra cấu trúc DOCX, heading, bảng, code, placeholder và số trang render khi có renderer.
- Create: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx` — file bàn giao duy nhất.
- Modify: `docs/superpowers/plans/2026-08-02-english-base-word-system-documentation.md` — đánh dấu tiến độ khi thực thi.

### Task 1: Kiểm kê chức năng và source hiện tại

**Files:**
- Read: `CONTEXT.md`
- Read: `docs/README.md`
- Read: `docs/architecture/*.md`
- Read: `docs/guides/*.md`
- Read: `docs/data/*.md`
- Read: `apps/web/app/**`
- Read: `apps/admin/app/**`
- Read: `apps/api/src/module/**`
- Read: `apps/api/prisma/schema.prisma`
- Read: `.github/workflows/*.yml`

**Interfaces:**
- Consumes: repository hiện tại và tài liệu canonical.
- Produces: danh sách capability, use case, route, API, model, test, script và trạng thái thực tế dùng cho Task 2–5.

- [ ] **Step 1: Liệt kê runtime, capability và route**

Run:

```powershell
rg --files apps/web/app apps/admin/app apps/api/src/module packages/shared/src
```

Expected: danh sách file của Web, Admin, API và Shared để phân nhóm theo capability.

- [ ] **Step 2: Liệt kê controller endpoint và use case backend**

Run:

```powershell
rg -n "@(Get|Post|Put|Patch|Delete)\(|export class .*UseCase|export class .*Usecase" apps/api/src/module
```

Expected: danh sách endpoint và lớp use case có trong source hiện tại.

- [ ] **Step 3: Liệt kê model Prisma, script và test**

Run:

```powershell
rg -n "^model |^enum " apps/api/prisma/schema.prisma
rg --files apps/api/scripts apps/api/src apps/web/app apps/admin/app | rg "(test|spec)\.ts$|scripts/"
```

Expected: danh sách model, enum, pipeline và test để đối chiếu nội dung.

- [ ] **Step 4: Ghi nhận khoảng trống deployment**

Run:

```powershell
Test-Path docker-compose.prod.yml
rg -n "docker-compose\.prod|DEPLOY_|NEXT_PUBLIC_|DATABASE_URL" .github docs .env.example
```

Expected: xác định rõ artifact production hiện có và artifact chỉ được workflow giả định.

## Task 2: Tạo khung Word và kiểm tra cấu trúc

**Files:**
- Create: `tools/documentation/build_english_base_word_document.py`
- Create: `tools/documentation/check_english_base_word_document.py`
- Create: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

**Interfaces:**
- Consumes: dữ liệu kiểm kê Task 1.
- Produces: `build_document(output_path: Path) -> None` và checker nhận đúng output path.

- [ ] **Step 1: Kiểm tra thư viện tạo DOCX**

Run:

```powershell
python -c "import docx; print(docx.__version__)"
```

Expected: in phiên bản `python-docx`; nếu module chưa có, cài dependency ở môi trường công cụ trước khi tiếp tục.

- [ ] **Step 2: Viết khung tài liệu và style**

Implement trong builder:

```python
from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.shared import Cm, Pt

OUTPUT = Path("artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx")

def build_document(output_path: Path = OUTPUT) -> None:
    document = Document()
    section = document.sections[0]
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(3)
    section.right_margin = Cm(2)
    normal = document.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(13)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    document.save(output_path)
```

Expected: khổ A4, lề báo cáo và font nội dung đúng yêu cầu.

- [ ] **Step 3: Thêm helper cho heading, bảng, code, caption và page break**

Implement sáu helper có chữ ký `add_heading(document, text, level)`,
`add_body(document, text)`, `add_code(document, code, language)`,
`add_table(document, headers, rows)`, `add_caption(document, label, text)` và
`add_page_break(document)`. `add_heading` ánh xạ level 1–4 sang Word Heading;
`add_body` thêm paragraph Normal có canh đều và first-line indent; `add_code`
thêm paragraph style Code với font Consolas; `add_table` tạo bảng Table Grid và
in đậm hàng đầu; `add_caption` dùng style Caption; `add_page_break` gọi
`document.add_page_break()`.

Expected: mọi chương dùng chung một hệ style, code dùng font Consolas và bảng có header rõ.

- [ ] **Step 4: Viết checker cấu trúc DOCX**

Checker phải mở DOCX và fail nếu thiếu các điều kiện:

```python
assert document.sections
assert len(document.paragraphs) >= 1
assert any(p.style.name.startswith("Heading") for p in document.paragraphs)
assert any("MỤC LỤC" in p.text.upper() for p in document.paragraphs)
assert any("PHỤ LỤC" in p.text.upper() for p in document.paragraphs)
```

Expected: checker trả exit code khác 0 khi tài liệu thiếu thành phần bắt buộc.

- [ ] **Step 5: Sinh bản khung và chạy checker**

Run:

```powershell
python tools/documentation/build_english_base_word_document.py
python tools/documentation/check_english_base_word_document.py
```

Expected: file DOCX mở được; checker xác nhận khung hợp lệ.

## Task 3: Biên soạn tổng quan, yêu cầu và kiến trúc

**Files:**
- Modify: `tools/documentation/build_english_base_word_document.py`
- Regenerate: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

**Interfaces:**
- Consumes: domain language và architecture canonical.
- Produces: phần đầu, Phần I và các chương nền tảng cho use case.

- [ ] **Step 1: Viết phần đầu tài liệu**

Thêm trang bìa, lời mở đầu, phạm vi, đối tượng, lịch sử chỉnh sửa, mục lục, danh mục bảng/hình và thuật ngữ.

- [ ] **Step 2: Viết tổng quan sản phẩm**

Nội dung phải bao phủ Learner, Admin, runtime ownership, product goals, feature map và user journey.

- [ ] **Step 3: Viết kiến trúc tổng thể**

Nội dung phải thể hiện đúng các luồng:

```text
Localized route -> View -> Feature hook -> Resource API -> Auth transport -> Nest controller -> Use case/service -> Prisma -> PostgreSQL
```

- [ ] **Step 4: Viết công nghệ, cấu trúc source và dependency direction**

Giải thích Next.js, NestJS, Prisma, PostgreSQL, Shared/UI packages, Turbo và pnpm bằng code/tree thực tế.

- [ ] **Step 5: Sinh DOCX và kiểm tra nội dung nền tảng**

Run:

```powershell
python tools/documentation/build_english_base_word_document.py
python tools/documentation/check_english_base_word_document.py
```

Expected: checker tìm thấy phần tổng quan, kiến trúc, actor và thuật ngữ.

## Task 4: Biên soạn tính năng, use case và code

**Files:**
- Modify: `tools/documentation/build_english_base_word_document.py`
- Regenerate: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

**Interfaces:**
- Consumes: inventory Task 1 và nền tảng Task 3.
- Produces: Phần II với các chương capability và ma trận use case.

- [ ] **Step 1: Viết nhóm tài khoản và khởi tạo hành trình**

Bao phủ Authentication, email verification/password reset nếu source đã hoàn tất, Onboarding, Settings và Placement Test.

- [ ] **Step 2: Viết nhóm học General English**

Bao phủ Courses, Units, Lessons, Vocabulary, Saved Words, Practice, Review, Progress và Dashboard.

- [ ] **Step 3: Viết Reading**

Bao phủ catalog/detail, attempt submission, grading, history, Admin publication và content import theo source hiện tại.

- [ ] **Step 4: Viết TOEIC**

Bao phủ TOEIC Reading, Listening, Dictation và Grammar theo capability/source hiện tại; phân biệt Full Test, Part practice và content acquisition/import.

- [ ] **Step 5: Viết Admin và content pipelines**

Bao phủ Course Management và các workflow quản lý/import có thật; không mô tả Admin như backend domain mặc định.

- [ ] **Step 6: Chuẩn hóa từng use case**

Mỗi use case quan trọng phải có bảng actor/điều kiện, luồng chính, luồng thay thế, business rule, API, code, database, test và xác minh.

- [ ] **Step 7: Sinh và kiểm tra DOCX**

Run builder/checker và xác nhận tất cả capability chính xuất hiện trong heading và ma trận use case.

## Task 5: Biên soạn setup, deployment và vận hành

**Files:**
- Modify: `tools/documentation/build_english_base_word_document.py`
- Regenerate: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

**Interfaces:**
- Consumes: package scripts, environment guide, Dockerfiles, workflows và data guides.
- Produces: Phần IV–VI và phụ lục thao tác.

- [ ] **Step 1: Viết setup local từ máy mới**

Đưa đầy đủ lệnh PowerShell từ prerequisites đến `pnpm dev`, endpoint, health check và lỗi thường gặp.

- [ ] **Step 2: Viết verification**

Bao phủ architecture check, test, type check, lint, build, format và vocabulary workflow tests đúng guide.

- [ ] **Step 3: Viết production deployment**

Bao phủ server bootstrap, `.env.production`, Compose production mẫu, GHCR, GitHub Variables/Secrets, staging, migration, deploy và health check. Mẫu chưa tồn tại trong repo phải được ghi rõ là mẫu cần tạo trên server.

- [ ] **Step 4: Viết vận hành an toàn**

Bao phủ release, backup/restore, rollback image, migration failure, log, secret và incident checklist.

- [ ] **Step 5: Viết data/content operations**

Bao phủ seed/import như thao tác riêng cần xác nhận, phân biệt inventory/validate không ghi DB với import/apply có ghi DB.

- [ ] **Step 6: Hoàn thiện phụ lục**

Thêm API inventory, environment variables, command reference, data model, quyền, use case-code-test matrix và checklist nghiệm thu.

## Task 6: Kiểm định 200 trang và chất lượng nội dung

**Files:**
- Modify: `tools/documentation/check_english_base_word_document.py`
- Modify: `tools/documentation/build_english_base_word_document.py` khi phát hiện thiếu nội dung.
- Regenerate: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

**Interfaces:**
- Consumes: DOCX hoàn chỉnh.
- Produces: bằng chứng cấu trúc, độ dài và khả năng mở/render.

- [ ] **Step 1: Quét placeholder và secret**

Checker fail khi nội dung có chỉ dấu chưa hoàn thiện hoặc các giá trị nhạy cảm từ `.env` thật.

- [ ] **Step 2: Kiểm tra coverage**

Checker xác nhận các phần Tổng quan, Use case, Kiến trúc, Database, Kiểm thử, Cài đặt, Triển khai, Vận hành và Phụ lục đều tồn tại.

- [ ] **Step 3: Render PDF để đo số trang**

Run khi LibreOffice có sẵn:

```powershell
soffice --headless --convert-to pdf --outdir artifacts artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx
```

Expected: PDF được tạo thành công. Dùng PDF page count để xác nhận `>= 200`.

- [ ] **Step 4: Bổ sung nội dung còn mỏng nếu chưa đủ 200 trang**

Chỉ mở rộng bằng use case, API, business rule, test scenario, giải thích code, troubleshooting hoặc checklist thực tế còn thiếu; không nhân bản đoạn văn.

- [ ] **Step 5: Chạy kiểm tra cuối**

Run:

```powershell
python tools/documentation/build_english_base_word_document.py
python tools/documentation/check_english_base_word_document.py
```

Expected: DOCX hợp lệ, không placeholder/secret, đầy đủ section và page count render ít nhất 200.

## Task 7: Bàn giao

**Files:**
- Final: `artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx`

**Interfaces:**
- Consumes: kết quả kiểm định Task 6.
- Produces: file Word duy nhất cho người dùng.

- [ ] **Step 1: Kiểm tra file và dung lượng**

Run:

```powershell
Get-Item artifacts/English-Base-Tai-lieu-he-thong-va-huong-dan-trien-khai.docx | Select-Object FullName,Length,LastWriteTime
```

Expected: file tồn tại, dung lượng khác 0 và timestamp thuộc lần build cuối.

- [ ] **Step 2: Kiểm tra git diff không chạm application behavior**

Run:

```powershell
git status --short
```

Expected: chỉ có artifact/công cụ tài liệu và các thay đổi có sẵn của người dùng; không có thay đổi application behavior do công việc tài liệu tạo ra.

- [ ] **Step 3: Bàn giao đường dẫn file và kết quả kiểm định**

Báo cáo đường dẫn Word, tổng số trang render, phạm vi nội dung và các khoảng trống production được ghi trong tài liệu.
