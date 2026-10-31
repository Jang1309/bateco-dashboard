import Link from "next/link";
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import type { Person, PersonKind } from "@/lib/db/budget";
import { outlineBtn } from "@/components/dashboard/kpi-strip";
import { YearSelect } from "@/components/dashboard/controls";
import {
  GroupCompareChart,
  WinMixChart,
} from "@/views/so-sanh-nam/components/charts";
import { seriesGroups } from "@/views/so-sanh-nam/lib/compare-data";
import { fmt, personColor, type Kind } from "@/views/so-sanh-nam/lib/format";
import { PeoplePicker, type Pick } from "./components/people-picker";

export type { Pick };

type Metric = {
  label: string;
  kind: Kind;
  value: (p: Person) => number;
  /** 0 nghĩa là "chưa có", không phải giá trị 0 (vd chỉ tiêu chưa giao) */
  empty?: string;
};

const KIND_LABEL: Record<PersonKind, string> = {
  owner: "Phụ trách",
  seller: "Người bán",
};

function metricsOf(kind: PersonKind, all: Person[]): Metric[] {
  if (kind === "owner")
    return [
      { label: "Doanh thu kỳ vọng", kind: "money", value: (p) => p.expected },
      {
        label: "Kế hoạch (pipeline)",
        kind: "money",
        value: (p) => p.plan ?? 0,
      },
      {
        label: "Chỉ tiêu công ty",
        kind: "money",
        value: (p) => p.company ?? 0,
        empty: "Chưa giao",
      },
      {
        // cùng định nghĩa với cột "% Đạt" ở bảng phụ trách
        label: "% Đạt",
        kind: "pct",
        value: (p) => {
          const base = p.company || p.plan || 0;
          return base > 0 ? (p.expected / base) * 100 : 0;
        },
      },
      { label: "Win rate", kind: "pct", value: (p) => p.winRate },
      { label: "Lợi nhuận", kind: "money", value: (p) => p.profit },
      { label: "Hạng mục", kind: "count", value: (p) => p.count },
      { label: "Khách hàng", kind: "count", value: (p) => p.customers },
    ];
  const total = all.reduce((s, p) => s + p.amount, 0);
  return [
    { label: "Pipeline", kind: "money", value: (p) => p.amount },
    { label: "Doanh thu kỳ vọng", kind: "money", value: (p) => p.expected },
    { label: "Win rate", kind: "pct", value: (p) => p.winRate },
    { label: "Lợi nhuận", kind: "money", value: (p) => p.profit },
    { label: "Hạng mục", kind: "count", value: (p) => p.count },
    { label: "Khách hàng", kind: "count", value: (p) => p.customers },
    {
      label: "Giá trị TB mỗi hạng mục",
      kind: "money",
      value: (p) => (p.count ? p.amount / p.count : 0),
    },
    {
      label: "Tỷ trọng pipeline",
      kind: "pct",
      value: (p) => (total > 0 ? (p.amount / total) * 100 : 0),
    },
  ];
}

