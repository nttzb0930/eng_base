# Admin UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the approved Tailwind 4/Shadcn Admin design system, theme, shell, grouped navigation, feedback, form, and table foundations without changing domain HTTP behavior.

**Architecture:** Admin owns its Shadcn source under `apps/admin/app/components/ui`; exact cross-runtime primitives remain re-exported from `@repo/ui`. CSS-first Tailwind scans the shared UI package, while routes continue to compose `app/views` and feature behavior remains under `app/features`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Shadcn CLI, Radix UI, next-themes, TanStack Table, React Query, Sonner, TypeScript.

## Global Constraints

- Preserve the dependency flow `route -> app/views -> app/features hook -> resource .api.ts -> Auth-owned HTTP client`.
- Use Inter loaded by `next/font/google` and the approved 400/500/600 typography scale.
- Keep app-only Shadcn source in `apps/admin/app/components/ui`; retain Avatar, Dialog, and Separator as `@repo/ui` re-exports.
- Do not change Admin URLs, resource endpoints, query-key roots, request methods, or payloads.
- Do not add fake search, analytics, or a dashboard without a real capability.
- Do not run migration, seed, vocabulary, provider, or database-write commands.
- Preserve unrelated untracked `artifacts/` and `tools/` content.

---

### Task 1: Characterize the CSS-first Admin profile

**Files:**

- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Test: `apps/admin/test/app-profile-architecture.test.ts`

**Interfaces:**

- Consumes: current Admin file profile and `@repo/ui` re-export rule.
- Produces: structural requirements for `components.json`, CSS-first Tailwind source scanning, theme provider, and the approved primitive set.

- [ ] **Step 1: Replace the Tailwind-config assertion with failing CSS-first assertions**

Add assertions that require:

```ts
test("Admin owns a CSS-first Shadcn profile", () => {
  const components = JSON.parse(
    readFileSync(join(root, "components.json"), "utf8")
  ) as {
    style: string;
    tailwind: { config: string; css: string; cssVariables: boolean };
    aliases: { components: string; ui: string; utils: string };
  };
  const globals = readFileSync(join(root, "app/globals.css"), "utf8");

  assert.equal(components.style, "new-york");
  assert.equal(components.tailwind.config, "");
  assert.equal(components.tailwind.css, "app/globals.css");
  assert.equal(components.tailwind.cssVariables, true);
  assert.equal(components.aliases.components, "@/app/components");
  assert.equal(components.aliases.ui, "@/app/components/ui");
  assert.equal(components.aliases.utils, "@/app/utils/cn");
  assert.match(globals, /@import "tailwindcss"/u);
  assert.match(globals, /@import "tw-animate-css"/u);
  assert.match(globals, /@source "\.\.\/\.\.\/\.\.\/packages\/ui\/src/u);
  assert.match(globals, /@custom-variant dark/u);
  assert.equal(existsSync(join(root, "tailwind.config.ts")), false);
});
```

Extend the existing file list with:

```ts
"app/components/theme/AdminThemeProvider.tsx",
"app/components/theme/ThemeMenu.tsx",
"app/components/layout/PageHeader.tsx",
"app/components/feedback/EmptyState.tsx",
"app/components/feedback/ErrorState.tsx",
"app/components/feedback/LoadingState.tsx",
"app/components/forms/FormField.tsx",
"app/components/forms/FormActions.tsx",
"app/components/ui/alert-dialog.tsx",
"app/components/ui/badge.tsx",
"app/components/ui/collapsible.tsx",
"app/components/ui/sheet.tsx",
"app/components/ui/skeleton.tsx",
"app/components/ui/switch.tsx",
"app/components/ui/tabs.tsx",
"app/components/ui/textarea.tsx",
"app/components/ui/tooltip.tsx",
```

- [ ] **Step 2: Run the architecture test and verify it fails**

Run:

```powershell
pnpm --filter @repo/admin architecture:check
```

Expected: FAIL because `components.json`, the CSS-first imports, theme files, and new primitives do not exist.

- [ ] **Step 3: Commit the characterization test**

```powershell
git add apps/admin/test/app-profile-architecture.test.ts
git commit -m "test(admin): characterize shadcn ui foundation"
```

### Task 2: Migrate Admin styling dependencies and configuration

