"use client";

import { useState } from "react";
import { useRemPx } from "@/hooks/use-rem-px";
import { useXsm } from "@/hooks/use-xsm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { cn } from "cn";
import {
  Panel,
  RatePill,
  ToneBadge,
  type Tone,
} from "@/components/dashboard/panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { BudgetOverview, PipelineGroup } from "@/lib/db/budget";
import { formatPct, formatTy } from "@/lib/money";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

export { Panel, RatePill, ToneBadge };

type Data = { data: BudgetOverview; className?: string };
type TickProps = {
  x: number;
  y: number;
  payload: { value: string; index: number };
};

const NAVY = "var(--chart-1)";
const BLUE = "var(--chart-2)";
const SOFT = "var(--chart-soft)";
const DANGER = "var(--chart-danger)";
const TRACK = "var(--chart-track)";
const SUCCESS = "var(--success)";
const DIM = 0.3;
const toTy = (n: number) => Math.round(n / 100_000_000) / 10;
const tyVnd = (n: number) => (n ? `${formatTy(n)} tỷ ₫` : "—");
/** Kỳ vọng dưới ngưỡng 50% tô đỏ, còn lại xanh đậm. */
const rateColor = (v: number) => (v < 50 ? DANGER : NAVY);

/** Mốc trục tròn (1-2-2,5-5 × 10ⁿ), tối đa 5 khoảng, sát giá trị lớn nhất. */
function niceTicks(max: number) {
  if (max <= 0) return [0, 1];
  const p = 10 ** Math.floor(Math.log10(max));
  for (const m of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5].map((k) => k * p)) {
    const n = Math.ceil(max / m);
    if (n <= 5)
      return Array.from({ length: n + 1 }, (_, i) => +(i * m).toFixed(2));
  }
  return [0, max];
}

/** Index đang hover của BarChart; dim(i) = phần tử khác đang bị làm mờ. */
function useHover() {
  const [active, setActive] = useState<number | null>(null);
  return {
    active,
    dim: (i: number) => active != null && active !== i,
    chartProps: {
      onMouseMove: (s: { activeTooltipIndex?: unknown }) =>
        setActive(
          s.activeTooltipIndex == null ? null : Number(s.activeTooltipIndex),
        ),
      onMouseLeave: () => setActive(null),
    },
  };
}

// Cột đứng mọc từ dưới lên khi tải trang (CSS, chạy 1 lần)
// Transition cho hiệu ứng làm mờ khi hover. Animation lúc tải trang làm bằng CSS (chạy 1 lần):
// animation của recharts chạy lại mỗi lần re-render → nhãn nhấp nháy khi hover.
const fadeCls = cn(
  "[&_.recharts-bar-rectangle_path]:transition-[fill-opacity,stroke] [&_.recharts-bar-rectangle_path]:duration-200",
  "[&_.recharts-label]:transition-[fill-opacity] [&_.recharts-label]:duration-200",
  "[&_foreignObject]:transition-opacity [&_foreignObject]:duration-200",
);
// thanh ngang mọc từ trái sang
const chartCls = cn(
  fadeCls,
  "motion-safe:[&_.recharts-bar-rectangles]:animate-[bar-reveal_700ms_ease-out] motion-safe:[&_.recharts-label-list]:animate-[bar-reveal_700ms_ease-out]",
);
// cột đứng mọc từ dưới lên
const columnCls = cn(
  fadeCls,
  // ChartContainer mặc định tô cursor bằng fill-muted (xanh) → ép về neutral-muted như Figma
  "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-neutral-muted",
  "motion-safe:[&_.recharts-bar-rectangles]:animate-[bar-rise_700ms_ease-out] motion-safe:[&_.recharts-label-list]:animate-[bar-rise_700ms_ease-out]",
);

/** Dải nền hàng đang hover: phủ cả hàng (kể cả nhãn) như Figma, trượt mượt giữa các hàng. */
function RowBand({
  active,
  top,
  rowHeight,
}: {
  active: number | null;
  top: number;
  rowHeight: number;
}) {
  // giữ hàng cuối cùng để dải mờ dần tại chỗ khi rời chuột
  const [last, setLast] = useState(active ?? 0);
  if (active != null && active !== last) setLast(active);
  return (
    <div
      className={cn(
        "pointer-events-none absolute -inset-x-3 rounded-md bg-neutral-muted transition-[top,opacity] duration-200 ease-out",
        active == null && "opacity-0",
      )}
      style={{ top: top + last * rowHeight, height: rowHeight }}
    />
  );
}

/* ---------- Tooltip theo Figma: tiêu đề · series có màu · delta ---------- */

function thresholdBadge(v: number): { tone: Tone; text: string } {
  if (v < 50) return { tone: "destructive", text: "Dưới ngưỡng 50%" };
  if (v < 80) return { tone: "muted", text: "Trên ngưỡng 50%" };
  return { tone: "success", text: "Đạt ngưỡng 80%" };
}

