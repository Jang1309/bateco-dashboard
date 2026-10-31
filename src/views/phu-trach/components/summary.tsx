import type { BudgetDetail, BudgetOverview } from "@/lib/db/budget";
import { formatPct, formatTy } from "@/lib/money";
import { Panel, RatePill } from "@/components/dashboard/panel";

/** "DA260452: 2026-CN1- NĐQN-Trung tu hệ nước" → phần mô tả sau mã. */
const describe = (product: string) =>
  product.includes(":")
    ? product.slice(product.indexOf(":") + 1).trim()
    : product;

/** Ô bento: những gì lớn nhất trong kế hoạch của một phụ trách (dữ liệu trang đã có sẵn). */
export function SummaryTile({
  data,
  details,
  className,
}: {
  data: BudgetOverview;
  details: BudgetDetail[];
  className?: string;
}) {
  const total = data.kpis.plan;
  const share = (n: number) =>
    total > 0 ? formatPct((n / total) * 100, 0) : "—";
  // details đã sắp theo giá trị giảm dần (getBudgetDetails)
  const top = details[0];
  const category = data.categories[0];
  const customer = data.topCustomers[0];

  const items = [
    top && {
      label: "Hạng mục lớn nhất",
      title: describe(top.product) || "(Không mô tả)",
      sub: top.customer,
      amount: `${formatTy(top.amount)} tỷ`,
      badge: <RatePill value={top.winRate} />,
    },
    category && {
      label: "Nhóm hàng chính",
      title: category.name,
      sub: `${category.count} hạng mục`,
      amount: `${formatTy(category.amount)} tỷ`,
      badge: (
        <span className="text-xs text-muted-foreground">
          {share(category.amount)} pipeline
        </span>
      ),
    },
    customer && {
      label: "Khách hàng lớn nhất",
      title: customer.name,
      sub: `${customer.count} hạng mục`,
      amount: `${formatTy(customer.amount)} tỷ`,
      badge: (
        <span className="text-xs text-muted-foreground">
          {share(customer.amount)} pipeline
        </span>
      ),
    },
  ].filter((x) => !!x);

  return (
    <Panel
      className={className}
      title="Tóm tắt nhanh"
      description="Những phần lớn nhất trong kế hoạch, theo giá trị pipeline"
    >
      <ul className="flex flex-1 flex-col justify-around gap-3 px-6 pt-1 pb-6">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex flex-col gap-1 border-b border-border/40 pb-3 last:border-0 last:pb-0"
          >
            <span className="text-[0.75rem] font-medium tracking-wide text-muted-foreground uppercase">
              {it.label}
            </span>
            <span
              className="line-clamp-2 text-[0.875rem] leading-5 font-semibold text-foreground"
              title={it.title}
            >
              {it.title}
            </span>
            <span className="flex items-center gap-2">
              <span
                className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                title={it.sub}
              >
                {it.sub}
              </span>
              <span className="text-[0.875rem] font-semibold text-foreground tabular-nums">
                {it.amount}
              </span>
              {it.badge}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
