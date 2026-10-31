import Link from "next/link";
import { TrendingUpIcon } from "lucide-react";
import type { BudgetOverview } from "@/lib/db/budget";
import { ExportButton, YearSelect } from "@/components/dashboard/controls";
import { outlineBtn } from "@/components/dashboard/kpi-strip";
import { CustomizeButton, DashboardSections } from "./components/customize";

export function TongQuanView({ data }: { data: BudgetOverview }) {
  const { kpis, owners, year } = data;
  const budgetCount = owners.reduce((s, o) => s + o.budgetCount, 0);

  return (
    <div className="flex flex-col pb-12">
      <div className="flex flex-wrap items-end gap-5 px-10 pt-10 pb-2 xsm:px-4 xsm:pt-6">
        <div className="mr-auto flex flex-col gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:ease-fluid">
          <span className="w-fit rounded-full bg-card px-3 py-1 text-[0.625rem] font-medium tracking-[0.2em] text-muted-foreground uppercase ring-1 ring-foreground/[0.06]">
            Kế hoạch năm {year}
          </span>
          <h1 className="text-[2.125rem] leading-10 font-semibold tracking-[-0.03em] text-foreground">
            Tổng quan doanh thu
          </h1>
          <p className="text-[0.8125rem] leading-5 text-muted-foreground">
            {budgetCount} kế hoạch · {owners.length} phụ trách ·{" "}
            {kpis.opportunities} hạng mục · {kpis.customers} khách hàng
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <YearSelect year={year} years={data.availableYears} />
          <Link href="/so-sanh-nam" className={outlineBtn}>
            <TrendingUpIcon className="size-4" />
            So sánh năm
          </Link>
          <CustomizeButton />
          <ExportButton data={data} />
        </div>
      </div>

      <div className="flex flex-col gap-7 px-10 pt-7 xsm:px-4">
        <DashboardSections data={data} />
      </div>
    </div>
  );
}