function TipCard({
  title,
  rows,
  badge,
  note,
  wide,
}: {
  title: string;
  rows: { label: string; value: string; color: string }[];
  badge: { tone: Tone; text: string };
  note?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card px-3.5 py-3 text-[0.8125rem] leading-5 shadow-[0_2px_3px_rgba(22,46,77,0.08),0_8px_12px_rgba(22,46,77,0.16)]",
        wide ? "w-[18.125rem]" : "w-[15.625rem]",
      )}
    >
      <p className="font-semibold text-foreground">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: r.color }}
          />
          <span className="flex-1 text-muted-foreground">{r.label}</span>
          <span className="font-medium whitespace-nowrap text-foreground tabular-nums">
            {r.value}
          </span>
        </div>
      ))}
      <div className="h-px bg-border" />
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <ToneBadge tone={badge.tone}>{badge.text}</ToneBadge>
        {note && (
          <span className="min-w-0 text-[0.78125rem] text-muted-foreground">
            {note}
          </span>
        )}
      </div>
    </div>
  );
}

/** Bọc render tooltip: lấy row dữ liệu của phần tử đang hover. */
function tip<T>(render: (row: T, dataKey?: unknown) => React.ReactNode) {
  return function Content(p: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: unknown; dataKey?: unknown }>;
  }) {
    const item = p.payload?.[0];
    return p.active && item?.payload
      ? render(item.payload as T, item.dataKey)
      : null;
  };
}

/* ---------- Khung card ---------- */

function ChartCard({
  children,
  ...props
}: Omit<React.ComponentProps<typeof Panel>, "children"> & {
  children: React.ReactNode;
}) {
  return (
    <Panel {...props}>
      <div className="flex flex-1 flex-col gap-5 px-6 pt-1 pb-6">
        {children}
      </div>
    </Panel>
  );
}

type LegendItem = { label: string; color: string; shape?: "box" | "tick" };

