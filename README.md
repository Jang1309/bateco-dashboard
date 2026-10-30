# Bateco Revenue — Enterprise BI

Dashboard doanh thu Bateco theo Figma: chỉ tiêu, kỳ vọng, gói thầu và hiệu suất giám đốc / chi nhánh.

## Screens

| Route | Mô tả |
|------|--------|
| `/dashboard` | Tổng quan doanh thu (KPI, charts, bảng giám đốc) |
| `/directors/[id]` | Chi tiết giám đốc / chi nhánh |
| `/coming-soon` | Stub cho mục sidebar chưa có design |

Skeleton bảng: `src/app/(dashboard)/dashboard/loading.tsx`. Empty search: gõ từ khóa không khớp trên bảng overview.

## Tech

Next.js 16 · shadcn/ui · Tailwind CSS v4 · Recharts · next-themes · Lucide

## Start

```bash
pnpm install
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

## License

[MIT](LICENSE) © 2026 Bateco / Giang Nguyen
