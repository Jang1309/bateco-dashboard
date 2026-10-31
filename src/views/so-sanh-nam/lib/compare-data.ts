import type { BudgetOverview, YearBreakdown, YearGroup } from "@/lib/db/budget";

/** Dữ liệu một năm trên trang so sánh. */
export type YearData = {
  year: number;
  overview: BudgetOverview;
  breakdown: YearBreakdown;
};

/** Một nhóm (nhóm hàng / người bán / khách hàng) qua nhiều năm; values[i] vắng = năm thứ i không có. */
export type GroupSeries = {
  key: string;
  name: string;
  values: (YearGroup | undefined)[];
};

/** Một nhóm ghép giữa năm đầu (a) và năm cuối (b) — cho các biểu đồ chỉ so 2 mốc. */
export type GroupPair = {
  key: string;
  name: string;
  a?: YearGroup;
  b?: YearGroup;
};

export type AdditiveMetric = "expected" | "amount" | "profit";
export type GroupMetric = AdditiveMetric | "winRate" | "count";

export const metricValue = (g: YearGroup | undefined, m: GroupMetric) =>
  g?.[m] ?? 0;

/** Ghép theo key qua các năm, sắp theo giá trị lớn nhất của nhóm ở bất kỳ năm nào (nhóm chỉ có ở 1 năm vẫn giữ). */
export function seriesGroups(lists: YearGroup[][]): GroupSeries[] {
  const map = new Map<string, GroupSeries>();
  lists.forEach((list, i) => {
    for (const g of list) {
      const s = map.get(g.key) ?? {
        key: g.key,
        name: g.name,
        values: lists.map(() => undefined),
      };
      s.values[i] = g;
      s.name = g.name; // lấy tên ở năm muộn nhất
      map.set(g.key, s);
    }
  });
  const peak = (s: GroupSeries) =>
    Math.max(...s.values.map((v) => v?.amount ?? 0));
  return [...map.values()].sort((x, y) => peak(y) - peak(x));
}

/** Ghép năm đầu (a) với năm cuối (b). */
export function pairGroups(a: YearGroup[], b: YearGroup[]): GroupPair[] {
  return seriesGroups([a, b]).map(({ key, name, values }) => ({
    key,
    name,
    a: values[0],
    b: values[1],
  }));
}

export type BridgeStep = {
  name: string;
  kind: "total" | "up" | "down";
  /** phần trong suốt bên dưới (điểm bắt đầu của cột) */
  base: number;
  /** chiều cao cột (luôn ≥ 0) */
  value: number;
  /** chênh lệch có dấu (cột tổng = giá trị tổng) */
  delta: number;
};

/**
 * Biểu đồ cầu nối: tổng năm a → các nhóm thay đổi nhiều nhất → "Khác" (gộp phần còn lại) → tổng năm b.
 * Tổng các bước luôn khớp tổng 2 năm vì "Khác" gom đủ phần dư.
 */
export function bridge(
  pairs: GroupPair[],
  metric: AdditiveMetric,
  labels: [string, string],
  top = 6,
): BridgeStep[] {
  const deltas = pairs
    .map((p) => ({
      name: p.name,
      delta: metricValue(p.b, metric) - metricValue(p.a, metric),
    }))
    .filter((d) => d.delta !== 0)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const shown = deltas.slice(0, top);
  const rest = deltas.slice(top).reduce((s, d) => s + d.delta, 0);
  if (rest !== 0)
    shown.push({ name: `Khác (${deltas.length - top})`, delta: rest });

  const totalA = pairs.reduce((s, p) => s + metricValue(p.a, metric), 0);
  const totalB = pairs.reduce((s, p) => s + metricValue(p.b, metric), 0);
  let run = totalA;
  const steps: BridgeStep[] = [
    { name: labels[0], kind: "total", base: 0, value: totalA, delta: totalA },
  ];
  for (const d of shown) {
    const next = run + d.delta;
    steps.push({
      name: d.name,
      kind: d.delta > 0 ? "up" : "down",
      base: Math.min(run, next),
      value: Math.abs(d.delta),
      delta: d.delta,
    });
    run = next;
  }
  steps.push({
    name: labels[1],
    kind: "total",
    base: 0,
    value: totalB,
    delta: totalB,
  });
  return steps;
}

/** Khách mới (chỉ có ở b), mất (chỉ có ở a), giữ lại (cả 2) — tính theo mã khách hàng. */
export function customerFlow(pairs: GroupPair[]) {
  const flow = {
    kept: { count: 0, a: 0, b: 0 },
    added: { count: 0, b: 0 },
    lost: { count: 0, a: 0 },
  };
  for (const p of pairs) {
    if (p.a && p.b) {
      flow.kept.count++;
      flow.kept.a += p.a.expected;
      flow.kept.b += p.b.expected;
    } else if (p.b) {
      flow.added.count++;
      flow.added.b += p.b.expected;
    } else if (p.a) {
      flow.lost.count++;
      flow.lost.a += p.a.expected;
    }
  }
  return flow;
}

/** Các nhóm thay đổi nhiều nhất theo trị tuyệt đối. */
export function topMovers(pairs: GroupPair[], metric: AdditiveMetric, n = 10) {
  return pairs
    .map((p) => ({
      name: p.name,
      status: !p.a ? ("Mới" as const) : !p.b ? ("Mất" as const) : null,
      a: metricValue(p.a, metric),
      b: metricValue(p.b, metric),
      delta: metricValue(p.b, metric) - metricValue(p.a, metric),
    }))
    .filter((r) => r.delta !== 0)
    .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
    .slice(0, n);
}