/** So sánh 2–5 phụ trách hoặc người bán trong cùng một năm. */
export function SoSanhNhanSuView({
  year,
  available,
  kind,
  people,
  picks,
  maxPeople,
}: {
  year: number;
  available: number[];
  kind: PersonKind;
  people: Person[];
  picks: Pick[];
  maxPeople: number;
}) {
  const chosen = picks.map((x) => ({
    ...x,
    person: people.find((p) => p.key === x.key)!,
  }));
  const metrics = metricsOf(kind, people);
  const labels = chosen.map((c) => c.person.name);
  const colors = chosen.map((c) => personColor(c.slot));
  const categories = seriesGroups(chosen.map((c) => c.person.categories));
  const kindLabel = KIND_LABEL[kind].toLowerCase();

  return (
    <div className="flex flex-col pb-12">
      <div className="flex flex-wrap items-end gap-5 px-10 pt-10 pb-2 xsm:px-4 xsm:pt-6">
        <div className="mr-auto flex flex-col gap-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:ease-fluid">
          <span className="w-fit rounded-full bg-card px-3 py-1 text-[0.625rem] font-medium tracking-[0.2em] text-muted-foreground uppercase ring-1 ring-foreground/[0.06]">
            Năm {year} · {chosen.length} {kindLabel}
          </span>
          <h1 className="text-[2.125rem] leading-10 font-semibold tracking-[-0.03em] text-foreground">
            So sánh nhân sự
          </h1>
          <p className="text-[0.8125rem] leading-5 text-muted-foreground">
            {kind === "owner"
              ? "Phụ trách = người sở hữu kế hoạch năm"
              : "Người bán = người trực tiếp theo từng hạng mục"}{" "}
            · chọn 2–{maxPeople} người để so
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden xsm:w-full">
          <Link
            href={`/?year=${year}`}
            className={cn(outlineBtn, "xsm:w-full")}
          >
            <ArrowLeftIcon className="size-4" />
            Tổng quan
          </Link>
          {/* đổi loại hoặc năm → chọn lại người (người năm này có thể không có ở năm khác) */}
          <div
            role="radiogroup"
            aria-label="Loại nhân sự"
            className="flex h-10 items-center rounded-full bg-card p-1 ring-1 ring-border/70"
          >
            {(["owner", "seller"] as const).map((k) => (
              <Link
                key={k}
                role="radio"
                aria-checked={kind === k}
                href={`/so-sanh-nhan-su?year=${year}&type=${k}`}
                className={cn(
                  "flex h-8 items-center rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors duration-200",
                  kind === k
                    ? "bg-neutral-muted text-foreground ring-1 ring-foreground/10"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {KIND_LABEL[k]}
              </Link>
            ))}
          </div>
          <YearSelect
            year={year}
            years={available}
            hrefPrefix={`/so-sanh-nhan-su?type=${kind}&year=`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-7 px-10 pt-5 xsm:px-4">
        <PeoplePicker
          year={year}
          kind={kind}
          people={people}
          picks={picks}
          maxPeople={maxPeople}
        />

        {people.length < 2 ? (
          <p className="rounded-2xl bg-warning-muted px-4 py-3 text-sm text-warning">
            Năm {year} chỉ có {people.length} {kindLabel} — cần ít nhất 2 người
            để so sánh.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-5 xsm:grid-cols-1 xsm:gap-3">
              {metrics.map((m, i) => {
                const values = chosen.map((c) => m.value(c.person));
                const empty = (v: number) => Boolean(m.empty) && !v;
                const max =
                  m.kind === "pct"
                    ? Math.max(100, ...values)
                    : Math.max(...values, 1);
                const top = Math.max(...values);
                const leader = chosen[values.indexOf(top)];
                return (
                  <div
                    key={m.label}
                    style={{ animationDelay: `${i * 50}ms` }}
                    className="rounded-[1.5rem] bg-foreground/[0.025] p-1.5 shadow-[0_20px_40px_-28px_rgba(22,46,77,0.18)] ring-1 ring-foreground/[0.06] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:ease-fluid motion-safe:fill-mode-both"
                  >
                    <div className="flex h-full flex-col gap-3 rounded-[calc(1.5rem-0.375rem)] bg-card px-5 py-4.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(22,46,77,0.05)] xsm:px-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="flex flex-col gap-1">
                        <p className="text-[0.78125rem] leading-4 font-medium text-muted-foreground">
                          {m.label}
                        </p>
                        {/* người dẫn đầu ở chỉ số này */}
                        {leader && top > 0 ? (
                          <p className="flex items-center gap-1.5 text-[0.9375rem] leading-5 font-semibold text-foreground">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ background: personColor(leader.slot) }}
                            />
                            <span className="truncate">
                              {leader.person.name}
                            </span>
                          </p>
                        ) : (
                          <p className="text-[0.9375rem] leading-5 font-semibold text-muted-foreground">
                            {m.empty ?? "—"}
                          </p>
                        )}
                      </div>
                      {/* mỗi người một thanh mảnh, màu theo người; số luôn hiện (không chỉ dựa vào màu) */}
                      <div className="mt-auto flex flex-col gap-2">
                        {chosen.map((c, j) => {
                          const v = values[j]!;
                          return (
                            // 2 tầng: tên + số ở trên, thanh trải hết chiều ngang ở dưới (thẻ hẹp vẫn đọc được)
                            <div
                              key={c.key}
                              className="flex flex-col gap-1 text-[0.6875rem] leading-4 text-muted-foreground tabular-nums"
                            >
                              <div className="flex items-baseline gap-2">
                                <span
                                  className="min-w-0 flex-1 truncate"
                                  title={c.person.name}
                                >
                                  {c.person.name}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0",
                                    v === top &&
                                      v > 0 &&
                                      "font-semibold text-foreground",
                                  )}
                                >
                                  {empty(v)
                                    ? m.empty
                                    : fmt(v, m.kind).replace(" tỷ ₫", " tỷ")}
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, (v / max) * 100)}%`,
                                    background: personColor(c.slot),
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <GroupCompareChart
              title="Theo nhóm hàng"
              description={`Từng nhóm hàng của mỗi ${kindLabel} — đổi chỉ số ở thanh chọn`}
              series={categories}
              labels={labels}
              colors={colors}
            />

            <WinMixChart
              rows={chosen.map((c) => ({
                label: c.person.name,
                buckets: c.person.buckets,
              }))}
              description={`Tỷ trọng giá trị pipeline ở từng ngưỡng win rate của mỗi ${kindLabel} — phần đỏ (< 50%) càng lớn càng rủi ro`}
            />

            {kind === "owner" && (
              <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">
                Xem trang chi tiết:
                {chosen.map((c) => (
                  <Link
                    key={c.key}
                    href={`/phu-trach/${c.key}?year=${year}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 font-medium text-foreground ring-1 ring-border/70 hover:bg-muted"
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: personColor(c.slot) }}
                    />
                    {c.person.name}
                    <ChevronRightIcon className="size-3.5" />
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
