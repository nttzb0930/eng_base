# ARCHITECTURE — Cấu trúc thư mục & convention

> File này mô tả layout thư mục dự án, naming convention, và ranh giới giữa các layer.

## 📁 Cấu trúc thư mục

```
english-dashboard/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Route group cho dashboard
│   │   └── page.tsx              # /dashboard — trang chính
│   ├── layout.tsx                # Root layout (font, providers)
│   ├── page.tsx                  # Redirect → /dashboard
│   └── globals.css               # Tailwind + CSS variables
│
├── components/
│   ├── ui/                       # shadcn primitives (copy từ shadcn CLI)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── progress.tsx
│   │   └── tooltip.tsx
│   │
│   ├── dashboard/                # Component riêng cho dashboard
│   │   ├── TopBar.tsx
│   │   ├── Greeting.tsx
│   │   ├── HeroCTA.tsx
│   │   ├── StatGrid.tsx
│   │   ├── StatCard.tsx
│   │   ├── ActivityChart.tsx
│   │   ├── RecentSessions.tsx
│   │   ├── SessionItem.tsx
│   │   ├── Recommendations.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── CEFRProgress.tsx
│   │   ├── CEFRRow.tsx
│   │   ├── NewUserOnboarding.tsx
│   │   └── StateToggle.tsx       # Toggle demo (chỉ dùng dev)
│   │
│   └── layout/
│       ├── Container.tsx
│       └── NavLink.tsx
│
├── hooks/
│   ├── useDashboardStats.ts      # Tổng hợp stat cards
│   ├── useStreak.ts
│   ├── useActivity.ts            # 7-day chart data
│   ├── useSessions.ts
│   ├── useCEFR.ts
│   └── useRecommendations.ts
│
├── lib/
│   ├── api/
│   │   ├── client.ts             # Fetch wrapper
│   │   └── dashboard.ts          # API calls cho dashboard
│   ├── format/
│   │   ├── date.ts
│   │   ├── number.ts             # Format số liệu
│   │   └── percentage.ts
│   └── utils.ts                  # cn(), twMerge, etc.
│
├── types/
│   ├── dashboard.ts              # Stats, Activity, Session, Recommendation
│   ├── cefr.ts                   # CEFR level, progress
│   └── user.ts
│
├── data/
│   └── mock/
│       ├── dashboard.json        # Mock data cho dev
│       ├── activity.json
│       └── sessions.json
│
├── messages/                     # i18n
│   ├── vi.json
│   └── en.json
│
├── public/
│   └── fonts/                    # Inter variable (nếu self-host)
│
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🏷️ Naming convention

### Components
- **PascalCase**, suffix theo vai trò:
  - `StatCard` (đơn lẻ) → render trong `StatGrid`
  - `SessionItem` → render trong `RecentSessions`
  - `HeroCTA` → section lớn, đứng độc lập
- **Không** dùng `Dashboard*` làm prefix — thư mục đã là `dashboard/`
- **Tránh** tên quá chung chung: thay vì `Card`, dùng `StatCard`, `RecommendationCard`

### Hooks
- Bắt đầu bằng `use`, camelCase
- Trả về `{ data, isLoading, error }` theo pattern React Query
- Đặt trong `hooks/`, không trong component folder

### Types
- PascalCase, suffix theo vai trò:
  - `StatCardProps` — props cho component
  - `UserStats` — entity từ API
  - `CEFRLevel` — enum/union
- File `types/dashboard.ts` chứa tất cả type liên quan đến dashboard

### Files
- Component: `PascalCase.tsx`
- Hook: `useCamelCase.ts`
- Utility: `camelCase.ts`
- Type: `camelCase.ts`
- JSON: `kebab-case.json`

## 🔀 Ranh giới layer

| Layer | Được phép | Không được phép |
|---|---|---|
| `components/ui/` | Dùng Tailwind + Radix primitives | Gọi API, chứa business logic |
| `components/dashboard/` | Gọi hooks, nhận props | Gọi API trực tiếp, hardcode data |
| `hooks/` | Gọi API, format data | Render JSX |
| `lib/` | Pure functions, fetch wrapper | Render JSX, dùng React hooks |
| `types/` | TypeScript types only | Logic, runtime values |
| `data/mock/` | JSON tĩnh | Type definitions (chuyển sang `types/`) |

## 🧩 Pattern composition

**Page-level component (Server Component):**

```tsx
// app/(dashboard)/page.tsx
import { Greeting } from '@/components/dashboard/Greeting'
import { HeroCTA } from '@/components/dashboard/HeroCTA'
import { StatGrid } from '@/components/dashboard/StatGrid'
// ... import hooks + components

export default async function DashboardPage() {
  const stats = await getStats()  // server-side fetch
  const activity = await getActivity()
  const sessions = await getSessions()
  
  return (
    <>
      <Greeting userName="Minh" streakDays={5} dueToday={12} />
      <HeroCTA dueCount={12} estimatedMinutes={8} />
      <StatGrid stats={stats} />
      <ActivityChart data={activity} />
      <RecentSessions sessions={sessions} />
      <Recommendations items={recs} />
      <CEFRProgress levels={cefr} />
    </>
  )
}
```

**Section-level (vẫn là Server nếu data tĩnh):**

```tsx
// components/dashboard/StatGrid.tsx
import { StatCard } from './StatCard'
import type { UserStats } from '@/types/dashboard'

export function StatGrid({ stats }: { stats: UserStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard variant="blue" label="Từ đã học" value={stats.learned} total={stats.totalVocab} delta={stats.weeklyDelta} />
      {/* ... */}
    </div>
  )
}
```

**Leaf component (Client khi cần):**

```tsx
'use client'
// components/dashboard/ActivityChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ActivityDay } from '@/types/dashboard'

export function ActivityChart({ data }: { data: ActivityDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data}>
        {/* ... */}
      </BarChart>
    </ResponsiveContainer>
  )
}
```

## 📦 Quyết định kiến trúc

| Câu hỏi | Quyết định | Lý do |
|---|---|---|
| Monorepo hay single app? | Single app | Dashboard độc lập, chưa cần share |
| Server-first hay client-first? | Server-first | Ít JS ship, dashboard chủ yếu hiển thị |
| State management? | React Query (TanStack) | Cache, refetch, optimistic update |
| Form library? | react-hook-form + zod | Dùng cho phase sau (test đầu vào) |
| Testing? | Vitest + Testing Library + Playwright | Từ Phase 6 |

## 🔄 Khi nào refactor?

- Component > 200 dòng → tách nhỏ
- 1 file types > 300 dòng → chia theo domain
- 1 hook trả về > 5 fields → tách thành nhiều hook chuyên biệt
- Duplicate UI ≥ 3 lần → đẩy vào `components/ui/`
