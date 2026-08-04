# Cấu hình Production: VPS, GitHub Actions và DNS

Tài liệu này là checklist cấu hình production cho English Base. Các giá trị
`example.com`, `<VPS_IPV4>`, `<owner>` và `<repo>` là placeholder, phải thay
bằng domain, IP và tên repository thực tế trước khi deploy.

Tài liệu chuẩn về quyền sở hữu biến môi trường nằm tại
[`environment-configuration.md`](environment-configuration.md). Luồng publish
image và deploy nằm tại [`ci-cd.md`](ci-cd.md).

## 1. Mô hình domain được dùng trong tài liệu

| Dịch vụ     | URL production              | Container port |
| ----------- | --------------------------- | -------------: |
| Learner Web | `https://example.com`       |         `3000` |
| Admin       | `https://admin.example.com` |         `3001` |
| API         | `https://api.example.com`   |         `4000` |

Reverse proxy trên VPS (Caddy, Nginx hoặc Traefik) nhận traffic tại cổng `80`
và `443`, cấp TLS certificate, sau đó proxy đến ba container. Không public trực
tiếp các cổng `3000`, `3001`, `4000` hoặc `5432` ra Internet.

Nếu muốn dùng `app.example.com` hoặc `learn.example.com` cho Learner Web, thay
`https://example.com` bằng hostname đó ở tất cả các mục bên dưới.

## 2. File `.env.production` trên VPS

Đặt file tại:

```text
<DEPLOY_PATH>/.env.production
```

Ví dụ đầy đủ:

```dotenv
# Docker images. deploy.yml sẽ tự cập nhật bốn giá trị này khi deploy.
API_IMAGE=ghcr.io/<owner>/<repo>-api
WEB_IMAGE=ghcr.io/<owner>/<repo>-web
ADMIN_IMAGE=ghcr.io/<owner>/<repo>-admin
IMAGE_TAG=<commit-sha-da-publish>

# API runtime
NODE_ENV=production
TZ=Asia/Ho_Chi_Minh
APP_NAME=English Base
APP_SERVICE_NAME=eng-base-api
API_PORT=4000
CORS_ORIGINS=https://example.com,https://www.example.com,https://admin.example.com
AUTH_COOKIE_DOMAIN=example.com

# Đặt bằng số reverse proxy tin cậy nằm trước API.
# Một Caddy/Nginx container duy nhất: 1. Không có proxy: 0.
TRUST_PROXY_HOPS=1

# PostgreSQL trong cùng Docker Compose network.
# Nếu dùng managed PostgreSQL, thay DB_HOST bằng hostname của nhà cung cấp.
DB_HOST=db
DB_PORT=5432
DB_USER=eng_base
DB_PASSWORD=<mat-khau-database-manh>
DB_NAME=eng_base
DB_SCHEMA=public

# Không cần DATABASE_URL khi đã có đầy đủ sáu biến DB_* ở trên.
# Nếu nhà cung cấp chỉ cấp một URL, bỏ DB_* và dùng một URL đã resolve hoàn toàn:
# DATABASE_URL=postgresql://user:password@host:5432/eng_base?schema=public

# JWT: hai secret khác nhau, mỗi secret tối thiểu 32 ký tự.
JWT_ACCESS_SECRET=<random-secret-1-it-nhat-32-ky-tu>
JWT_REFRESH_SECRET=<random-secret-2-khac-secret-1>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Global rate limit
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Auth rate limit
AUTH_LOGIN_IP_LIMIT=10
AUTH_LOGIN_IDENTITY_LIMIT=5
AUTH_LOGIN_TTL=60
AUTH_REGISTER_IP_LIMIT=5
AUTH_REGISTER_TTL=3600
AUTH_REFRESH_IP_LIMIT=30
AUTH_REFRESH_SESSION_LIMIT=10
AUTH_REFRESH_TTL=60

# Email. Bật SMTP nếu production cần verify email và reset password.
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-app-password-hoac-provider-password>
SMTP_FROM="English Base <no-reply@example.com>"

# Private licensed TOEIC media. Compose phải mount volume vào đúng đường dẫn này.
LICENSED_CONTENT_ROOT=/var/lib/eng-base/licensed-content

# TOEIC Writing AI. Giữ false nếu chưa sử dụng Gemini trên production.
GEMINI_ENABLED=false
GEMINI_API_KEY=
GEMINI_API_ENDPOINT=
GEMINI_VISION_MODEL=gemini-3.5-flash-lite
GEMINI_GRADING_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=20000
WRITING_AI_DAILY_LIMIT=5
WRITING_AI_RESERVATION_TTL_MS=120000
WRITING_AI_USER_LIMIT=2
WRITING_AI_IP_LIMIT=10
WRITING_AI_RATE_LIMIT_TTL=60
```