**Files:**

- Create: `apps/admin/components.json`
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/postcss.config.js`
- Modify: `pnpm-lock.yaml`
- Delete: `apps/admin/tailwind.config.ts`

**Interfaces:**

- Consumes: pnpm 10 workspace and the CSS-first assertions from Task 1.
- Produces: a Shadcn registry rooted at `app/components/ui` and a Tailwind 4 PostCSS build.

- [ ] **Step 1: Add the Shadcn registry**

Create `apps/admin/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/app/components",
    "utils": "@/app/utils/cn",
    "ui": "@/app/components/ui",
    "lib": "@/app",
    "hooks": "@/app/hooks"
  }
}
```

- [ ] **Step 2: Replace the Admin CSS toolchain dependencies**

Run:

```powershell
pnpm --filter @repo/admin remove autoprefixer tailwindcss-animate
pnpm --filter @repo/admin add next-themes zod
pnpm --filter @repo/admin add -D tailwindcss@^4.1.13 @tailwindcss/postcss@^4.2.0 tw-animate-css@^1.4.0 shadcn@^4.9.0
```

Expected: `apps/admin/package.json` and `pnpm-lock.yaml` change; no other workspace manifest changes.

- [ ] **Step 3: Replace PostCSS configuration**

Set `apps/admin/postcss.config.js` to:

```js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

- [ ] **Step 4: Remove the obsolete Tailwind 3 config**

Delete `apps/admin/tailwind.config.ts`. Tailwind source scanning is now owned by `app/globals.css`.

- [ ] **Step 5: Generate the app-owned Shadcn primitives**

Run from `apps/admin`:

```powershell
pnpm exec shadcn add alert-dialog badge button card checkbox collapsible dropdown-menu input label pagination radio-group select sheet skeleton switch table tabs textarea tooltip --yes --overwrite
```

Do not generate `avatar`, `dialog`, or `separator`; those three files must continue to re-export `@repo/ui`.

- [ ] **Step 6: Normalize generated imports**

Verify every generated file imports `cn` from:

```ts
import { cn } from "@/app/utils/cn";
```

Verify generated files do not import from `@/components`, `@/lib/utils`, or capability code.

- [ ] **Step 7: Run install/config verification**

Run:

```powershell
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin architecture:check
```

Expected: architecture still fails only for global CSS/theme/layout files required by later tasks; dependency and generated primitive compilation passes.

- [ ] **Step 8: Commit configuration and primitives**

```powershell
git add apps/admin/components.json apps/admin/package.json apps/admin/postcss.config.js apps/admin/app/components/ui pnpm-lock.yaml
git add -u apps/admin/tailwind.config.ts
git commit -m "build(admin): establish tailwind shadcn profile"
```

### Task 3: Add semantic global styling and theme ownership

**Files:**

- Modify: `apps/admin/app/globals.css`
- Modify: `apps/admin/app/layout.tsx`
- Modify: `apps/admin/app/providers.tsx`
- Create: `apps/admin/app/components/theme/AdminThemeProvider.tsx`
- Create: `apps/admin/app/components/theme/ThemeMenu.tsx`

**Interfaces:**

- Consumes: `ThemeProvider` from `next-themes`, Shadcn Dropdown Menu, Inter from `next/font/google`.
- Produces: `AdminThemeProvider`, `ThemeMenu`, semantic light/dark tokens, and `--font-inter`.

- [ ] **Step 1: Replace globals with the CSS-first semantic theme**

