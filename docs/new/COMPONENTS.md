# COMPONENTS

> Props API + ví dụ code cho từng component. Coder copy thẳng vào project.

---

## 1. TopBar

```tsx
// components/dashboard/TopBar.tsx
import { Flame } from 'lucide-react'
import { Container } from '@/components/layout/Container'
import { NavLink } from '@/components/layout/NavLink'

type Props = {
  userName: string
  streakDays: number
}

export function TopBar({ userName, streakDays }: Props) {
  return (
    <header className="py-2 pb-8">
      <Container className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5 font-bold text-lg">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-brand to-brand-dark grid place-items-center text-white shadow-green-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          Lexi · Học tiếng Anh
        </div>

        {/* Nav */}
        <nav className="hidden md:flex gap-1">
          <NavLink href="/dashboard" active>Bảng học tập</NavLink>
          <NavLink href="/vocab">Từ vựng</NavLink>
          <NavLink href="/practice">Luyện tập</NavLink>
          <NavLink href="/stats">Thống kê</NavLink>
        </nav>

        {/* Right */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-orange-soft to-orange-soft/50 text-orange-deep font-semibold text-[13px]">
            <Flame className="w-3.5 h-3.5" />
            {streakDays} ngày
          </div>
          <button className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold text-sm grid place-items-center shadow-purple">
            {userName.charAt(0).toUpperCase()}
          </button>
        </div>
      </Container>
    </header>
  )
}
```

---

## 2. Greeting

```tsx
// components/dashboard/Greeting.tsx
type Props = {
  userName: string
  level: string  // "A1 · Sơ cấp"
  dueToday: number
}

export function Greeting({ userName, level, dueToday }: Props) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'

  return (
    <div className="mb-6">
      <h1 className="text-display font-bold tracking-tight mb-1.5">
        {greeting}, {userName} 👋
      </h1>
      <p className="text-body text-text-2">
        Bạn đang ở <span className="text-brand-dark font-semibold">{level}</span>.
        Hôm nay có <strong className="text-text font-semibold">{dueToday} từ</strong> cần ôn — chỉ 8 phút thôi!
      </p>
    </div>
  )
}
```

---

## 3. HeroCTA

```tsx
// components/dashboard/HeroCTA.tsx
import { Clock, ArrowRight } from 'lucide-react'

type Props = {
  dueCount: number
  estimatedMinutes: number
  onStart?: () => void
  onSnooze?: () => void
}

export function HeroCTA({ dueCount, estimatedMinutes, onStart, onSnooze }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-7 text-white mb-6 shadow-green
                    bg-gradient-to-br from-brand-darkest via-brand-darker to-brand">
      {/* Decorative circles */}
      <div className="absolute -right-10 -top-10 w-60 h-60 rounded-full
                      bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="absolute right-20 -bottom-15 w-45 h-45 rounded-full
                      bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative z-10 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/18 backdrop-blur-sm
                          px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <Clock className="w-3 h-3" />
            Phiên ôn hôm nay · {estimatedMinutes} phút
          </div>
          <h2 className="text-h2 font-bold mb-1.5 tracking-tight">
            {dueCount} từ đang chờ bạn ôn lại
          </h2>
          <p className="text-sm opacity-85">
            Hoàn thành hôm nay để giữ streak 🔥 và tránh quên từ.
          </p>
        </div>

        <div className="flex gap-2.5">
          <button onClick={onStart}
            className="bg-white text-brand-dark px-6 py-3 rounded-[10px] font-semibold text-sm
                       flex items-center gap-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.2)]
                       hover:-translate-y-px transition-transform">
            Bắt đầu ôn ngay
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onSnooze}
            className="bg-white/12 text-white border border-white/25 px-5 py-3 rounded-[10px]
                       font-medium text-sm hover:bg-white/20 transition-colors">
            Để sau
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 4. StatCard

```tsx
// components/dashboard/StatCard.tsx
import { type LucideIcon } from 'lucide-react'

type Variant = 'blue' | 'green' | 'pink' | 'orange'
type State = 'active' | 'locked'

type Props = {
  variant: Variant
  state?: State
  label: string
  value: number | string
  suffix?: string  // " /600"
  meta: ReactNode
  delta?: { value: string; direction: 'up' | 'down' }
  icon: LucideIcon
}

const variantStyles: Record<Variant, { bar: string; iconBg: string; iconColor: string }> = {
  blue:   { bar: 'bg-blue-500',   iconBg: 'bg-blue-soft',   iconColor: 'text-blue-500' },
  green:  { bar: 'bg-brand',      iconBg: 'bg-brand-soft',  iconColor: 'text-brand-dark' },
  pink:   { bar: 'bg-pink-500',   iconBg: 'bg-pink-soft',   iconColor: 'text-pink-500' },
  orange: { bar: 'bg-orange-500', iconBg: 'bg-orange-soft', iconColor: 'text-orange-500' },
}

