# TYPOGRAPHY

> Font Inter cho UI, kèm token type scale, line-height, weight. Tối ưu cho tiếng Việt.

## 🔤 Font stack

### Primary: Inter (UI)
- **Tại sao**: Designed cho UI, hỗ trợ tabular-nums, multi-weight, render tốt tiếng Việt
- **License**: SIL Open Font License (miễn phí thương mại)
- **Sử dụng bởi**: GitHub, Vercel, Linear, Figma, Notion, Vercel
- **Variable weight**: 100-900 (1 file ~280KB)

### Mono: JetBrains Mono (cho số liệu nếu cần)
- **Tại sao**: Cho bảng data nặng, code, ID
- Hiện tại **không dùng** trong dashboard — Inter với `tabular-nums` đã đủ

## 📥 Cài đặt

### Option A: Google Fonts (nhanh, dễ)
```html
<!-- app/layout.tsx -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

### Option B: Self-host (tối ưu performance)
```bash
npm i @fontsource-variable/inter
```

```ts
// app/layout.tsx
import '@fontsource-variable/inter'
```

> **Khuyến nghị**: Production nên self-host. Google Fonts thêm 1 round-trip + DNS lookup.

## 📐 Type scale

| Token | Size | Weight | Line-height | Letter-spacing | Dùng cho |
|---|---|---|---|---|---|
| `display` | 32px | 700 | 1.2 | -0.02em | H1 — Greeting |
| `h2` | 24px | 700 | 1.25 | -0.01em | H2 — Hero title, card title lớn |
| `h3` | 18px | 700 | 1.3 | -0.01em | H3 — Section title |
| `h4` | 16px | 700 | 1.4 | 0 | H4 — Card title |
| `body-lg` | 15px | 400 | 1.5 | 0 | Body lớn |
| `body` | 14px | 400 | 1.5 | 0 | Body mặc định |
| `body-medium` | 14px | 500 | 1.5 | 0 | Label, button |
| `body-sm` | 13px | 400 | 1.5 | 0 | Meta, description |
| `body-sm-medium` | 13px | 500 | 1.5 | 0 | Stat meta, nav |
| `caption` | 12px | 600 | 1.3 | +0.05em | CAPS label (TỪ ĐÃ HỌC) |
| `caption-regular` | 12px | 400 | 1.3 | 0 | Helper text, badge |
| `micro` | 11px | 500 | 1.3 | 0 | Tooltip, tag nhỏ |

## 🇻🇳 Tối ưu tiếng Việt

Mấy điểm cần lưu ý riêng:

### Line-height
- **Bump từ 1.5 → 1.55** cho body text tiếng Việt
- Chữ có dấu huyền/sắc/hỏi/ngã/nặng chiếm nhiều chỗ hơn chữ Latin thuần
- Tailwind mặc định `leading-6` (1.5) → dùng `leading-[1.55]` cho body tiếng Việt

### Letter-spacing
- **Không nên** set dương cho heading tiếng Việt
- Dấu sẽ bị tách rời khỏi chữ cái, trông không tự nhiên
- Heading dùng `tracking-tight` (-0.01 đến -0.02em) hoặc `tracking-normal`

### Font-weight
- **400 (regular)**: body
- **500 (medium)**: label, button, nav
- **600 (semibold)**: CAPS label, strong text
- **700 (bold)**: heading
- **800 (extrabold)**: chỉ dùng cho display lớn (32px+)

> Lưu ý: weight 700 với tiếng Việt đôi khi trông đậm hơn mong đợi. Test thử với text "Chào buổi chiều" trước khi commit.

## 🔢 Numerical typography

Dashboard có nhiều số liệu — cần xử lý đặc biệt:

### Tabular nums
```css
.tabular { font-variant-numeric: tabular-nums; }
```
- **Bắt buộc** cho: stat values, scores, percentages, counters
- Đảm bảo số thẳng hàng khi hiển thị nhiều dòng
- Tailwind: `tabular-nums`

### Slashed zero
```css
.slashed { font-variant-numeric: slashed-zero; }
```
- Dùng cho năm (2026), ID, code
- Phân biệt rõ với chữ O

### Fraction
```css
.fraction { font-variant-numeric: diagonal-fractions; }
```
- Dùng cho 1/2, 3/4 (ít gặp trong dashboard)

## 🎨 Tailwind config

```ts
// tailwind.config.ts
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      'display':   ['32px', { lineHeight: '1.2',   letterSpacing: '-0.02em' }],
      'h2':        ['24px', { lineHeight: '1.25',  letterSpacing: '-0.01em' }],
      'h3':        ['18px', { lineHeight: '1.3',   letterSpacing: '-0.01em' }],
      'h4':        ['16px', { lineHeight: '1.4',   letterSpacing: '0' }],
      'body-lg':   ['15px', { lineHeight: '1.5' }],
      'body':      ['14px', { lineHeight: '1.5' }],
      'body-sm':   ['13px', { lineHeight: '1.5' }],
      'caption':   ['12px', { lineHeight: '1.3',   letterSpacing: '+0.05em' }],
      'micro':     ['11px', { lineHeight: '1.3' }],
    },
  },
}
```

## ✅ Component examples

```tsx
// Heading lớn
<h1 className="text-display font-bold tracking-tight">Chào buổi chiều, Minh 👋</h1>

// Card title
<h3 className="text-h3 font-bold">Hoạt động 7 ngày qua</h3>

// CAPS label (stat card)
<span className="text-caption font-semibold uppercase tracking-wider text-text-3">
  TỪ ĐÃ HỌC
</span>

// Stat value — tabular nums
<div className="text-display font-bold tabular-nums">
  87<span className="text-text-3 text-base font-medium"> /600</span>
</div>

// Body description
<p className="text-body text-text-2 leading-relaxed">
  Dùng spaced repetition để ghi nhớ lâu hơn.
</p>

// Helper text
<span className="text-caption-regular text-text-3">
  Sau 3 lần ôn đúng liên tiếp
</span>
```

## 🧪 Test render tiếng Việt

Mở `typography-showcase.html` để xem toàn bộ type scale + test các ký tự đặc biệt tiếng Việt:
- Có dấu: `Tiếng Việt có dấu`
- Đặc biệt: `Nguyễn Triều Dương`, `Quế`, `Phở`
- Mixed: `Luyện tập A1 · Bài 7`
- Số: `87/600 từ · 23 thành thạo · 14.5%`

## ⚠️ Tránh các lỗi này

| ❌ Không nên | ✅ Nên làm |
|---|---|
| `text-[16px]` | `text-h4` |
| `font-bold text-2xl` | `text-h2 font-bold` |
| `tracking-wide` cho heading VN | `tracking-tight` hoặc bỏ qua |
| `leading-6` cho body VN dài | `leading-[1.55]` |
| `font-normal` cho button | `font-medium` (500) |
| Hard-code weight bằng số `font-[600]` | `font-semibold` |
| Set letter-spacing dương | Mặc định 0, trừ CAPS label |
| Dùng `font-black` (900) | Tối đa `font-extrabold` (800), và chỉ cho display lớn |

## 🔄 Cân nhắc Dark mode

Khi thêm dark mode (xem `DESIGN-TOKENS.md`):
- Tăng line-height thêm 0.05 (nền tối cần nhiều hơi thở hơn)
- Giảm font-weight 1 bậc (700 → 600) vì chữ trên nền tối trông đậm hơn
- Tăng contrast cho body text (text-2 trên nền tối cần nhạt hơn)
