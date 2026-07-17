# Admin EC Profile Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the remaining Auth, Users, Practice, and Settings Admin capabilities plus shared presentation primitives to the accepted EC `app/features` + `app/views` profile without changing HTTP behavior.

**Architecture:** Admin routes remain thin and import `app/views/<resource>/<Resource>View.tsx`. Each business owner contains resource HTTP adapters, React Query hooks, local types, and tests under `app/features/<capability>`. The existing `src/services/http/admin-http-client.ts` and `src/lib/http-client.ts` remain the only cross-cutting transport; domain services and Views are removed from `src`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, TanStack Query 5, Node test runner through `tsx --test`, Zod 4, existing fetch HTTP client.

## Global Constraints

- Scope is `apps/admin` only; do not change `apps/api`, Prisma, migrations, seeds, or vocabulary data.
- Preserve `/login`, `/users`, `/practice-sessions`, and `/settings` URLs and all existing HTTP paths, methods, payloads, response fallbacks, local-storage keys, query keys, and visible behavior.
- Resource API files use singular names: `auth.api.ts`, `user.api.ts`, `practice-session.api.ts`, and `setting.api.ts`.
- Route files may render a View but may not own HTTP calls, query keys, table behavior, or forms.
- `app/schema`, `app/hooks`, `app/store`, and `app/utils` are app-wide only; capability code stays under its owner.
- Do not add capability root barrels unless a real public Interface needs one.
- Do not introduce compatibility forwarding services in the old `src/services/<capability>` paths.
- Keep `src/services/http/admin-http-client.ts` and `src/lib/http-client.ts` as the existing cross-cutting HTTP transport for this scope.
- Run the narrow test after every red/green step and commit each completed task separately.

---

## File and Interface Map

Shared Admin presentation:

```text
app/components/ui/*                  shared UI primitives
app/components/data-table/*          reusable table composition
app/components/feedback/TableSkeleton.tsx
app/hooks/use-debounce.ts
app/hooks/use-table-controls.ts
app/utils/cn.ts
app/providers.tsx
```

Capability Interfaces:

```text
app/features/auth/api/auth.api.ts
  createAuthApi(http), authApi.login(body)
app/features/users/api/user.api.ts
  createUserApi(http), userApi.list/create/update/remove
app/features/practice/api/practice-session.api.ts
  createPracticeSessionApi(http), practiceSessionApi.list/detail/remove
app/features/settings/api/setting.api.ts
  createSettingApi(http), settingApi.get/update
```

Every API factory accepts an injectable structural HTTP Interface so its route,
method, body, params, and fallback behavior can be tested without network I/O.

### Task 1: Move shared Admin presentation primitives under `app`

**Files:**
- Create: `apps/admin/test/app-profile-architecture.test.ts`
- Move: `apps/admin/components/ui/*.tsx` -> `apps/admin/app/components/ui/*.tsx`
- Move: `apps/admin/src/components/data-table/*.tsx` -> `apps/admin/app/components/data-table/*.tsx`
- Move: `apps/admin/src/components/table-skeleton.tsx` -> `apps/admin/app/components/feedback/TableSkeleton.tsx`
- Move: `apps/admin/src/components/providers.tsx` -> `apps/admin/app/providers.tsx`
- Move: `apps/admin/src/hooks/use-debounce.ts` -> `apps/admin/app/hooks/use-debounce.ts`
- Move: `apps/admin/src/hooks/use-table-controls.ts` -> `apps/admin/app/hooks/use-table-controls.ts`
- Move: `apps/admin/src/lib/utils.ts` -> `apps/admin/app/utils/cn.ts`
- Modify: `apps/admin/app/layout.tsx`
- Modify: `apps/admin/app/(dashboard)/layout.tsx`
- Modify: every current `apps/admin/app/views/**/*.tsx` import of `@/components`, `@/src/components`, `@/src/hooks`, or `@/lib/utils`
- Modify temporarily: remaining `apps/admin/src/views/**/*.tsx` imports to the new shared app locations
- Modify: `apps/admin/package.json`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`, `useDebounce`, `useTableControls`, `DataTableCard`, `Column`, and `Providers` at the exact `app` paths listed above.
- Consumes: no capability Interface.

- [ ] **Step 1: Write the failing shared-profile architecture test**

Create `apps/admin/test/app-profile-architecture.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("shared Admin presentation primitives live under app", () => {
  for (const path of [
    "app/components/ui/button.tsx",
    "app/components/data-table/data-table-card.tsx",
    "app/components/feedback/TableSkeleton.tsx",
    "app/hooks/use-debounce.ts",
    "app/hooks/use-table-controls.ts",
    "app/utils/cn.ts",
    "app/providers.tsx",
  ]) {
    assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  }

  for (const path of [
    "components/ui",
    "src/components/data-table",
    "src/components/providers.tsx",
    "src/hooks/use-debounce.ts",
    "src/hooks/use-table-controls.ts",
    "src/lib/utils.ts",
  ]) {
    assert.equal(existsSync(join(root, path)), false, `${path} must be removed`);
  }
});
```

- [ ] **Step 2: Run the test and verify red**

Run:

```bash
pnpm --filter @repo/admin exec tsx --test test/app-profile-architecture.test.ts
```

Expected: FAIL because `app/components/ui/button.tsx` does not exist.

- [ ] **Step 3: Move files and update imports**

Use `git mv` for the paths above. Apply these exact import transformations in
all Admin TS/TSX files:

```ts
// before
import { Button } from "@/components/ui/button";
import { DataTableCard, type Column } from "@/src/components/data-table";
import { useDebounce } from "@/src/hooks/use-debounce";
import { useTableControls } from "@/src/hooks/use-table-controls";
import { cn } from "@/lib/utils";
import { Providers } from "@/src/components/providers";

