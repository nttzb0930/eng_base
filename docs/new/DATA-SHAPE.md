# DATA SHAPE — TypeScript types & mock data

> Tất cả type cần dùng cho dashboard. Copy thẳng vào `types/`.

---

## 📦 Core types

### `types/dashboard.ts`

```ts
// ===== Stats =====
export type UserStats = {
  learned: number
  totalVocab: number           // 600 cho A1
  learnedPercent: number       // 14.5
  weeklyLearned: number        // 12

  mastered: number
  masteredPercent: number      // 26
  weeklyMastered: number       // 4

  dueToday: number
  dueDelta: number             // +3 so với hôm qua (số dương = tăng)

  weakWords: number

  accuracyPercent: number      // optional — tổng hợp từ tất cả session
  totalReviews: number
  savedWords: number
}

// ===== Activity (7-day chart) =====
export type ActivityDay = {
  date: string                 // "2026-07-13"
  dayLabel: string             // "T2", "T3", ... "CN"
  dayOfWeek: number            // 0=CN, 1=T2, ..., 6=T7
  learned: number              // từ mới
  reviewed: number             // từ ôn
  total: number                // learned + reviewed
  isToday: boolean
  isRestDay: boolean           // true nếu total = 0 và không phải hôm nay
}

export type Activity = {
  days: ActivityDay[]
  totalDays: number            // số ngày có hoạt động
  totalWords: number
  streakDays: number
}

// ===== Sessions =====
export type SessionType = 'flashcard' | 'listen' | 'fill' | 'speak' | 'quiz'

export type Session = {
  id: string
  type: SessionType
  title: string                // "Flashcard · 20 từ"
  totalQuestions: number
  startedAt: string            // ISO 8601
  durationSec: number
  scorePercent: number         // 0-100
  correctCount: number
  wrongCount: number
}

export type SessionsResponse = {
  items: Session[]
  total: number
}

// ===== Recommendations =====
export type RecommendationType = 'review' | 'weak' | 'continue'

export type Recommendation = {
  id: string
  type: RecommendationType
  tag: string                  // "Đề xuất cho bạn"
  title: string                // "Ôn tập 12 từ đến hạn"
  description: string          // multi-line OK
  ctaLabel: string             // "Bắt đầu ôn"
  estimatedMinutes?: number
  progressPercent?: number     // 0-100, optional (cho "Tiếp tục bài 7 · A1")
  href: string                 // route để navigate
  featured?: boolean
}

// ===== CEFR =====
export type CEFRCode = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

export type CEFRLevel = {
  code: CEFRCode
  name: string                 // "Sơ cấp"
  nameFull: string             // "Sơ cấp cao"
  learned: number
  total: number
  mastered: number
  accuracyPercent: number
  progressPercent: number
  isCurrent: boolean
  isLocked: boolean
  unlockRequirement?: string   // "sẽ mở khi A1 đạt 80%"
}

// ===== User context =====
export type UserContext = {
  id: string
  name: string
  avatarUrl?: string
  currentLevel: CEFRCode
  totalXp: number
  streakDays: number
  joinedAt: string
}
```

### `types/api.ts`

```ts
export type ApiResponse<T> = {
  data: T
  meta?: { total: number; page: number; pageSize: number }
}

export type ApiError = {
  code: string
  message: string
  field?: string
}
```

---

## 📊 Mock data

### `data/mock/dashboard.json`