Tạo hai JWT secret trên máy tin cậy, không đưa kết quả vào Git hoặc chat:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

### Biến bắt buộc để API khởi động

- `JWT_ACCESS_SECRET` và `JWT_REFRESH_SECRET`: khác nhau, mỗi giá trị tối thiểu
  32 ký tự.
- Một `DATABASE_URL` hoàn chỉnh, hoặc đủ cả sáu biến `DB_HOST`, `DB_PORT`,
  `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`.
- Nên set rõ `CORS_ORIGINS` và `TRUST_PROXY_HOPS` theo hạ tầng production thay
  vì dùng fallback localhost.

### Biến bắt buộc theo tính năng

- Khi `SMTP_ENABLED=true`, bắt buộc có `SMTP_USER` và `SMTP_PASS`.
- Khi `GEMINI_ENABLED=true`, bắt buộc có `GEMINI_API_KEY`.
- Nếu phục vụ licensed TOEIC media, `LICENSED_CONTENT_ROOT` phải là volume private
  đã mount vào API container.

### Biến không đặt trong `.env.production`

Không cần đặt `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL` hoặc
`NEXT_PUBLIC_API_URL` trên VPS. Chúng được compile vào Web/Admin image từ GitHub
Actions Variables lúc publish image. Sau khi sửa các biến này, phải publish lại
frontend image.

Bảo vệ file trên VPS:

```bash
chmod 600 .env.production
```

Không commit `.env.production`. Không đặt provider key, JWT secret hoặc database
password vào Docker build args.

## 3. GitHub Actions Variables

Vào `Repository > Settings > Secrets and variables > Actions > Variables`, tạo:

| Variable                | Giá trị production            | Dùng bởi           |
| ----------------------- | ----------------------------- | ------------------ |
| `NEXT_PUBLIC_APP_NAME`  | `English Base`                | Web và Admin       |
| `NEXT_PUBLIC_WEB_URL`   | `https://example.com`         | Build Web          |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.example.com`   | Build Admin        |
| `NEXT_PUBLIC_API_URL`   | `https://api.example.com/api` | Build Web và Admin |

Đây là giá trị public, người dùng có thể đọc được trong browser bundle. Không
đặt password, token, key hoặc `DATABASE_URL` vào GitHub Actions Variables.

## 4. GitHub Actions Secrets

Workflow `deploy.yml` dùng GitHub Environment. Vào:

```text
Repository > Settings > Environments > production > Environment secrets
```

Tạo các secret sau:

| Secret                  | Bắt buộc    | Ví dụ / ý nghĩa                                                       |
| ----------------------- | ----------- | --------------------------------------------------------------------- |
| `DEPLOY_HOST`           | Có          | IP public hoặc hostname SSH của VPS                                   |
| `DEPLOY_USER`           | Có          | User được phép chạy Docker Compose                                    |
| `DEPLOY_SSH_KEY`        | Có          | Toàn bộ private SSH key của deploy user                               |
| `DEPLOY_PATH`           | Có          | Thư mục tuyệt đối chứa `docker-compose.prod.yml` và `.env.production` |
| `DEPLOY_PORT`           | Không       | Cổng SSH; bỏ trống để dùng `22`                                       |
| `DEPLOY_API_HEALTH_URL` | Khuyên dùng | `https://api.example.com/api/health`                                  |
| `DEPLOY_WEB_URL`        | Khuyên dùng | `https://example.com`                                                 |
| `DEPLOY_ADMIN_URL`      | Khuyên dùng | `https://admin.example.com`                                           |

Nếu có environment `staging`, tạo bộ secrets riêng trong environment
`staging`; không dùng chung database/JWT của production.

Không cần tạo `GITHUB_TOKEN`: GitHub tự cấp token này cho workflow publish GHCR.
Workflow hiện tại cũng không đọc database, JWT, SMTP hoặc Gemini secret từ GitHub;
các secret runtime này phải tồn tại trong `.env.production` trên VPS.

Nếu GHCR package là private, đăng nhập `ghcr.io` trên VPS một lần bằng token chỉ
có quyền `read:packages`. Workflow deploy hiện tại không nhận `GHCR_TOKEN`, nên
chỉ tạo secret tên này trong GitHub sẽ không có tác dụng.

## 5. DNS records

Tạo các record sau tại nhà cung cấp DNS. `@` đại diện cho root domain
`example.com`.

| Type    | Name/Host | Value/Target  | TTL               | Mục đích              |
| ------- | --------- | ------------- | ----------------- | --------------------- |
| `A`     | `@`       | `<VPS_IPV4>`  | `Auto` hoặc `300` | Learner Web           |
| `A`     | `admin`   | `<VPS_IPV4>`  | `Auto` hoặc `300` | Admin                 |
| `A`     | `api`     | `<VPS_IPV4>`  | `Auto` hoặc `300` | API                   |
| `CNAME` | `www`     | `example.com` | `Auto` hoặc `300` | Redirect/alias về Web |