// after
import { Button } from "@/app/components/ui/button";
import { DataTableCard, type Column } from "@/app/components/data-table";
import { useDebounce } from "@/app/hooks/use-debounce";
import { useTableControls } from "@/app/hooks/use-table-controls";
import { cn } from "@/app/utils/cn";
import { Providers } from "@/app/providers";
```

Keep both exports in `app/utils/cn.ts` unchanged:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || ""}${path}`;
}
```

Change `apps/admin/package.json`:

```json
"architecture:check": "tsx --test \"test/*architecture.test.ts\""
```

- [ ] **Step 4: Run narrow verification**

Run:

```bash
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/admin check-types
```

Expected: both commands PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "refactor(admin): move shared presentation under app"
```

### Task 2: Migrate Admin Auth to its capability owner

**Files:**
- Create: `apps/admin/app/features/auth/api/auth.api.ts`
- Create: `apps/admin/app/features/auth/hooks/use-admin-login.ts`
- Create: `apps/admin/app/features/auth/components/AuthGuard.tsx`
- Create: `apps/admin/app/features/auth/types/auth.types.ts`
- Create: `apps/admin/app/features/auth/tests/auth.api.test.ts`
- Move/rename: `apps/admin/src/views/login/login.view.tsx` -> `apps/admin/app/views/auth/LoginView.tsx`
- Modify: `apps/admin/app/login/page.tsx`
- Modify: `apps/admin/app/(dashboard)/layout.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Delete: `apps/admin/src/services/auth/auth.service.ts`
- Delete: `apps/admin/src/services/auth/create-auth.service.ts`
- Delete: `apps/admin/src/views/login/hooks/use-admin-login.ts`
- Delete: `apps/admin/components/auth/AuthGuard.tsx`

**Interfaces:**
- Consumes: `adminHttpClient.post<T>(path, body)`.
- Produces: `authApi.login(body: AdminLoginBody): Promise<AdminLoginResponse>` and `useAdminLogin()`.

- [ ] **Step 1: Write failing API and architecture tests**

Create `apps/admin/app/features/auth/tests/auth.api.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createAuthApi } from "../api/auth.api";

test("Admin login preserves its endpoint and returns the response data", async () => {
  const requests: unknown[] = [];
  const api = createAuthApi({
    async post<T>(path: string, body?: unknown) {
      requests.push({ method: "POST", path, body });
      return {
        success: true,
        data: {
          token: "token",
          user: { id: "1", username: "admin", email: "a@b.c", role: "ADMIN" },
        } as T,
      };
    },
  });

  assert.equal((await api.login({ username: "admin", password: "secret" })).token, "token");
  assert.deepEqual(requests, [
    { method: "POST", path: "/admin/auth/login", body: { username: "admin", password: "secret" } },
  ]);
});

