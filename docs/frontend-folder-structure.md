# Frontend Folder Structure

Tài liệu này mô tả đầy đủ vai trò, chức năng và rule sử dụng folder cho các client frontend trong monorepo, hiện áp dụng cho:

- `apps/web`: app public/customer-facing.
- `apps/admin`: app dashboard/quản trị nội bộ.

Mục tiêu là giữ cấu trúc đủ rõ để làm boilerplate cho nhiều dự án Next.js khác, đồng thời tránh việc code UI, API, type và helper bị trộn lẫn.

## Cây Folder Chuẩn

```txt
apps/<client>/
├── app/
├── src/
│   ├── app/
│   │   └── providers/
│   ├── components/
│   ├── config/
│   ├── constants/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── views/
├── Dockerfile
├── next.config.js
├── package.json
└── tsconfig.json
```

`apps/<client>` có thể là `apps/web`, `apps/admin` hoặc client Next.js khác được thêm sau này.

## Vai Trò Cấp App Root

### `app/`

Đây là folder của Next.js App Router.

Chỉ đặt các file framework-level tại đây:

- `layout.tsx`
- `page.tsx`
- `loading.tsx`
- `error.tsx`
- `not-found.tsx`
- route groups như `(dashboard)`, `(auth)`, `(marketing)`

Rule:

- `app/**/page.tsx` phải là file mỏng.
- Không đặt `"use client"` trong `page.tsx` nếu không có lý do cực kỳ đặc biệt.
- Không viết business logic, table columns, mock data, form state hoặc API call trực tiếp trong `page.tsx`.
- `page.tsx` chỉ import view từ `src/views`.

Ví dụ:

```tsx
import { BookingsView } from "@/src/views/bookings/bookings.view";

export default function BookingsPage() {
  return <BookingsView />;
}
```

`error.tsx` có thể dùng `"use client"` vì Next.js cần callback `reset()`.

### `.next/`, `.turbo/`, `node_modules/`

Đây là output/cache/dependency folder do tool sinh ra. Không viết code thủ công trong các folder này.

## Vai Trò Trong `src/`

### `src/app/`

Chứa cấu hình runtime cấp app, không phải route.

Nên dùng cho:

- Provider composition.
- Client/global store.
- App bootstrap helper.

Ví dụ:

```txt
src/app/
├── providers/
│   └── theme-provider.tsx
└── stores/
    └── ui.store.ts
```

Không đặt page, route hoặc feature UI trong `src/app`.

### `src/app/providers/`

Chứa các provider dùng ở root layout hoặc một layout lớn.

Ví dụ:

- `theme-provider.tsx`
- `query-provider.tsx`
- `auth-provider.tsx`
- `toast-provider.tsx`

Provider nên được import bởi `app/layout.tsx` hoặc route layout tương ứng.

### `src/app/stores/`

Chứa global/client store cấp app.

Ví dụ:

- UI store.
- Command menu state.
- Sidebar state.
- Auth session state nếu cần client-side store.

Không đặt store chỉ dùng riêng một feature ở đây. Store riêng của feature nên nằm trong `src/views/<feature>`.

### `src/views/`

Chứa màn hình theo route hoặc feature lớn.

Đây là nơi `page.tsx` import vào.

Ví dụ:

```txt
src/views/bookings/
├── bookings.view.tsx
├── bookings.constants.ts
├── bookings.types.ts
├── bookings.utils.ts
├── bookings.columns.tsx
├── components/
│   ├── booking-status-badge.tsx
│   └── bookings-table.tsx
└── index.ts
```

Vai trò từng file:

| File                     | Vai trò                                                                 |
| :----------------------- | :---------------------------------------------------------------------- |
| `<feature>.view.tsx`     | Compose màn hình chính của route.                                       |
| `<feature>.constants.ts` | Static config của view: tabs, filters, mock data, labels.               |
| `<feature>.types.ts`     | Type chỉ phục vụ UI/view state như filter value, tab value, local mode. |
| `<feature>.utils.ts`     | Helper thuần chỉ dùng trong feature đó.                                 |
| `<feature>.columns.tsx`  | Column definition cho TanStack Table hoặc table UI.                     |
| `components/`            | Component private của feature.                                          |

Rule:

- Feature component không dùng ở nơi khác thì để trong `src/views/<feature>/components`.
- Không đưa type API/domain DTO vào `<feature>.types.ts`.
- Không import trực tiếp component private của feature khác.
- Nếu logic được dùng bởi nhiều feature, cân nhắc đưa lên `src/components/common`, `src/hooks`, `src/utils`, `src/services` hoặc `packages/*`.

### `src/components/`

Chứa component dùng lại trong phạm vi app hiện tại.

Khuyến nghị chia:

```txt
src/components/
├── common/
└── layout/
```

`common/` dùng cho component app-level reusable:

- `PageHeader`
- `StatePanel`
- `FormField`
- `StatsCard`
- `EmptyState`
- `ConfirmDialog`

`layout/` dùng cho shell và navigation:

- `DashboardShell`
- `AppSidebar`
- `Header`
- `MobileSidebar`
- `TopNav`

Rule:

- Không đặt business-specific component vào `common`.
- Ví dụ `BookingStatusBadge` không thuộc `common`; nó thuộc `src/views/bookings/components`.
- Nếu component đủ generic cho cả admin và web, đưa lên `packages/ui`.

### `src/config/`

Chứa app config hoặc mapping từ env sang object an toàn cho app dùng.

Ví dụ:

- `app.config.ts`
- `env.config.ts`
- `feature-flags.config.ts`
- `routes.config.ts`

Không đọc env rải rác trong nhiều component. Gom cấu hình vào đây khi bắt đầu có nhiều biến.

### `src/constants/`

Chứa constant cấp app, dùng bởi nhiều view hoặc nhiều module trong client đó.

Ví dụ:

- route paths.
- query keys.
- pagination defaults.
- date formats.
- navigation constants dùng nhiều nơi.

Rule:

- Constant chỉ dùng trong một feature thì đặt trong `src/views/<feature>/<feature>.constants.ts`.
- Constant dùng nhiều feature mới đưa lên `src/constants`.

### `src/hooks/`

Chứa React hooks dùng lại trong nhiều view/component.

Ví dụ:

- `use-debounce.ts`
- `use-media-query.ts`
- `use-disclosure.ts`
- `use-copy-to-clipboard.ts`

Rule:

- Hook phải bắt đầu bằng `use`.
- Hook chỉ dùng riêng một feature thì đặt trong `src/views/<feature>`.
- Hook dùng API/server state nên gọi service/query function, không hardcode request ngay trong component UI.
- Hook dùng chung giữa nhiều client nên đưa vào `packages/hooks`.

### `src/lib/`

Chứa wrapper hoặc adapter cho thư viện/framework.

Ví dụ:

- `query-client.ts`
- `toast.ts`
- `dayjs.ts`
- `analytics.ts`
- `storage.ts`

Rule:

- `lib` không phải nơi đặt business logic.
- `lib` nên là code hạ tầng nhỏ giúp app dùng thư viện thống nhất.

### `src/services/`

Chứa API/query functions, client-side service, adapter giao tiếp backend.

Ví dụ:

```txt
src/services/
├── bookings.service.ts
├── users.service.ts
└── reports.service.ts
```

Rule:

- Dùng HTTP client từ `@repo/shared/http` khi cần gọi API.
- Không gọi API trực tiếp trong component nếu service đã tồn tại.
- Response type/domain DTO import từ `@repo/shared`.
- Với feature rất lớn, có thể tách service feature-local, nhưng phải giữ rule rõ trong docs feature đó.

### `src/types/`

Chứa type app-level chỉ có ý nghĩa trong client hiện tại.

Ví dụ:

- `navigation.types.ts`
- `theme.types.ts`
- `table.types.ts`

Rule:

- API response type, shared domain type, DTO dùng lại giữa app/API phải nằm trong `packages/shared/src/types`.
- Type chỉ phục vụ một view thì đặt trong `src/views/<feature>/<feature>.types.ts`.
- Không gom tất cả type vào một file lớn.

### `src/utils/`

Chứa utility function thuần, không React, không JSX, không browser side-effect khó kiểm soát.

Ví dụ:

- `format-currency.ts`
- `format-date.ts`
- `get-initials.ts`
- `parse-search-params.ts`

Rule:

- Utility chỉ dùng trong một feature thì đặt trong `src/views/<feature>/<feature>.utils.ts`.
- Utility dùng nhiều app nên cân nhắc đưa vào `packages/shared/src/utils`.

## Quan Hệ Với `packages/*`

