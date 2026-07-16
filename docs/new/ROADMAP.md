# ROADMAP — 7 phase triển khai

> Thứ tự ưu tiên: làm từ trên xuống dưới. Mỗi phase có acceptance criteria rõ ràng.

---

## Phase 0 · Setup & Foundation  ⏱ 30 phút

**Mục tiêu**: Có project chạy được với stack đầy đủ.

### Tasks
- [ ] `npx create-next-app@latest english-dashboard --typescript --tailwind --app --src-dir=false`
- [ ] Cài shadcn: `npx shadcn-ui@latest init`
- [ ] Cài dependencies: `lucide-react recharts zustand @tanstack/react-query`
- [ ] Copy **Design tokens** từ `DESIGN-TOKENS.md` vào `tailwind.config.ts`
- [ ] Copy **font setup** từ `TYPOGRAPHY.md` vào `app/layout.tsx`
- [ ] Setup React Query Provider trong `app/providers.tsx`
- [ ] Tạo folder structure theo `ARCHITECTURE.md`
- [ ] Commit: `chore: initial project setup`

### Acceptance criteria
- ✅ `npm run dev` chạy không lỗi
- ✅ Tailwind áp dụng được custom color (test: `bg-brand` render ra màu xanh)
- ✅ Font Inter load thành công (mở DevTools → Network filter "font")
- ✅ Folder structure khớp với `ARCHITECTURE.md`

---

## Phase 1 · Design System primitives  ⏱ 1.5 giờ

**Mục tiêu**: Có bộ UI base dùng chung cho mọi component.

### Tasks
- [ ] Add shadcn components cần dùng:
  ```bash
  npx shadcn-ui@latest add button card badge progress tooltip separator avatar
  ```
- [ ] Tạo custom variants cho `Card`:
  - `featured` (gradient xanh nhạt)
  - `locked` (opacity thấp + grayscale)
- [ ] Tạo `StatCard` base component trong `components/dashboard/StatCard.tsx`
- [ ] Tạo `IconBadge` component (ô bo tròn chứa icon, dùng trong stat card)
- [ ] Tạo `SectionHeader` component (title + sub + optional badge)
- [ ] Storybook hoặc demo page `/dev/components` để test từng primitive

### Acceptance criteria
- ✅ Mỗi shadcn component import được và render đúng
- ✅ `StatCard` có props `variant: 'blue' | 'green' | 'pink' | 'orange'` và `state: 'active' | 'locked'`
- ✅ `IconBadge` support size `sm | md | lg`
- ✅ Demo page hiển thị đủ các variant, click thử hover state thấy smooth

---

## Phase 2 · Layout shell  ⏱ 1 giờ

**Mục tiêu**: Top bar + container + page structure sẵn sàng nhận content.

### Tasks
- [ ] `TopBar.tsx`: logo, nav links (Bảng học tập / Từ vựng / Luyện tập / Thống kê), streak pill, avatar
- [ ] `Container.tsx`: max-width 1200px, padding responsive
- [ ] `Greeting.tsx`: hiển thị "Chào buổi chiều, Minh 👋" + sub copy
- [ ] Setup route `/dashboard` với page trống
- [ ] Active state cho nav link (theo current route)
- [ ] Responsive: nav ẩn trên mobile, thay bằng hamburger menu

### Acceptance criteria
- ✅ Top bar cố định ở top, không che content khi scroll
- ✅ Nav link active có background xanh nhạt
- ✅ Mobile (<768px): nav collapse thành menu icon
- ✅ Greeting hiển thị đúng giờ trong ngày (sáng/chiều/tối)

---

## Phase 3 · Hero CTA + Stat Grid  ⏱ 2 giờ

**Mục tiêu**: Phần đầu trang thu hút — hero card xanh lớn + 4 stat cards.

### Tasks
- [ ] `HeroCTA.tsx`:
  - Gradient xanh lá (3 màu: dark → medium → light)
  - Tag "Phiên ôn hôm nay · 8 phút" với icon clock
  - Title "12 từ đang chờ bạn ôn lại"
  - Sub copy với emoji 🔥
  - 2 buttons: primary (Bắt đầu ôn ngay) + ghost (Để sau)
  - Decorative circles ở góc phải (absolute positioned)
