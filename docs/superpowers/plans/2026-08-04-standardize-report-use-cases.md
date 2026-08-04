# Standardized Report Use Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo một bản Word mới của báo cáo English Base với mục 3.14 chứa đủ 20 đặc tả Use Case chuẩn, đúng source và có bố cục được kiểm định.

**Architecture:** Một pipeline Python đọc báo cáo gốc và bằng chứng trong repository, dựng catalog UC01–UC20 có schema chặt chẽ, rồi thay đúng phạm vi mục 3.14 trong bản sao `.docx`. PowerShell/Word COM cập nhật mục lục và xuất PDF kiểm tra; validator độc lập kiểm tra nội dung, số lượng, actor, đường dẫn source và kết quả render.

**Tech Stack:** Python 3.13, `python-docx`, `PyPDF2`/`pypdf`, PowerShell, Microsoft Word COM, `unittest`, Git.

## Global Constraints

- Không ghi đè `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.docx`.
- File Word bàn giao là `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx`.
- Giữ mã UC01–UC20 và phạm vi chức năng đã được duyệt trong spec.
- Mỗi Use Case có đủ tám trường: Use Case Name, Use Case ID, Use Case Description, Actor, Priority, Trigger, Pre-Condition và Post-Condition.
- Mỗi Use Case có sáu phần: luồng chính, luồng thay thế, luồng ngoại lệ, quy tắc nghiệp vụ, dữ liệu vào/ra và truy vết triển khai.
- Courses, Progress, Vocabulary, Reading, Practice, Dashboard, TOEIC, Prisma và database không được ghi là actor.
- Không mô tả tính năng chưa có bằng chứng trong source và không khẳng định dữ liệu đã import/seed chỉ vì schema tồn tại.
- Bản gốc giữ nguyên checksum; file đầu ra phải được render và kiểm tra trực quan trước bàn giao.

---

## File Structure

- Create `tools/reporting/use_case_standardizer/__init__.py`: khai báo package.
- Create `tools/reporting/use_case_standardizer/use_case_catalog.py`: schema, enum và nội dung UC01–UC20.
- Create `tools/reporting/use_case_standardizer/source_evidence.py`: kiểm tra đường dẫn và thu bằng chứng route/controller/use case/model/test.
- Create `tools/reporting/use_case_standardizer/rewrite_report.py`: sao chép cấu trúc báo cáo và thay mục 3.14.
- Create `tools/reporting/use_case_standardizer/finalize_word.ps1`: cập nhật field/mục lục, lưu DOCX và xuất PDF.
- Create `tools/reporting/use_case_standardizer/validate_report.py`: kiểm tra DOCX/PDF và xuất JSON kết quả.
- Create `tools/reporting/use_case_standardizer/tests/test_catalog.py`: kiểm thử schema và nội dung 20 Use Case.
- Create `tools/reporting/use_case_standardizer/tests/test_source_evidence.py`: kiểm thử mọi tham chiếu source tồn tại.
- Create `tools/reporting/use_case_standardizer/tests/test_rewrite_report.py`: kiểm thử thay đúng mục 3.14 và giữ nội dung ngoài phạm vi.
- Create `tools/reporting/use_case_standardizer/tests/test_validate_report.py`: kiểm thử validator phát hiện lỗi cấu trúc/actor.
- Create `artifacts/use-case-standardization/source-evidence.json`: bằng chứng source đã thu thập.
- Create `artifacts/use-case-standardization/validation.json`: số liệu và kết quả kiểm định cuối.

### Task 1: Define the strict Use Case catalog

**Files:**

- Create: `tools/reporting/use_case_standardizer/__init__.py`
- Create: `tools/reporting/use_case_standardizer/use_case_catalog.py`
- Test: `tools/reporting/use_case_standardizer/tests/test_catalog.py`

**Interfaces:**

- Produces: `UseCaseSpec`, `FlowStep`, `Traceability`, `build_use_case_catalog() -> tuple[UseCaseSpec, ...]`, `validate_catalog(catalog) -> list[str]`.

- [ ] **Step 1: Write the failing catalog test**