### `packages/ui`

Chứa UI primitive thật sự reusable giữa nhiều app.

Phù hợp:

- `Button`
- `Card`
- `Input`
- `Table`
- `Dialog`
- `Tabs`
- `Switch`

Không phù hợp:

- `BookingStatusBadge`
- `UserRoleBadge`
- `RevenueDashboardCard`
- Component có wording/domain cụ thể.

### `packages/shared`

Chứa contract và helper dùng chung.

Phù hợp:

- API response types.
- Domain DTO.
- Zod schemas.
- Constants dùng chung nhiều app/API.
- HTTP client/helper.
- Utility dùng chung nhiều package.

Rule quan trọng:

- Type có hình dạng dữ liệu từ API hoặc domain contract phải đặt trong `packages/shared/src/types`.
- `src/views/<feature>/<feature>.types.ts` chỉ chứa type phục vụ view/local UI state.
- Không đặt React hook vào `packages/shared`; hook dùng chung nằm ở `packages/hooks`.

Ví dụ:

```ts
// packages/shared/src/types/booking.types.ts
export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed";

export type BookingSummary = {
  id: string;
  customer: string;
  status: BookingStatus;
};
```

```ts
// apps/admin/src/views/bookings/bookings.types.ts
import type { BookingStatus } from "@repo/shared";

export type BookingStatusFilter = "all" | BookingStatus;
```

## Barrel File Rule

Chỉ tạo `index.ts` ở folder thật sự cần re-export module con.

Không tạo `index.ts` chỉ để giữ folder trống.

Không tạo `index.ts` ở folder cha nếu folder đó không có public export rõ ràng.

Được phép:

```txt
src/components/common/index.ts
src/views/bookings/index.ts
src/views/bookings/components/index.ts
```

Không cần:

```txt
src/index.ts
src/views/index.ts
src/hooks/index.ts
src/utils/index.ts
```

`index.ts` chỉ dùng để export:

```ts
export * from "./page-header";
export * from "./state-panel";
```

Không viết business logic, React component implementation, constant lớn hoặc helper function trong `index.ts`.

## Import Rule

- Trong app dùng alias `@/src/...`.
- Import primitive từ `@repo/ui`.
- Import shared type/schema/helper từ `@repo/shared`.
- View được import bởi `app/**/page.tsx`.
- View có thể import `src/components/common`, `src/components/layout`, `src/hooks`, `src/services`, `src/utils`, `src/constants`.
- `src/components/common` không import ngược vào `src/views`.
- Feature này không import component private của feature khác.

## Khi Nào Đưa Code Lên Tầng Cao Hơn?

| Tình huống                             | Nơi đặt                                                           |
| :------------------------------------- | :---------------------------------------------------------------- |
| Chỉ dùng trong một màn hình            | `src/views/<feature>`                                             |
| Dùng trong nhiều màn hình của cùng app | `src/components/common`, `src/hooks`, `src/utils`, `src/services` |
| Dùng trong cả web và admin             | `packages/ui` hoặc `packages/shared`                              |
| Là API/domain DTO                      | `packages/shared/src/types`                                       |
| Là schema validate shared              | `packages/shared/src/schemas`                                     |
| Là UI primitive không chứa domain      | `packages/ui`                                                     |
| Là React hook dùng chung nhiều client  | `packages/hooks`                                                  |

## Checklist Khi Thêm Route Mới

1. Tạo route trong `app`.
2. Tạo view trong `src/views/<feature>/<feature>.view.tsx`.
3. `page.tsx` chỉ render view.
4. Component riêng của feature đặt trong `src/views/<feature>/components`.
5. Static config/mock data/filter/tab đặt trong `<feature>.constants.ts`.
6. View-only type đặt trong `<feature>.types.ts`.
7. API/domain type đặt trong `packages/shared/src/types`.
8. Table columns đặt trong `<feature>.columns.tsx`.
9. Helper chỉ dùng trong feature đặt trong `<feature>.utils.ts`.
10. Component dùng lại nhiều feature đưa vào `src/components/common`.
11. API/query function đặt trong `src/services`.
12. Chạy typecheck/lint/build trước khi hoàn tất.

Xem template chi tiết tại `docs/architecture/frontend-route-template.md`.

Xem bộ hook dùng chung tại `docs/architecture/frontend-shared-hooks.md`.