test("Admin login rejects an empty response envelope", async () => {
  const api = createAuthApi({
    async post<T>() {
      return { success: true } as { success: boolean; data?: T };
    },
  });
  await assert.rejects(() => api.login({ username: "admin", password: "secret" }), /Invalid login response/);
});
```

Add to `app-profile-architecture.test.ts`:

```ts
test("Admin Auth follows the EC feature and view profile", () => {
  assert.equal(existsSync(join(root, "app/features/auth/api/auth.api.ts")), true);
  assert.equal(existsSync(join(root, "app/features/auth/hooks/use-admin-login.ts")), true);
  assert.equal(existsSync(join(root, "app/views/auth/LoginView.tsx")), true);
  assert.equal(existsSync(join(root, "src/services/auth")), false);
  assert.equal(existsSync(join(root, "src/views/login")), false);
});
```

- [ ] **Step 2: Run tests and verify red**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/auth/tests/auth.api.test.ts test/app-profile-architecture.test.ts
```

Expected: FAIL because the new Auth Interface does not exist.

- [ ] **Step 3: Implement the Auth feature Interface**

Move the existing Auth types unchanged to `types/auth.types.ts`. Implement
`api/auth.api.ts`:

```ts
import type { ApiEnvelope } from "@/src/lib/http-client";
import { adminHttpClient } from "@/src/services/http/admin-http-client";
import type { AdminLoginBody, AdminLoginResponse } from "../types/auth.types";

export type AuthHttp = {
  post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>>;
};

export function createAuthApi(http: AuthHttp) {
  return {
    async login(body: AdminLoginBody) {
      const response = await http.post<AdminLoginResponse>("/admin/auth/login", body);
      if (!response.data) throw new Error("Invalid login response");
      return response.data;
    },
  };
}

export const authApi = createAuthApi(adminHttpClient);
```

Implement `hooks/use-admin-login.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

export function useAdminLogin() {
  return useMutation({ mutationFn: authApi.login });
}
```

Move the current Login JSX unchanged to `app/views/auth/LoginView.tsx` and use:

```ts
import { useAdminLogin } from "@/app/features/auth/hooks/use-admin-login";
```

Move `AuthGuard` to its feature owner. Update the two routes/layouts:

```tsx
// app/login/page.tsx
import { LoginView } from "@/app/views/auth/LoginView";
export default function LoginPage() { return <LoginView />; }

// dashboard layout import
import { AuthGuard } from "@/app/features/auth/components/AuthGuard";
```

Keep `admin_token`, `admin_user`, `/admin/auth/login`, `/login`, and `/courses`
unchanged. Remove the old Auth services, View, hook, and root AuthGuard only after
all imports point at the new owner.

- [ ] **Step 4: Run narrow verification**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/auth/tests/auth.api.test.ts test/app-profile-architecture.test.ts
pnpm --filter @repo/admin check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "refactor(admin): migrate auth to EC feature profile"
```

### Task 3: Migrate Users to its capability owner

**Files:**
- Create: `apps/admin/app/features/users/api/user.api.ts`
- Create: `apps/admin/app/features/users/hooks/use-users.ts`
- Create: `apps/admin/app/features/users/types/user-management.types.ts`
- Create: `apps/admin/app/features/users/tests/user.api.test.ts`
- Move/rename: `apps/admin/src/views/users/users.view.tsx` -> `apps/admin/app/views/users/UsersView.tsx`
- Modify: `apps/admin/app/(dashboard)/users/page.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Delete: `apps/admin/src/services/users/users.service.ts`
- Delete: `apps/admin/src/services/users/create-users.service.ts`
- Delete: `apps/admin/src/views/users/hooks/use-users.ts`
- Delete: `apps/admin/src/views/users/hooks/use-users-directory.ts`

**Interfaces:**
- Consumes: existing `adminHttpClient`.
- Produces: `userKeys`, `userApi.list/create/update/remove`, `useUsers`, `useCreateUser`, `useUpdateUser`, `useDeleteUser`.

- [ ] **Step 1: Write the failing Users API test**

Create `user.api.test.ts` with this behavior:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createUserApi } from "../api/user.api";

