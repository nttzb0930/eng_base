# Production Release Checklist

Checklist này dùng trước và sau khi phát hành English Base lên staging hoặc production.

## 1. Branch và CI

- [ ] Đã merge commit cần phát hành vào `main`.
- [ ] CI trên commit phát hành xanh: architecture, test, typecheck, lint và build.
- [ ] Đã xác định image tag bằng commit SHA, không dùng tag không rõ nguồn.
- [ ] Đã kiểm tra image API, Web và Admin được publish thành công lên GHCR.

Các lệnh kiểm tra local:

```powershell
pnpm architecture:check
pnpm test
pnpm check-types
pnpm lint
pnpm build
```

## 2. Secrets và environment

Tạo bộ biến riêng cho từng môi trường. Không commit `.env`, token, API key hoặc database password.

API tối thiểu:

```dotenv
NODE_ENV=production
APP_NAME=English Base
APP_SERVICE_NAME=eng-base-api
API_PORT=4000
TRUST_PROXY_HOPS=1
CORS_ORIGINS=https://app.example.com,https://admin.example.com

DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<secret-ít-nhất-32-ký-tự>
JWT_REFRESH_SECRET=<secret-khác-ít-nhất-32-ký-tự>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

Web/Admin build values:

```dotenv
NEXT_PUBLIC_APP_NAME=English Base
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com/api
```

Email verification và reset password:

```dotenv
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<gmail-app-password-hoặc-provider-password>
SMTP_FROM=English Base <no-reply@example.com>
```

TOEIC Writing AI:

```dotenv
GEMINI_ENABLED=true
GEMINI_API_KEY=<production-key>
GEMINI_API_ENDPOINT=
GEMINI_VISION_MODEL=<approved-model>
GEMINI_GRADING_MODEL=<approved-model>
GEMINI_TIMEOUT_MS=20000
WRITING_AI_DAILY_LIMIT=5
WRITING_AI_RESERVATION_TTL_MS=120000
```

`GEMINI_API_ENDPOINT=http://127.0.0.1:8045` chỉ hợp lệ cho proxy local. Production phải để trống để dùng endpoint chính thức hoặc dùng một proxy reachable từ container.

Rotate mọi key đã từng xuất hiện trong chat, terminal history hoặc log.

## 3. Database

- [ ] Đã backup database production và biết cách restore.
- [ ] `DATABASE_URL` đã được kiểm tra trỏ đúng database.
- [ ] Đã generate Prisma Client.
- [ ] Chỉ áp dụng migration đã commit:

```bash
pnpm --filter @repo/api db:generate
pnpm --filter @repo/api db:migrate:deploy
```

- [ ] Không chạy `db:push`, `db:migrate:reset` hoặc `db:seed:dev` trên production.
- [ ] Migration state đã được kiểm tra sau khi deploy.

## 4. Licensed content và dataset

Media licensed không nằm trong Git hoặc frontend image. API production phải mount volume riêng:

```dotenv
LICENSED_CONTENT_ROOT=/var/lib/eng-base/licensed-content
```

Đảm bảo volume có các package đã validate và import:

- [ ] TOEIC Reading.
- [ ] TOEIC Listening.
- [ ] TOEIC Dictation.
- [ ] TOEIC Grammar.
- [ ] TOEIC Writing Part 1/2.
- [ ] Writing Part 1 image contexts.

Chỉ import snapshot có checksum đã inventory/download/validate. Không tự động crawl hoặc publish dữ liệu mới trong lúc deploy.

## 5. Deploy

Workflow deploy yêu cầu các GitHub Environment secrets:

- [ ] `DEPLOY_HOST`
- [ ] `DEPLOY_USER`
- [ ] `DEPLOY_SSH_KEY`
- [ ] `DEPLOY_PATH`
- [ ] `DEPLOY_PORT` nếu khác 22
- [ ] `DEPLOY_API_HEALTH_URL`
- [ ] `DEPLOY_WEB_URL`
- [ ] `DEPLOY_ADMIN_URL`

Workflow sẽ pull image, chạy `prisma migrate deploy`, rồi khởi động Docker Compose. Kiểm tra `docker compose ps` sau deploy và giữ image tag trước đó để rollback.

## 6. Smoke test sau deploy

- [ ] `GET /api/health` trả 200.
- [ ] Web và Admin mở bằng HTTPS.
- [ ] Đăng ký tài khoản tạo trạng thái chờ verification.
- [ ] Email verification nhận được code/link.
- [ ] Đăng nhập, refresh session và logout hoạt động.
- [ ] Quên mật khẩu gửi được email và reset thành công.
- [ ] Reading/Listening/Dictation tải được dữ liệu.
- [ ] TOEIC Writing Part 1 hiển thị context và chấm AI thành công.
- [ ] TOEIC Writing Part 2 chấm đúng giới hạn 50–300 từ.
- [ ] Invalid response bị chặn trước khi gọi AI.
- [ ] Retry cùng idempotency key không trừ quota lần hai.
- [ ] User khác không đọc được grade/history của user hiện tại.
- [ ] Lỗi Gemini không lộ API key, prompt hoặc raw provider response.

## 7. Rate limit và scale

Rate limit Writing AI hiện dùng process-local storage. Không chạy nhiều API replica nếu chưa thay bằng shared storage như Redis; nếu không, mỗi replica sẽ có quota/rate limit riêng.

## 8. Rollback

Khi AI gặp sự cố:

```dotenv
GEMINI_ENABLED=false
```

Restart API để dừng provider calls mới. Dữ liệu task, draft, submission, context và grade đã lưu không bị xóa.

Khi image lỗi:

1. Dừng rollout mới.
2. Khôi phục `IMAGE_TAG` về image tag trước đó.
3. Chạy lại `docker compose pull` và `docker compose up -d`.
4. Kiểm tra `/api/health` và các smoke test chính.

Không xóa migration history hoặc dữ liệu learner để rollback ứng dụng.