export function StatCard({ variant, state = 'active', label, value, suffix, meta, delta, icon: Icon }: Props) {
  const v = variantStyles[variant]
  const locked = state === 'locked'

  return (
    <div className={`relative overflow-hidden bg-surface border border-border rounded-2xl p-5
                     transition-all duration-150
                     hover:-translate-y-0.5 hover:shadow
                     ${locked ? 'opacity-60' : ''}`}>
      {/* Accent bar */}
      <div className={`absolute top-0 inset-x-0 h-[3px] ${v.bar}`} />

      <div className="flex items-center justify-between mb-3">
        <div className="text-caption font-semibold uppercase tracking-wider text-text-3">
          {label}
        </div>
        <div className={`w-8 h-8 rounded-lg grid place-items-center ${v.iconBg} ${v.iconColor}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>

      <div className="text-display font-bold tracking-tight tabular-nums mb-1.5">
        {value}
        {suffix && <span className="text-text-3 text-base font-medium"> {suffix}</span>}
      </div>

      <div className="text-body-sm text-text-2 flex items-center gap-1">
        {meta}
        {delta && (
          <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded-md
                            ${delta.direction === 'up' ? 'bg-brand-soft text-brand-dark' : 'bg-pink-soft text-pink-500'}`}>
            {delta.direction === 'up' ? '+' : '−'}{delta.value}
          </span>
        )}
      </div>
    </div>
  )
}
```

---

## 5. StatGrid

```tsx
// components/dashboard/StatGrid.tsx
import { BookOpen, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { StatCard } from './StatCard'
import type { UserStats } from '@/types/dashboard'

type Props = { stats: UserStats }

export function StatGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <StatCard
        variant="blue"
        label="Từ đã học"
        value={stats.learned}
        suffix={`/ ${stats.totalVocab}`}
        meta={`${stats.learnedPercent}% chương trình A1`}
        delta={{ value: `${stats.weeklyLearned} tuần này`, direction: 'up' }}
        icon={BookOpen}
      />
      <StatCard
        variant="green"
        label="Đã thành thạo"
        value={stats.mastered}
        meta={`~${stats.masteredPercent}% trong số đã học`}
        delta={{ value: `${stats.weeklyMastered} tuần này`, direction: 'up' }}
        icon={Check}
      />
      <StatCard
        variant="pink"
        label="Cần ôn hôm nay"
        value={stats.dueToday}
        meta="Ưu tiên cao — đã đến hạn"
        delta={{ value: `${stats.dueDelta} so hôm qua`, direction: 'down' }}
        icon={RefreshCw}
      />
      <StatCard
        variant="orange"
        label="Từ còn yếu"
        value={stats.weakWords}
        meta="Sai ≥ 3 lần tuần này"
        delta={{ value: 'Cần luyện thêm', direction: 'down' }}
        icon={AlertCircle}
      />
    </div>
  )
}
```

---

## 6. ActivityChart

```tsx
// components/dashboard/ActivityChart.tsx
'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'
import type { ActivityDay } from '@/types/dashboard'

type Props = { data: ActivityDay[] }

export function ActivityChart({ data }: Props) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <header className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-h3 font-bold">Hoạt động 7 ngày qua</h3>
          <p className="text-body-sm text-text-2">Số phiên học và từ đã ôn mỗi ngày</p>
        </div>
        <span className="text-caption font-semibold px-2.5 py-1 rounded-full bg-brand-soft text-brand-dark">
          5/7 ngày học
        </span>
      </header>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis dataKey="dayLabel" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A93A6' }} />
            <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
            <Bar dataKey="learned" stackId="a" fill="#60A5FA" radius={[0, 0, 4, 4]} />
            <Bar dataKey="reviewed" stackId="a" fill="#34D399" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 text-caption-regular text-text-2 mt-3">
        <LegendItem color="#60A5FA" label="Từ mới học" />
        <LegendItem color="#34D399" label="Từ ôn tập" />
        <LegendItem color="#E6EAF0" label="Nghỉ" />
      </div>
    </div>
  )
}
```

---

## 7. RecentSessions

```tsx
// components/dashboard/RecentSessions.tsx
import { Zap, Headphones, Edit3 } from 'lucide-react'
import { SessionItem } from './SessionItem'
import type { Session } from '@/types/dashboard'

type Props = { sessions: Session[] }

const sessionIcons = {
  flashcard: { Icon: Zap,         style: 'bg-orange-soft text-orange-500' },
  listen:    { Icon: Headphones,  style: 'bg-purple-soft text-purple-500' },
  fill:      { Icon: Edit3,       style: 'bg-blue-soft text-blue-500' },
}