test("User resource preserves list and CRUD requests", async () => {
  const requests: unknown[] = [];
  const response = { data: [], pagination: { totalPages: 1, total: 0 } };
  const api = createUserApi({
    async get<T>(path, options) { requests.push({ method: "GET", path, params: options?.params }); return { success: true, data: response as T }; },
    async post<T>(path, body) { requests.push({ method: "POST", path, body }); return { success: true, data: { id: "1" } as T }; },
    async put<T>(path, body) { requests.push({ method: "PUT", path, body }); return { success: true, data: { id: "1" } as T }; },
    async delete<T>(path) { requests.push({ method: "DELETE", path }); return { success: true } as { success: boolean; data?: T }; },
  });

  await api.list({ page: 2, limit: 10, search: "lin" });
  await api.create({ username: "lin", email: "lin@example.com", password: "secret" });
  await api.update("1", { role: "ADMIN" });
  await api.remove("1");

  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/users", params: { page: 2, limit: 10, search: "lin" } },
    { method: "POST", path: "/admin/users", body: { username: "lin", email: "lin@example.com", password: "secret" } },
    { method: "PUT", path: "/admin/users/1", body: { role: "ADMIN" } },
    { method: "DELETE", path: "/admin/users/1" },
  ]);
});

test("User list preserves its empty-page fallback", async () => {
  const api = createUserApi({
    async get<T>() { return { success: true } as { success: boolean; data?: T }; },
    async post<T>() { return { success: true } as { success: boolean; data?: T }; },
    async put<T>() { return { success: true } as { success: boolean; data?: T }; },
    async delete<T>() { return { success: true } as { success: boolean; data?: T }; },
  });
  assert.deepEqual(await api.list(), { data: [], pagination: { totalPages: 1 } });
});
```

- [ ] **Step 2: Run the test and verify red**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/users/tests/user.api.test.ts
```

Expected: FAIL because `createUserApi` does not exist.

- [ ] **Step 3: Implement Users and move the View**

Move the existing User request/response types to
`types/user-management.types.ts`. Rename the factory to `createUserApi`, the
instance to `userApi`, `getUsers` to `list`, `createUser` to `create`,
`updateUser` to `update`, and `deleteUser` to `remove`; keep the existing paths,
methods, params, and fallback exactly as characterized.

Implement query ownership in `hooks/use-users.ts`:

```ts
export const userKeys = {
  all: ["users"] as const,
  list: (query: ListUsersQuery) => [...userKeys.all, "list", query] as const,
};
```

The four hooks call `userApi` and invalidate `userKeys.all` after successful
mutations. Move the current JSX unchanged to `app/views/users/UsersView.tsx`,
import types from `@/app/features/users/types/user-management.types`, and import
hooks from `@/app/features/users/hooks/use-users`. Remove the unused
`use-users-directory.ts` rather than recreating it.

Update the route:

```tsx
import { UsersView } from "@/app/views/users/UsersView";
export default function UsersPage() { return <UsersView />; }
```

Extend the architecture test to require the new API/hook/View, require the route
import above, and reject `src/services/users` and `src/views/users`.

- [ ] **Step 4: Run narrow verification**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/users/tests/user.api.test.ts test/app-profile-architecture.test.ts
pnpm --filter @repo/admin check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "refactor(admin): migrate users to EC feature profile"
```

### Task 4: Migrate Practice Sessions under the Practice owner

**Files:**
- Create: `apps/admin/app/features/practice/api/practice-session.api.ts`
- Create: `apps/admin/app/features/practice/hooks/use-practice-sessions.ts`
- Create: `apps/admin/app/features/practice/types/practice-session.types.ts`
- Create: `apps/admin/app/features/practice/tests/practice-session.api.test.ts`
- Move/rename: `apps/admin/src/views/practice-sessions/practice-sessions.view.tsx` -> `apps/admin/app/views/practice-sessions/PracticeSessionsView.tsx`
- Modify: `apps/admin/app/(dashboard)/practice-sessions/page.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Delete: `apps/admin/src/services/practice-sessions/*`
- Delete: `apps/admin/src/views/practice-sessions/hooks/use-practice-sessions.ts`

**Interfaces:**
- Produces: `practiceSessionKeys`, `practiceSessionApi.list/detail/remove`, and the three existing Practice Session hooks.
- Naming rule: capability owner is `practice`; `practice-session` is the addressed resource.

