# English Base Academic Report Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise the existing 235-page English Base DOCX into a 210–250 page evidence-based academic report with real source analysis, honest verification results, reachable product screenshots, refreshed Word fields, a checked PDF, and a complete change log.

**Architecture:** Treat the current DOCX as the canonical document and transform only targeted chapter ranges. Build a reproducible evidence bundle first, then compose replacement chapter content from that bundle, edit the DOCX, finalize it with Microsoft Word, and validate both structure and rendered pages. Runtime evidence is isolated from documentation composition so a failed local service produces an honest result instead of blocking source-backed revision.

**Tech Stack:** Python 3, `python-docx`, PowerShell, Microsoft Word COM automation, Node.js 22.17.0, pnpm 10.30.1, Turbo, Docker Compose, PostgreSQL 15, Prisma, Playwright or installed browser automation, PyPDF, Mermaid.

## Global Constraints

- The canonical input is `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Hoan_Chinh.docx`; the existing PDF is comparison-only.
- Write final deliverables to `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.docx`, `.pdf`, and `English_Base_Change_Log.txt`.
- Final PDF must have at least 200 pages; target 210–250 pages without padding, repeated prose, blank lines, or enlarged type.
- Preserve approved front matter, real diagrams, references, and appendices unless current source proves them incorrect.
- Use only current source excerpts and observed command/API/browser evidence.
- Never fabricate screenshots, tests, deployment status, student IDs, database state, or references.
- Never expose secrets, cookies, tokens, private email addresses, authorization headers, or database connection strings.
- Database writes are allowed only after proving the resolved target is local and isolated.
- Never run `db:migrate:reset`, `db:push`, vocabulary synchronization, enrichment, AI-provider, or production/shared-database commands.
- Do not change application behavior as part of this documentation task.

---

### Task 1: Establish the evidence workspace and baseline report inventory

**Files:**
- Create: `tools/documentation/revision/report_inventory.py`
- Create: `artifacts/academic-report-revision/baseline/report-inventory.json`
- Create: `artifacts/academic-report-revision/baseline/report-headings.txt`
- Test: `tools/documentation/revision/tests/test_report_inventory.py`

**Interfaces:**
- Consumes: existing DOCX and comparison PDF paths.
- Produces: `inventory_report(docx_path: Path, pdf_path: Path) -> ReportInventory` and JSON containing pages, sections, headings, tables, captions, media, fields, placeholders, repeated paragraphs, and chapter boundaries.

- [ ] **Step 1: Write inventory tests using a minimal fixture DOCX**

  Verify heading boundaries, placeholder detection, `.99` detection, repeated paragraph normalization, media count, TOC field count, and PDF page count.

- [ ] **Step 2: Run the focused test and confirm it fails before implementation**

  Run: `python -m unittest tools.documentation.revision.tests.test_report_inventory -v`

  Expected: failure because `report_inventory` does not exist.

- [ ] **Step 3: Implement the inventory reader**

  Use `python-docx` for paragraphs/tables/sections, ZIP XML inspection for media and field codes, and PyPDF for page count. Store normalized hashes for paragraphs longer than 80 characters to expose large-scale duplication.

