import Link from "next/link";
import { cn } from "cn";
import { ArrowLeftIcon } from "lucide-react";
import { ToneBadge } from "@/components/dashboard/panel";
import { outlineBtn } from "@/components/dashboard/kpi-strip";
import {
  BridgeChart,
  CustomerFlowPanel,
  GroupCompareChart,
  TrendChart,
  WinMixChart,
} from "./components/charts";
import { pairGroups, seriesGroups, type YearData } from "./lib/compare-data";
import { OwnersCompareTable } from "./components/owners-table";
import { delta, fmt, yearColor, type Kind } from "./lib/format";
import { YearPicker } from "./components/year-picker";

function DeltaBadge({ a, b, kind }: { a: number; b: number; kind: Kind }) {
  const d = delta(a, b, kind);
  return <ToneBadge tone={d.tone}>{d.text}</ToneBadge>;
}

/** So sánh nhiều năm (xếp tăng dần): mọi năm hiện cạnh nhau; chênh lệch tính năm đầu → năm cuối. */
export function SoSanhNamView({
  data,
  available,
  maxYears,
}: {
  data: YearData[];
  available: number[];
  maxYears: number;
}) {
  const n = data.length;
  const years = data.map((d) => d.year);
  const first = data[0]!;
  const last = data[n - 1]!;
  const yearA = first.year;
  const yearB = last.year;

  // chỉ tiêu = 0 nghĩa là chưa giao, không phải giảm 100%
  const metrics: {
    label: string;
    kind: Kind;
    values: number[];
    empty?: string;
  }[] = [
    {
      label: "Doanh thu kỳ vọng",
      kind: "money",
      values: data.map((d) => d.overview.kpis.expected),
    },
    {
      label: "Kế hoạch (pipeline)",
      kind: "money",
      values: data.map((d) => d.overview.kpis.plan),
    },
    {
      label: "Chỉ tiêu công ty",
      kind: "money",
      values: data.map((d) => d.overview.kpis.company),
      empty: "Chưa giao",
    },
    {
      label: "Lợi nhuận",
      kind: "money",
      values: data.map((d) => d.overview.kpis.profit),
    },
    {
      label: "Tỷ lệ kỳ vọng",
      kind: "pct",
      values: data.map((d) => d.overview.kpis.coveragePct),
    },
    {
      label: "Win rate bình quân",
      kind: "pct",
      values: data.map((d) => d.overview.kpis.avgWinRate),
    },
    {
      label: "Hạng mục",
      kind: "count",
      values: data.map((d) => d.overview.kpis.opportunities),
    },
    {
      label: "Khách hàng",
      kind: "count",
      values: data.map((d) => d.overview.kpis.customers),
    },
  ];

  // waterfall và biến động khách hàng chỉ so 2 mốc: năm đầu → năm cuối
  const pairs = {
    categories: pairGroups(
      first.breakdown.categories,
      last.breakdown.categories,
    ),
    sellers: pairGroups(first.breakdown.sellers, last.breakdown.sellers),
    customers: pairGroups(first.breakdown.customers, last.breakdown.customers),
  };
  const series = {
    categories: seriesGroups(data.map((d) => d.breakdown.categories)),
    sellers: seriesGroups(data.map((d) => d.breakdown.sellers)),
  };
  // 2 chart nhóm hàng / người bán đứng cạnh nhau: chung chiều cao theo chart nhiều dòng hơn
  const sideRows = Math.max(series.categories.length, series.sellers.length);

  const ownerIds = [
    ...new Set(data.flatMap((d) => d.overview.owners.map((o) => o.employeeId))),
  ];
  const owners = ownerIds.map((id) =>
    data.map((d) => d.overview.owners.find((o) => o.employeeId === id)),
  );

  return (
    <div className="flex flex-col pb-12">
      <div className="flex flex-wrap items-end gap-5 px-10 pt-10 pb-2 xsm:px-4 xsm:pt-6">
        <div className="mr-auto flex flex-col gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:ease-fluid">
          <span className="w-fit rounded-full bg-card px-3 py-1 text-[0.625rem] font-medium tracking-[0.2em] text-muted-foreground uppercase ring-1 ring-foreground/[0.06]">
            {n} năm · {years.join(" · ")}
          </span>
          <h1 className="text-[2.125rem] leading-10 font-semibold tracking-[-0.03em] text-foreground">
            So sánh các năm
          </h1>
          <p className="text-[0.8125rem] leading-5 text-muted-foreground">
            Mọi năm hiện cạnh nhau; chênh lệch tính từ năm đầu {yearA} đến năm
            cuối {yearB}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden xsm:w-full">
          <Link
            href={`/?year=${yearB}`}
            className={cn(outlineBtn, "xsm:w-full")}
          >
            <ArrowLeftIcon className="size-4" />
            Tổng quan
          </Link>
          <YearPicker
            available={available}
            selected={years}
            maxYears={maxYears}
          />
        </div>
      </div>

      <div className="flex flex-col gap-7 px-10 pt-7 xsm:px-4">
        {n < 2 && (
          <p className="rounded-2xl bg-warning-muted px-4 py-3 text-sm text-warning">
            Mới có dữ liệu của 1 năm — cần ít nhất 2 năm để so sánh.
          </p>
        )}

        <div className="grid grid-cols-4 gap-5 xsm:grid-cols-2 xsm:gap-3">
          {metrics.map((m, i) => {
            const empty = (v: number) => Boolean(m.empty) && !v;
            const a = m.values[0]!;
            const b = m.values[n - 1]!;
            // % đo trên thang 0–100, còn lại so với năm lớn nhất
            const max = m.kind === "pct" ? 100 : Math.max(...m.values, 1);
            return (
              // viền kép như thẻ KPI trang tổng quan
              <div
                key={m.label}
                style={{ animationDelay: `${i * 50}ms` }}
                className="rounded-[1.5rem] bg-foreground/[0.025] p-1.5 shadow-[0_20px_40px_-28px_rgba(22,46,77,0.18)] ring-1 ring-foreground/[0.06] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:ease-fluid motion-safe:fill-mode-both"
              >
                <div className="flex h-full flex-col gap-3 rounded-[calc(1.5rem-0.375rem)] bg-card px-5 py-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(22,46,77,0.05)] xsm:gap-2 xsm:px-3.5 xsm:py-3.5 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="flex items-start gap-2 xsm:flex-col xsm:gap-1.5">
                    <p className="flex-1 text-[0.78125rem] leading-4 font-medium text-muted-foreground">
                      {m.label}
                    </p>
                    {empty(a) || empty(b) ? (
                      <ToneBadge tone="warning">{`Năm ${b ? yearA : yearB} chưa giao`}</ToneBadge>
                    ) : (
                      <DeltaBadge a={a} b={b} kind={m.kind} />
                    )}
                  </div>
                  <p className="text-[1.6875rem] leading-8 font-semibold tracking-[-0.025em] text-foreground xsm:text-xl xsm:leading-7">
                    {empty(b) ? m.empty : fmt(b, m.kind)}
                  </p>
                  {/* mỗi năm một thanh mảnh: năm đầu nhạt → năm cuối đậm */}
                  <div className="mt-auto flex flex-col gap-1.5">
                    {m.values.map((v, j) => (
                      <div
                        key={years[j]}
                        className="flex items-center gap-2 text-[0.6875rem] leading-4 text-muted-foreground tabular-nums xsm:gap-1.5 xsm:text-[0.625rem]"
                      >
                        <span className="w-8 shrink-0 xsm:w-6">{years[j]}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (v / max) * 100)}%`,
                              background: yearColor(j, n),
                            }}
                          />
                        </div>
                        <span className="w-[4.5rem] shrink-0 text-right xsm:w-12">
                          {empty(v)
                            ? m.empty
                            : fmt(v, m.kind).replace(" tỷ ₫", " tỷ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <TrendChart data={data} />

        <BridgeChart pairs={pairs} yearA={yearA} yearB={yearB} />

        <div className="grid grid-cols-2 items-start gap-7 xsm:grid-cols-1">
          <GroupCompareChart
            title="Theo nhóm hàng"
            description={`Từng nhóm hàng qua ${n} năm — đổi chỉ số ở thanh chọn`}
            series={series.categories}
            labels={years.map((y) => `Năm ${y}`)}
            colors={years.map((_, i) => yearColor(i, n))}
            compareEnds
            rowCount={sideRows}
          />
          <GroupCompareChart
            title="Theo người bán"
            description={`Từng người bán qua ${n} năm — đổi chỉ số ở thanh chọn`}
            series={series.sellers}
            labels={years.map((y) => `Năm ${y}`)}
            colors={years.map((_, i) => yearColor(i, n))}
            compareEnds
            rowCount={sideRows}
          />
        </div>

        <WinMixChart
          rows={data.map((d) => ({
            label: `Năm ${d.year}`,
            buckets: d.overview.winBuckets,
          }))}
          compareEnds
        />
        <CustomerFlowPanel
          pairs={pairs.customers}
          yearA={yearA}
          yearB={yearB}
        />

        <OwnersCompareTable owners={owners} years={years} />
      </div>
    </div>
  );
}
