# DESIGN TOKENS

> Copy thẳng vào `tailwind.config.ts`. Đã map sẵn CSS variables + Tailwind utilities.

## 🎨 Colors

```ts
// tailwind.config.ts
const colors = {
  // Brand
  brand: {
    DEFAULT: '#10B981',
    dark:    '#059669',
    darker:  '#047857',
    darkest: '#064E3B',
    soft:    '#ECFDF5',
  },
  // Semantic
  blue: {
    DEFAULT: '#3B82F6',
    light:   '#60A5FA',
    soft:    '#EFF6FF',
  },
  pink: {
    DEFAULT: '#F43F5E',
    soft:    '#FFF1F2',
  },
  orange: {
    DEFAULT: '#F59E0B',
    soft:    '#FFFBEB',
    deep:    '#C2410C',
  },
  purple: {
    DEFAULT: '#8B5CF6',
    soft:    '#F5F3FF',
  },
  // Neutrals
  bg:        '#F6F8FB',
  surface:   '#FFFFFF',
  'surface-2': '#F8FAFC',
  border:        '#E6EAF0',
  'border-strong': '#D5DBE4',
  text:    '#0B1220',
  'text-2': '#5A6478',
  'text-3': '#8A93A6',
}
```

## 📏 Spacing

| Token | Value | Dùng cho |
|---|---|---|
| `space-1` | 4px | Gap giữa icon + text |
| `space-2` | 8px | Padding nhỏ trong card |
| `space-3` | 12px | Gap trong button, list item |
| `space-4` | 16px | Gap giữa card |
| `space-5` | 20px | Padding card |
| `space-6` | 24px | Section gap |
| `space-8` | 32px | Container padding |
| `space-16` | 64px | Page padding bottom |

Tailwind đã có sẵn 4-px scale (`p-4`, `gap-6`), không cần custom.

## 🔘 Border radius

```ts
borderRadius: {
  sm:   '10px',   // button, badge, list item
  DEFAULT: '16px', // card thường
  lg:   '24px',   // hero CTA, empty state
  full: '9999px', // pill, avatar
}
```

## 🌑 Shadow

```ts
boxShadow: {
  'sm':     '0 1px 2px rgba(15, 23, 42, 0.04)',
  'DEFAULT':'0 4px 16px -4px rgba(15, 23, 42, 0.06), 0 2px 6px -2px rgba(15, 23, 42, 0.04)',
  'lg':     '0 24px 48px -12px rgba(15, 23, 42, 0.18)',
  'green':  '0 20px 50px -20px rgba(16, 185, 129, 0.4)',  // hero CTA
  'green-sm': '0 8px 20px -6px rgba(16, 185, 129, 0.5)',  // brand mark
}
```

## 📐 Container

```ts
maxWidth: {
  container: '1200px',  // page max-width
}
padding: {
  container: '32px',    // desktop
  'container-mobile': '16px',
}
```

## 🌈 Gradient

```ts
// Hero CTA
background: linear-gradient(135deg, #064E3B 0%, #047857 50%, #10B981 100%)

// Brand mark
background: linear-gradient(135deg, #10B981, #059669)

// Avatar
background: linear-gradient(135deg, #6366F1, #8B5CF6)

// Featured card
background: linear-gradient(135deg, #ECFDF5, #FFFFFF)

// New user onboarding
background: linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)

// Streak pill
background: linear-gradient(135deg, #FFF7ED, #FFEDD5)
```

## 🎚️ Transition

```ts
transitionDuration: {
  DEFAULT: '150ms',
  slow:    '300ms',
}
transitionTimingFunction: {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',  // ease-out
}
```

## 🎯 Component-level tokens

### Stat card
- Top accent bar: `height: 3px`, full-width, màu theo variant
- Border: `1px solid var(--border)`
- Padding: `20px`
- Icon container: `32×32`, `border-radius: 8px`
- Label: 12px, uppercase, `+0.05em` tracking, color `text-3`
- Value: 32px, 700, `letter-spacing: -0.02em`
- Meta: 13px, color `text-2`

### Hero CTA
- Background: gradient xanh (3-stop)
- Padding: `28px 32px`
- Border radius: `24px`
- Shadow: `shadow-green`
- Decorative: 2 circles absolute, gradient radial trắng 8-12% opacity
- Title: 24px, 700, white
- Sub: 14px, white 85% opacity
- Primary button: white bg, brand color text, shadow `0 6px 20px -6px rgba(0,0,0,0.2)`
- Ghost button: white 12% bg, 1px border white 25%

### Pill / Badge
- Border radius: `9999px`
- Padding: `4px 12px` (small) / `6px 12px` (medium)
- Font: 12-13px, 600
- Variants: `default` (brand-soft + brand-dark), `neutral` (surface-2 + text-2)

### Bar chart
- Bar width: fill column, gap 2px
- Bar radius: `6px 6px 4px 4px`
- Bar height: 6 levels dựa theo data
- Today bar: dashed border brand, fill brand-soft
- Rest day bar: `var(--border)`, height 4%
- Tooltip: black bg, white text, 11px, fade in 150ms

## 📦 File CSS variables (nếu cần dynamic theme)

```css
/* app/globals.css */
:root {
  --color-bg: #F6F8FB;
  --color-surface: #FFFFFF;
  --color-surface-2: #F8FAFC;
  --color-border: #E6EAF0;
  --color-border-strong: #D5DBE4;
  --color-text: #0B1220;
  --color-text-2: #5A6478;
  --color-text-3: #8A93A6;
  --color-brand: #10B981;
  --color-brand-dark: #059669;
  --color-brand-soft: #ECFDF5;
  /* ... các màu khác */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0B1220;
    --color-surface: #161B2C;
    /* ... dark mode */
  }
}
```

## 🎨 Ví dụ sử dụng trong component

```tsx
<div className="bg-surface border border-border rounded-2xl p-5 shadow-sm hover:shadow transition-all">
  <div className="absolute top-0 inset-x-0 h-[3px] bg-brand rounded-t-2xl" />
  <span className="text-xs font-semibold uppercase tracking-wider text-text-3">TỪ ĐÃ HỌC</span>
  <div className="text-3xl font-bold tracking-tight mt-3">87<span className="text-text-3 text-base font-medium"> /600</span></div>
</div>
```

## ✅ Checklist khi apply tokens

- [ ] Copy `colors`, `borderRadius`, `boxShadow` vào `tailwind.config.ts`
- [ ] Không hardcode màu trong component (`bg-[#10B981]` ❌ → `bg-brand` ✅)
- [ ] Dùng spacing scale của Tailwind thay vì tự định nghĩa
- [ ] Test contrast bằng axe DevTools sau khi apply
- [ ] Verify gradient render đúng trên Safari (đôi khi gradient bị banding)