export function RecentSessions({ sessions }: Props) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <header className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-h3 font-bold">Phiên học gần đây</h3>
          <p className="text-body-sm text-text-2">Lịch sử luyện tập của bạn</p>
        </div>
        <button className="text-caption font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-text-2 hover:bg-border transition">
          Xem tất cả
        </button>
      </header>

      <div className="flex flex-col gap-1">
        {sessions.map(s => (
          <SessionItem key={s.id} session={s} icon={sessionIcons[s.type]} />
        ))}
      </div>
    </div>
  )
}
```

---

## 8. Recommendations

```tsx
// components/dashboard/Recommendations.tsx
import { Repeat, Target, BookMarked, ArrowRight } from 'lucide-react'
import { RecommendationCard } from './RecommendationCard'
import type { Recommendation } from '@/types/dashboard'

type Props = { items: Recommendation[] }

const recIcons = {
  review:   { Icon: Repeat,    style: 'bg-blue-soft text-blue-500' },
  weak:     { Icon: Target,    style: 'bg-orange-soft text-orange-500' },
  continue: { Icon: BookMarked, style: 'bg-purple-soft text-purple-500' },
}

export function Recommendations({ items }: Props) {
  return (
    <section>
      <h3 className="text-h3 font-bold mb-4 flex items-center gap-2.5">
        Nên học gì tiếp
        <span className="text-caption font-semibold text-text-3 bg-surface-2 px-2 py-0.5 rounded-full">
          {items.length} gợi ý
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <RecommendationCard
            key={item.id}
            item={item}
            icon={recIcons[item.type]}
            featured={i === 0}
          />
        ))}
      </div>
    </section>
  )
}
```

---

## 9. CEFRProgress

```tsx
// components/dashboard/CEFRProgress.tsx
import { Target, Lock } from 'lucide-react'
import { CEFRRow } from './CEFRRow'
import type { CEFRLevel } from '@/types/dashboard'

type Props = { levels: CEFRLevel[] }

export function CEFRProgress({ levels }: Props) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-6">
      <header className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-h3 font-bold">Tiến độ CEFR</h3>
          <p className="text-body-sm text-text-2">Lộ trình học theo khung châu Âu</p>
        </div>
        <span className="text-caption font-semibold px-2.5 py-1 rounded-full bg-brand-soft text-brand-dark">
          Đang ở A1
        </span>
      </header>

      <div>
        {levels.map(level => (
          <CEFRRow key={level.code} level={level} />
        ))}
      </div>
    </div>
  )
}
```

---

## 10. NewUserOnboarding

```tsx
// components/dashboard/NewUserOnboarding.tsx
import { Layers, ArrowRight } from 'lucide-react'

type Props = {
  onStartTest?: () => void
  onSkip?: () => void
}

export function NewUserOnboarding({ onStartTest, onSkip }: Props) {
  return (
    <div className="bg-gradient-to-br from-white to-brand-soft
                    border border-dashed border-brand/40
                    rounded-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl grid place-items-center
                      bg-gradient-to-br from-brand to-brand-dark text-white shadow-green">
        <Layers className="w-7 h-7" />
      </div>
      <h2 className="text-h2 font-bold mb-1.5">Bắt đầu hành trình của bạn</h2>
      <p className="text-body text-text-2 mb-5">
        Chỉ 10 phút/ngày · 600 từ đầu tiên trong 4 tháng.
        <br />
        Dùng flashcard, nghe, điền từ để ghi nhớ sâu.
      </p>
      <button onClick={onStartTest}
        className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3
                   rounded-[10px] font-semibold text-sm shadow-green
                   hover:-translate-y-px transition-transform">
        Làm bài test đầu vào
        <ArrowRight className="w-4 h-4" />
      </button>
      <p className="text-caption-regular text-text-3 mt-4">
        Hoặc{' '}
        <button onClick={onSkip} className="text-brand-dark font-semibold hover:underline">
          bỏ qua, bắt đầu với 20 từ A1 đầu tiên →
        </button>
      </p>
    </div>
  )
}
```

---

## 💡 Pattern chung

### Composition
- Page = composition of sections, không chứa logic
- Section = có thể là Server hoặc Client Component
- Card = chỉ nhận props, không fetch data

### Props convention
- Required props trước, optional sau
- Callback props có prefix `on*` (`onStart`, `onSnooze`)
- Dùng destructuring, không truy cập `props.x`

### Class merging
```ts
import { cn } from '@/lib/utils'

<div className={cn('base-classes', conditional && 'extra-classes', className)} />
```

`className` luôn là prop cuối cùng để cho phép override từ parent.