- [ ] **Step 1: Write the failing Practice Session API test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createPracticeSessionApi } from "../api/practice-session.api";

test("Practice Session resource preserves list, detail, and delete routes", async () => {
  const requests: unknown[] = [];
  const api = createPracticeSessionApi({
    async get<T>(path, options) {
      requests.push({ method: "GET", path, params: options?.params });
      return { success: true, data: (path.endsWith("/7") ? { id: 7 } : { data: [], pagination: { totalPages: 1 } }) as T };
    },
    async delete<T>(path) { requests.push({ method: "DELETE", path }); return { success: true } as { success: boolean; data?: T }; },
  });
  await api.list({ page: 1, limit: 10, user_id: "learner" });
  await api.detail(7);
  await api.remove(7);
  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/practiceSessions", params: { page: 1, limit: 10, user_id: "learner" } },
    { method: "GET", path: "/admin/practiceSessions/7", params: undefined },
    { method: "DELETE", path: "/admin/practiceSessions/7" },
  ]);
});
```

- [ ] **Step 2: Run the test and verify red**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/practice/tests/practice-session.api.test.ts
```

Expected: FAIL because the resource API does not exist.

- [ ] **Step 3: Implement and move without changing behavior**

Move the existing interfaces to `types/practice-session.types.ts`. Rename the
factory/instance methods to the Interface above while preserving
`/admin/practiceSessions` camelCase compatibility and the empty-page/null
fallbacks. Move hooks under the Practice owner and keep these keys exactly:

```ts
export const practiceSessionKeys = {
  all: ["practice-sessions"] as const,
  list: (query: ListPracticeSessionsQuery) => [...practiceSessionKeys.all, "list", query] as const,
  detail: (id: number) => [...practiceSessionKeys.all, "detail", id] as const,
};
```

Move the View JSX unchanged, update feature/shared imports, update the route to
`@/app/views/practice-sessions/PracticeSessionsView`, and delete the old domain
service/hook/View files.

- [ ] **Step 4: Run narrow verification**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/practice/tests/practice-session.api.test.ts test/app-profile-architecture.test.ts
pnpm --filter @repo/admin check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "refactor(admin): migrate practice sessions to practice owner"
```

### Task 5: Migrate Settings to a resource API and React Query hooks

**Files:**
- Create: `apps/admin/app/features/settings/api/setting.api.ts`
- Create: `apps/admin/app/features/settings/hooks/use-setting.ts`
- Create: `apps/admin/app/features/settings/tests/setting.api.test.ts`
- Move/rename: `apps/admin/src/views/settings/settings.view.tsx` -> `apps/admin/app/views/settings/SettingsView.tsx`
- Modify: `apps/admin/app/(dashboard)/settings/page.tsx`
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Delete: `apps/admin/src/services/settings/settings.service.ts`

**Interfaces:**
- Produces: `settingKeys.detail(key)`, `settingApi.get(key)`, `settingApi.update(key, value)`, `useSetting(key)`, `useUpdateSetting(key)`.

- [ ] **Step 1: Write the failing Setting API test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createSettingApi } from "../api/setting.api";

test("Setting resource preserves get, update, and empty fallback behavior", async () => {
  const requests: unknown[] = [];
  const api = createSettingApi({
    async get<T>(path) { requests.push({ method: "GET", path }); return { success: true, data: "5" as T }; },
    async post<T>(path, body) { requests.push({ method: "POST", path, body }); return { success: true } as { success: boolean; data?: T }; },
  });
  assert.equal(await api.get("MAX_HEARTS"), "5");
  await api.update("MAX_HEARTS", "7");
  assert.deepEqual(requests, [
    { method: "GET", path: "/admin/settings/MAX_HEARTS" },
    { method: "POST", path: "/admin/settings/MAX_HEARTS", body: { value: "7" } },
  ]);
});
```

