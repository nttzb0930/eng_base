# Backend Folder Structure

Tài liệu này định nghĩa cấu trúc backend cho `apps/api`. Backend dùng NestJS nhưng module nghiệp vụ nên được tổ chức theo hướng Clean Architecture nhẹ: controller ở ngoài cùng, use case ở application layer, repository ở infrastructure/data access layer.

Mục tiêu:

- Module dễ test bằng unit test.
- Business logic không bị nhét vào controller.
- Data access không bị gọi trực tiếp từ controller/use case nếu module đã có repository.
- Mỗi module có folder `tests/` để test use case của module đó.

## Cây Folder Tổng Quan

```txt
apps/api/src/
├── common/
├── config/
├── database/
├── modules/
│   └── <module>/
├── shared/
├── workers/
├── app.module.ts
└── main.ts
```

## Vai Trò Folder Cấp API

### `common/`

Chứa hạ tầng dùng chung trong API app:

- decorators
- guards
- filters
- interceptors
- middleware
- logger
- response helpers
- request/response types

Không đặt logic nghiệp vụ domain trong `common`.

### `config/`

Chứa cấu hình môi trường và config provider:

- app config
- database config
- Redis config
- JWT config
- rate limit config
- email config
- job config
- env validation

Không đọc `process.env` rải rác trong module nghiệp vụ nếu đã có config tương ứng.

### `database/`

Chứa adapter kết nối database/cache:

- Prisma module/service.
- Redis module/service.
- Database-related provider dùng chung.

Repository của từng module có thể inject `PrismaService` từ folder này.

### `modules/`

Chứa module nghiệp vụ. Mỗi domain chính nên có một folder riêng:

```txt
src/modules/bookings/
src/modules/customers/
src/modules/services/
src/modules/staff/
```

Mỗi module là một vertical slice của backend.

### `shared/`

Chứa interface hoặc abstraction dùng trong API app. Ví dụ hiện có:

```txt
src/shared/interfaces/base-usecase.interface.ts
```

Không nhầm với `packages/shared`. Nếu type/schema cần dùng chung giữa API/Admin/Web thì đưa vào `packages/shared`.

### `workers/`

Chứa worker entrypoint, processor và queue-specific runtime code.

Worker có thể gọi use case/service của module nhưng không nên chứa business logic chính nếu logic đó thuộc module.

## Cấu Trúc Chuẩn Của Một Module

Module mới nên đi theo cấu trúc sau:

```txt
src/modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── dto/
│   ├── create-<entity>.dto.ts
│   └── update-<entity>.dto.ts
├── repository/
│   ├── <module>.repository.ts
│   └── <module>.repository.interface.ts
├── use-cases/
│   ├── create-<entity>.use-case.ts
│   ├── update-<entity>.use-case.ts
│   ├── get-<entity>.use-case.ts
│   └── list-<entity>.use-case.ts
├── service/
│   └── <module>-domain.service.ts
├── tests/
│   ├── create-<entity>.use-case.spec.ts
│   └── update-<entity>.use-case.spec.ts
└── <module>.types.ts
```

Không phải module nào cũng cần đủ mọi folder ngay từ đầu. Nhưng với module nghiệp vụ có write/read data, tối thiểu nên có:

- `*.module.ts`
- `*.controller.ts`
- `dto/`
- `repository/`
- `use-cases/`
- `tests/`

## Backend Layers

### Controller Layer

File:

```txt
<module>.controller.ts
```

Vai trò:

- Nhận HTTP request.
- Validate DTO thông qua Nest pipe/class-validator.
- Lấy user/context từ decorator.
- Gọi use case tương ứng.
- Trả response.

Không làm:

- Không chứa business logic.
- Không gọi Prisma trực tiếp.
- Không tự xử lý transaction phức tạp.
- Không tự gửi email/notification nếu đó là nghiệp vụ của use case.

Ví dụ shape:

```ts
@Post()
create(@Body() dto: CreateBookingDto) {
  return this.createBookingUseCase.execute(dto);
}
```

### DTO Layer

Folder:

```txt
dto/
```

Vai trò:

- Định nghĩa request payload.
- Validate input bằng `class-validator`.
- Dùng Swagger decorators nếu cần document API.

Rule:

- DTO không chứa business logic.
- DTO không thay thế domain type/shared contract.
- Response DTO có thể đặt trong `dto/` nếu chỉ API dùng; nếu Admin/Web cũng dùng type đó, đưa contract sang `packages/shared`.

### Use Case Layer

Folder:

```txt
use-cases/
```

Vai trò:

- Chứa application business flow.
- Điều phối repository, domain service, email/notification/job.
- Kiểm tra rule nghiệp vụ.
- Là phần ưu tiên viết unit test.

Naming:

```txt
create-booking.use-case.ts
cancel-booking.use-case.ts
list-bookings.use-case.ts
```

Class:

```ts
export class CreateBookingUseCase {
  async execute(input: CreateBookingInput) {
    // business flow
  }
}
```

Rule:

- Use case không phụ thuộc HTTP request/response.
- Use case không import controller.
- Use case không nên biết Express/Nest request object.
- Use case có thể nhận primitive/context object rõ ràng như `businessId`, `actorId`, `role`.
- Use case gọi repository interface hoặc repository concrete tùy mức độ module. Với module lớn, ưu tiên interface token.

### Repository Layer

Folder:

```txt
repository/
```

