import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import type { BudgetDetail, BudgetOverview } from "@/lib/db/budget";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatTy } from "@/lib/money";
import {
  CategoryChart,
  SellerChart,
  TopCustomersChart,
  WinRiskChart,
} from "@/views/tong-quan/components/charts";
import { ExportButton, YearSelect } from "@/components/dashboard/controls";
import { KpiStrip, outlineBtn } from "@/components/dashboard/kpi-strip";
import { OpportunitiesTable } from "./components/opportunities-table";
import { SummaryTile } from "./components/summary";

export function PhuTrachView({
  data,
  employeeId,
  details,
}: {
  data: BudgetOverview;
  employeeId: number;
  details: BudgetDetail[];
}) {
  const owner = data.owners[0];
  const back = (
    <Link href={`/?year=${data.year}`} className={outlineBtn}>
      <ArrowLeftIcon className="size-4" />
      Tổng quan
    </Link>
  );

  if (!owner) {
    return (
      <div className="flex flex-col items-start gap-4 px-10 pt-10 xsm:px-4">
        {back}
        <h1 className="text-2xl font-semibold text-foreground">
          Không có kế hoạch năm {data.year}
        </h1>
        <p className="text-sm text-muted-foreground">
          Nhân viên ID {employeeId} chưa có kế hoạch đang hoạt động trong năm
          này. Chọn năm khác:
        </p>
        <YearSelect year={data.year} years={data.availableYears} />
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-12">
      <div className="flex flex-wrap items-end gap-5 px-10 pt-10 pb-2 xsm:px-4 xsm:pt-6">
        <div className="mr-auto flex items-center gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:ease-fluid">
          <Avatar className="size-16 ring-4 ring-card">
            <AvatarFallback className="bg-secondary text-xl font-semibold text-secondary-foreground">
              {owner.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <span className="w-fit rounded-full bg-card px-3 py-1 text-[0.625rem] font-medium tracking-[0.2em] text-muted-foreground uppercase ring-1 ring-foreground/[0.06]">
              Phụ trách · Chi nhánh {owner.branch}
            </span>
            <h1 className="text-[2.125rem] leading-10 font-semibold tracking-[-0.03em] text-foreground">
              {owner.name}
            </h1>
            <p className="text-[0.8125rem] leading-5 text-muted-foreground">
              ID {owner.employeeId} · Năm {data.year} · {owner.budgetCount} kế
              hoạch · {data.kpis.opportunities} hạng mục · {data.kpis.customers}{" "}
              khách hàng
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {back}
          <YearSelect year={data.year} years={data.availableYears} />
          <ExportButton data={data} details={details} ownerName={owner.name} />
        </div>
      </div>

      <div className="flex flex-col gap-7 px-10 pt-7 xsm:px-4">
        <KpiStrip data={data} />

        {data.kpis.opportunities === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[1.75rem] bg-foreground/[0.025] px-6 py-16 text-center ring-1 ring-foreground/[0.06]">
            <p className="text-lg font-semibold text-foreground">
              Chưa có hạng mục nào trong năm {data.year}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {owner.company > 0
                ? `${owner.name} đã được giao chỉ tiêu ${formatTy(owner.company)} tỷ nhưng chưa lập hạng mục chi tiết nào.`
                : `${owner.name} chưa có hạng mục nào trong kế hoạch.`}
            </p>
          </div>
        ) : (
          <>
            {/* bento: hàng 1 hai card cao bằng nhau; top khách hàng cao 2 hàng, bên phải là người bán + tóm tắt nhanh */}
            <div className="grid grid-cols-12 gap-7 xsm:grid-cols-1 [&>section:nth-child(even)]:[animation-delay:120ms]">
              <CategoryChart
                data={data}
                className="col-span-7 xsm:col-span-1"
              />
              <WinRiskChart data={data} className="col-span-5 xsm:col-span-1" />
              <TopCustomersChart
                data={data}
                compact
                className="col-span-7 row-span-2 xsm:col-span-1 xsm:row-span-1"
              />
              <SellerChart data={data} className="col-span-5 xsm:col-span-1" />
              <SummaryTile
                data={data}
                details={details}
                className="col-span-5 xsm:col-span-1"
              />
            </div>
            <OpportunitiesTable details={details} />
          </>
        )}
      </div>
    </div>
  );
}