- [ ] `StatGrid.tsx` + `StatCard.tsx`:
  - 4 cards: Từ đã học / Đã thành thạo / Cần ôn hôm nay / Từ còn yếu
  - Accent bar 3px ở top (màu theo variant)
  - Label uppercase 12px
  - Icon trong ô 32×32 bo 8px
  - Value to (32px) + meta + delta pill (+/- %)
- [ ] Hover effect: card lift 2px + shadow mềm

### Acceptance criteria
- ✅ Hero CTA hiển thị giống 100% prototype
- ✅ Hover vào stat card có transition mượt (transform + shadow)
- ✅ Delta pill có 2 trạng thái: `up` (xanh) / `down` (hồng)
- ✅ Responsive: trên mobile stat grid thành 2 cột, hero CTA stack dọc

---

## Phase 4 · Activity Chart + Recent Sessions  ⏱ 2.5 giờ

**Mục tiêu**: 2 card cạnh nhau — biểu đồ 7 ngày + danh sách phiên học.

### Tasks
- [ ] `ActivityChart.tsx` (Client Component):
  - Stacked bar: từ mới (xanh dương) + từ ôn (xanh lá)
  - 7 cột Th2 → CN
  - Ngày nghỉ: bar xám nhạt
  - Hôm nay: bar dashed viền xanh, tooltip "0 từ · hôm nay"
  - Tooltip hover hiển thị số từ
  - Legend bên dưới: 3 màu + label
- [ ] `RecentSessions.tsx` + `SessionItem.tsx`:
  - List 4 phiên học gần nhất
  - Icon theo loại: flashcard (cam ⚡), nghe (tím 🎧), điền từ (xanh ✏️)
  - Tên phiên + thời gian (relative: "Hôm qua 21:34", "2 ngày trước")
  - Score bên phải, màu theo ngưỡng: ≥85 xanh, 70-85 cam, <70 hồng
  - Hover state: background xám nhạt
- [ ] Layout 2 cột (60/40 split) trên desktop, stack trên mobile

### Acceptance criteria
- ✅ Chart render đúng trên SSR (dùng ResponsiveContainer + dynamic import nếu cần)
- ✅ Tooltip xuất hiện khi hover vào cột, ẩn khi rời đi
- ✅ Ngày hôm nay (CN) có viền dashed phân biệt
- ✅ Score màu đúng ngưỡng khi thay đổi data
- ✅ Thời gian hiển thị dạng relative, locale `vi-VN`

---

## Phase 5 · Recommendations + CEFR  ⏱ 2 giờ

**Mục tiêu**: 2 phần cuối — gợi ý luyện tập + tiến độ CEFR.

### Tasks
- [ ] `Recommendations.tsx` + `RecommendationCard.tsx`:
  - 3 cards đều nhau (grid 3 cột)
  - Card 1: "Đề xuất cho bạn" — Ôn tập 12 từ đến hạn (featured, gradient xanh)
  - Card 2: "Cải thiện điểm yếu" — Sửa 8 từ yếu
  - Card 3: "Tiếp tục chương trình" — Bài 7 A1 (45%)
  - Mỗi card: tag uppercase + icon + title + desc + optional progress bar + CTA row
  - Hover: border xanh + shadow + lift
- [ ] `CEFRProgress.tsx` + `CEFRRow.tsx`:
  - 4 levels: A1, A2, B1, B2
  - A1: `current` style (gradient xanh, badge "Đang ở A1")
  - A2/B1/B2: `locked` style (opacity 0.6, icon 🔒 thay cho %)
  - Sub copy: "sẽ mở khi A1 đạt 80%"
- [ ] Tạo `NewUserOnboarding.tsx` cho trạng thái user mới:
  - Card gradient trắng → xanh nhạt
  - Icon lớn 64×64 gradient xanh
  - Title + sub copy + 1 CTA chính + 1 link phụ
- [ ] `StateToggle.tsx` ở góc phải (chỉ dùng dev, ẩn ở production)

### Acceptance criteria
- ✅ 3 recommendation cards đều nhau về chiều cao
- ✅ CEFR level hiện tại nổi bật, các level sau mờ đi
- ✅ Lock icon 🔒 hiển thị thay % cho level chưa mở
- ✅ New user state hiển thị đúng khi toggle
- ✅ CTA trong onboarding có hover effect