function Legend({ items }: { items: LegendItem[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              i.shape === "tick"
                ? "h-3 w-[0.1875rem] rounded-full"
                : "size-2.5 rounded-[0.1875rem]",
            )}
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Insight({
  tone,
  badge,
  children,
}: {
  tone: Tone;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="insight"
      className="mt-auto flex items-center gap-2.5 border-t border-border/60 pt-4"
    >
      <ToneBadge tone={tone}>{badge}</ToneBadge>
      <p className="flex-1 text-[0.84375rem] leading-5 text-foreground">
        {children}
      </p>
    </div>
  );
}

/* ---------- Thanh ngang: kỳ vọng nằm trong pipeline (dùng chung 4 chart) ---------- */

type BarRow = {
  name: string;
  sub?: string;
  amount: number;
  expected: number;
  count: number;
  company?: number;
};

const barConfig = {
  expected: { label: "Kỳ vọng", color: NAVY },
  rest: { label: "Phần còn lại", color: TRACK },
  company: { label: "Chỉ tiêu công ty", color: BLUE },
} satisfies ChartConfig;

function TargetMarker(p: unknown) {
  const { x, y, width, height } = p as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  if (!width) return <g />;
  return (
    <rect
      x={x + width - 1.5}
      y={y - 5}
      width={3}
      height={height + 10}
      rx={1.5}
      fill={BLUE}
    />
  );
}

function PipelineBars({
  title,
  description,
  rows,
  mode,
  total,
  nameHeader,
  leftWidth,
  rowHeight,
  longNames,
  insight,
  className,
}: {
  title: string;
  description: string;
  rows: BarRow[];
  /** owner: so với kế hoạch (tỷ lệ kỳ vọng) + vạch chỉ tiêu; group: so với pipeline (win rate) */
  mode: "owner" | "group";
  total: number;
  nameHeader: string;
  /** rem */
  leftWidth: number;
  /** rem */
  rowHeight: number;
  longNames?: boolean;
  insight?: React.ReactNode;
  className?: string;
}) {
  const { active, dim, chartProps } = useHover();
  const owner = mode === "owner";
  const ratioLabel = owner ? "Tỷ lệ kỳ vọng" : "Win rate";
  const amountLabel = owner ? "Kế hoạch" : "Pipeline";
  const px = useRemPx();
  // mobile: cột tên cố định (28.75rem) rộng hơn cả màn hình → thu hẹp, chừa chỗ cho thanh
  const xsm = useXsm();
  const left = xsm ? 8.5 : leftWidth;
  const right = xsm ? 5 : 6.75;
  const RIGHT = px(right);
  const L = px(left);
  const H = px(rowHeight);
  const data = rows.map((r) => {
    const ratio = r.amount > 0 ? (r.expected / r.amount) * 100 : 0;
    return {
      name: r.name,
      expected: toTy(r.expected),
      // tối thiểu 0.001 để recharts vẫn vẽ nhãn đầu thanh khi phần còn lại = 0 (win rate 100%, chưa có kế hoạch)
      rest: Math.max(toTy(Math.max(r.amount - r.expected, 0)), 0.001),
      company: toTy(r.company ?? 0),
      // giá trị ghi ngay đầu thanh để không phải dò trục
      tip:
        r.amount > 0
          ? `${formatTy(r.amount)} tỷ`
          : owner && r.company
            ? `Chỉ tiêu ${formatTy(r.company)} tỷ · chưa có kế hoạch`
            : "",
      ratio,
      raw: r,
    };
  });
  type Row = (typeof data)[number];
  const hasTarget = owner && data.some((d) => d.company > 0);
  const max = Math.max(
    ...rows.map((r) => Math.max(r.amount, r.company ?? 0) / 1e9),
  );
  const fade = (i: number) => (dim(i) ? 0.35 : 1);

  return (
    <ChartCard title={title} description={description} className={className}>
      <Legend
        items={[
          { label: "Kỳ vọng (dự kiến thắng)", color: NAVY },
          {
            label: owner ? "Kế hoạch chưa có kỳ vọng" : "Pipeline còn lại",
            color: TRACK,
          },
          ...(hasTarget
            ? [
                {
                  label: "Chỉ tiêu công ty",
                  color: BLUE,
                  shape: "tick" as const,
                },
              ]
            : []),
        ]}
      />
      {xsm ? (
        // mobile: vùng vẽ recharts chỉ còn ~100px → danh sách: tên cả dòng, thanh + số + win rate bên dưới
        <ol className="flex flex-col">
          {data.map((d) => {
            const top = Math.max(...rows.map((r) => r.amount), 1);
            return (
              <li
                key={d.name}
                title={`${d.name}: kỳ vọng ${tyVnd(d.raw.expected)} / ${amountLabel.toLowerCase()} ${tyVnd(d.raw.amount)}`}
                className="flex flex-col gap-1.5 border-b border-border/40 py-2.5 last:border-0"
              >
                <span
                  className={cn(
                    "font-medium text-foreground",
                    longNames
                      ? "line-clamp-2 text-[0.75rem] leading-4 uppercase"
                      : "truncate text-[0.8125rem] leading-5",
                  )}
                >
                  {d.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex h-2.5 flex-1">
                    <span
                      className="flex h-full overflow-hidden rounded-[4px] bg-chart-track"
                      style={{ width: `${(d.raw.amount / top) * 100}%` }}
                    >
                      <span
                        className="h-full bg-chart-1"
                        style={{ width: `${Math.min(d.ratio, 100)}%` }}
                      />
                    </span>
                  </span>
                  <span className="w-16 text-right text-[0.8125rem] font-semibold text-foreground tabular-nums">
                    {d.tip || "—"}
                  </span>
                  {d.raw.amount > 0 ? (
                    <RatePill value={d.ratio} />
                  ) : (
                    <span className="text-[0.8125rem] text-muted-foreground">
                      —
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <div>
          <div className="flex border-b border-border/60 pb-2 text-[0.75rem] font-medium tracking-wide text-muted-foreground uppercase">
            <span style={{ width: `${left}rem` }}>{nameHeader}</span>
            <span className="flex-1">{amountLabel}</span>
            <span className="text-right" style={{ width: `${right}rem` }}>
              {ratioLabel}
            </span>
          </div>
          <div className="relative mt-1">
            <RowBand active={active} top={0} rowHeight={H} />
            <ChartContainer
              config={barConfig}
              className={cn("relative aspect-auto w-full", chartCls)}
              style={{ height: rows.length * H }}
            >
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                barCategoryGap={0}
                {...chartProps}
              >
                {/* giá trị đã ghi ở đầu thanh → bỏ trục & lưới cho đỡ rối; chừa 22% cho nhãn */}
                <XAxis
                  type="number"
                  hide
                  domain={[0, max * (xsm ? 1.9 : 1.28) || 1]}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={L}
                  tickLine={false}
                  axisLine={false}
                  tick={(p: unknown) => {
                    const t = p as TickProps;
                    const r = rows[t.payload.index];
                    return (
                      <foreignObject
                        x={0}
                        y={t.y - H / 2}
                        width={L - px(0.875)}
                        height={H}
                        opacity={fade(t.payload.index)}
                      >
                        <div className="flex h-full flex-col justify-center">
                          <span
                            className={cn(
                              "font-medium text-foreground",
                              longNames
                                ? "line-clamp-2 text-[0.8125rem] leading-4 uppercase xsm:text-[0.6875rem] xsm:leading-[0.875rem]"
                                : "truncate text-[0.875rem] leading-5",
                            )}
                            title={t.payload.value}
                          >
                            {t.payload.value}
                          </span>
                          {r?.sub && (
                            <span className="text-[0.75rem] leading-4 text-muted-foreground">
                              {r.sub}
                            </span>
                          )}
                        </div>
                      </foreignObject>
                    );
                  }}
                />
                <YAxis
                  yAxisId="value"
                  orientation="right"
                  type="category"
                  dataKey="name"
                  width={RIGHT}
                  tickLine={false}
                  axisLine={false}
                  tick={(p: unknown) => {
                    const t = p as TickProps;
                    const d = data[t.payload.index];
                    if (!d) return <g />;
                    return (
                      <foreignObject
                        x={t.x}
                        y={t.y - px(0.75)}
                        width={RIGHT - px(0.5)}
                        height={px(1.5)}
                        opacity={fade(t.payload.index)}
                      >
                        <div className="flex h-full items-center justify-end">
                          {d.raw.amount > 0 ? (
                            <RatePill value={d.ratio} />
                          ) : (
                            <span className="text-[0.8125rem] text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </foreignObject>
                    );
                  }}
                />
                {hasTarget && (
                  <YAxis yAxisId="target" type="category" dataKey="name" hide />
                )}
                <ChartTooltip
                  cursor={false}
                  offset={px(1)}
                  animationDuration={200}
                  animationEasing="ease-out"
                  content={tip<Row>(({ raw, ratio }) => (
                    <TipCard
                      wide={longNames}
                      title={raw.name}
                      rows={[
                        {
                          label: amountLabel,
                          value: tyVnd(raw.amount),
                          color: TRACK,
                        },
                        {
                          label: "Kỳ vọng",
                          value: tyVnd(raw.expected),
                          color: NAVY,
                        },
                        ...(owner
                          ? [
                              {
                                label: "Chỉ tiêu công ty",
                                value: tyVnd(raw.company ?? 0),
                                color: BLUE,
                              },
                            ]
                          : []),
                        {
                          label: ratioLabel,
                          value: raw.amount > 0 ? formatPct(ratio) : "—",
                          color: rateColor(ratio),
                        },
                        {
                          label: "Số hạng mục",
                          value: String(raw.count),
                          color: SOFT,
                        },
                      ]}
                      badge={
                        raw.amount > 0
                          ? thresholdBadge(ratio)
                          : { tone: "warning", text: "Chưa có kế hoạch" }
                      }
                      note={
                        owner
                          ? raw.amount > 0
                            ? ratio < 80
                              ? "chưa đạt 80%"
                              : "đạt mục tiêu"
                            : undefined
                          : `${formatPct(total > 0 ? (raw.amount / total) * 100 : 0)} tổng pipeline`
                      }
                    />
                  ))}
                />
                <Bar
                  dataKey="expected"
                  stackId="p"
                  barSize={px(1.625)}
                  radius={[4, 0, 0, 4]}
                  fill="var(--color-expected)"
                  isAnimationActive={false}
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fillOpacity={dim(i) ? DIM : 1} />
                  ))}
                </Bar>
                <Bar
                  dataKey="rest"
                  stackId="p"
                  barSize={px(1.625)}
                  radius={[0, 4, 4, 0]}
                  fill="var(--color-rest)"
                  isAnimationActive={false}
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fillOpacity={dim(i) ? 0.45 : 1} />
                  ))}
                  <LabelList
                    dataKey="tip"
                    position="right"
                    offset={px(0.5)}
                    className="pointer-events-none fill-foreground font-semibold"
                    fontSize="0.84375rem"
                  />
                </Bar>
                {hasTarget && (
                  <Bar
                    yAxisId="target"
                    dataKey="company"
                    barSize={px(1.625)}
                    fill="transparent"
                    shape={TargetMarker}
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      )}
      {insight}
    </ChartCard>
  );
}

/** Insight chung cho các nhóm: nhóm lớn nhất chiếm bao nhiêu pipeline và win rate của nó. */
function topInsight(groups: PipelineGroup[], total: number, what: string) {
  const top = groups[0];
  if (!top || total <= 0) return null;
  const share = (top.amount / total) * 100;
  return (
    <Insight
      tone={top.winRate < 50 ? "destructive" : "neutral"}
      badge={`${Math.round(share)}% pipeline`}
    >
      {what} lớn nhất <b className="font-semibold">{top.name}</b> có win rate{" "}
      {formatPct(top.winRate)}
      {top.winRate < 50
        ? " — dưới ngưỡng 50%, nhiều rủi ro dồn vào một nhóm."
        : "."}
    </Insight>
  );
}

const pipelineTotal = (data: BudgetOverview) =>
  data.winBuckets.reduce((s, b) => s + b.amount, 0);

const groupRows = (
  groups: PipelineGroup[],
  sub?: (g: PipelineGroup) => string,
) =>
  groups.map((g) => ({
    name: g.name,
    sub: sub?.(g),
    amount: g.amount,
    expected: g.expected,
    count: g.count,
  }));

/* R2 — Tỷ lệ kỳ vọng theo phụ trách: mỗi người một đồng hồ tròn */
export function OwnerPlanChart({ data, className }: Data) {
  const n = data.owners.length;
  // 1 → full, 2 → nửa, 3+ → carousel 3 cột
  const basis = n <= 1 ? "basis-full" : n === 2 ? "basis-1/2" : "basis-1/3";
  const below = data.owners.filter(
    (o) => o.plan > 0 && o.expected / o.plan < 0.5,
  );
  const orphans = data.owners.filter((o) => o.plan === 0 && o.company > 0);
  const issues = [
    below.length > 0 &&
      `${below.map((o) => o.name).join(", ")} có tỷ lệ kỳ vọng dưới 50%.`,
    ...orphans.map(
      (o) =>
        `${o.name} có chỉ tiêu ${formatTy(o.company)} tỷ nhưng chưa có kế hoạch.`,
    ),
  ].filter(Boolean);

  return (
    <ChartCard
      className={className}
      title="Tỷ lệ kỳ vọng theo phụ trách"
      description="Kỳ vọng ÷ kế hoạch · ngưỡng 50%, mục tiêu 80%"
    >
      {/* Carousel kéo/vuốt khi >3 người (1 trên mobile), mũi tên trái/phải khi focus */}
      <Carousel opts={{ align: "start" }} className="my-auto">
        {n > 3 && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-[0.8125rem] text-muted-foreground">
              {n} phụ trách · kéo hoặc bấm mũi tên để xem thêm
            </span>
            <div className="flex gap-1.5">
              <CarouselPrevious className="static translate-none" />
              <CarouselNext className="static translate-none" />
            </div>
          </div>
        )}
        <CarouselContent className="-ml-3">
          {data.owners.map((o) => (
            <CarouselItem
              key={o.id}
              className={cn(basis, "pl-3 pr-px xsm:basis-full")}
            >
              <Link
                href={`/phu-trach/${o.employeeId}?year=${data.year}`}
                className="block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Xem chi tiết ${o.name}`}
              >
                <OwnerGauge owner={o} />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {issues.length > 0 ? (
        <Insight tone="destructive" badge="Cần chú ý">
          {issues.join(" ")}
        </Insight>
      ) : (
        <Insight tone="success" badge="Ổn">
          Tất cả phụ trách có tỷ lệ kỳ vọng từ 50% trở lên.
        </Insight>
      )}
    </ChartCard>
  );
}

function OwnerGauge({ owner: o }: { owner: BudgetOverview["owners"][number] }) {
  const px = useRemPx();
  const ratio = o.plan > 0 ? (o.expected / o.plan) * 100 : null;
  // đã giao chỉ tiêu → hiện thêm kỳ vọng ÷ chỉ tiêu
  const target = o.company > 0 ? (o.expected / o.company) * 100 : null;
  const color =
    ratio == null ? TRACK : ratio < 50 ? DANGER : ratio < 80 ? NAVY : SUCCESS;
  return (
    <div className="flex h-full flex-col items-center gap-3 rounded-xl bg-neutral-muted/45 px-3 pt-4 pb-3 text-center transition-colors select-none hover:bg-neutral-muted">
      <div className="group/ring relative size-[9.75rem]">
        <ChartContainer
          config={{ value: { label: "Tỷ lệ kỳ vọng", color } }}
          className="aspect-square size-full"
        >
          <RadialBarChart
            data={[{ name: o.name, value: Math.min(ratio ?? 0, 100) }]}
            innerRadius="80%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={px(0.875)}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              dataKey="value"
              fill="var(--color-value)"
              background={{ fill: TRACK }}
              cornerRadius={px(0.375)}
              isAnimationActive="auto"
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ChartContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-700 ease-out group-has-[.recharts-surface]/ring:opacity-100">
          <span className="text-[1.875rem] leading-9 font-bold tracking-tight text-foreground">
            {ratio == null ? "—" : formatPct(ratio)}
          </span>
          <span className="text-[0.75rem] text-muted-foreground">
            tỷ lệ kỳ vọng
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[0.9375rem] leading-5 font-semibold text-foreground">
          {o.name}
        </span>
        <span className="text-[0.75rem] text-muted-foreground">
          Chi nhánh {o.branch}
        </span>
      </div>
      <dl className="grid w-full grid-cols-[auto_1fr] gap-x-2 gap-y-1 border-t border-border/60 pt-2.5 text-left text-[0.8125rem] tabular-nums">
        <dt className="text-muted-foreground">Kỳ vọng</dt>
        <dd className="text-right font-medium">{tyVnd(o.expected)}</dd>
        <dt className="text-muted-foreground">Kế hoạch</dt>
        <dd className="text-right font-medium">{tyVnd(o.plan)}</dd>
        <dt className="text-muted-foreground">Chỉ tiêu</dt>
        <dd className="text-right font-medium">{tyVnd(o.company)}</dd>
      </dl>
      {ratio == null ? (
        <ToneBadge tone="warning">Chưa có kế hoạch</ToneBadge>
      ) : target != null ? (
        <ToneBadge
          tone={
            target >= 100 ? "success" : target >= 50 ? "neutral" : "destructive"
          }
        >
          Đạt {formatPct(target)} chỉ tiêu
        </ToneBadge>
      ) : (
        <RatePill value={ratio} />
      )}
    </div>
  );
}

/* R2 — Pipeline theo ngưỡng win rate: donut + danh sách liên kết hover */
const bandColors = { high: NAVY, mid: BLUE, low: SOFT } as const;
const bandLabels = { high: "≥ 80%", mid: "50 – 80%", low: "< 50%" } as const;
const bandNotes = {
  high: "gần như chắc",
  mid: "khả quan",
  low: "rủi ro",
} as const;
type BandKey = keyof typeof bandColors;

export function WinRiskChart({ data, className }: Data) {
  const [active, setActive] = useState<number | null>(null);
  const buckets = data.winBuckets.map((b) => ({ ...b, key: b.key as BandKey }));
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const count = buckets.reduce((s, b) => s + b.count, 0);
  const share = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const lowShare = share(buckets.find((b) => b.key === "low")?.amount ?? 0);
  const config = Object.fromEntries(
    buckets.map((b) => [
      b.key,
      { label: bandLabels[b.key], color: bandColors[b.key] },
    ]),
  ) satisfies ChartConfig;
  const dim = (i: number) => active != null && active !== i;
  type Row = (typeof buckets)[number];

  return (
    <ChartCard
      className={className}
      title="Pipeline theo ngưỡng win rate"
      description="Cơ cấu giá trị pipeline theo khả năng thắng"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="group/ring relative size-[14rem] shrink-0">
          <ChartContainer config={config} className="aspect-square size-full">
            <PieChart>
              <ChartTooltip
                cursor={false}
                animationDuration={200}
                animationEasing="ease-out"
                wrapperStyle={{ zIndex: 10 }}
                content={tip<Row>((b) => (
                  <TipCard
                    title={`Win rate ${bandLabels[b.key]}`}
                    rows={[
                      {
                        label: "Pipeline",
                        value: tyVnd(b.amount),
                        color: bandColors[b.key],
                      },
                      {
                        label: "Số hạng mục",
                        value: String(b.count),
                        color: bandColors[b.key],
                      },
                    ]}
                    badge={{ tone: "muted", text: formatPct(share(b.amount)) }}
                    note="tổng pipeline"
                  />
                ))}
              />
              <Pie
                data={buckets}
                dataKey="amount"
                nameKey="label"
                innerRadius="68%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                stroke="var(--card)"
                strokeWidth={2}
                // vòng quét khi chart được vẽ (lúc lọt vào màn hình); "auto" tự tắt khi bật giảm chuyển động
                isAnimationActive="auto"
                animationBegin={0}
                animationDuration={800}
                animationEasing="ease-out"
                onMouseEnter={(_: unknown, i: number) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {buckets.map((b, i) => (
                  <Cell
                    key={b.key}
                    fill={bandColors[b.key]}
                    fillOpacity={dim(i) ? DIM : 1}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          {/* số giữa hiện cùng lúc với vòng (chart chỉ vẽ khi lọt vào màn hình) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center opacity-0 transition-opacity duration-700 ease-out group-has-[.recharts-surface]/ring:opacity-100">
            <span className="text-[1.875rem] leading-9 font-bold tracking-tight text-foreground">
              {formatTy(total)} tỷ
            </span>
            <span className="text-[0.75rem] text-muted-foreground">
              pipeline · {count} hạng mục
            </span>
          </div>
        </div>
        <ul className="flex w-full flex-1 flex-col gap-1">
          {buckets.map((b, i) => (
            <li
              key={b.key}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 transition-[opacity,background-color] duration-200",
                active === i && "bg-neutral-muted",
                dim(i) && "opacity-40",
              )}
            >
              <span
                className="size-3 shrink-0 rounded-[0.1875rem]"
                style={{ background: bandColors[b.key] }}
              />
              <span className="flex flex-1 flex-col">
                <span className="text-[0.90625rem] leading-5 font-medium text-foreground">
                  Win rate {bandLabels[b.key]}
                </span>
                <span className="text-[0.75rem] text-muted-foreground tabular-nums">
                  {bandNotes[b.key]} · {formatTy(b.amount)} tỷ · {b.count} hạng
                  mục
                </span>
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatPct(share(b.amount))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* chỉ nói "phần lớn" khi nhóm rủi ro thật sự chiếm quá nửa pipeline */}
      {lowShare > 0 && (
        <Insight
          tone={lowShare > 50 ? "destructive" : "neutral"}
          badge={`${Math.round(lowShare)}% pipeline`}
        >
          {lowShare > 50
            ? "có win rate dưới 50% — phần lớn giá trị đang nằm ở nhóm rủi ro."
            : "có win rate dưới 50% (nhóm rủi ro)."}
        </Insight>
      )}
    </ChartCard>
  );
}

/* R3 — Pipeline & win rate theo nhóm hàng: cột đứng chồng (kỳ vọng / phần còn lại) */
const columnConfig = {
  expected: { label: "Kỳ vọng", color: NAVY },
  rest: { label: "Pipeline còn lại", color: TRACK },
} satisfies ChartConfig;

export function CategoryChart({ data, className }: Data) {
  const { active, dim, chartProps } = useHover();
  const px = useRemPx();
  const total = pipelineTotal(data);
  const rows = data.categories.map((c) => ({
    name: c.name,
    expected: toTy(c.expected),
    // tối thiểu 0.001 để nhãn đỉnh cột vẫn hiện khi win rate 100%
    rest: Math.max(toTy(c.amount - c.expected), 0.001),
    tip: formatTy(c.amount),
    raw: c,
  }));
  type Row = (typeof rows)[number];
  const yTicks = niceTicks(
    Math.max(...data.categories.map((c) => c.amount / 1e9)),
  );

  return (
    <ChartCard
      className={className}
      title="Pipeline & win rate theo nhóm hàng"
      description="Chiều cao = pipeline (tỷ ₫) · phần đậm = kỳ vọng · nhãn dưới = win rate"
    >
      <Legend
        items={[
          { label: "Kỳ vọng (dự kiến thắng)", color: NAVY },
          { label: "Pipeline còn lại", color: TRACK },
        ]}
      />
      {/* mobile: cuộn ngang thay vì nhét chồng tên nhóm và nhãn win rate */}
      <p className="hidden text-xs text-muted-foreground xsm:block">
        Vuốt ngang để xem hết biểu đồ →
      </p>
      <div
        className="xsm:-mx-6 xsm:overflow-x-auto xsm:px-6"
        style={
          { "--cat-min": `${rows.length * 5 + 4}rem` } as React.CSSProperties
        }
      >
        <ChartContainer
          config={columnConfig}
          className={cn(
            "aspect-auto h-[25rem] w-full grow text-[0.8125rem] xsm:h-[21rem]",
            // mỗi nhóm cần ~5rem cho tên + nhãn win rate
            "xsm:min-w-[var(--cat-min)]",
            columnCls,
          )}
        >
          <BarChart
            data={rows}
            margin={{ top: px(1.375), right: px(0.25), left: 0, bottom: 0 }}
            {...chartProps}
          >
            <CartesianGrid vertical={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={px(3.5)}
              domain={[0, yTicks.at(-1)!]}
              ticks={yTicks}
              tickFormatter={(v: number) => (v === 0 ? "0" : `${v} tỷ`)}
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={px(4.625)}
              tick={(p: unknown) => {
                const t = p as TickProps;
                const r = rows[t.payload.index];
                if (!r) return <g />;
                return (
                  <foreignObject
                    x={t.x - px(2.125)}
                    y={t.y + px(0.25)}
                    width={px(4.25)}
                    height={px(4.25)}
                  >
                    <div
                      className={cn(
                        "flex flex-col items-center gap-1 transition-opacity duration-200",
                        dim(t.payload.index) && "opacity-35",
                      )}
                    >
                      <span
                        className={cn(
                          "line-clamp-2 text-center text-[0.78125rem] leading-[0.875rem]",
                          active === t.payload.index
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {r.name}
                      </span>
                      <RatePill value={r.raw.winRate} />
                    </div>
                  </foreignObject>
                );
              }}
            />
            <ChartTooltip
              cursor={{ fill: "var(--neutral-muted)", radius: 8 }}
              animationDuration={200}
              animationEasing="ease-out"
              content={tip<Row>(({ raw }) => (
                <TipCard
                  title={raw.name}
                  rows={[
                    {
                      label: "Pipeline",
                      value: tyVnd(raw.amount),
                      color: TRACK,
                    },
                    {
                      label: "Kỳ vọng",
                      value: tyVnd(raw.expected),
                      color: NAVY,
                    },
                    {
                      label: "Win rate",
                      value: formatPct(raw.winRate),
                      color: rateColor(raw.winRate),
                    },
                    {
                      label: "Số hạng mục",
                      value: String(raw.count),
                      color: SOFT,
                    },
                  ]}
                  badge={thresholdBadge(raw.winRate)}
                  note={`${formatPct(total > 0 ? (raw.amount / total) * 100 : 0)} tổng pipeline`}
                />
              ))}
            />
            <Bar
              dataKey="expected"
              stackId="c"
              fill="var(--color-expected)"
              maxBarSize={px(3.25)}
              isAnimationActive={false}
            >
              {rows.map((r, i) => (
                <Cell key={r.name} fillOpacity={dim(i) ? DIM : 1} />
              ))}
            </Bar>
            <Bar
              dataKey="rest"
              stackId="c"
              fill="var(--color-rest)"
              maxBarSize={px(3.25)}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {rows.map((r, i) => (
                <Cell key={r.name} fillOpacity={dim(i) ? 0.45 : 1} />
              ))}
              <LabelList
                dataKey="tip"
                position="top"
                offset={px(0.375)}
                className="pointer-events-none fill-foreground font-semibold"
                fontSize="0.78125rem"
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      {topInsight(data.categories, total, "Nhóm hàng")}
    </ChartCard>
  );
}

/* R3 — Người bán: bảng xếp hạng theo pipeline, kèm thước win rate có vạch ngưỡng 50% */
export function SellerChart({ data, className }: Data) {
  const total = pipelineTotal(data);
  const sellers = data.sellers;
  const max = Math.max(...sellers.map((s) => s.amount), 1);
  const risky = sellers.filter((s) => s.winRate < 50);
  const riskyShare =
    total > 0 ? (risky.reduce((s, r) => s + r.amount, 0) / total) * 100 : 0;

  return (
    <ChartCard
      className={className}
      title="Xếp hạng người bán"
      description="Xếp theo pipeline · thanh màu = win rate, vạch đứng ở giữa là ngưỡng 50%"
    >
      <div>
        <div className="grid grid-cols-[1.375rem_minmax(0,1fr)_5.75rem_minmax(7.5rem,0.8fr)] items-center gap-3 xsm:grid-cols-[1.25rem_minmax(0,1fr)_5.5rem] xsm:gap-x-2.5 xsm:gap-y-2 border-b border-border/60 pb-2 text-[0.75rem] font-medium tracking-wide text-muted-foreground uppercase">
          <span>#</span>
          <span>Người bán</span>
          <span className="text-right">Pipeline</span>
          <span className="xsm:hidden">Win rate</span>
        </div>
        <ol>
          {sellers.map((s, i) => {
            const share = total > 0 ? (s.amount / total) * 100 : 0;
            const low = s.winRate < 50;
            return (
              <li
                key={s.name}
                title={`${s.name}: kỳ vọng ${formatTy(s.expected)} / pipeline ${formatTy(s.amount)} tỷ (${formatPct(share)} tổng pipeline)`}
                className="grid grid-cols-[1.375rem_minmax(0,1fr)_5.75rem_minmax(7.5rem,0.8fr)] items-center gap-3 xsm:grid-cols-[1.25rem_minmax(0,1fr)_5.5rem] xsm:gap-x-2.5 xsm:gap-y-2 border-b border-border/40 py-3 transition-colors last:border-0 hover:bg-neutral-muted/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1"
                style={{
                  animationDelay: `${i * 40}ms`,
                  animationFillMode: "both",
                }}
              >
                <span className="text-[0.8125rem] font-semibold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="size-9 xsm:hidden">
                    <AvatarFallback className="bg-muted text-[0.75rem] font-semibold text-foreground">
                      {initialsOf(s.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[0.875rem] leading-5 font-medium text-foreground">
                      {s.name}
                    </span>
                    <span className="text-[0.75rem] leading-4 whitespace-nowrap text-muted-foreground">
                      {s.count} hạng mục
                    </span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-[0.875rem] leading-5 font-semibold text-foreground tabular-nums">
                    {formatTy(s.amount)} tỷ
                  </span>
                  {/* độ lớn tương đối so với người lớn nhất */}
                  <span className="h-1.5 w-full overflow-hidden rounded-full bg-chart-track">
                    <span
                      className="block h-full rounded-full bg-chart-1"
                      style={{ width: `${(s.amount / max) * 100}%` }}
                    />
                  </span>
                </span>
                <span className="flex items-center gap-2 xsm:col-span-2 xsm:col-start-2">
                  <span className="relative h-3 flex-1 rounded-full bg-chart-track">
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full",
                        low ? "bg-chart-danger" : "bg-chart-1",
                      )}
                      style={{ width: `${Math.min(s.winRate, 100)}%` }}
                    />
                    {/* vạch ngưỡng 50% */}
                    <span className="absolute -inset-y-1 left-1/2 w-px bg-foreground/50" />
                  </span>
                  <span
                    className={cn(
                      "w-12 text-right text-[0.8125rem] font-semibold tabular-nums",
                      low ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {formatPct(s.winRate)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {risky.length > 0 ? (
        <Insight
          tone="destructive"
          badge={`${Math.round(riskyShare)}% pipeline`}
        >
          nằm ở {risky.length}/{sellers.length} người bán có win rate dưới 50%.
        </Insight>
      ) : (
        <Insight tone="success" badge="Ổn">
          Tất cả người bán có win rate từ 50% trở lên.
        </Insight>
      )}
    </ChartCard>
  );
}

/** Chữ cái đầu của tên đệm cuối + tên: "Nguyễn Đình Giáp" → "ĐG". */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(-2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase();
}

/* R4 — Top khách hàng theo pipeline */
export function TopCustomersChart({
  data,
  className,
  compact,
}: Data & { compact?: boolean }) {
  const total = pipelineTotal(data);
  const top3 = data.topCustomers.slice(0, 3).reduce((s, c) => s + c.amount, 0);
  return (
    <PipelineBars
      className={className}
      title="Top khách hàng theo pipeline"
      description={`Top ${data.topCustomers.length} · xếp theo pipeline · % = win rate theo giá trị, dưới 50% tô đỏ`}
      mode="group"
      total={total}
      nameHeader="Khách hàng"
      leftWidth={compact ? 15 : 28.75}
      rowHeight={4}
      longNames
      rows={groupRows(data.topCustomers)}
      insight={
        total > 0 && (
          <Insight
            tone="neutral"
            badge={`${formatPct((top3 / total) * 100)} pipeline`}
          >
            đến từ 3 khách hàng lớn nhất ({data.kpis.customers} khách hàng có
            hạng mục).
          </Insight>
        )
      }
    />
  );
}