Use this structure in `globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

@source "../../../packages/ui/src/**/*.{ts,tsx}";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
  --radius: 0.5rem;
  --background: oklch(0.985 0.002 247.839);
  --foreground: oklch(0.129 0.042 264.695);
  --card: oklch(1 0 0);
  --card-foreground: var(--foreground);
  --popover: oklch(1 0 0);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.208 0.042 265.755);
  --primary-foreground: oklch(0.984 0.003 247.858);
  --secondary: oklch(0.968 0.007 247.896);
  --secondary-foreground: var(--primary);
  --muted: oklch(0.968 0.007 247.896);
  --muted-foreground: oklch(0.554 0.046 257.417);
  --accent: oklch(0.929 0.013 255.508);
  --accent-foreground: var(--primary);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.929 0.013 255.508);
  --input: oklch(0.869 0.022 252.894);
  --ring: oklch(0.551 0.027 264.364);
  --admin-scrollbar-thumb: oklch(0.704 0.04 256.788 / 0.62);
  --admin-scrollbar-thumb-hover: oklch(0.446 0.043 257.281 / 0.84);
}

.dark {
  color-scheme: dark;
  --background: oklch(0.129 0.042 264.695);
  --foreground: oklch(0.984 0.003 247.858);
  --card: oklch(0.208 0.042 265.755);
  --card-foreground: var(--foreground);
  --popover: oklch(0.208 0.042 265.755);
  --popover-foreground: var(--foreground);
  --primary: oklch(0.929 0.013 255.508);
  --primary-foreground: oklch(0.208 0.042 265.755);
  --secondary: oklch(0.279 0.041 260.031);
  --secondary-foreground: var(--foreground);
  --muted: oklch(0.279 0.041 260.031);
  --muted-foreground: oklch(0.704 0.04 256.788);
  --accent: oklch(0.279 0.041 260.031);
  --accent-foreground: var(--foreground);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 0.1);
  --input: oklch(1 0 0 / 0.15);
  --ring: oklch(0.551 0.027 264.364);
  --admin-scrollbar-thumb: oklch(0.554 0.046 257.417 / 0.6);
  --admin-scrollbar-thumb-hover: oklch(0.869 0.022 252.894 / 0.78);
}

@theme inline {
  --font-sans: var(--font-inter);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
```

Add the Warranty-derived browser rules for box sizing, thin scrollbars, stable scrollbar gutter, Radix `data-scroll-locked` compensation, full height, and body background/foreground.

```css
* {
  box-sizing: border-box;
  scrollbar-color: var(--admin-scrollbar-thumb) transparent;
  scrollbar-width: thin;
}

*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  background: transparent;
}

*::-webkit-scrollbar-track,
*::-webkit-scrollbar-corner {
  background: transparent;
  box-shadow: none;
}

*::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

*::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 9999px;
  background-color: var(--admin-scrollbar-thumb);
  background-clip: content-box;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: var(--admin-scrollbar-thumb-hover);
}

html {
  min-height: 100%;
  scrollbar-gutter: stable;
}

html body[data-scroll-locked] {
  margin-right: 0 !important;
}

body {
  min-height: 100%;
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  font-weight: 400;
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
}
```

- [ ] **Step 2: Load Inter explicitly in the root layout**

Use:

```tsx
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
});
```

Set `<html lang="vi" suppressHydrationWarning>` and apply `className={inter.variable}` to `<body>`.

- [ ] **Step 3: Add the theme provider**

Create a client wrapper around `next-themes`:

```tsx
"use client";

import { ThemeProvider } from "next-themes";

export function AdminThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
```

Compose it inside `Providers` around `QueryClientProvider`.

- [ ] **Step 4: Add the accessible theme menu**

`ThemeMenu` uses `useTheme`, a ghost icon Button, and Dropdown Menu items for `light`, `dark`, and `system`. The trigger has `aria-label="Chọn giao diện"`; selected state is communicated by text plus a Check icon.

- [ ] **Step 5: Run focused checks and commit**

```powershell
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
git add apps/admin/app/globals.css apps/admin/app/layout.tsx apps/admin/app/providers.tsx apps/admin/app/components/theme
git commit -m "feat(admin): add semantic theme foundation"
```

### Task 4: Rebuild the responsive Admin shell and grouped navigation

**Files:**

- Modify: `apps/admin/app/components/layout/AdminShell.tsx`
- Modify: `apps/admin/app/components/layout/AdminSidebar.tsx`
- Modify: `apps/admin/app/components/layout/AdminNavbar.tsx`
- Modify: `apps/admin/app/components/layout/admin-navigation.ts`
- Create: `apps/admin/app/components/layout/AdminNavigationContent.tsx`
- Create: `apps/admin/app/components/layout/PageHeader.tsx`
- Modify: `apps/admin/app/store/sidebar.store.ts`
- Test: `apps/admin/test/app-profile-architecture.test.ts`

**Interfaces:**