```json
{
  "user": {
    "id": "u_001",
    "name": "Minh",
    "currentLevel": "A1",
    "totalXp": 1240,
    "streakDays": 5,
    "joinedAt": "2026-06-01"
  },
  "stats": {
    "learned": 87,
    "totalVocab": 600,
    "learnedPercent": 14.5,
    "weeklyLearned": 12,
    "mastered": 23,
    "masteredPercent": 26,
    "weeklyMastered": 4,
    "dueToday": 12,
    "dueDelta": 3,
    "weakWords": 8,
    "accuracyPercent": 86,
    "totalReviews": 142,
    "savedWords": 31
  },
  "activity": {
    "days": [
      { "date": "2026-07-07", "dayLabel": "T2", "dayOfWeek": 1, "learned": 5, "reviewed": 3, "total": 8, "isToday": false, "isRestDay": false },
      { "date": "2026-07-08", "dayLabel": "T3", "dayOfWeek": 2, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-09", "dayLabel": "T4", "dayOfWeek": 3, "learned": 8, "reviewed": 6, "total": 14, "isToday": false, "isRestDay": false },
      { "date": "2026-07-10", "dayLabel": "T5", "dayOfWeek": 4, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-11", "dayLabel": "T6", "dayOfWeek": 5, "learned": 14, "reviewed": 8, "total": 22, "isToday": false, "isRestDay": false },
      { "date": "2026-07-12", "dayLabel": "T7", "dayOfWeek": 6, "learned": 10, "reviewed": 8, "total": 18, "isToday": false, "isRestDay": false },
      { "date": "2026-07-13", "dayLabel": "CN", "dayOfWeek": 0, "learned": 0, "reviewed": 0, "total": 0, "isToday": true, "isRestDay": false }
    ],
    "totalDays": 5,
    "totalWords": 62,
    "streakDays": 5
  },
  "sessions": {
    "items": [
      {
        "id": "s_001",
        "type": "flashcard",
        "title": "Flashcard · 20 từ",
        "totalQuestions": 20,
        "startedAt": "2026-07-12T21:34:00+07:00",
        "durationSec": 480,
        "scorePercent": 92,
        "correctCount": 18,
        "wrongCount": 2
      },
      {
        "id": "s_002",
        "type": "listen",
        "title": "Nghe · 15 câu",
        "totalQuestions": 15,
        "startedAt": "2026-07-11T19:12:00+07:00",
        "durationSec": 720,
        "scorePercent": 78,
        "correctCount": 12,
        "wrongCount": 3
      },
      {
        "id": "s_003",
        "type": "fill",
        "title": "Điền từ · 10 câu",
        "totalQuestions": 10,
        "startedAt": "2026-07-10T08:45:00+07:00",
        "durationSec": 360,
        "scorePercent": 90,
        "correctCount": 9,
        "wrongCount": 1
      },
      {
        "id": "s_004",
        "type": "flashcard",
        "title": "Flashcard · 25 từ",
        "totalQuestions": 25,
        "startedAt": "2026-07-09T22:10:00+07:00",
        "durationSec": 600,
        "scorePercent": 64,
        "correctCount": 16,
        "wrongCount": 9
      }
    ],
    "total": 4
  },
  "recommendations": [
    {
      "id": "r_001",
      "type": "review",
      "tag": "Đề xuất cho bạn",
      "title": "Ôn tập 12 từ đến hạn",
      "description": "Dùng spaced repetition để ghi nhớ lâu hơn. Chỉ 8 phút.",
      "ctaLabel": "Bắt đầu ôn",
      "estimatedMinutes": 8,
      "href": "/practice/review?set=due",
      "featured": true
    },
    {
      "id": "r_002",
      "type": "weak",
      "tag": "Cải thiện điểm yếu",
      "title": "Sửa 8 từ yếu",
      "description": "Luyện sâu các từ bạn hay sai: accommodate, schedule…",
      "ctaLabel": "Luyện từ yếu",
      "estimatedMinutes": 6,
      "href": "/practice/weak"
    },
    {
      "id": "r_003",
      "type": "continue",
      "tag": "Tiếp tục chương trình",
      "title": "Tiếp tục bài 7 · A1",
      "description": "Family & relationships — 24 từ mới, 6 ngữ pháp.",
      "ctaLabel": "Tiếp tục",
      "estimatedMinutes": 15,
      "progressPercent": 45,
      "href": "/lesson/7"
    }
  ],
  "cefr": [
    {
      "code": "A1",
      "name": "Sơ cấp",
      "nameFull": "Sơ cấp",
      "learned": 87,
      "total": 600,
      "mastered": 23,
      "accuracyPercent": 86,
      "progressPercent": 14.5,
      "isCurrent": true,
      "isLocked": false
    },
    {
      "code": "A2",
      "name": "Sơ cấp cao",
      "nameFull": "Sơ cấp cao",
      "learned": 0,
      "total": 800,
      "mastered": 0,
      "accuracyPercent": 0,
      "progressPercent": 0,
      "isCurrent": false,
      "isLocked": true,
      "unlockRequirement": "sẽ mở khi A1 đạt 80%"
    },
    {
      "code": "B1",
      "name": "Trung cấp",
      "nameFull": "Trung cấp",
      "learned": 0,
      "total": 900,
      "mastered": 0,
      "accuracyPercent": 0,
      "progressPercent": 0,
      "isCurrent": false,
      "isLocked": true
    },
    {
      "code": "B2",
      "name": "Trung cấp cao",
      "nameFull": "Trung cấp cao",
      "learned": 0,
      "total": 700,
      "mastered": 0,
      "accuracyPercent": 0,
      "progressPercent": 0,
      "isCurrent": false,
      "isLocked": true
    }
  ]
}
```

### `data/mock/new-user.json` (trạng thái user mới)

