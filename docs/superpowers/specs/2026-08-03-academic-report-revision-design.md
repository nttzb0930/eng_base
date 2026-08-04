# English Base Academic Report Evidence-Based Revision Design

## Objective

Revise the existing `English_Base_Bao_Cao_Do_An_Hoan_Chinh.docx` into an evidence-based Vietnamese software project report. The revision must preserve strong front matter, diagrams, and appendices while replacing repetitive theory and unverified claims with source-backed implementation analysis, real verification results, and real product screenshots when the local system can be run safely.

The final deliverables are:

- `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.docx`
- `C:\Users\nttzb\Downloads\English_Base_Bao_Cao_Do_An_Thuc_Te.pdf`
- `C:\Users\nttzb\Downloads\English_Base_Change_Log.txt`

The final document must contain at least 200 pages, with a target range of 210–250 pages.

## Editing Strategy

The process uses a hybrid direct-editing approach. The existing DOCX is the canonical input; the PDF is used only for page and visual comparison. A document-processing script will preserve approved sections and replace or condense targeted chapter ranges. Microsoft Word automation will update fields, pagination, lists of figures and tables, and export the final PDF.

The report will not be reconstructed from the PDF. Existing front matter, academic formatting, useful diagrams, references, and appendices remain unless source verification identifies a factual error.

## Evidence Model

Every material claim belongs to one of three evidence classes:

1. **Observed execution:** supported by command output, HTTP response, browser screenshot, database inspection, or generated build artifact from the current branch and commit.
2. **Source-confirmed behavior:** supported by a concrete route, component, hook, controller, use case, Prisma model, configuration file, Dockerfile, or workflow in the repository.
3. **Proposed operation:** a safe runbook or future direction that is not claimed as completed deployment or verified runtime behavior.

The report must label the distinction when it matters. No test, production deployment, database state, user data, or feature is invented.

## Safe Runtime Procedure

Runtime evidence will use the current `develop` branch and record the tested commit. PostgreSQL may be started through the repository Docker Compose configuration. Migration and seed operations are permitted only after confirming the resolved database host is local and isolated. Destructive reset commands, provider-backed enrichment, vocabulary synchronization, and writes to shared or production databases are prohibited.

Secrets, cookies, tokens, private email addresses, connection strings, and personal data must not appear in screenshots, logs, code samples, request/response examples, the report, or the change log.

If Docker, PostgreSQL, migration, seed, or an application runtime cannot be started, the failure becomes an observed result. The report will retain source-confirmed implementation analysis and move missing screenshots or runtime evidence to the final checklist.

## Chapter Revision

### Chapter 1

Rewrite Chapter 1 to 4–6 pages in natural Vietnamese student-report prose. It will explain learner needs, fragmentation across learning tools, product motivation, objectives, users, implemented scope, method, and realistic limitations. The repeated evidence disclaimer will appear at most once under scope or method. Enterprise architecture terminology will be removed unless essential.

### Chapter 2

Condense Chapter 2 to 18–22 pages and seven groups: web architecture; authentication and authorization; relational database and Prisma; frontend technologies; backend technologies; deployment technologies; and English-learning foundations. Each group contains a short concept, its role in English Base, source-backed application, selection rationale, and project-specific limitation. Reusable generic advantage/disadvantage templates will be deleted.

### Chapter 3

Condense Chapter 3 to 35–45 pages. Preserve detailed user-focused specifications for 10–12 core use cases. TOEIC variants will be represented under a parent TOEIC use case with concise variant differences. Remaining use cases will move into a summary table containing ID, name, actor, goal, main flow, and related API. Shared technical mechanics will be explained once in Chapter 4 instead of repeated per use case.

### Chapter 4

Retain the existing diagram families after comparing them with current routes, modules, and Prisma schema. Each diagram receives a source-oriented explanation covering participants, data flow, responsibility, related tables, related API/modules, important design decisions, and rationale. Relations or modules absent from source will be corrected or removed. Target length is 30–40 pages.

### Chapter 5