```python
from tools.reporting.use_case_standardizer.use_case_catalog import (
    build_use_case_catalog,
    validate_catalog,
)


def test_catalog_has_twenty_complete_unique_use_cases():
    catalog = build_use_case_catalog()
    assert [uc.id for uc in catalog] == [f"UC{i:02d}" for i in range(1, 21)]
    assert validate_catalog(catalog) == []
    for uc in catalog:
        assert all((uc.name, uc.description, uc.actor, uc.priority,
                    uc.trigger, uc.pre_condition, uc.post_condition))
        assert uc.main_flow and uc.alternative_flows and uc.exception_flows
        assert uc.business_rules and uc.inputs and uc.outputs
```

- [ ] **Step 2: Run the test and confirm the module is absent**

Run: `python -m unittest tools.reporting.use_case_standardizer.tests.test_catalog -v`

Expected: FAIL with `ModuleNotFoundError`.

- [ ] **Step 3: Implement the schema and validation**

```python
from dataclasses import dataclass
from typing import Literal

Priority = Literal["Cao", "Trung bình", "Thấp"]

@dataclass(frozen=True)
class FlowStep:
    number: str
    actor_action: str
    system_response: str

@dataclass(frozen=True)
class Traceability:
    ui_routes: tuple[str, ...]
    api_paths: tuple[str, ...]
    source_paths: tuple[str, ...]
    data_models: tuple[str, ...]
    test_paths: tuple[str, ...]

@dataclass(frozen=True)
class UseCaseSpec:
    id: str
    name: str
    description: str
    actor: str
    supporting_actors: tuple[str, ...]
    priority: Priority
    trigger: str
    pre_condition: str
    post_condition: str
    main_flow: tuple[FlowStep, ...]
    alternative_flows: tuple[str, ...]
    exception_flows: tuple[str, ...]
    business_rules: tuple[str, ...]
    inputs: tuple[str, ...]
    outputs: tuple[str, ...]
    traceability: Traceability

FORBIDDEN_ACTORS = {
    "Courses", "Progress", "Vocabulary", "Reading", "Practice",
    "Dashboard", "TOEIC", "Prisma", "Database",
}

def validate_catalog(catalog: tuple[UseCaseSpec, ...]) -> list[str]:
    errors: list[str] = []
    expected = [f"UC{i:02d}" for i in range(1, 21)]
    actual = [uc.id for uc in catalog]
    if actual != expected:
        errors.append(f"Expected {expected}, got {actual}")
    for uc in catalog:
        if uc.actor in FORBIDDEN_ACTORS:
            errors.append(f"{uc.id}: internal component used as actor")
        if not uc.main_flow or not uc.alternative_flows or not uc.exception_flows:
            errors.append(f"{uc.id}: incomplete flows")
    return errors
```

Complete `build_use_case_catalog()` with individually written UC01–UC20 content from the approved design. Do not generate repeated boilerplate from a name list.

- [ ] **Step 4: Run the catalog test**

Run: `python -m unittest tools.reporting.use_case_standardizer.tests.test_catalog -v`

Expected: PASS; 20 IDs in exact order and no validation errors.

- [ ] **Step 5: Commit the catalog**

```powershell
git add tools/reporting/use_case_standardizer
git commit -m "docs: define standardized use case catalog"
```

### Task 2: Collect and validate source traceability

**Files:**

- Create: `tools/reporting/use_case_standardizer/source_evidence.py`
- Create: `tools/reporting/use_case_standardizer/tests/test_source_evidence.py`
- Create: `artifacts/use-case-standardization/source-evidence.json`

**Interfaces:**

- Consumes: `build_use_case_catalog()`.
- Produces: `collect_source_evidence(root: Path, catalog: tuple[UseCaseSpec, ...]) -> dict`, `validate_source_paths(root: Path, catalog) -> list[str]`.

- [ ] **Step 1: Write the failing source-path test**

```python
from pathlib import Path
from tools.reporting.use_case_standardizer.source_evidence import validate_source_paths
from tools.reporting.use_case_standardizer.use_case_catalog import build_use_case_catalog


def test_every_traceability_source_path_exists():
    root = Path(__file__).resolve().parents[4]
    assert validate_source_paths(root, build_use_case_catalog()) == []
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `python -m unittest tools.reporting.use_case_standardizer.tests.test_source_evidence -v`

Expected: FAIL because `source_evidence` does not exist.

- [ ] **Step 3: Implement exact path validation and JSON evidence output**

```python
def validate_source_paths(root: Path, catalog) -> list[str]:
    errors: list[str] = []
    for uc in catalog:
        for relative in (*uc.traceability.source_paths, *uc.traceability.test_paths):
            if not (root / relative).is_file():
                errors.append(f"{uc.id}: missing {relative}")
    return errors
