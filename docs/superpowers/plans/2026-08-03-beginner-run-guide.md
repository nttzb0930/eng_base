# English Base Beginner Run Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone Vietnamese Word/PDF guide that a beginner can follow to run English Base locally on Windows using PostgreSQL in Docker and API/Web/Admin through pnpm.

**Architecture:** Collect commands and constraints from canonical repository files into a small evidence manifest, compose a beginner-oriented document with copyable commands and safe screenshots, finalize it using Microsoft Word, then validate structure and rendered pages. The guide reports observed seed/test failures honestly and excludes destructive database procedures.

**Tech Stack:** Python 3, python-docx, Microsoft Word COM, PyPDF, PyMuPDF, PowerShell, repository Node.js/pnpm/Docker configuration.

## Global Constraints

- Output DOCX: `C:\Users\nttzb\Downloads\English_Base_Huong_Dan_Chay_Du_An_Cho_Nguoi_Moi.docx`.
- Output PDF: `C:\Users\nttzb\Downloads\English_Base_Huong_Dan_Chay_Du_An_Cho_Nguoi_Moi.pdf`.
- Windows 10/11 is the primary platform.
- PostgreSQL runs through Docker Compose; API, Web, and Admin run through pnpm.
- Never expose real secrets, tokens, cookies, private email addresses, or production URLs.
- Never recommend reset, push, provider-backed enrichment, or writes to shared/production databases.
- Commands must remain selectable/copyable text.
- Every step must state an expected result and a diagnostic path.

### Task 1: Collect beginner-guide facts

**Files:**

- Create: `tools/documentation/beginner_guide/source_facts.py`
- Create: `tools/documentation/beginner_guide/tests/test_source_facts.py`
- Create: `artifacts/beginner-run-guide/source-facts.json`

- [ ] Write a failing test for versions, scripts, ports, Compose service, and forbidden commands.
- [ ] Implement extraction from package manifests, `.env.example`, Compose, and canonical guides.
- [ ] Run the focused test and emit the evidence JSON.

### Task 2: Build the Word guide

**Files:**

- Create: `tools/documentation/beginner_guide/build_beginner_run_guide.py`
- Create: `tools/documentation/beginner_guide/tests/test_guide_content.py`
- Create: `C:\Users\nttzb\Downloads\English_Base_Huong_Dan_Chay_Du_An_Cho_Nguoi_Moi.docx`

- [ ] Write content tests requiring all start-to-finish steps, three URLs, seed warning, safe stop procedure, troubleshooting, and no forbidden commands/placeholders.
- [ ] Implement cover, automatic TOC, prerequisite installation, environment setup, database, Prisma, three runtime sections, verification, stopping, troubleshooting, checklist, and advanced appendix.
- [ ] Insert only safe screenshots from the observed local run.
- [ ] Reopen the generated DOCX and run content tests.

### Task 3: Finalize and export

**Files:**

- Create: `tools/documentation/beginner_guide/finalize_word.ps1`
- Create: `C:\Users\nttzb\Downloads\English_Base_Huong_Dan_Chay_Du_An_Cho_Nguoi_Moi.pdf`

- [ ] Open the DOCX with Microsoft Word.
- [ ] Update the automatic table of contents and all fields.
- [ ] Repaginate, save, and export PDF.
- [ ] Record page, word, table, figure, and field counts.

### Task 4: Validate visually and structurally

**Files:**

- Create: `tools/documentation/beginner_guide/validate_guide.py`
- Create: `artifacts/beginner-run-guide/validation.json`
- Create: `artifacts/beginner-run-guide/rendered-pages/*.png`

- [ ] Validate that DOCX/PDF open and required sections/URLs/commands exist.
- [ ] Validate no placeholders, secrets, forbidden destructive commands, or fake Pass claims exist.
- [ ] Render every PDF page.
- [ ] Inspect cover, TOC, command-heavy pages, screenshots, troubleshooting tables, and final checklist.
- [ ] Correct overflow, clipping, distorted images, or abnormal blank pages and rerun finalization.

### Task 5: Run final verification

- [ ] Run `python -m unittest discover -s tools/documentation/beginner_guide/tests -v`.
- [ ] Run `python -m compileall -q tools/documentation/beginner_guide`.
- [ ] Run `git diff --check -- tools/documentation/beginner_guide docs/superpowers`.
- [ ] Confirm DOCX/PDF exist, are non-empty, open successfully, and have matching page counts.
- [ ] Report actual output paths and the beginner's primary five-command startup sequence.
