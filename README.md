# Bateco Dashboard

Fintech dashboard cho Bateco — Next.js App Router, shadcn/ui, Tailwind CSS.

## Features

- **11 pages** — Dashboard, Accounts, Transactions, Transfers, Cards, Crypto, Analytics, Investments, Budgets, Settings, Notifications
- **Crypto** — Candlestick chart, portfolio, trade form, market overview
- **Dashboard tùy chỉnh** — Kéo thả widget (dnd-kit), lưu localStorage
- **Cards** — 3D flip, freeze, virtual card
- **Investments** — Live ticker, allocation, holdings, watchlist
- **Analytics** — Heatmap 365 ngày, category donut, recurring detector, AI insights
- **Budgets** — Progress rings, savings goals, month projection
- **Auth** — Sign in / sign up với globe 3D
- **Dark mode** — light / dark / system
- **Responsive** — desktop, tablet, mobile

## Project structure

```
src/
  app/          # Next.js App Router (routing, layouts, loading)
  views/        # Page UI (folder/index.tsx)
  components/   # Shared UI & feature components
  data/         # Mock / seed data
  hooks/
  lib/
```

Mỗi route trong `app` chỉ import view tương ứng:

```tsx
import { DashboardView } from "@/views/dashboard"

export default function Page() {
  return <DashboardView />
}
```

## Pages

| Route | Mô tả |
|------|--------|
| `/dashboard` | Tổng quan tài chính, wallet, quick transfer |
| `/accounts` | Tài khoản ngân hàng liên kết |
| `/transactions` | Bảng giao dịch, filter, export CSV |
| `/transfers` | Chuyển tiền send/receive/scheduled |
| `/cards` | Thẻ tín dụng, freeze, virtual card |
| `/analytics` | Heatmap, category, recurring, insights |
| `/crypto` | Chart, portfolio, trade |
| `/investments` | Allocation, holdings, ticker, watchlist |
| `/budgets` | Budget rings, goals, projection |
| `/settings` | Profile, security, billing, appearance |
| `/notifications` | Feed thông báo |
| `/sign-in` | Đăng nhập |
| `/sign-up` | Đăng ký |

## Tech stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| Animations | [Motion](https://motion.dev) |
| Drag & Drop | [@dnd-kit](https://dndkit.com) |
| Icons | [Lucide React](https://lucide.dev) |
| Language | TypeScript |

## Getting started

```bash
git clone git@github.com:Jang1309/bateco-dashboard.git
cd bateco-dashboard
pnpm install
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Mô tả |
|---------|--------|
| `pnpm dev` | Dev server |
| `pnpm build` | Lint fix + format + production build |
| `pnpm start` | Chạy bản build |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier (`src/**`) |
| `pnpm check-types` | `tsc --noEmit` |

## Customization

- **Theme** — `src/app/globals.css` (CSS variables, dark mode)
- **Mock data** — `src/data/seed.ts`
- **Dashboard layout** — nút Customize trên dashboard (localStorage)

## License

[MIT](LICENSE) © 2026 Bateco / Giang Nguyen

Dựa trên template [shadcn-fintech](https://github.com/abderrahimghazali/shadcn-fintech) (MIT).