```json
{
  "user": {
    "id": "u_002",
    "name": "Minh",
    "currentLevel": "A1",
    "totalXp": 0,
    "streakDays": 0,
    "joinedAt": "2026-07-13"
  },
  "stats": {
    "learned": 0,
    "totalVocab": 600,
    "learnedPercent": 0,
    "weeklyLearned": 0,
    "mastered": 0,
    "masteredPercent": 0,
    "weeklyMastered": 0,
    "dueToday": 0,
    "dueDelta": 0,
    "weakWords": 0,
    "accuracyPercent": 0,
    "totalReviews": 0,
    "savedWords": 0
  },
  "activity": {
    "days": [
      { "date": "2026-07-07", "dayLabel": "T2", "dayOfWeek": 1, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-08", "dayLabel": "T3", "dayOfWeek": 2, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-09", "dayLabel": "T4", "dayOfWeek": 3, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-10", "dayLabel": "T5", "dayOfWeek": 4, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-11", "dayLabel": "T6", "dayOfWeek": 5, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-12", "dayLabel": "T7", "dayOfWeek": 6, "learned": 0, "reviewed": 0, "total": 0, "isToday": false, "isRestDay": true },
      { "date": "2026-07-13", "dayLabel": "CN", "dayOfWeek": 0, "learned": 0, "reviewed": 0, "total": 0, "isToday": true, "isRestDay": false }
    ],
    "totalDays": 0,
    "totalWords": 0,
    "streakDays": 0
  },
  "sessions": { "items": [], "total": 0 },
  "recommendations": [],
  "cefr": []
}
```

---

## 🔌 API contract (khi integrate backend)

### Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/dashboard` | Tất cả data cho dashboard (user + stats + activity + sessions + recs + cefr) |
| `GET` | `/api/dashboard/stats` | Chỉ stats (cho real-time update) |
| `GET` | `/api/dashboard/activity?days=7` | Activity chart data |
| `GET` | `/api/dashboard/sessions?limit=10` | Recent sessions |
| `GET` | `/api/dashboard/recommendations` | Personalized recommendations |
| `GET` | `/api/dashboard/cefr` | CEFR progress |
| `POST` | `/api/sessions/:id/start` | Bắt đầu phiên học |
| `POST` | `/api/sessions/:id/complete` | Hoàn thành phiên học |

### Response format

```ts
// Success
{
  "data": { ... },
  "meta": { "requestId": "req_abc123" }
}

// Error
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Vui lòng đăng nhập lại",
    "field": null
  }
}
```

### Query params

| Param | Type | Default | Mô tả |
|---|---|---|---|
| `days` | number | 7 | Số ngày cho activity chart |
| `limit` | number | 10 | Số session lấy về |
| `level` | CEFRCode | null | Filter theo level |

---

## 🧪 Validation schema (Zod)

```ts
// lib/schemas/dashboard.ts
import { z } from 'zod'

export const ActivityDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayLabel: z.string().min(1).max(3),
  dayOfWeek: z.number().int().min(0).max(6),
  learned: z.number().int().min(0),
  reviewed: z.number().int().min(0),
  total: z.number().int().min(0),
  isToday: z.boolean(),
  isRestDay: z.boolean(),
})

export const SessionSchema = z.object({
  id: z.string(),
  type: z.enum(['flashcard', 'listen', 'fill', 'speak', 'quiz']),
  title: z.string().min(1),
  totalQuestions: z.number().int().positive(),
  startedAt: z.string().datetime(),
  durationSec: z.number().int().min(0),
  scorePercent: z.number().min(0).max(100),
  correctCount: z.number().int().min(0),
  wrongCount: z.number().int().min(0),
})

export const DashboardResponseSchema = z.object({
  user: z.object({ /* ... */ }),
  stats: z.object({ /* ... */ }),
  activity: z.object({ days: z.array(ActivityDaySchema) }),
  sessions: z.object({ items: z.array(SessionSchema) }),
  recommendations: z.array(/* ... */),
  cefr: z.array(/* ... */),
})
```

Dùng để validate response từ API trước khi pass xuống component.

---

## 💡 Tips

- **Mock trước, API sau**: dùng `data/mock/*.json` để dev UI không phụ thuộc backend
- **Một endpoint tổng** cho lần load đầu (giảm round-trip), sau đó fetch chi tiết theo nhu cầu
- **Cache với React Query** — stale time 5 phút cho stats, 1 phút cho activity
- **Optimistic update** khi user complete session → update stats ngay, không chờ server
- **Type-safe**: nếu dùng tRPC hoặc GraphQL, generate types từ schema backend
