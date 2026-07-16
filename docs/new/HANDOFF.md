# HANDOFF — English Learning Dashboard

> Tài liệu bàn giao từ design sang dev. Đọc file này trước tiên.

## 🎯 Mục tiêu

Xây dựng dashboard học tiếng Anh theo prototype HTML đã duyệt:
- Hiển thị tiến độ học từ vựng, streak, gợi ý luyện tập
- 2 trạng thái chính: **user có dữ liệu** + **user mới (onboarding)**
- Responsive, a11y, performance tốt

## 🛠️ Tech stack đề xuất

| Layer | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR, routing, dễ scale |
| Ngôn ngữ | **TypeScript (strict)** | Type safety cho data shape |
| Styling | **Tailwind CSS 3.4+** | Match với design tokens |
| Components | **shadcn/ui** | Không phụ thuộc vendor, copy code về |
| State | **Zustand** hoặc **React Query** | Tùy scale dự án |
| Icons | **lucide-react** | Đã dùng trong prototype |
| Charts | **Recharts** hoặc **visx** | Stacked bar, tooltip dễ |
| i18n | **next-intl** | Cần cho đa ngôn ngữ sau |
| Font | **Inter** (self-host variable) | Xem `TYPOGRAPHY.md` |

> Có thể thay thế bằng Vite + React Router, hoặc Remix. Concept giữ nguyên.

## 📂 Cấu trúc tài liệu

```
handoff/
├── HANDOFF.md          ← File này — đọc đầu tiên
├── ARCHITECTURE.md     ← Cấu trúc thư mục, naming convention
├── ROADMAP.md          ← 7 phase triển khai + acceptance criteria
├── DESIGN-TOKENS.md    ← Màu, spacing, radius, shadow → tailwind.config
├── TYPOGRAPHY.md       ← Font, type scale, line-height
├── COMPONENTS.md       ← Props API + ví dụ code từng component
└── DATA-SHAPE.md       ← TypeScript types + mock data schema
```

## 🚀 Quick start cho coder

```bash
# 1. Tạo project (Phase 0)
npx create-next-app@latest english-dashboard --typescript --tailwind --app
cd english-dashboard
npx shadcn-ui@latest init

# 2. Copy tokens từ DESIGN-TOKENS.md vào tailwind.config.ts
# 3. Copy font setup từ TYPOGRAPHY.md vào app/layout.tsx
# 4. Làm theo ROADMAP.md từ Phase 1 trở đi
```

## 🎨 Tham chiếu thiết kế

- **Prototype HTML**: `/english-dashboard-demo/index.html` — mở trong trình duyệt để xem
- **Typography showcase**: `/english-dashboard-handoff/typography-showcase.html` — test type scale
- **State toggle**: trong prototype có nút góc phải để bật/tắt giữa "Đã có dữ liệu" và "User mới"

## 📏 Quy ước quan trọng

- **Component naming**: PascalCase, suffix theo vai trò (`HeroCTA`, `StatCard`, `ActivityChart`)
- **File naming**: cùng tên với component (`HeroCTA.tsx`)
- **Props**: luôn define `interface`, đặt `type` riêng trong `types/` nếu dùng chung
- **Mock data**: đặt trong `data/mock/`, **không** hardcode trong component
- **Server vs Client**: mặc định Server Component, thêm `"use client"` chỉ khi cần (chart, state, effect)
- **i18n keys**: dùng namespace theo feature (`dashboard.hero.title`), không nhét hết vào `common.json`

## ✅ Definition of Done

Một phase được tính là xong khi:
1. Code chạy được, không có lỗi console
2. Acceptance criteria trong `ROADMAP.md` đã đạt
3. Có screenshot so với prototype (nếu là phase UI)
4. Đã tự test responsive ở 3 breakpoint: mobile (375px), tablet (768px), desktop (1280px)
5. Đã check a11y cơ bản: contrast, alt text, focus state
