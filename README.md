# English Base

English Base là monorepo nền tảng cho sản phẩm học tiếng Anh dành cho người Việt. Dự án cung cấp ứng dụng học tập, trang quản trị, API nghiệp vụ và pipeline dữ liệu từ vựng trong cùng một workspace có quy tắc ownership rõ ràng.

## Mục tiêu dự án

- Cung cấp base có thể tái sử dụng cho các sản phẩm học tập khác.
- Giữ nghiệp vụ theo capability thay vì gom code vào các folder kỹ thuật toàn cục.
- Tách giao diện Learner, giao diện Admin và API thành các runtime độc lập.
- Duy trì contract TypeScript dùng chung mà không làm rò rỉ Prisma hoặc framework internals.
- Bảo vệ các workflow dữ liệu và database bằng bước review, dry run và xác nhận rõ ràng.

## Cấu trúc monorepo

```text
apps/
  web/                 Next.js cho Learner, cổng 3000
  admin/               Next.js/React Admin, cổng 3001
  api/                 NestJS, Prisma và PostgreSQL, cổng 4000
packages/
  shared/              TypeScript wire types và constants trung lập framework
  ui/                  React UI primitives dùng chung cho Web và Admin
  eslint-config/       cấu hình ESLint dùng chung
  typescript-config/   cấu hình TypeScript dùng chung
data/vocabulary/       catalog, taxonomy, prompts và dữ liệu pipeline chính thức
```

`packages/shared` chỉ cung cấp kiểu TypeScript ở compile time và constants dùng chung. Validation request, mapper response, ViewModel, HTTP client và UI vẫn thuộc runtime sử dụng chúng.

## Yêu cầu môi trường

- Node.js phiên bản LTS tương thích với các package hiện tại.
- pnpm `10.30.1`.
- Docker Desktop hoặc một PostgreSQL 15 tương thích.
- PowerShell cho các command mẫu trên Windows.

## Khởi động nhanh

```powershell
pnpm install
Copy-Item .env.example .env
docker compose up -d db
pnpm db:generate
pnpm --filter @repo/api db:migrate:deploy
pnpm dev
```

File `.env` ở root được Web, Admin, API và các offline script sử dụng. Thay các secret mẫu trước khi chạy Auth ngoài môi trường local.

## Các lệnh thường dùng

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
pnpm db:studio
```

Xem [Local development](docs/guides/local-development.md) để setup, tạo/deploy
migration và xử lý lỗi kết nối. Xem [Verification](docs/guides/verification.md)
để chọn test hẹp và chạy full gate trước handoff.

## Quy tắc an toàn dữ liệu

> Các lệnh `db:seed`, `db:push`, `db:migrate:reset`, vocabulary enrichment, normalization/POS sync và AI-provider có thể thay đổi database hoặc dữ liệu nguồn. Không chạy chúng chỉ để kiểm tra kiến trúc, compile hoặc test. Hãy đọc workflow tương ứng và có xác nhận rõ ràng trước khi chạy.

Pipeline vocabulary, nguồn canonical và chính sách artifact được mô tả tại [Vocabulary data pipeline](docs/data/vocabulary-pipeline.md).

## Tài liệu kiến trúc

Bắt đầu từ [English Base documentation](docs/README.md). Domain language nằm trong [CONTEXT.md](CONTEXT.md), workflow bắt buộc cho coder/agent nằm trong [AGENTS.md](AGENTS.md), còn lý do của các quyết định kiến trúc nằm trong `docs/adr/`.