- [ ] **Step 2: Run the test and verify red**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/settings/tests/setting.api.test.ts
```

Expected: FAIL because `createSettingApi` does not exist.

- [ ] **Step 3: Implement Settings and replace direct View effects**

Implement `setting.api.ts` with the existing GET/POST behavior. Implement hooks:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingApi } from "../api/setting.api";

export const settingKeys = {
  all: ["settings"] as const,
  detail: (key: string) => [...settingKeys.all, key] as const,
};

export function useSetting(key: string) {
  return useQuery({ queryKey: settingKeys.detail(key), queryFn: () => settingApi.get(key) });
}

export function useUpdateSetting(key: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => settingApi.update(key, value),
    onSuccess: (_data, value) => queryClient.setQueryData(settingKeys.detail(key), value),
  });
}
```

In `SettingsView`, replace the direct service `useEffect` and `useTransition`
with `useSetting("MAX_HEARTS")` and `useUpdateSetting("MAX_HEARTS")`. Keep the
existing integer validation, loading UI, toast text, and form JSX. Initialize
the input from query data in a small effect:

```ts
const settingQuery = useSetting("MAX_HEARTS");
const updateSetting = useUpdateSetting("MAX_HEARTS");
useEffect(() => {
  if (settingQuery.data) setMaxHearts(settingQuery.data);
}, [settingQuery.data]);
```

Update the route to `@/app/views/settings/SettingsView`, extend the architecture
test, then remove the old service and View.

- [ ] **Step 4: Run narrow verification**

```bash
pnpm --filter @repo/admin exec tsx --test app/features/settings/tests/setting.api.test.ts test/app-profile-architecture.test.ts
pnpm --filter @repo/admin check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin
git commit -m "refactor(admin): migrate settings to EC feature profile"
```

### Task 6: Enforce the completed Admin profile and run all gates

**Files:**
- Modify: `apps/admin/test/app-profile-architecture.test.ts`
- Modify: `docs/frontend-folder-structure.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: all Interfaces produced in Tasks 1-5.
- Produces: an architecture gate that prevents legacy Admin domain buckets from returning.

- [ ] **Step 1: Add the final failing legacy scan**

Add a recursive helper and final test:

```ts
import { readdirSync, readFileSync } from "node:fs";

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

test("Admin has no legacy capability implementation or imports", () => {
  for (const path of [
    "src/services/auth",
    "src/services/users",
    "src/services/practice-sessions",
    "src/services/settings",
    "src/views/login",
    "src/views/users",
    "src/views/practice-sessions",
    "src/views/settings",
  ]) {
    assert.deepEqual(filesUnder(join(root, path)), [], `${path} must be empty`);
  }

  const appSources = filesUnder(join(root, "app")).filter((file) => /\.(ts|tsx)$/.test(file));
  for (const file of appSources) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("@/src/views/"), false, `${file} imports legacy View code`);
    assert.equal(source.includes("@/src/services/auth"), false, `${file} imports legacy Auth`);
    assert.equal(source.includes("@/src/services/users"), false, `${file} imports legacy Users`);
    assert.equal(source.includes("@/src/services/practice-sessions"), false, `${file} imports legacy Practice`);
    assert.equal(source.includes("@/src/services/settings"), false, `${file} imports legacy Settings`);
  }
});
```

- [ ] **Step 2: Run the architecture gate**

```bash
pnpm --filter @repo/admin architecture:check
```

Expected before cleanup: FAIL with the exact remaining legacy path/import, or
PASS if Tasks 1-5 already removed every occurrence.

- [ ] **Step 3: Remove only reported legacy leftovers and update docs**

Do not add facades. Fix each reported import to the owning `app/features` or
`app/views` Interface and remove empty old directories. Update
`docs/frontend-folder-structure.md` so its Admin tree lists Auth, Courses,
Practice, Settings, and Users as migrated examples and names
`src/services/http` as the only retained Admin infrastructure exception.

- [ ] **Step 4: Run complete Admin and repository-safe gates**

```bash
pnpm --filter @repo/admin architecture:check
pnpm --filter @repo/admin test
pnpm --filter @repo/admin check-types
pnpm --filter @repo/admin lint
pnpm --filter @repo/admin build
```

Expected: every command exits 0. Existing lint warnings may remain only if they
were present before the task; no new warning is accepted.

- [ ] **Step 5: Inspect the diff and commit**

```bash
git diff --check
git status --short
git add apps/admin docs/frontend-folder-structure.md AGENTS.md
git commit -m "test(admin): enforce EC capability profile"
```
