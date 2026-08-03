# English Base Beginner Run Guide Design

## Objective

Create a standalone Vietnamese Microsoft Word guide that enables a person with basic computer skills, but no prior familiarity with the English Base repository, to install prerequisites and run the project locally on Windows 10 or Windows 11.

The output is:

`C:\Users\nttzb\Downloads\English_Base_Huong_Dan_Chay_Du_An_Cho_Nguoi_Moi.docx`

A matching PDF may be exported for visual verification and convenient reading.

## Audience and Assumptions

The reader can download software, use Windows File Explorer, and copy commands into PowerShell. The guide must not assume knowledge of monorepos, environment variables, PostgreSQL, Prisma, Docker, APIs, ports, or package managers. Each concept will be explained briefly at the point where it is needed.

The repository is assumed to be available at a user-selected local folder. Examples may use `C:\Users\<TEN_NGUOI_DUNG>\Downloads\eng_base`, but commands must explain how to substitute the actual path.

## Recommended Runtime Method

The primary path runs PostgreSQL 15 through the repository Docker Compose service and runs API, Web, and Admin with Node.js/pnpm on Windows. This matches the current repository guide and makes logs visible in three PowerShell windows.

Building and running all three application Docker images is an advanced appendix because the current local Compose file owns only PostgreSQL. The guide must not imply that one Compose command starts the entire product.

## Guide Structure

The document will contain:

1. What the project contains and what will run.
2. Required computer configuration and expected disk/network access.
3. Installation of Git, Node.js 22 LTS, pnpm 10.30.1, and Docker Desktop.
4. Verification commands for every prerequisite.
5. Source download or clone and navigation to the repository root.
6. Dependency installation using the lockfile.
7. Creation of `.env` from `.env.example`.
8. Explanation of required local database, JWT, CORS, and public frontend variables without revealing real secrets.
9. PostgreSQL startup through `docker compose up -d db` and health verification.
10. Prisma client generation and committed migration application.
11. Honest handling of the currently observed seed failure; seed is optional and never represented as required for compilation.
12. API startup and health endpoint verification.
13. Web startup and browser verification.
14. Admin startup and browser verification.
15. How to use three terminal windows and identify which runtime owns each log.
16. Safe stopping and restarting without deleting the database volume.
17. Common errors and exact diagnostic commands.
18. A final checklist proving the local stack is reachable.
19. An advanced Docker image build appendix.
20. A copy/paste command reference.

## Evidence and Accuracy

Commands and defaults must be derived from `package.json`, application manifests, `.env.example`, `docker-compose.yml`, Prisma configuration, and canonical repository guides. The document will distinguish:

- commands observed successfully during the documentation acceptance run;
- commands confirmed by repository configuration;
- optional or advanced procedures not executed in that run.

The guide will record the observed facts that PostgreSQL, Prisma generation, migration deploy, API, Web, and Admin started successfully; `db:seed` failed; and the full verification gates did not all pass. It will not hide those failures or instruct the reader to use destructive reset/push commands.

## Safety Rules

The guide must never include actual JWT secrets, provider keys, SMTP credentials, database passwords, cookies, tokens, private email addresses, or production connection strings. Example secrets must be clearly marked as local examples and must meet current validation constraints.

The normal setup must not use `db:migrate:reset`, `db:push`, provider-backed enrichment, vocabulary synchronization, or a production/shared database. Stopping the project uses `docker compose stop db`, which preserves the named volume. Volume deletion is excluded from the beginner procedure.

## Word Presentation

The document will use a clean university/technical-guide layout with a cover, automatic table of contents, numbered headings, readable command blocks, warning/note boxes, screenshots from the real local run, troubleshooting tables, and a final checklist. Commands must be copyable text, not embedded only inside images.

Screenshots containing personal data, tokens, or private email addresses will not be inserted. Existing safe screenshots may illustrate Web login, Web registration, Admin login, Admin Course Management, and Settings. Terminal evidence may be represented as sanitized text blocks when a safe screenshot is unavailable.

## Acceptance Criteria

The DOCX must open in Microsoft Word, have an updated table of contents, contain no unresolved placeholders, and provide one complete start-to-finish path that a beginner can follow without consulting the 201-page report. Every command must show the expected result or the next diagnostic step. The final PDF render must have no clipped commands, overflowing tables, distorted images, or abnormal blank pages.

The finished guide must explicitly state the three successful browser endpoints:

- `http://localhost:4000/api/health`
- `http://localhost:3000/vi/sign-in`
- `http://localhost:3001/login`

It must also state that feature data and learner onboarding depend on the database content available in the reader's local environment.