- Consumes: Sheet, Collapsible, Dropdown Menu, Tooltip, ThemeMenu, AuthGuard, current routes.
- Produces: `AdminShell`, grouped `adminNavigation`, `PageHeader`, and persisted sidebar presentation state.

- [ ] **Step 1: Define grouped navigation data**

Use a discriminated structure:

```ts
export type AdminNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type AdminNavigationGroup = {
  id: "content" | "operations" | "system";
  label: string;
  items: Array<
    | AdminNavigationItem
    | {
        id: "courses" | "reading";
        label: string;
        icon: LucideIcon;
        children: AdminNavigationItem[];
      }
  >;
};
```

Populate it with the exact route hierarchy from the design spec. `getAdminPageTitle` continues to map existing paths and uses correctly encoded Vietnamese labels.

- [ ] **Step 2: Persist only sidebar presentation state**

Keep `isCollapsed` and `isMobileOpen`. Read and write the key `admin-sidebar-collapsed` defensively in an effect; do not place auth/session data in this hook.

- [ ] **Step 3: Implement shared navigation content**

`AdminNavigationContent` receives `pathname`, `collapsed`, and `onNavigate`. It renders group labels, child Collapsibles when expanded, and accessible Tooltip/Dropdown behavior when collapsed. Active child paths expand their parent and use `aria-current="page"`.

- [ ] **Step 4: Replace the custom mobile overlay with Sheet**

`AdminSidebar` renders a fixed desktop aside at `w-72` or `w-16`, plus a controlled Sheet for mobile. Both render `AdminNavigationContent`; the mobile Sheet closes after navigation.

- [ ] **Step 5: Simplify Navbar and Shell**

Navbar contains the mobile/desktop sidebar controls, contextual title, ThemeMenu, and account Dropdown. Shell uses semantic colors:

```tsx
<div className="bg-background text-foreground min-h-dvh">
  <AdminSidebar
    isCollapsed={isCollapsed}
    isMobileOpen={isMobileOpen}
    onCloseMobile={closeMobile}
    pathname={pathname}
  />
  <div
    className={cn(
      "min-h-dvh transition-[padding] duration-200",
      isCollapsed ? "lg:pl-16" : "lg:pl-72"
    )}
  >
    <AdminNavbar
      onLogout={handleLogout}
      onToggleDesktop={toggleCollapsed}
      onToggleMobile={toggleMobile}
      title={getAdminPageTitle(pathname)}
      username={username}
    />
    <main className="mx-auto w-full max-w-[88rem] px-4 py-6 lg:px-8 lg:py-8">
      {children}
    </main>
  </div>
</div>
```

- [ ] **Step 6: Add PageHeader**

Export:

```ts
type PageHeaderProps = {
  actions?: React.ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};
```

Use `text-2xl font-semibold tracking-normal` for title, `font-medium` for eyebrow, and normal-weight muted description.

- [ ] **Step 7: Verify shell behavior and commit**

```powershell
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/admin test
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
git add apps/admin/app/components/layout apps/admin/app/store/sidebar.store.ts apps/admin/test/app-profile-architecture.test.ts
git commit -m "feat(admin): rebuild responsive management shell"
```

### Task 5: Add reusable feedback and form composition

**Files:**

- Create: `apps/admin/app/components/feedback/EmptyState.tsx`
- Create: `apps/admin/app/components/feedback/ErrorState.tsx`
- Create: `apps/admin/app/components/feedback/LoadingState.tsx`
- Create: `apps/admin/app/components/forms/FormField.tsx`
- Create: `apps/admin/app/components/forms/FormActions.tsx`
- Modify: `apps/admin/app/components/feedback/TableSkeleton.tsx`

**Interfaces:**

- Produces: `EmptyState`, `ErrorState`, `LoadingState`, `FormField`, `FormActions`.

- [ ] **Step 1: Implement feedback contracts**

Use these exact prop contracts:

```ts
type EmptyStateProps = {
  action?: React.ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
};
type ErrorStateProps = {
  description?: string;
  onRetry?: () => void;
  title?: string;
};
type LoadingStateProps = {
  label?: string;
  rows?: number;
  variant?: "page" | "table";
};
```

All variants use semantic tokens, normal body weight, and accessible live text. Retry uses Button; loading uses Skeleton and an `sr-only` label.

- [ ] **Step 2: Implement form composition**

Use:

```ts
type FormFieldProps = {
  children: React.ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
};

type FormActionsProps = {
  cancelLabel?: string;
  isSubmitting?: boolean;
  onCancel(): void;
  submitLabel: string;
};
```

`FormField` generates `${htmlFor}-description` and `${htmlFor}-error` IDs. Callers pass them to control `aria-describedby`; error uses `role="alert"`.

- [ ] **Step 3: Normalize TableSkeleton**

Keep the existing public component name but implement it with the Skeleton primitive and semantic Table classes.

- [ ] **Step 4: Verify and commit**

```powershell
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
git add apps/admin/app/components/feedback apps/admin/app/components/forms
git commit -m "feat(admin): add feedback and form patterns"
```

### Task 6: Rebuild the shared Data Table on TanStack Table

**Files:**

- Modify: `apps/admin/app/components/data-table/data-table.tsx`
- Modify: `apps/admin/app/components/data-table/data-table-card.tsx`
- Create: `apps/admin/app/components/data-table/data-table-pagination.tsx`
- Create: `apps/admin/app/components/data-table/data-table-toolbar.tsx`
- Create: `apps/admin/app/components/data-table/data-table.types.ts`
- Modify: `apps/admin/app/components/data-table/index.ts`
- Test: `apps/admin/test/app-profile-architecture.test.ts`

**Interfaces:**

- Consumes: existing `Column<T>` definitions and external server-pagination callbacks.
- Produces: the same consumer props plus optional `getRowId(item): string` and accessible internal TanStack row/header models.

- [ ] **Step 1: Preserve the public table contract**

Move `Column<T>` and `DataTableProps<T>` to `data-table.types.ts`. Add:

```ts
getRowId?: (item: T) => string;
```

Do not rename current pagination, search, sort, or loading props.

- [ ] **Step 2: Adapt columns to TanStack definitions**

Map each current `Column<T>` to a `ColumnDef<T>` with a stable ID derived from `accessorKey` or `header`. Configure `useReactTable` with `getCoreRowModel`, `manualPagination: true`, and `manualSorting: true`. Row keys use `getRowId` when provided and TanStack's row ID only as transitional fallback.

- [ ] **Step 3: Extract toolbar and pagination**

Toolbar owns Search/Input and optional actions. Pagination owns page-size Select, range copy, previous/next Buttons, and numbered pages. Disabled controls use actual `disabled` buttons instead of pointer-events on anchors.

- [ ] **Step 4: Replace literal colors and index keys**

Use semantic table/card tokens. Header sort actions are Buttons with `aria-sort`; empty/loading/error content uses the new feedback patterns. Column IDs and row IDs replace array-index keys.

- [ ] **Step 5: Verify compatibility and commit**

```powershell
pnpm --filter @repo/admin test
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
pnpm --filter @repo/admin build
git add apps/admin/app/components/data-table apps/admin/test/app-profile-architecture.test.ts
git commit -m "refactor(admin): standardize data table foundation"
```

### Task 7: Foundation regression gate and documentation

**Files:**

- Modify: `docs/architecture/frontend.md`
- Modify: `docs/guides/verification.md` only if focused commands differ
- Test: all Admin and repository architecture gates

**Interfaces:**

- Produces: canonical documentation for CSS-first Shadcn ownership and theme behavior.

- [ ] **Step 1: Update frontend architecture**

Document:

- Admin's CSS-first Tailwind/Shadcn source profile;
- app-local versus exact shared primitive ownership;
- `components.json` aliases;
- class-based light/dark/system theme;
- the 400/500/600 typography hierarchy;
- grouped navigation and app-wide versus feature-owned presentation.

- [ ] **Step 2: Run the Plan 1 gate**

```powershell
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/admin test
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
pnpm --filter @repo/admin build
pnpm architecture:check
git diff --check
git status --short
```

Expected: every command passes; status contains only intentional Plan 1 changes plus the user's pre-existing untracked `artifacts/` and `tools/`.

- [ ] **Step 3: Commit documentation**

```powershell
git add docs/architecture/frontend.md docs/guides/verification.md
git commit -m "docs: record admin shadcn ui profile"
```

- [ ] **Step 4: Record Plan 1 completion**

Do not begin typed Settings until the Plan 1 build and architecture gate are green.