Rewrite Chapter 5 as the main product-construction chapter, targeting 60–75 pages. Authentication, Placement Test, Course/Lesson/Challenge, Vocabulary/Flashcard/Review, Practice/Reading, four TOEIC modes, Dashboard/Progress, and Admin will each connect the user flow to routes, frontend components/hooks, API resources, backend controllers/use cases, database tables, real source excerpts, sanitized request/response examples, error handling, and observed or source-confirmed outcomes.

Code excerpts must come directly from the tested source revision, normally 10–35 lines, and must be followed by an explanation. Screenshots must be captured from running Web/Admin applications. If a screen cannot be reached with safe local data, it will not be replaced by a mock image or counted as a figure.

### Chapter 6

Rewrite Chapter 6 as a verification record, targeting 20–30 pages. Record OS, Node.js, pnpm, PostgreSQL, browser, branch, and commit. Run the repository-defined verification gates and record command, purpose, actual status, duration, and relevant notes. Functional/API/UI cases will distinguish executed results from cases not verified during the documentation acceptance run. A Pass status requires fresh execution evidence.

### Chapter 7

Expand Chapter 7 to 10–15 pages using repository configuration and observed local execution. Cover environment ownership, dependency installation, local PostgreSQL, Prisma generation and migration, optional safe seed, starting API/Web/Admin, health checks, Docker Compose, image builds, CI workflows, production variables, backup/restore/rollback procedures, and troubleshooting. Observed, source-confirmed, and proposed procedures will be clearly distinguished.

### Conclusion and Appendices

Rewrite the conclusion around the learner problem, implemented features, verified behavior, unmet goals, strengths, limitations, and feasible future work. AI assistance, pronunciation evaluation, and mobile applications remain future directions unless the source proves otherwise. Preserve the endpoint, model, environment, route, and command appendices, updating them only where current source differs.

## Placeholder and Numbering Policy

All known placeholder strings will be scanned. Missing student IDs remain only in a final checklist and are never fabricated. UI placeholders and their captions will be removed from the main content and automatic figure list. Unverified test-result tables will be replaced by actual results or explicitly marked acceptance-run gaps.

Chapter conclusion headings will use the next valid section number. No `.99` numbering may remain. Figure and table captions must be sequential, attached to real content, and included in automatic lists only when the referenced object exists.

## Document Generation Components

The documentation toolchain will be divided by responsibility:

- a source-evidence collector that inventories routes, APIs, modules, Prisma models, environment contracts, workflows, and selected source excerpts;
- a runtime-evidence runner that records commands, durations, statuses, and sanitized logs without destructive database operations;
- a screenshot workflow that starts local services, captures reachable Web/Admin/API states, crops images, and redacts sensitive values;
- a DOCX revision engine that edits the existing report, preserves retained sections, replaces target chapters, inserts verified evidence, removes placeholders, and repairs captions/numbering;
- a Word finalization and validation step that updates automatic fields, exports PDF, checks pagination and structure, and renders representative or all pages for visual review;
- a change-log generator that records removals, merges, rewritten chapters, inserted evidence, executed and unexecuted tests, remaining data requests, and page counts before and after.

Generated artifacts will live under `artifacts/academic-report-revision/`. User-facing deliverables will be written to `C:\Users\nttzb\Downloads`.

## Validation and Acceptance

Acceptance requires the DOCX to open in Microsoft Word, the PDF to contain at least 200 pages, Chapters 1–7 to follow the requested emphasis and approximate allocation, and automatic contents/figure/table lists to be refreshed. The validation process will scan for repeated warning text, `.99` headings, known placeholders in main content, fake figure captions, duplicated paragraphs, obsolete project terms, malformed tables, missing media, and inconsistent caption ordering.

The final verification report must show the real outcome of architecture check, tests, type checking, linting, and build. Runtime screenshots and API responses are included only when captured successfully. A visual PDF review will check for blank-page anomalies, overflow, distorted images, unreadable diagrams, orphan headings, and broken page numbering.

## Non-Goals

This work does not change application behavior, repair unrelated product defects, deploy to production, write to shared databases, fabricate student information, fabricate screenshots, fabricate test success, or claim that future AI/mobile functions already exist.