---

## Phase 6 · Empty / Loading / Error states  ⏱ 1.5 giờ

**Mục tiêu**: App hoạt động mượt mà trong mọi trạng thái.

### Tasks
- [ ] Loading state:
  - Skeleton cho từng section (dùng shadcn Skeleton)
  - Stat card skeleton: hình chữ nhật pulse
  - Chart skeleton: thanh ngang nhấp nháy
- [ ] Empty state:
  - Activity chart trống → icon + "Chưa có hoạt động nào"
  - Sessions trống → "Hoàn thành bài học để bắt đầu thống kê"
  - Recommendations trống → CTA "Khám phá bài học"
- [ ] Error state:
  - Toast thông báo khi API fail (dùng shadcn Toast)
  - Mỗi section có nút "Thử lại"
  - Fallback UI không làm crash toàn trang
- [ ] No-data state cho user mới (đã có ở Phase 5, polish thêm)

### Acceptance criteria
- ✅ Loading skeleton khớp với layout thật (không bị layout shift khi data load)
- ✅ Toast hiện đúng vị trí, tự ẩn sau 5s
- ✅ API fail → có nút retry, không cần refresh trang
- ✅ Mỗi empty state có CTA rõ ràng

---

## Phase 7 · Polish & A11y  ⏱ 2 giờ

**Mục tiêu**: Production-ready.

### Tasks
- [ ] Animation:
  - Fade-in cho từng section khi load (stagger 50ms)
  - Smooth transition khi switch state (active ↔ new user)
  - Hover effect đồng nhất (cùng duration, easing)
- [ ] Responsive audit:
  - Test 3 breakpoint: 375px, 768px, 1280px
  - Fix mọi overflow, text truncate sai
  - Touch target ≥ 44×44px trên mobile
- [ ] Accessibility:
  - Tất cả icon có `aria-label` hoặc `aria-hidden`
  - Color contrast ≥ 4.5:1 (test với axe DevTools)
  - Keyboard navigation: Tab order hợp lý, focus ring rõ
  - Heading hierarchy đúng (h1 → h2 → h3, không skip)
- [ ] Performance:
  - Lighthouse score ≥ 90 (Performance, A11y, Best Practices)
  - LCP < 2.5s, FID < 100ms, CLS < 0.1
  - Self-host font Inter variable (nếu chưa)
  - Lazy load chart component (dynamic import + ssr: false)
- [ ] SEO (optional):
  - Meta tags, OG image
  - `<title>` cho từng route
- [ ] Testing:
  - Unit test cho hooks (`useDashboardStats`, `useStreak`)
  - Component test cho `StatCard`, `CEFRRow`
  - E2E test với Playwright: load page → check hero CTA → click "Bắt đầu ôn" → verify navigation

### Acceptance criteria
- ✅ Lighthouse mobile: Performance ≥ 90, A11y = 100
- ✅ Axe DevTools: 0 critical issues
- ✅ Test pass toàn bộ
- ✅ Không có layout shift khi load (CLS = 0)

---

## 📊 Tổng thời gian ước tính

| Phase | Thời gian | Dev cần |
|---|---|---|
| 0. Setup | 30 phút | 1 |
| 1. Design system | 1.5 giờ | 1 |
| 2. Layout shell | 1 giờ | 1 |
| 3. Hero + Stats | 2 giờ | 1 |
| 4. Chart + Sessions | 2.5 giờ | 1 |
| 5. Recs + CEFR | 2 giờ | 1 |
| 6. Empty/Loading | 1.5 giờ | 1 |
| 7. Polish | 2 giờ | 1 |
| **Tổng** | **~13 giờ** | **1 dev** |

Tức khoảng **1.5-2 ngày làm việc** cho 1 dev mid-level. Nếu có 2 dev song song có thể rút xuống 1 ngày.

## 🚦 Sau khi xong tất cả phase

- [ ] Demo cho PM/Designer review
- [ ] Update lại prototype HTML nếu có thay đổi
- [ ] Viết README trong repo
- [ ] Setup CI/CD (lint, test, build)
- [ ] Deploy lên Vercel/preview env
