# English Base

English Base là một monorepo nền tảng cho sản phẩm học tiếng Anh dành cho
người Việt. Tên kỹ thuật của repository là `eng_base`; tên hiển thị của sản phẩm
là **English Base**. Codebase cung cấp ứng dụng Learner, trang Admin, API nghiệp
vụ, dữ liệu từ vựng chuẩn và các quy tắc kiến trúc có thể tái sử dụng cho dự án
học tập khác.

## Thành phần chính

| Runtime  | Công nghệ                         | Cổng mặc định | Vai trò                                |
| -------- | --------------------------------- | ------------- | -------------------------------------- |
| Web      | Next.js 16, React 19, next-intl   | `3000`        | Trải nghiệm học tập của Learner        |
| Admin    | Next.js 16, React 19, React Query | `3001`        | Quản trị nội dung và người dùng        |
| API      | NestJS 11, Prisma 7               | `4000`        | Nghiệp vụ, Auth và truy cập PostgreSQL |
| Database | PostgreSQL 15                     | `5432`        | Dữ liệu ứng dụng                       |

Workspace sử dụng pnpm `10.30.1`, Turborepo, TypeScript 6, ESLint và Prettier.

## Kiến trúc

Code được tổ chức theo runtime owner và business capability:

```text
apps/
  web/                 giao diện Learner
  admin/               giao diện quản trị
  api/                 NestJS, Prisma, migrations và data scripts
packages/
  shared/              TypeScript wire types và constants trung lập framework
  ui/                  React primitives dùng giống nhau ở Web và Admin
  eslint-config/       cấu hình ESLint dùng chung
  typescript-config/   cấu hình TypeScript dùng chung
data/vocabulary/       catalog, 103 Topics, prompts và review chính thức
docs/                  kiến trúc, ADR, hướng dẫn vận hành và dữ liệu
```

Frontend đặt hành vi theo capability trong `app/features`, màn hình route trong
`app/views`, và giữ `page.tsx` mỏng. API đặt nghiệp vụ trong
`src/module/<capability>` với use case theo mục tiêu. `packages/shared` chỉ chứa
wire types TypeScript và constants dùng chung; Prisma model, Nest DTO, HTTP
client, Auth state, ViewModel và UI không được đưa vào Shared.

Course dùng `code` kebab-case duy nhất và bất biến làm business identity; numeric
`id` vẫn là khóa quan hệ, còn `title` là nội dung hiển thị có thể sửa. Hiện dự án
chưa có Course `slug` hoặc route Course Detail công khai.

## Yêu cầu

- Node.js 22 LTS.
- pnpm `10.30.1` thông qua Corepack hoặc cài đặt tương thích.
- Docker Desktop cho PostgreSQL và kiểm tra image, hoặc PostgreSQL 15 có thể truy cập.
- Git; các ví dụ local bên dưới dùng PowerShell.

## Khởi động local

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d db
pnpm db:generate
pnpm --filter @repo/api db:migrate:deploy
pnpm dev
```

Sửa password và hai JWT secret mẫu trong `.env` trước khi chạy Auth. Database có
thể dùng một `DATABASE_URL` đã resolve hoặc sáu biến `DB_*`; tất cả Prisma
consumer sử dụng cùng một resolver. Không commit `.env`.

Các địa chỉ mặc định:

- Learner Web: `http://localhost:3000`
- Admin: `http://localhost:3001`
- API: `http://localhost:4000/api`
- Health: `http://localhost:4000/api/health`
- PostgreSQL: `localhost:5432`

Xem [Local development](docs/guides/local-development.md) và
[Environment configuration](docs/guides/environment-configuration.md) để biết
đầy đủ cách cấu hình, migrate và xử lý lỗi Prisma.

## Lệnh phát triển và kiểm tra

```powershell
pnpm dev
pnpm dev:web
pnpm dev:admin
pnpm dev:api

pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

Trước khi bàn giao, cần chạy thêm bộ test vocabulary độc lập và Prettier theo
[Verification guide](docs/guides/verification.md). Các gate thông thường không
cần kết nối hoặc ghi database.

## Docker

Build ba production image từ repository root:

```powershell
docker build -f apps/api/Dockerfile -t eng-base-api:local .
docker build -f apps/web/Dockerfile -t eng-base-web:local .
docker build -f apps/admin/Dockerfile -t eng-base-admin:local .
```

Web và Admin là Next standalone image, chạy bằng user không phải root. Ba biến
`NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` và `NEXT_PUBLIC_API_URL` là build
args công khai. API không nhận secret khi build; database, JWT, CORS, proxy và
rate limit phải được inject lúc container chạy.

## CI/CD và GHCR

Repository có đúng hai workflow:

- `.github/workflows/ci.yml`: kiểm tra mọi branch, pull request vào `main`, hoặc chạy thủ công.
- `.github/workflows/docker-build.yml`: publish ba image lên GHCR khi push `main`, tag semantic `v*.*.*`, hoặc chạy thủ công.

GHCR sử dụng `GITHUB_TOKEN`, không cần Docker Hub registry hay secret Docker Hub.
Tên image sau khi push có dạng:

```text
ghcr.io/<owner-lowercase>/eng-base-api
ghcr.io/<owner-lowercase>/eng-base-web
ghcr.io/<owner-lowercase>/eng-base-admin
```

Workflow chỉ publish image; nó không tự deploy, migrate hoặc seed database. Xem
[CI/CD guide](docs/guides/ci-cd.md) để cấu hình GitHub Variables, quyền package,
tag và cách pull/run image.

## An toàn dữ liệu

Các lệnh sau có thể thay đổi schema, database, dữ liệu nguồn hoặc gọi provider:

- `db:push`, `db:migrate`, `db:migrate:deploy`, `db:migrate:reset`, `db:seed`;
- vocabulary enrichment, normalization, POS correction và database sync;
- Topic classification/expansion qua AI provider.

Không chạy chúng chỉ để kiểm tra compile hoặc kiến trúc. Hãy đọc migration/data
workflow, review input/output và có xác nhận rõ ràng trước khi chạy. Catalog
versioned không chứng minh database hiện tại đã được seed hoặc sync.

## Git, snapshot và GitHub

Mỗi checkpoint ổn định được lưu bằng commit. Git tag là snapshot trỏ tới một
commit; tag local không tự xuất hiện trên GitHub và không nên bị di chuyển sau
khi đã chia sẻ.

Khi đã tạo repository GitHub:

```powershell
git remote add origin https://github.com/<owner>/eng_base.git
git push -u origin main
git push origin --tags
```

Sau khi push và bật GitHub Actions, CI bắt đầu theo trigger; GHCR chỉ có image
sau khi workflow Docker chạy thành công. Luôn kiểm tra `git status`, remote và
tag trước khi push.

## Tài liệu

- [Project context](CONTEXT.md): ngôn ngữ nghiệp vụ và invariant.
- [Agent workflow](AGENTS.md): quy tắc bắt buộc khi thay đổi codebase.
- [Documentation index](docs/README.md): bản đồ tài liệu canonical.
- [Codebase structure](docs/architecture/codebase-structure.md): ownership và dependency direction.
- [Frontend architecture](docs/architecture/frontend.md) và [API architecture](docs/architecture/api.md).
- [Vocabulary pipeline](docs/data/vocabulary-pipeline.md): nguồn canonical và data safety.