Vai trò:

- Data access.
- Query database thông qua Prisma.
- Map database model sang domain/shared DTO nếu cần.
- Ẩn chi tiết Prisma khỏi use case.

Naming:

```txt
booking.repository.ts
booking.repository.interface.ts
```

Rule:

- Repository không chứa business decision.
- Repository có thể chứa query/filter/sort/pagination.
- Repository không gửi email, notification hoặc gọi external service.
- Repository không phụ thuộc controller.

Ví dụ:

```ts
export interface BookingRepository {
  findById(id: string): Promise<BookingSummary | null>;
  create(input: CreateBookingRepositoryInput): Promise<BookingSummary>;
}
```

### Domain Service Layer

Folder tùy module:

```txt
service/
```

Vai trò:

- Chứa logic domain thuần hoặc helper nghiệp vụ dùng bởi nhiều use case.
- Ví dụ: tính available slots, kiểm tra double-booking, tính tổng thời lượng dịch vụ.

Rule:

- Nếu logic chỉ dùng trong một use case, để trong use case trước.
- Nếu lặp lại giữa nhiều use case, tách ra domain service.
- Domain service không biết HTTP.

### Tests Layer

Folder:

```txt
tests/
```

Mỗi module phải có folder `tests/`.

Unit test ưu tiên cho use case:

```txt
tests/create-booking.use-case.spec.ts
tests/cancel-booking.use-case.spec.ts
tests/list-bookings.use-case.spec.ts
```

Rule:

- Test use case bằng mock repository.
- Không cần boot Nest app cho unit test use case.
- Không gọi database thật trong unit test.
- Mỗi behavior quan trọng cần test: success path, validation/business error, permission/ownership rule, edge case.

Ví dụ test shape:

```ts
describe("CreateBookingUseCase", () => {
  it("creates a booking when slot is available", async () => {
    const repository = createBookingRepositoryMock();
    const useCase = new CreateBookingUseCase(repository);

    await expect(useCase.execute(input)).resolves.toEqual(expected);
  });
});
```

## Dependency Direction

Luồng phụ thuộc nên đi theo chiều:

```txt
controller -> use-case -> repository -> database
                 |
                 -> domain service
                 -> external gateway/job/email service
```

Không đi ngược:

```txt
repository -> use-case       ❌
use-case -> controller       ❌
service -> controller        ❌
common -> module nghiệp vụ   ❌
```

## Clean Architecture Rule Trong Repo Này

Repo này dùng Clean Architecture theo mức pragmatic, không quá ceremony:

- Controller là delivery layer.
- Use case là application layer.
- Repository là infrastructure/data access layer.
- Domain service là domain logic shared trong module.
- DTO là HTTP input contract.
- Shared package là cross-app contract.

Không bắt buộc tạo entity/domain model riêng nếu module còn nhỏ. Khi logic phức tạp lên, có thể thêm:

```txt
domain/
├── booking.entity.ts
├── booking-policy.ts
└── booking.errors.ts
```

## Rule Với `packages/shared`

Đưa vào `packages/shared` khi type/schema/constant cần dùng bởi nhiều app:

- API response type.
- Admin/Web DTO.
- Zod schema dùng chung.
- Domain enum dùng chung.
- Utility framework-neutral.

Không đưa vào `packages/shared`:

- DTO chỉ dùng bởi Nest controller.
- Prisma-specific type.
- Use case input private.
- Repository input private.

## Khi Tạo Module Mới

Checklist:

1. Tạo folder `src/modules/<module>`.
2. Tạo `<module>.module.ts`.
3. Tạo `<module>.controller.ts`.
4. Tạo `dto/`.
5. Tạo `repository/`.
6. Tạo `use-cases/`.
7. Tạo `tests/`.
8. Viết unit test cho use case chính trước hoặc cùng lúc implementation.
9. Đăng ký provider trong module.
10. Import module vào `app.module.ts` hoặc module parent.
11. Chạy test/typecheck/lint.

## Naming Convention

| Loại file            | Pattern                              |
| :------------------- | :----------------------------------- |
| Controller           | `<module>.controller.ts`             |
| Module               | `<module>.module.ts`                 |
| DTO                  | `<action>-<entity>.dto.ts`           |
| Use case             | `<action>-<entity>.use-case.ts`      |
| Repository           | `<module>.repository.ts`             |
| Repository interface | `<module>.repository.interface.ts`   |
| Domain service       | `<module>-domain.service.ts`         |
| Unit test            | `<action>-<entity>.use-case.spec.ts` |

Ưu tiên `kebab-case` cho file name và `PascalCase` cho class name.

## Example Module

```txt
src/modules/bookings/
├── bookings.module.ts
├── bookings.controller.ts
├── dto/
│   ├── create-booking.dto.ts
│   └── reschedule-booking.dto.ts
├── repository/
│   ├── bookings.repository.ts
│   └── bookings.repository.interface.ts
├── service/
│   └── booking-availability.service.ts
├── use-cases/
│   ├── create-booking.use-case.ts
│   ├── cancel-booking.use-case.ts
│   └── list-bookings.use-case.ts
└── tests/
    ├── create-booking.use-case.spec.ts
    └── cancel-booking.use-case.spec.ts
```

## Verification Commands

```bash
pnpm --filter @repo/api check-types
pnpm --filter @repo/api lint
pnpm --filter @repo/api test
pnpm --filter @repo/api build
```
