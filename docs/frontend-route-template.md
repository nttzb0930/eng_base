# Frontend Route Template

Template này dùng khi thêm route mới vào `apps/admin` hoặc `apps/web`.

## Route Page

`app/(group)/example/page.tsx`

```tsx
import { ExampleView } from "@/src/views/example/example.view";

export default function ExamplePage() {
  return <ExampleView />;
}
```

Rule:

- Không thêm `"use client"` vào `page.tsx`.
- Không đặt UI logic, state, table columns, mock data hoặc helper function trong `page.tsx`.
- `page.tsx` chỉ compose view.

## View Folder

```txt
src/views/example/
├── example.view.tsx
├── example.constants.ts
├── example.types.ts
├── example.utils.ts
├── example.columns.tsx
├── components/
│   └── example-table.tsx
└── index.ts
```

Không phải feature nào cũng cần đủ mọi file. Tạo file khi feature thật sự cần.

## View

`src/views/example/example.view.tsx`

```tsx
import { PageHeader } from "@/src/components/common/page-header";

export function ExampleView() {
  return (
    <div className="space-y-6">
      <PageHeader
        description="Short description for the route."
        eyebrow="Section"
        title="Example"
      />
    </div>
  );
}
```

## Constants

`src/views/example/example.constants.ts`

```ts
export const exampleTabs = [
  {
    label: "Overview",
    value: "overview",
  },
  {
    label: "Settings",
    value: "settings",
  },
] as const;
```

## Types

`src/views/example/example.types.ts`

```ts
export type ExampleViewMode = "table" | "cards";
export type ExampleStatusFilter = "all" | "active" | "inactive";
```

Rule: file này chỉ chứa type phục vụ view/local UI state. Type dữ liệu trả về từ API hoặc domain contract phải đặt trong `packages/shared/src/types`.

## Utils

`src/views/example/example.utils.ts`

```ts
import type { ExampleItem } from "@/src/views/example/example.types";

export function isExampleActive(item: ExampleItem) {
  return item.status === "active";
}
```

## Columns

`src/views/example/example.columns.tsx`

```tsx
import type { ColumnDef } from "@tanstack/react-table";
import type { ExampleItemSummary } from "@repo/shared";

export const exampleColumns: ColumnDef<ExampleItemSummary>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
];
```

## Barrel

`src/views/example/index.ts`

```ts
export * from "./example.view";
export * from "./example.constants";
export * from "./example.types";
export * from "./example.utils";
```

Không viết implementation trong `index.ts`.

## Checklist

- [ ] `page.tsx` chỉ import view.
- [ ] View nằm trong `src/views/<feature>`.
- [ ] Feature component riêng nằm trong `src/views/<feature>/components`.
- [ ] API/domain DTO được đặt trong `packages/shared/src/types`.
- [ ] `<feature>.types.ts` chỉ chứa type phục vụ view/local UI state.
- [ ] Component dùng lại nhiều view nằm trong `src/components/common`.
- [ ] `index.ts` chỉ export.
- [ ] Chạy `check-types`, `lint`, `build` cho app bị ảnh hưởng.
