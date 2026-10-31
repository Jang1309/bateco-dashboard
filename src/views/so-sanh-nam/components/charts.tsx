"use client";

import { useState } from "react";
import { useXsm } from "@/hooks/use-xsm";
import { cn } from "cn";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import type { BudgetOverview } from "@/lib/db/budget";
import { formatPct, formatVnd } from "@/lib/money";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Panel, ToneBadge } from "@/components/dashboard/panel";
import {
  bridge,
  customerFlow,
  metricValue,
  topMovers,
  type AdditiveMetric,
  type GroupMetric,
  type GroupPair,
  type GroupSeries,
  type YearData,
} from "./compare-data";
import { delta, type Kind } from "./format";

const COLOR_A = "var(--chart-plan)";
const COLOR_B = "var(--chart-1)";
const UP = "var(--success)";
const DOWN = "var(--chart-danger)";

type Years = { yearA: number; yearB: number };

const signed = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatVnd(Math.abs(n))}`;
const short = (v: string, n = 14) =>
  v.length > n ? `${v.slice(0, n - 1)}…` : v;

/* ---------- phần dùng chung ---------- */

export function Seg<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    // segmented control: rãnh nhạt, mục đang chọn là "viên" nền card nổi lên
    <ToggleGroup
      aria-label={label}
      size="sm"
      spacing={1}
      value={[value]}
      onValueChange={(v) => v[0] && onChange(v[0] as T)}
      className="rounded-full bg-neutral-muted p-1 ring-1 ring-foreground/[0.04] data-[size=sm]:rounded-full xsm:w-full dark:bg-background/70"
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          value={o.value}
          className="h-7 rounded-full px-3.5 text-[0.8125rem] font-medium xsm:flex-1 xsm:px-1.5 xsm:text-xs text-muted-foreground transition-[background-color,color,box-shadow] duration-200 ease-fluid hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-[0_1px_2px_rgba(22,46,77,0.12),0_1px_6px_-2px_rgba(22,46,77,0.1)] dark:aria-pressed:bg-neutral-muted dark:aria-pressed:ring-1 dark:aria-pressed:ring-foreground/10"
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[0.1875rem]"
            style={{ background: i.color }}
          />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** Tooltip: tiêu đề · giá trị 2 năm · badge chênh lệch. */
function TipBox({
  title,
  rows,
  badge,
  note,
}: {
  title: string;
  rows: { label: string; value: string; color: string }[];
  badge?: { a: number; b: number; kind: Kind };
  note?: string;
}) {
  const d = badge && delta(badge.a, badge.b, badge.kind);
  return (
    <div className="flex w-60 flex-col gap-2 rounded-lg border bg-card px-3.5 py-3 text-[0.8125rem] leading-5 shadow-[0_2px_3px_rgba(22,46,77,0.08),0_8px_12px_rgba(22,46,77,0.16)]">
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
      {(d || note) && <div className="h-px bg-border" />}
      {(d || note) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {d && <ToneBadge tone={d.tone}>{d.text}</ToneBadge>}
          {note && (
            <span className="text-[0.78125rem] text-muted-foreground">
              {note}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Bọc render tooltip: lấy row dữ liệu của phần tử đang hover. */
function tip<T>(render: (row: T) => React.ReactNode) {
  return function Content(p: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: unknown }>;
  }) {
    const row = p.payload?.[0]?.payload;
    return p.active && row ? render(row as T) : null;
  };
}

const cursor = { fill: "var(--neutral-muted)", radius: 8 };

/** Tick tên 1 dòng (recharts tự xuống dòng làm chữ chồng nhau); tên đầy đủ khi hover. */
function nameTick(max: number) {
  return function NameTick(p: unknown) {
    const { x, y, payload } = p as {
      x: number;
      y: number;
      payload: { value: string };
    };
    return (
      <text
        x={x}
        y={y}
        dy="0.35em"
        textAnchor="end"
        className="fill-muted-foreground"
        fontSize="0.78125rem"
      >
        <title>{payload.value}</title>
        {short(payload.value, max)}
      </text>
    );
  };
}

/* ---------- 2. Cầu nối: thay đổi đến từ đâu ---------- */

const additiveOptions: { value: AdditiveMetric; label: string }[] = [
  { value: "expected", label: "Kỳ vọng" },
  { value: "amount", label: "Pipeline" },
  { value: "profit", label: "Lợi nhuận" },
];

type Dim = "categories" | "sellers" | "customers";
const dimOptions: { value: Dim; label: string }[] = [
  { value: "categories", label: "Nhóm hàng" },
  { value: "sellers", label: "Người bán" },
  { value: "customers", label: "Khách hàng" },
];

export function BridgeChart({
  pairs,
  yearA,
  yearB,
}: { pairs: Record<Dim, GroupPair[]> } & Years) {
  const [dim, setDim] = useState<Dim>("categories");
  const [metric, setMetric] = useState<AdditiveMetric>("expected");
  const xsm = useXsm();
  const rows = bridge(pairs[dim], metric, [`Năm ${yearA}`, `Năm ${yearB}`]).map(
    (s) => ({
      ...s,
      label: s.kind === "total" ? formatVnd(s.value) : signed(s.delta),
    }),
  );
  type Row = (typeof rows)[number];
  const color = (k: Row["kind"]) =>
    k === "total" ? COLOR_B : k === "up" ? UP : DOWN;
  const metricLabel = additiveOptions.find((o) => o.value === metric)!.label;
  const dimLabel = dimOptions.find((o) => o.value === dim)!.label.toLowerCase();

  return (
    <Panel
      title="Thay đổi đến từ đâu"
      description={`${metricLabel} năm ${yearA} → năm ${yearB}, tách theo ${dimLabel} (6 thay đổi lớn nhất, phần còn lại gộp “Khác”)`}
    >
      <div className="flex flex-col gap-4 px-6 pt-1 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Seg
            label="Chia theo"
            value={dim}
            onChange={setDim}
            options={dimOptions}
          />
          <Seg
            label="Chỉ số"
            value={metric}
            onChange={setMetric}
            options={additiveOptions}
          />
          <div className="ml-auto xsm:ml-0">
            <Legend
              items={[
                { label: "Tăng", color: UP },
                { label: "Giảm", color: DOWN },
                { label: "Tổng năm", color: COLOR_B },
              ]}
            />
          </div>
        </div>
        {/* 9 cột không vừa màn hình điện thoại → cuộn ngang thay vì nhét chồng nhãn */}
        <p className="hidden text-xs text-muted-foreground xsm:block">
          Vuốt ngang để xem hết biểu đồ →
        </p>
        <div className="xsm:-mx-6 xsm:overflow-x-auto xsm:px-6">
          <ChartContainer
            config={{}}
            className="aspect-auto h-[22rem] w-full text-[0.8125rem] xsm:h-[18rem] xsm:min-w-[44rem]"
          >
            <BarChart
              data={rows}
              margin={{ top: 24, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                interval={0}
                tickFormatter={(v: string) => short(v, xsm ? 10 : 14)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) => (v ? formatVnd(v) : "0")}
              />
              <ChartTooltip
                cursor={cursor}
                content={tip<Row>((r) => (
                  <TipBox
                    title={r.name}
                    rows={[
                      r.kind === "total"
                        ? {
                            label: metricLabel,
                            value: formatVnd(r.value),
                            color: COLOR_B,
                          }
                        : {
                            label: r.kind === "up" ? "Tăng thêm" : "Giảm đi",
                            value: signed(r.delta),
                            color: color(r.kind),
                          },
                    ]}
                    note={
                      r.kind === "total"
                        ? undefined
                        : `Lũy kế sau bước này: ${formatVnd(r.kind === "up" ? r.base + r.value : r.base)}`
                    }
                  />
                ))}
              />
              <Bar
                dataKey="base"
                stackId="w"
                fill="transparent"
                isAnimationActive={false}
              />
              <Bar dataKey="value" stackId="w" radius={4} maxBarSize={24}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={color(r.kind)} />
                ))}
                <LabelList dataKey="label" content={CapLabel} />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- 3. So sánh từng nhóm (nhóm hàng / người bán) ---------- */

const groupOptions: { value: GroupMetric; label: string }[] = [
  ...additiveOptions,
  { value: "winRate", label: "Win rate" },
  { value: "count", label: "Hạng mục" },
];

export function GroupCompareChart({
  title,
  description,
  series,
  labels,
  colors,
  compareEnds = false,
  rowCount = series.length,
}: {
  title: string;
  description: string;
  series: GroupSeries[];
  /** nhãn + màu của từng chuỗi (năm hoặc người), cùng thứ tự với series[].values */
  labels: string[];
  colors: string[];
  /** chuỗi có thứ tự (các năm): tooltip so chuỗi đầu → cuối, chỉ ghi số ở chuỗi cuối */
  compareEnds?: boolean;
  /** số dòng dùng để tính chiều cao — đặt bằng nhau để 2 chart cạnh nhau cao bằng nhau */
  rowCount?: number;
}) {
  const [metric, setMetric] = useState<GroupMetric>("expected");
  const xsm = useXsm();
  const n = labels.length;
  const last = n - 1;
  const kind: Kind =
    metric === "winRate" ? "pct" : metric === "count" ? "count" : "money";
  const show = (v: number) =>
    kind === "money" ? formatVnd(v) : kind === "pct" ? formatPct(v) : String(v);
  const rows = series.map((s) => ({
    name: s.name,
    ...Object.fromEntries(
      labels.map((_, i) => [`y${i}`, metricValue(s.values[i], metric)]),
    ),
    s,
  }));
  type Row = (typeof rows)[number];
  // mỗi năm một thanh mảnh trong dải của nhóm
  const rowHeight = 20 + n * 16;

  return (
    <Panel title={title} description={description}>
      <div className="flex flex-col gap-4 px-6 pt-1 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Seg
            label="Chỉ số"
            value={metric}
            onChange={setMetric}
            options={groupOptions}
          />
          <div className="ml-auto xsm:ml-0">
            <Legend
              items={labels.map((label, i) => ({ label, color: colors[i]! }))}
            />
          </div>
        </div>
        <ChartContainer
          config={{}}
          className="aspect-auto w-full text-[0.8125rem]"
          style={{ height: Math.max(rowCount, rows.length) * rowHeight + 32 }}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: xsm ? 56 : 72, left: 0, bottom: 0 }}
            barGap={2}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v ? show(v) : "0")}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={xsm ? 100 : 150}
              interval={0}
              tick={nameTick(xsm ? 13 : 20)}
            />
            <ChartTooltip
              cursor={cursor}
              content={tip<Row>((r) => {
                const first = metricValue(r.s.values[0], metric);
                const end = metricValue(r.s.values[last], metric);
                return (
                  <TipBox
                    title={r.name}
                    rows={labels.map((label, i) => ({
                      label,
                      value: r.s.values[i]
                        ? show(metricValue(r.s.values[i], metric))
                        : "—",
                      color: colors[i]!,
                    }))}
                    badge={compareEnds ? { a: first, b: end, kind } : undefined}
                    note={
                      !compareEnds
                        ? undefined
                        : !r.s.values[0]
                          ? `Không có ở ${labels[0]!.toLowerCase()}`
                          : !r.s.values[last]
                            ? `Không còn ở ${labels[last]!.toLowerCase()}`
                            : `${labels[0]} → ${labels[last]}`
                    }
                  />
                );
              })}
            />
            {labels.map((label, i) => (
              <Bar
                key={label}
                dataKey={`y${i}`}
                fill={colors[i]}
                radius={[0, 4, 4, 0]}
                maxBarSize={n > 2 ? 12 : 16}
              >
                {/* các năm: chỉ ghi số năm cuối (năm khác xem tooltip); các người: ghi số mọi thanh
                    vì vài màu tương phản thấp với nền nên không được chỉ dựa vào màu + tooltip */}
                {(!compareEnds || i === last) && (
                  <LabelList
                    dataKey={`y${i}`}
                    content={(p: unknown) => {
                      const {
                        x,
                        y: top,
                        width,
                        height,
                        value,
                      } = p as {
                        x: number;
                        y: number;
                        width: number;
                        height: number;
                        value: number;
                      };
                      return value ? (
                        <text
                          x={x + width + 6}
                          y={top + height / 2}
                          dy="0.35em"
                          className="fill-foreground font-medium"
                          fontSize="0.75rem"
                        >
                          {show(value)}
                        </text>
                      ) : null;
                    }}
                  />
                )}
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
      </div>
    </Panel>
  );
}

/* ---------- 4. Cơ cấu rủi ro win rate ---------- */

// phân kỳ: chắc (xanh) ↔ vừa (xám trung tính) ↔ rủi ro (đỏ) — token trong globals.css
const bucketColor: Record<string, string> = {
  high: "var(--chart-win-high)",
  mid: "var(--chart-win-mid)",
  low: "var(--chart-win-low)",
};
// chữ trong khối chọn theo APCA: trắng, trừ khối xám ở theme sáng
const bucketText: Record<string, string> = {
  high: "fill-white",
  mid: "fill-[#0d1c2a] dark:fill-white",
  low: "fill-white",
};

type WinBucket = BudgetOverview["winBuckets"][number];

/** Cơ cấu pipeline theo ngưỡng win rate; mỗi hàng là một năm hoặc một người. */
export function WinMixChart({
  rows: input,
  compareEnds = false,
  description = "Tỷ trọng giá trị pipeline ở từng ngưỡng win rate qua các năm — phần đỏ (< 50%) càng lớn càng rủi ro",
}: {
  rows: { label: string; buckets: WinBucket[] }[];
  /** hàng có thứ tự (các năm): thêm cột thay đổi tỷ trọng hàng đầu → hàng cuối */
  compareEnds?: boolean;
  description?: string;
}) {
  const n = input.length;
  const first = input[0]!;
  const lastRow = input[n - 1]!;
  const share = (buckets: WinBucket[], key: string) => {
    const total = buckets.reduce((s, b) => s + b.amount, 0);
    const amount = buckets.find((b) => b.key === key)?.amount ?? 0;
    return total > 0 ? (amount / total) * 100 : 0;
  };
  // danh sách ngưỡng lấy từ hàng nào có dữ liệu (người chưa có hạng mục thì rỗng)
  const buckets = input.find((r) => r.buckets.length)?.buckets ?? [];
  const rows = input.map((r) => ({
    name: r.label,
    ...Object.fromEntries(buckets.map((b) => [b.key, share(r.buckets, b.key)])),
  }));
  // hàng giữa ẩn khỏi bảng trên mobile cho khỏi chật (chỉ khi so đầu → cuối); vẫn đọc được ở thanh phía trên
  const middle = (i: number) => compareEnds && i > 0 && i < n - 1;

  return (
    <Panel title="Cơ cấu pipeline theo win rate" description={description}>
      <div className="flex flex-col gap-4 px-6 pt-1 pb-6">
        <Legend
          items={buckets.map((b) => ({
            label: b.label,
            color: bucketColor[b.key]!,
          }))}
        />
        <ChartContainer
          config={{}}
          className="aspect-auto w-full text-[0.8125rem]"
          style={{ height: n * 40 + 24 }}
        >
          <BarChart
            data={rows}
            layout="vertical"
            barCategoryGap={12}
            margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis type="number" hide domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={compareEnds ? 80 : 120}
              tick={nameTick(compareEnds ? 12 : 16)}
            />
            {buckets.map((b) => (
              <Bar
                key={b.key}
                dataKey={b.key}
                stackId="m"
                fill={bucketColor[b.key]}
                barSize={28}
                radius={4}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey={b.key}
                  position="insideLeft"
                  offset={10}
                  formatter={(v: unknown) =>
                    Number(v) >= 8 ? formatPct(Number(v), 0) : ""
                  }
                  className={`${bucketText[b.key]} font-medium`}
                  fontSize="0.75rem"
                />
              </Bar>
            ))}
          </BarChart>
        </ChartContainer>
        {/* bảng số luôn hiện thay cho tooltip (tooltip bị khung panel cắt, và không được là cách duy nhất để đọc số) */}
        <div className="overflow-x-auto">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Ngưỡng</th>
                {input.map((r, i) => (
                  <th
                    key={r.label}
                    className={cn(
                      "py-2 pl-3 text-right font-medium whitespace-nowrap",
                      middle(i) && "xsm:hidden",
                    )}
                  >
                    {r.label}
                  </th>
                ))}
                {compareEnds && (
                  <th className="py-2 pl-3 text-right font-medium">
                    <span className="xsm:hidden">
                      Tỷ trọng thay đổi {first.label} → {lastRow.label}
                    </span>
                    <span className="hidden xsm:inline">Thay đổi</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => {
                const d = delta(
                  share(first.buckets, b.key),
                  share(lastRow.buckets, b.key),
                  "pct",
                );
                // nhóm rủi ro tăng là xấu → đảo màu; nhóm giữa không tốt không xấu
                const tone =
                  b.key === "mid" || d.tone === "neutral"
                    ? "neutral"
                    : b.key === "low"
                      ? d.tone === "success"
                        ? "destructive"
                        : "success"
                      : d.tone;
                return (
                  <tr
                    key={b.key}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 whitespace-nowrap text-foreground xsm:text-xs">
                        <span
                          className="size-2.5 rounded-[0.1875rem]"
                          style={{ background: bucketColor[b.key] }}
                        />
                        {b.label.split(" · ")[0]}
                        <span className="xsm:hidden">
                          {" "}
                          · {b.label.split(" · ")[1]}
                        </span>
                      </span>
                    </td>
                    {input.map((r, i) => {
                      const x = r.buckets.find((w) => w.key === b.key);
                      return (
                        <td
                          key={r.label}
                          className={cn(
                            "py-2.5 pl-3 text-right tabular-nums",
                            middle(i) && "xsm:hidden",
                          )}
                        >
                          {x ? (
                            <>
                              <span className="font-medium text-foreground">
                                {formatVnd(x.amount)}
                              </span>
                              <span className="text-muted-foreground xsm:block xsm:text-xs">
                                <span className="xsm:hidden"> · </span>
                                {formatPct(share(r.buckets, b.key), 0)}
                                {n <= 2 && (
                                  <span className="xsm:hidden">
                                    {" "}
                                    · {x.count} hạng mục
                                  </span>
                                )}
                              </span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })}
                    {compareEnds && (
                      <td className="py-2.5 pl-3 text-right">
                        <ToneBadge tone={tone}>{d.text}</ToneBadge>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- 6. Xu hướng: một chỉ số qua các năm ---------- */

const trendOptions = [
  { value: "expected", label: "Kỳ vọng" },
  { value: "plan", label: "Pipeline" },
  { value: "profit", label: "Lợi nhuận" },
  { value: "company", label: "Chỉ tiêu" },
] as const;
type TrendMetric = (typeof trendOptions)[number]["value"];

export function TrendChart({ data }: { data: YearData[] }) {
  const [metric, setMetric] = useState<TrendMetric>("expected");
  const rows = data.map((d) => ({
    name: String(d.year),
    value: d.overview.kpis[metric],
  }));
  type Row = (typeof rows)[number];
  const label = trendOptions.find((o) => o.value === metric)!.label;
  const first = rows[0]!;
  const last = rows[rows.length - 1]!;
  const d = delta(first.value, last.value, "money");

  return (
    <Panel
      title="Xu hướng qua các năm"
      description={`${label} từng năm (tỷ ₫) · ${first.name} → ${last.name}`}
      action={<ToneBadge tone={d.tone}>{d.text}</ToneBadge>}
    >
      <div className="flex flex-col gap-4 px-6 pt-1 pb-6">
        <Seg
          label="Chỉ số"
          value={metric}
          onChange={setMetric}
          options={[...trendOptions]}
        />
        <ChartContainer
          config={{}}
          className="aspect-auto h-[16rem] w-full text-[0.8125rem]"
        >
          <LineChart
            data={rows}
            margin={{ top: 28, right: 40, left: 40, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis hide domain={[0, "auto"]} />
            <ChartTooltip
              cursor={{ stroke: "var(--border)" }}
              content={tip<Row>((r) => (
                <TipBox
                  title={`Năm ${r.name}`}
                  rows={[{ label, value: formatVnd(r.value), color: COLOR_B }]}
                />
              ))}
            />
            <Line
              dataKey="value"
              stroke={COLOR_B}
              strokeWidth={2}
              dot={{
                r: 5,
                fill: COLOR_B,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
              activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive="auto"
              animationDuration={800}
            >
              <LabelList
                dataKey="value"
                position="top"
                offset={12}
                formatter={(v: unknown) =>
                  Number(v) ? formatVnd(Number(v)) : "0"
                }
                className="fill-foreground font-medium"
                fontSize="0.75rem"
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </div>
    </Panel>
  );
}

/* ---------- 5. Khách hàng: giữ lại / mới / mất + biến động lớn nhất ---------- */

export function CustomerFlowPanel({
  pairs,
  yearA,
  yearB,
}: { pairs: GroupPair[] } & Years) {
  const flow = customerFlow(pairs);
  const xsm = useXsm();
  const movers = topMovers(pairs, "expected", 10).map((m) => ({
    ...m,
    label: signed(m.delta),
  }));
  type Row = (typeof movers)[number];
  const tiles = [
    {
      label: "Khách giữ lại",
      count: flow.kept.count,
      value: `${formatVnd(flow.kept.a)} → ${formatVnd(flow.kept.b)}`,
      badge: delta(flow.kept.a, flow.kept.b, "money"),
    },
    {
      label: `Khách mới năm ${yearB}`,
      count: flow.added.count,
      value: `+${formatVnd(flow.added.b)} kỳ vọng`,
      badge: { tone: "success", text: "Mới" } as const,
    },
    {
      label: `Khách không còn ở năm ${yearB}`,
      count: flow.lost.count,
      value: `−${formatVnd(flow.lost.a)} kỳ vọng`,
      badge: { tone: "destructive", text: "Mất" } as const,
    },
  ];
  const max = Math.max(...movers.map((m) => Math.abs(m.delta)), 1);

  return (
    <Panel
      title="Biến động khách hàng"
      description={`Kỳ vọng năm ${yearA} → năm ${yearB}, tính theo từng khách hàng`}
    >
      <div className="flex flex-col gap-5 px-6 pt-1 pb-6">
        <div className="grid grid-cols-3 gap-3 xsm:grid-cols-1">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="flex flex-col gap-1.5 rounded-2xl bg-muted/50 px-4 py-3.5"
            >
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[0.78125rem] font-medium text-muted-foreground">
                  {t.label}
                </p>
                <ToneBadge tone={t.badge.tone}>{t.badge.text}</ToneBadge>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {t.count}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {t.value}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[0.8125rem] font-medium text-foreground">
          10 khách hàng biến động kỳ vọng lớn nhất
        </p>
        {xsm ? (
          // mobile: tên khách cả dòng phía trên, thanh tăng/giảm bên dưới (trục tên recharts quá hẹp ở 375px)
          <ul className="flex flex-col gap-3">
            {movers.map((m, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p className="flex items-center gap-1.5 text-xs text-foreground">
                  <span className="truncate" title={m.name}>
                    {m.name}
                  </span>
                  {m.status && (
                    <ToneBadge
                      tone={m.status === "Mới" ? "success" : "destructive"}
                    >
                      {m.status}
                    </ToneBadge>
                  )}
                </p>
                <div className="grid grid-cols-2 items-center text-[0.6875rem] tabular-nums">
                  <div className="flex items-center justify-end gap-1.5 border-r border-border pr-px">
                    {m.delta < 0 && (
                      <>
                        <span className="text-foreground">{m.label}</span>
                        <span
                          className="h-3 rounded-l-[4px]"
                          style={{
                            width: `${(Math.abs(m.delta) / max) * 60}%`,
                            background: DOWN,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 pl-px">
                    {m.delta > 0 && (
                      <>
                        <span
                          className="h-3 rounded-r-[4px]"
                          style={{
                            width: `${(m.delta / max) * 60}%`,
                            background: UP,
                          }}
                        />
                        <span className="text-foreground">{m.label}</span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ChartContainer
            config={{}}
            className="aspect-auto w-full text-[0.8125rem]"
            style={{ height: movers.length * 36 + 16 }}
          >
            <BarChart
              data={movers}
              layout="vertical"
              margin={{ top: 0, right: xsm ? 8 : 64, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                hide
                domain={xsm ? [-max * 2.4, max * 2.4] : [-max * 1.3, max * 1.3]}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={xsm ? 96 : 250}
                interval={0}
                tick={nameTick(xsm ? 12 : 28)}
              />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip
                cursor={cursor}
                content={tip<Row>((r) => (
                  <TipBox
                    title={r.name}
                    rows={[
                      {
                        label: `Năm ${yearA}`,
                        value: r.status === "Mới" ? "—" : formatVnd(r.a),
                        color: COLOR_A,
                      },
                      {
                        label: `Năm ${yearB}`,
                        value: r.status === "Mất" ? "—" : formatVnd(r.b),
                        color: COLOR_B,
                      },
                    ]}
                    badge={{ a: r.a, b: r.b, kind: "money" }}
                    note={
                      r.status === "Mới"
                        ? "Khách mới"
                        : r.status === "Mất"
                          ? `Không còn ở năm ${yearB}`
                          : undefined
                    }
                  />
                ))}
              />
              <Bar dataKey="delta" radius={4} maxBarSize={20}>
                {movers.map((m, i) => (
                  <Cell key={i} fill={m.delta > 0 ? UP : DOWN} />
                ))}
                <LabelList dataKey="label" content={MoverLabel} />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </Panel>
  );
}

/** Nhãn trên đỉnh cột, 1 dòng (LabelList mặc định xuống dòng theo bề rộng cột mảnh). */
function CapLabel(p: unknown) {
  const { x, y, width, value } = p as {
    x: number;
    y: number;
    width: number;
    value: string;
  };
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      className="fill-foreground font-medium"
      fontSize="0.75rem"
    >
      {value}
    </text>
  );
}

/** Nhãn đặt ở đầu cột: bên phải nếu tăng, bên trái nếu giảm (không đè lên tên khách). */
function MoverLabel(p: unknown) {
  const { x, y, width, height, value } = p as {
    x: number;
    y: number;
    width: number;
    height: number;
    value: string;
  };
  const up = !value.startsWith("−");
  return (
    <text
      x={up ? Math.max(x, x + width) + 6 : Math.min(x, x + width) - 6}
      y={y + height / 2}
      dy="0.35em"
      textAnchor={up ? "start" : "end"}
      className="fill-foreground"
      fontSize="0.75rem"
    >
      {value}
    </text>
  );
}