```

The collector must store repository-relative paths, endpoint strings and data model names without reading secrets or `.env` values.

- [ ] **Step 4: Run the evidence tests and write the artifact**

Run: `python -m tools.reporting.use_case_standardizer.source_evidence --root . --output artifacts/use-case-standardization/source-evidence.json`

Expected: exit 0; JSON contains exactly 20 top-level Use Case entries and no missing paths.

- [ ] **Step 5: Commit source evidence tooling**

```powershell
git add tools/reporting/use_case_standardizer artifacts/use-case-standardization/source-evidence.json
git commit -m "docs: trace report use cases to source"
```

### Task 3: Rewrite only section 3.14 in a copied report

**Files:**

- Create: `tools/reporting/use_case_standardizer/rewrite_report.py`
- Create: `tools/reporting/use_case_standardizer/tests/test_rewrite_report.py`
- Produce: `artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.draft.docx`

**Interfaces:**

- Consumes: `UseCaseSpec`, source DOCX path.
- Produces: `rewrite_use_case_section(source: Path, output: Path, catalog) -> None`.

- [ ] **Step 1: Write the failing document rewrite test**

```python
def test_rewrite_preserves_outer_sections_and_inserts_twenty_specs(tmp_path):
    source = make_minimal_report(tmp_path / "source.docx")
    output = tmp_path / "output.docx"
    rewrite_use_case_section(source, output, build_use_case_catalog())
    document = Document(output)
    text = "\n".join(p.text for p in document.paragraphs)
    assert "3.13. Sơ đồ Use Case" in text
    assert "3.15." in text
    assert text.count("Use Case ID") == 20
    assert all(f"UC{i:02d}" in text for i in range(1, 21))
```

- [ ] **Step 2: Run the test and confirm failure**

Run: `python -m unittest tools.reporting.use_case_standardizer.tests.test_rewrite_report -v`

Expected: FAIL because the rewrite function is missing.

- [ ] **Step 3: Implement section-boundary replacement and Word formatting**

Locate the paragraph whose normalized text equals `3.14. Đặc tả các Use Case chính` and the next same-level heading. Remove only nodes between those boundaries. Insert each Use Case with a heading, eight-field metadata table, three-column main-flow table and the six required subsections. Set table header repetition with WordprocessingML and prevent the Use Case heading from separating from its metadata table.

The function must refuse to write when either boundary is missing, when `source.resolve() == output.resolve()`, or when `validate_catalog()` returns errors.

- [ ] **Step 4: Run rewrite tests and create the draft**

Run:

```powershell
python -m unittest tools.reporting.use_case_standardizer.tests.test_rewrite_report -v
python -m tools.reporting.use_case_standardizer.rewrite_report --source "C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.docx" --output "artifacts\use-case-standardization\English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.draft.docx"
```

Expected: tests PASS; draft exists; source SHA-256 before and after is identical.

- [ ] **Step 5: Commit the rewrite engine and tests**

```powershell
git add tools/reporting/use_case_standardizer
git commit -m "docs: generate standardized use case section"
```

### Task 4: Finalize Word fields and create a PDF proof

**Files:**

- Create: `tools/reporting/use_case_standardizer/finalize_word.ps1`
- Consume: draft DOCX.
- Produce: final DOCX and proof PDF.

**Interfaces:**

- Produces CLI: `finalize_word.ps1 -InputDocx <path> -OutputDocx <path> -OutputPdf <path>`.

- [ ] **Step 1: Add argument and input-safety checks**

```powershell
param(
  [Parameter(Mandatory=$true)][string]$InputDocx,
  [Parameter(Mandatory=$true)][string]$OutputDocx,
  [Parameter(Mandatory=$true)][string]$OutputPdf
)
$inputPath = (Resolve-Path -LiteralPath $InputDocx).Path
if ([IO.Path]::GetFullPath($OutputDocx) -eq $inputPath) {
  throw "OutputDocx must differ from InputDocx"
}
```

- [ ] **Step 2: Implement Word COM finalization with guaranteed cleanup**

Open the draft invisibly, update every field and table of contents twice, repaginate, save to `OutputDocx`, export format 17 to `OutputPdf`, close the document and quit Word inside `finally`. Release COM objects so no `WINWORD.EXE` process remains.

- [ ] **Step 3: Run finalization to workspace artifacts first**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools/reporting/use_case_standardizer/finalize_word.ps1 `
  -InputDocx artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.draft.docx `
  -OutputDocx artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx `
  -OutputPdf artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.pdf