Chỉ tạo record `AAAA` nếu VPS đã có IPv6 hoạt động và firewall/reverse proxy
lắng nghe IPv6:

| Type   | Name/Host | Value/Target |
| ------ | --------- | ------------ |
| `AAAA` | `@`       | `<VPS_IPV6>` |
| `AAAA` | `admin`   | `<VPS_IPV6>` |
| `AAAA` | `api`     | `<VPS_IPV6>` |

Không tạo `AAAA` với IPv6 không sử dụng, vì browser có thể ưu tiên IPv6 và làm
website lúc vào được lúc không. DNS không chứa port; việc route hostname đến
container port do reverse proxy trên VPS xử lý.

Nếu dùng Cloudflare, nên để record ở chế độ `DNS only` trong lần cấp TLS và smoke
test đầu tiên. Chỉ bật proxy sau khi origin HTTPS đã hoạt động; dùng SSL mode
`Full (strict)`, không dùng `Flexible`.

Kiểm tra sau khi DNS propagate:

```bash
dig +short example.com A
dig +short admin.example.com A
dig +short api.example.com A
```

## 6. Điều kiện trên VPS trước khi chạy workflow

- Docker Engine và Docker Compose plugin đã cài.
- Public key tương ứng với `DEPLOY_SSH_KEY` nằm trong
  `~/.ssh/authorized_keys` của `DEPLOY_USER`.
- `DEPLOY_USER` có quyền chạy `docker compose`.
- Firewall chỉ mở cổng cần thiết: `22` (hoặc SSH port riêng), `80`, `443`.
- Reverse proxy đã route ba hostname theo bảng ở mục 1 và cấp HTTPS certificate.
- `.env.production` đã tạo và có permission `600`.
- Database production đã backup và có quy trình restore.

`docker-compose.prod.yml` đã được version ở root repository và phải được copy
đến `DEPLOY_PATH` trên VPS cùng với `.env.production`. File Compose sử dụng
`API_IMAGE`, `WEB_IMAGE`, `ADMIN_IMAGE`, `IMAGE_TAG`, truyền các biến runtime vào
API, và mount volume database/licensed content phù hợp. `.env.production` vẫn là
file riêng trên VPS, không commit vào repository.

Kiểm tra cấu hình Compose trên VPS trước deploy:

```bash
cd <DEPLOY_PATH>
docker compose -f docker-compose.prod.yml --env-file .env.production config
```

Lệnh trên phải resolve đủ ba image và không báo thiếu biến. Không đăng output của
lệnh này lên issue/chat vì output có thể chứa secret đã resolve.

## 7. Publish và deploy

1. Merge commit cần release vào `main` và đợi workflow `CI` xanh.
2. Workflow `Publish Images` tự chạy sau CI và publish ba image bằng commit SHA.
3. Khi publication thành công, workflow `Deploy` tự dùng cùng commit SHA để
   deploy vào GitHub Environment `production`.
4. Workflow SSH vào VPS, cập nhật bốn image variables, pull image, chạy
   `prisma migrate deploy`, khởi động Compose và health check.
5. Chỉ dùng `Actions > Deploy > Run workflow` khi cần deploy staging, rollback,
   hoặc deploy lại một image tag đã tồn tại.

Deployment không seed dữ liệu và không tự import Vocabulary/licensed content.
Không chạy `db:push`, `db:migrate:reset` hoặc `db:seed:dev` trên production.

## 8. Smoke test sau deploy

- [ ] `https://api.example.com/api/health` trả HTTP `200`.
- [ ] `https://example.com` và `https://admin.example.com` mở bằng HTTPS.
- [ ] Chứng chỉ TLS hợp lệ cho cả root, `www`, `admin` và `api` nếu các hostname
      đó được public.
- [ ] Đăng ký, verify email, đăng nhập, refresh session và logout hoạt động.
- [ ] Forgot/reset password gửi email thành công nếu SMTP được bật.
- [ ] Browser không bị lỗi CORS khi gọi API.
- [ ] Reading/Listening/Dictation tải được licensed content nếu tính năng được bật.
- [ ] TOEIC Writing AI chấm thành công nếu Gemini được bật.
- [ ] `docker compose ps` cho thấy các service cần thiết đang healthy/running.

## 9. Rollback nhanh

Nếu Gemini gặp sự cố, đặt `GEMINI_ENABLED=false` trong `.env.production` và
restart API.

Nếu image lỗi, đưa `IMAGE_TAG` về immutable tag trước đó, rồi chạy:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production pull api web admin
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Không xóa migration history hoặc dữ liệu Learner để rollback ứng dụng.