- [ ] **Step 4: Run focused tests and create the baseline inventory**

  Run:

  ```powershell
  python -m unittest tools.documentation.revision.tests.test_report_inventory -v
  python tools/documentation/revision/report_inventory.py `
    --docx C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Hoan_Chinh.docx `
    --pdf C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Hoan_Chinh.pdf `
    --output artifacts/academic-report-revision/baseline
  ```

  Expected: tests pass and baseline JSON identifies seven chapters, known placeholders, `.99` headings, and the current page count.

### Task 2: Collect a source-backed implementation manifest

**Files:**
- Create: `tools/documentation/revision/source_evidence.py`
- Create: `tools/documentation/revision/source-evidence-map.json`
- Create: `artifacts/academic-report-revision/source/source-evidence.json`
- Create: `artifacts/academic-report-revision/source/source-excerpts.json`
- Test: `tools/documentation/revision/tests/test_source_evidence.py`

**Interfaces:**
- Consumes: repository root and a curated evidence-map configuration.
- Produces: `collect_source_evidence(root: Path, evidence_map: dict) -> SourceEvidence` with routes, frontend features/hooks/APIs, controllers, use cases/services, Prisma models/relations, workflows, Docker configuration, environment names, and sanitized 10–35 line excerpts.

- [ ] **Step 1: Map the required report functions to concrete source paths**

  Include Auth, Placement Test, Courses/Lessons/Challenges, Progress, Vocabulary/Flashcard/Review, Practice, Reading, TOEIC Listening/Reading/Grammar/Dictation, Dashboard/Leaderboard, and Admin management.

- [ ] **Step 2: Write tests for path existence, excerpt range limits, secret filtering, and unsupported-feature handling**

  Run: `python -m unittest tools.documentation.revision.tests.test_source_evidence -v`

  Expected: failure until the collector exists.

- [ ] **Step 3: Implement source collection without importing application runtime code**

  Parse filenames and TypeScript text conservatively. Record exact relative path, line start/end, exported symbol, evidence category, and feature. Reject excerpts containing assignments to secret-like names or literal authorization/cookie values.

- [ ] **Step 4: Compare diagram entities and modules with source**

  Parse `apps/api/prisma/schema.prisma`, Nest module/controller files, and frontend route files. Produce discrepancies for diagram regeneration rather than silently accepting stale relations.

- [ ] **Step 5: Run tests and emit the current source manifest**

  Expected: every Chapter 5 function has at least one concrete source reference or an explicit `unsupported` status.

### Task 3: Prepare an isolated local runtime and record environment facts

**Files:**
- Create: `tools/documentation/revision/runtime_evidence.ps1`
- Create: `artifacts/academic-report-revision/runtime/environment.json`
- Create: `artifacts/academic-report-revision/runtime/database-safety.json`
- Create: `artifacts/academic-report-revision/runtime/commands.jsonl`

**Interfaces:**
- Consumes: repository `.env` without printing secret values.
- Produces: sanitized environment metadata and `Invoke-RecordedCommand` records with command label, start/end time, duration, exit code, status, and redacted log path.

- [ ] **Step 1: Implement environment and secret-name inspection**

  Record Windows version, Node, pnpm, Docker, browser versions, Git branch/commit, and environment variable names only.

- [ ] **Step 2: Prove database isolation before any write**

  Resolve the database host and port without logging credentials. Accept only loopback hosts or the repository Compose service reached through the local Docker network. Abort migration/seed if the host is remote, ambiguous, or already associated with an external environment.

- [ ] **Step 3: Start the local PostgreSQL Compose service**

  Run: `docker compose up -d db`

  Then run: `docker compose ps` and the configured health check. Record failure honestly if Docker Desktop is unavailable.

- [ ] **Step 4: Generate Prisma client and apply non-destructive migrations**

  Run `pnpm db:generate`, followed by the repository-documented local migration command only after the isolation assertion passes. Never use reset or push.

- [ ] **Step 5: Run the repository seed only against the confirmed isolated database**

  Record the actual result and sanitized log. Do not run provider-backed data workflows.

### Task 4: Run verification gates and build an honest test ledger

**Files:**
- Create: `artifacts/academic-report-revision/verification/verification-results.json`
- Create: `artifacts/academic-report-revision/verification/logs/*.log`
- Create: `artifacts/academic-report-revision/verification/functional-cases.json`

**Interfaces:**
- Consumes: `Invoke-RecordedCommand` from Task 3.
- Produces: structured results used verbatim by Chapter 6; only exit code zero becomes `Pass`.

- [ ] **Step 1: Run `pnpm architecture:check` and record duration/output**
- [ ] **Step 2: Run `pnpm test` and record duration/output**
- [ ] **Step 3: Run `pnpm check-types` and record duration/output**
- [ ] **Step 4: Run `pnpm lint` and record duration/output**
- [ ] **Step 5: Run `pnpm build` and record duration/output**
- [ ] **Step 6: Extract real totals only where the tool output provides them**

  Do not infer test counts. Failures retain the main message, likely cause only when evidenced, remediation attempted, and final state.

- [ ] **Step 7: Create functional-test records**

  Each record contains ID, precondition, input, steps, expected result, actual result, status, and evidence reference. Unexecuted cases use `Chưa kiểm chứng trong lần nghiệm thu tài liệu.` rather than Pass/Fail.

### Task 5: Start Web, Admin, and API and capture runtime/API evidence

**Files:**
- Create: `tools/documentation/revision/start_local_stack.ps1`
- Create: `tools/documentation/revision/capture_runtime_evidence.mjs`
- Create: `artifacts/academic-report-revision/runtime/services.json`
- Create: `artifacts/academic-report-revision/api/*.json`
- Create: `artifacts/academic-report-revision/screenshots/*.png`
- Create: `artifacts/academic-report-revision/screenshots/manifest.json`

**Interfaces:**
- Consumes: isolated local database and repository dev scripts.
- Produces: service health records, sanitized API request/response pairs, screenshots with route, viewport, timestamp, caption, and verification status.

- [ ] **Step 1: Start API, Web, and Admin as hidden background processes with separate logs**

  Use ports from repository configuration and validate each URL before capture. Record startup failure rather than editing app behavior.

- [ ] **Step 2: Capture public/auth screens at desktop width**

  Capture real login and registration screens first. Use local test users only if the seed provides them or a safe registration flow succeeds.

- [ ] **Step 3: Exercise reachable learner functions**

  Attempt Dashboard, Placement Test, Course, Unit/Lesson, Challenge, Saved Words, Flashcard/Review, Reading, TOEIC modes, and Leaderboard. Capture only real reachable states, including legitimate empty/error states where useful.

- [ ] **Step 4: Exercise reachable Admin functions**

  Attempt Admin Dashboard, Courses, Lessons/Challenges, Reading, Users, and Settings with an authorized local account. Do not elevate privileges through direct database edits unless the repository seed explicitly creates an Admin identity.

- [ ] **Step 5: Capture responsive states**

  For representative learner and Admin pages, capture desktop, tablet, and mobile viewports and record form validation/loading/empty/error states that can be reproduced.

- [ ] **Step 6: Capture sanitized API examples**

  Record real Login, Register, Course, Lesson, Complete Challenge, Progress, Flashcard Session, Reading Submit, TOEIC Listening Submit, and TOEIC Reading Submit responses only when safely executable. Replace tokens and personal values with `[REDACTED]` in stored evidence.

- [ ] **Step 7: Stop application processes while preserving the local database volume**

### Task 6: Compose concise replacement content for Chapters 1–4

**Files:**
- Create: `tools/documentation/revision/content/front_chapters.py`
- Create: `artifacts/academic-report-revision/content/chapters-1-4.json`
- Test: `tools/documentation/revision/tests/test_front_chapters.py`

**Interfaces:**
- Consumes: baseline inventory and source-evidence manifest.
- Produces: ordered document blocks (`heading`, `paragraph`, `table`, `figure`, `caption`, `code`) with citations to evidence records.

- [ ] **Step 1: Write structural tests for page-budget proxies and forbidden repetition**

  Assert one scope disclaimer maximum, seven Chapter 2 groups, 10–12 detailed use cases, summarized remaining use cases, no `.99`, no repeated technical boilerplate, and no placeholder figure.

- [ ] **Step 2: Write Chapter 1 in natural Vietnamese student prose**
- [ ] **Step 3: Write the seven consolidated Chapter 2 sections with source examples**
- [ ] **Step 4: Write Chapter 3 with 10–12 concise core use cases and the summary table**
- [ ] **Step 5: Verify and explain each retained Chapter 4 diagram against source evidence**
- [ ] **Step 6: Run content tests and duplication analysis**

### Task 7: Compose implementation-focused Chapter 5

**Files:**
- Create: `tools/documentation/revision/content/chapter5.py`
- Create: `artifacts/academic-report-revision/content/chapter-5.json`
- Test: `tools/documentation/revision/tests/test_chapter5.py`

**Interfaces:**
- Consumes: source excerpts, screenshot manifest, API evidence, Prisma relationships, and route manifest.
- Produces: Chapter 5 blocks with evidence classifications and no fake UI figures.

- [ ] **Step 1: Write tests requiring all eight functional groups and evidence links**
- [ ] **Step 2: Compose Authentication and Placement Test sections**
- [ ] **Step 3: Compose Course/Lesson/Challenge and Progress sections**
- [ ] **Step 4: Compose Vocabulary/Flashcard/Review and Practice/Reading sections**
- [ ] **Step 5: Compose separate TOEIC Listening, Reading, Grammar, and Dictation sections**
- [ ] **Step 6: Compose Dashboard/Leaderboard and Admin sections**
- [ ] **Step 7: Insert only 10–35 line real code excerpts with explanations**
- [ ] **Step 8: Insert only verified screenshots/API examples; route missing evidence to checklist**
- [ ] **Step 9: Run structural, secret, duplication, and evidence-reference tests**

### Task 8: Compose Chapters 6–7, conclusion, and final checklist

**Files:**
- Create: `tools/documentation/revision/content/back_chapters.py`
- Create: `artifacts/academic-report-revision/content/chapters-6-7-conclusion.json`
- Test: `tools/documentation/revision/tests/test_back_chapters.py`

**Interfaces:**
- Consumes: runtime/verification results and source deployment configuration.
- Produces: actual-result tables, installation runbook, conclusion, and consolidated missing-data checklist.

- [ ] **Step 1: Write tests enforcing honest status vocabulary**

  `Pass` must reference a zero-exit command or executed functional case. Production deployment must remain source-confirmed/proposed unless deployment evidence exists.

- [ ] **Step 2: Compose the environment and verification-gate results**
- [ ] **Step 3: Compose functional/API/UI test cases from the ledger**
- [ ] **Step 4: Compose Chapter 7 as the source-backed local/Docker/CI/operations guide**
- [ ] **Step 5: Compose conclusion and feasible future directions**
- [ ] **Step 6: Consolidate missing IDs, screenshots, unexecuted tests, and external deployment proof into one checklist**

### Task 9: Transform the existing DOCX and preserve approved sections

**Files:**
- Create: `tools/documentation/revision/revise_existing_docx.py`
- Create: `tools/documentation/revision/docx_styles.py`
- Create: `tools/documentation/revision/docx_blocks.py`
- Create: `tools/documentation/revision/tests/test_docx_revision.py`
- Create: `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.docx`

**Interfaces:**
- Consumes: canonical DOCX and all content JSON bundles.
- Produces: revised DOCX preserving front matter and appendices while replacing Chapter 1–7 and conclusion ranges.

- [ ] **Step 1: Write a fixture test that proves retained sections survive byte-level media reuse and target chapters are replaced**
- [ ] **Step 2: Implement chapter-boundary replacement using document XML order**
- [ ] **Step 3: Implement styles for academic prose, captions, tables, code, JSON, and figure placement**
- [ ] **Step 4: Insert screenshots and diagrams at aspect-ratio-safe widths**
- [ ] **Step 5: Remove placeholder figures/captions from main content and preserve missing IDs only in final checklist**
- [ ] **Step 6: Renumber headings, figures, and tables without `.99` values**
- [ ] **Step 7: Write the candidate DOCX and reopen it with `python-docx`**

### Task 10: Finalize in Microsoft Word and export PDF

**Files:**
- Create: `tools/documentation/revision/finalize_word.ps1`
- Create: `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.pdf`
- Create: `artifacts/academic-report-revision/finalization/word-metrics.json`

**Interfaces:**
- Consumes: candidate DOCX.
- Produces: updated TOC/list fields, stable pagination, PDF, and Word-reported page/word/table/figure metrics.

- [ ] **Step 1: Open the candidate in Word with alerts disabled**
- [ ] **Step 2: Update all fields, TOC, list of figures, and list of tables**
- [ ] **Step 3: Repaginate, save, close, reopen, and update once more**
- [ ] **Step 4: Export PDF using Word's fixed-format export**
- [ ] **Step 5: Record Word metrics and ensure the PDF has 200–250 pages**

  If below 200 pages, add only missing source-backed implementation detail, verified screenshots, API evidence, test evidence, or operational analysis. If above 250, remove repetition and overly detailed appendices without deleting required evidence.

### Task 11: Render and validate the complete report

**Files:**
- Create: `tools/documentation/revision/validate_final_report.py`
- Create: `artifacts/academic-report-revision/validation/final-validation.json`
- Create: `artifacts/academic-report-revision/validation/rendered-pages/*.png`
- Create: `artifacts/academic-report-revision/validation/contact-sheets/*.png`
- Test: `tools/documentation/revision/tests/test_final_validation.py`

**Interfaces:**
- Consumes: final DOCX, PDF, baseline inventory, screenshot manifest, and content evidence.
- Produces: machine-readable validation against all twenty final checks and page renderings for visual inspection.

- [ ] **Step 1: Validate DOCX structure and known forbidden strings**
- [ ] **Step 2: Validate seven chapters, caption order, lists, media references, tables, and automatic fields**
- [ ] **Step 3: Validate page count, placeholder policy, duplicate-paragraph thresholds, and evidence references**
- [ ] **Step 4: Render every PDF page and generate readable contact sheets**
- [ ] **Step 5: Inspect all contact sheets plus full-size high-risk pages**

  High-risk pages include cover, TOC/lists, every chapter opening, wide tables, every diagram family, code/API blocks, screenshots, verification results, references, appendix openings, and last page.

- [ ] **Step 6: Correct overflow, distortion, blank anomalies, orphan headings, and broken numbering, then rerun Tasks 10–11**

### Task 12: Generate the change log and run final verification

**Files:**
- Create: `tools/documentation/revision/generate_change_log.py`
- Create: `C:\Users\nttzb\Downloads\English_Base_Change_Log.txt`

**Interfaces:**
- Consumes: baseline/final inventories, evidence manifests, verification ledger, screenshot manifest, and validation output.
- Produces: required Vietnamese change log with removed/merged/rewritten content, inserted real images, executed/unexecuted tests, remaining placeholders/data, and before/after page counts.

- [ ] **Step 1: Generate the change log from structured evidence rather than memory**
- [ ] **Step 2: Run all documentation-tool unit tests**

  Run: `python -m unittest discover -s tools/documentation/revision/tests -v`

- [ ] **Step 3: Run Python compilation and Git whitespace checks**

  Run:

  ```powershell
  python -m compileall -q tools/documentation/revision
  git diff --check -- tools/documentation/revision docs/superpowers
  ```

- [ ] **Step 4: Run the final report validator against the delivered files**
- [ ] **Step 5: Confirm all three output files exist, are non-empty, open successfully, and match the final validation metrics**
- [ ] **Step 6: Report actual verification outcomes and remaining evidence gaps without overstating completion**