```

Expected: both files exist, Word process exits, and the source report checksum remains unchanged.

- [ ] **Step 4: Commit finalization tooling**

```powershell
git add tools/reporting/use_case_standardizer/finalize_word.ps1
git commit -m "docs: finalize standardized Word report"
```

### Task 5: Validate structure, source accuracy and rendered layout

**Files:**

- Create: `tools/reporting/use_case_standardizer/validate_report.py`
- Create: `tools/reporting/use_case_standardizer/tests/test_validate_report.py`
- Create: `artifacts/use-case-standardization/validation.json`
- Produce: `artifacts/use-case-standardization/rendered-pages/page-*.png`

**Interfaces:**

- Produces: `validate_report(docx: Path, pdf: Path, root: Path) -> dict`, CLI with `--docx`, `--pdf`, `--root`, `--output` and `--render-dir`.

- [ ] **Step 1: Write failing validator tests**

```python
def test_validator_rejects_missing_fields_and_internal_actor(tmp_path):
    docx = build_invalid_report(tmp_path / "bad.docx", actor="Progress")
    result = validate_report(docx, tmp_path / "bad.pdf", REPO_ROOT)
    assert "missing Use Case Name" in result["errors"]
    assert "internal component used as actor" in result["errors"]
```

- [ ] **Step 2: Run the validator test and confirm failure**

Run: `python -m unittest tools.reporting.use_case_standardizer.tests.test_validate_report -v`

Expected: FAIL because the validator is absent.

- [ ] **Step 3: Implement strict validation**

The validator must report: DOCX/PDF page counts, paragraph/table/figure counts, UC IDs found, missing metadata labels, missing six subsections, forbidden actors, missing source paths, duplicate boilerplate paragraphs and source checksum. It exits nonzero when `errors` is non-empty.

- [ ] **Step 4: Run all tests and final validator**

Run:

```powershell
python -m unittest discover -s tools/reporting/use_case_standardizer/tests -v
python -m compileall -q tools/reporting/use_case_standardizer
python -m tools.reporting.use_case_standardizer.validate_report `
  --docx artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx `
  --pdf artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.pdf `
  --root . `
  --output artifacts/use-case-standardization/validation.json `
  --render-dir artifacts/use-case-standardization/rendered-pages
```

Expected: all tests PASS; validation JSON has `"errors": []`, IDs UC01–UC20 and matching DOCX/PDF page counts.

- [ ] **Step 5: Inspect rendered pages**

Open the page containing UC01, one middle Use Case, UC20, the table of contents and both section boundaries. Confirm no clipped tables, orphan headings, broken Vietnamese, stale page references or blank pages caused by the replacement.

- [ ] **Step 6: Commit validator and validation artifact**

```powershell
git add tools/reporting/use_case_standardizer artifacts/use-case-standardization/validation.json
git commit -m "test: validate standardized use case report"
```

### Task 6: Deliver the new report without modifying the original

**Files:**

- Copy from: `artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx`
- Copy to: `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx`
- Optionally copy proof PDF to: `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.pdf`

**Interfaces:**

- Consumes: validated final artifacts.
- Produces: user-facing Word report and optional PDF proof.

- [ ] **Step 1: Verify final checksums and validation status**

Run:

```powershell
Get-FileHash -Algorithm SHA256 "C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.docx"
Get-FileHash -Algorithm SHA256 artifacts/use-case-standardization/English_Base_Bao_Cao_Do_An_UseCase_ChuanHoa.docx
Get-Content artifacts/use-case-standardization/validation.json
```

Expected: source and output hashes differ; validation contains `"errors": []`.

- [ ] **Step 2: Copy the validated files to Downloads**

Use `Copy-Item -LiteralPath` with explicit source and destination paths. Because Downloads is outside the writable repository root, request filesystem approval for this exact copy. Do not delete or overwrite the original report.

- [ ] **Step 3: Verify the delivered files**

Run: `Get-Item` and `Get-FileHash` for the delivered Word/PDF files.

Expected: nonzero sizes; hashes match the validated workspace artifacts; original report hash remains unchanged.

- [ ] **Step 4: Handoff**

Report the clickable Word/PDF paths, total pages, 20/20 Use Cases, validation result, source commit used for evidence and the fact that the original file was preserved.
