# Frontend Shared Hooks

Tài liệu này mô tả bộ hook dùng chung cho các client frontend trong monorepo.

Hook được đặt trong `packages/hooks` thay vì `packages/shared` vì hook phụ thuộc React runtime. `packages/shared` tiếp tục giữ vai trò framework-agnostic cho types, schemas, constants, HTTP helper và utility thuần.

## Package

```txt
packages/hooks/
├── src/
│   ├── async/
│   ├── auth/
│   ├── browser/
│   ├── data/
│   └── state/
├── package.json
└── tsconfig.json
```

Import khuyến nghị:

```tsx
import { useDebounce, useDisclosure } from "@repo/hooks";
```

Hoặc import theo nhóm khi muốn rõ boundary:

```tsx
import { usePagination, useTable } from "@repo/hooks/data";
import { useAuth, usePermission } from "@repo/hooks/auth";
```

## Danh Sách Hook

| Hook              | Nhóm      | Vai trò                                                        |
| :---------------- | :-------- | :------------------------------------------------------------- |
| `useDebounce`     | `state`   | Trì hoãn cập nhật value để giảm số lần search/filter/API call. |
| `useDisclosure`   | `state`   | Quản lý open/close/toggle cho modal, drawer, popover.          |
| `useClickOutside` | `browser` | Bắt click/touch bên ngoài một element.                         |
| `useLocalStorage` | `browser` | State đồng bộ với `window.localStorage`, có SSR fallback.      |
| `useAsync`        | `async`   | Quản lý lifecycle async: idle/loading/success/error.           |
| `usePagination`   | `data`    | Quản lý page, page size, offset, limit, range hiển thị.        |
| `useQueryParams`  | `data`    | Đọc/ghi query params bằng History API.                         |
| `useTable`        | `data`    | Sort/filter/paginate data client-side đơn giản.                |
| `useAuth`         | `auth`    | Auth context tối thiểu cho client UI.                          |
| `usePermission`   | `auth`    | Check permission/role dựa trên `AuthProvider`.                 |

## Quy Ước Sử Dụng

- Hook dùng lại giữa `apps/admin` và `apps/web` đặt trong `packages/hooks`.
- Hook chỉ dùng riêng một app đặt trong `apps/<client>/src/hooks`.
- Hook chỉ dùng riêng một view đặt trong `apps/<client>/src/views/<feature>`.
- Không đặt React hook trong `packages/shared`.
- Hook không tự gọi endpoint trực tiếp nếu có thể tách sang `src/services` hoặc API client riêng.
- Hook trong package này phải type-safe, SSR-safe nếu chạm tới `window`/`document`.
- File `index.ts` chỉ dùng để export, không viết implementation.

## Ví Dụ

### Debounce Search

```tsx
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);
```

### Disclosure

```tsx
const createDialog = useDisclosure();

return (
  <Dialog open={createDialog.isOpen} onOpenChange={createDialog.setIsOpen}>
    ...
  </Dialog>
);
```

### Auth Và Permission

```tsx
import { AuthProvider, usePermission } from "@repo/hooks/auth";

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider
      user={{
        id: "admin-1",
        email: "admin@example.com",
        role: "admin",
        permissions: ["bookings:read", "bookings:update"],
      }}
    >
      {children}
    </AuthProvider>
  );
}

function BookingAction() {
  const { can } = usePermission("bookings:update");

  return <Button disabled={!can}>Update</Button>;
}
```

### Table Client-Side

```tsx
const table = useTable({
  data: bookings,
  filter: (booking, query) =>
    booking.customer.toLowerCase().includes(query.toLowerCase()),
  initialSort: { key: "date", direction: "desc" },
  initialPageSize: 10,
});
```

`useTable` phù hợp cho data nhỏ hoặc mock UI. Khi table cần server-side pagination/filter/sort, hãy dùng state từ hook này để gọi service/query function thay vì load toàn bộ data lên client.

## Scripts

```bash
pnpm typecheck:hooks
pnpm lint:hooks
pnpm --filter @repo/hooks build
```

`build:packages` ở root đã bao gồm `@repo/hooks`.
