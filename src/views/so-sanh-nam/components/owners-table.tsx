"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import type { FieldDefinition } from "@querycn/filter-core";
import { viMessages as viFilterMessages } from "@querycn/filter-core/locales/vi";
import { createMemoryAdapter, FilterProvider } from "@querycn/filter-react";
import {
  createDataTableColumnHelper,
  resetPagePatch,
  useDataTable,
} from "@querycn/table-react";
import { viTableMessages } from "@querycn/table-react/locales/vi";
import { cn } from "cn";
import type { BudgetOwner } from "@/lib/db/budget";
import { formatTy } from "@/lib/money";
import { useFillColumnSizes } from "@/hooks/use-fill-column-sizes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { FilterBuilder } from "@/components/filter/filter-builder";
import { FilterChips } from "@/components/filter/filter-chips";
import { Panel, ToneBadge } from "@/components/dashboard/panel";
import { Seg } from "./charts";
import { delta, yearColor } from "../lib/format";

/** Một phụ trách qua các năm; byYear[i] vắng = năm thứ i không có kế hoạch. */
export type OwnerSeries = (BudgetOwner | undefined)[];

type Metric = "expected" | "plan";
const metricLabel: Record<Metric, string> = {
  expected: "Kỳ vọng",
  plan: "Kế hoạch",
};

type Row = {
  id: string;
  employeeId: number;
  name: string;
  initials: string;
  branch: string;
  expected: number[];
  plan: number[];
  /** năm nào có kế hoạch — để hiện "—" thay vì 0 */
  has: boolean[];
};

const money = (n: number, has: boolean) =>
  has ? (n ? `${formatTy(n)} tỷ ₫` : "0") : "—";

const helper = createDataTableColumnHelper<Row>();
// căn trái cho thẳng với tiêu đề cột (tiêu đề DataTable luôn căn trái)
const num = (v: React.ReactNode) => <div className="tabular-nums">{v}</div>;

// trường lọc: expected0, plan2… (tỷ ₫)
const getFilterValue = (r: Row, field: FieldDefinition) => {
  const m = /^(expected|plan)(\d+)$/.exec(field.name);
  if (m) return r[m[1] as Metric][Number(m[2])]! / 1e9;
  return r[field.name as "name" | "branch"];
};

type Props = { owners: OwnerSeries[]; years: number[] };

/** Bộ lọc theo cột bọc quanh bảng — giống bảng phụ trách ở trang tổng quan. */
export function OwnersCompareTable(props: Props) {
  const { owners, years } = props;
  const [adapter] = useState(() => createMemoryAdapter());
  const fields = useMemo<FieldDefinition[]>(
    () => [
      { name: "name", label: "Phụ trách", type: "text" },
      {
        name: "branch",
        label: "Chi nhánh",
        type: "select",
        options: [...new Set(owners.map((o) => o.find(Boolean)!.branch))].map(
          (b) => ({ label: b, value: b }),
        ),
      },
      ...(["expected", "plan"] as const).flatMap((m) =>
        years.map((y, i): FieldDefinition => ({
          name: `${m}${i}`,
          label: `${metricLabel[m]} ${y} (tỷ ₫)`,
          type: "number",
        })),
      ),
    ],
    [owners, years],
  );
  return (
    // áp dụng bộ lọc mới thì quay về trang 1
    <FilterProvider
      fields={fields}
      adapter={adapter}
      messages={viFilterMessages}
      onApply={() => resetPagePatch()}
    >
      <OwnersCompareTableInner {...props} />
    </FilterProvider>
  );
}

function DeltaCell({
  a,
  b,
  hasA,
  hasB,
}: {
  a: number;
  b: number;
  hasA: boolean;
  hasB: boolean;
}) {
  // không có mặt ở cả năm đầu lẫn năm cuối (chỉ có ở năm giữa) → không so được
  if (!hasA && !hasB) return <div className="text-muted-foreground">—</div>;
  const d = delta(hasA ? a : 0, b, "money");
  return (
    <div>
      <ToneBadge tone={d.tone}>{d.text}</ToneBadge>
    </div>
  );
}

function OwnersCompareTableInner({ owners, years }: Props) {
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("expected");
  const n = years.length;
  const last = n - 1;
  // độ rộng gốc (rem) và tỷ trọng nhận phần khung còn thừa; memo theo số năm để hook không tính lại mỗi lần render
  const [base, grow] = useMemo(() => {
    const yearKeys = years.map((_, i) => `y${i}`);
    return [
      {
        name: 11,
        ...Object.fromEntries(yearKeys.map((k) => [k, 8.5])),
        change: 7,
        action: 6.5,
      } as Record<string, number>,
      {
        name: 2,
        ...Object.fromEntries(yearKeys.map((k) => [k, 0.5])),
        change: 0.4,
      } as Record<string, number>,
    ];
  }, [years]);
  const { ref: wrapRef, sizes, root } = useFillColumnSizes(base, grow);

  const data = useMemo<Row[]>(
    () =>
      owners.map((byYear) => {
        const o = [...byYear].reverse().find(Boolean)!;
        return {
          id: o.id,
          employeeId: o.employeeId,
          name: o.name,
          initials: o.initials,
          branch: o.branch,
          expected: byYear.map((x) => x?.expected ?? 0),
          plan: byYear.map((x) => x?.plan ?? 0),
          has: byYear.map(Boolean),
        };
      }),
    [owners],
  );
  // mở trang chi tiết ở năm muộn nhất người đó có kế hoạch
  const detailHref = (r: Row) =>
    `/phu-trach/${r.employeeId}?year=${years[r.has.lastIndexOf(true)]}`;

  // độ rộng cột viết theo rem, đổi ra px cho TanStack
  const columns = useMemo(() => {
    const px = (rem: number) => Math.round(rem * root);
    return [
      // gộp chi nhánh vào để ô tìm kiếm tìm được cả chi nhánh
      helper.accessor((r) => `${r.name} ${r.branch}`, {
        id: "name",
        header: "Phụ trách",
        size: sizes.name,
        meta: {
          defaultPinned: "start",
          fitMaxSize: Math.max(sizes.name!, px(18)),
        },
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex items-center gap-2.5">
              <Avatar>
                <AvatarFallback
                  className={cn(
                    "text-xs font-semibold",
                    row.index % 2
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground",
                  )}
                >
                  {r.initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-foreground">
                  {r.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ID {r.employeeId} · {r.branch}
                </span>
              </span>
            </span>
          );
        },
      }),
      ...years.map((y, i) =>
        helper.accessor((r) => r[metric][i]!, {
          id: `y${i}`,
          header: `${metricLabel[metric]} ${y}`,
          size: sizes[`y${i}`],
          cell: ({ row, getValue }) =>
            num(
              <span
                className={
                  i === last ? "font-semibold" : "text-muted-foreground"
                }
              >
                {money(getValue(), row.original.has[i]!)}
              </span>,
            ),
        }),
      ),
      // sắp xếp theo chênh lệch tiền (badge hiện %), năm đầu → năm cuối
      helper.accessor((r) => r[metric][last]! - r[metric][0]!, {
        id: "change",
        header: "Thay đổi",
        // tiêu đề ngắn cho vừa cột; tên đầy đủ hiện ở menu Cột
        meta: {
          label: `Thay đổi ${metricLabel[metric].toLowerCase()} ${years[0]} → ${years[last]}`,
        },
        size: sizes.change,
        cell: ({ row }) => (
          <DeltaCell
            a={row.original[metric][0]!}
            b={row.original[metric][last]!}
            hasA={row.original.has[0]!}
            hasB={row.original.has[last]!}
          />
        ),
      }),
      helper.display({
        id: "action",
        header: "Chi tiết",
        size: sizes.action,
        enableSorting: false,
        meta: { defaultPinned: "end" },
        cell: ({ row }) => (
          <div>
            <Link
              href={detailHref(row.original)}
              className="inline-flex h-8 items-center gap-1 rounded-full px-3 font-medium whitespace-nowrap text-foreground hover:bg-muted"
            >
              Chi tiết
              <ChevronRightIcon className="size-4" />
            </Link>
          </div>
        ),
      }),
    ];
    // detailHref chỉ phụ thuộc years
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, sizes, years, metric, last]);

  const table = useDataTable({
    data,
    columns,
    getRowId: (r) => r.id,
    getFilterValue,
    // bộ cột đổi theo số năm → mỗi số năm một bố cục lưu riêng
    storageKey: `bateco-owners-compare-table-${n}`,
    layoutVersion: 5,
    searchColumns: ["name"],
    url: {
      defaultSorting: [{ id: `y${last}`, desc: true }],
      defaultPageSize: 10,
      pageSizes: [10, 20, 50],
    },
  });

  const totals = years.map((_, i) =>
    data.reduce((s, r) => s + r[metric][i]!, 0),
  );
  const dTotal = delta(totals[0]!, totals[last]!, "money");

  return (
    <Panel
      title="So sánh theo phụ trách"
      description={`${metricLabel[metric]} của từng phụ trách qua ${n} năm · thay đổi tính ${years[0]} → ${years[last]} · nhấp vào dòng để xem chi tiết`}
    >
      <div className="flex flex-col gap-3 px-6 pb-6">
        <DataTableToolbar table={table} messages={viTableMessages}>
          <DataTableSearch
            table={table}
            messages={viTableMessages}
            placeholder="Tìm phụ trách, chi nhánh…"
            className="h-9 w-72 rounded-full border-border bg-card px-1 shadow-[0_1px_2px_rgba(22,46,77,0.05)] transition-shadow duration-300 ease-fluid focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_15%,transparent)] xsm:w-full"
          />
          <Seg
            label="Chỉ số"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "expected", label: "Kỳ vọng" },
              { value: "plan", label: "Kế hoạch" },
            ]}
          />
          <FilterBuilder className="h-9 rounded-full px-3.5" />
          <FilterChips />
        </DataTableToolbar>
        <div ref={wrapRef}>
          <DataTable
            table={table}
            messages={viTableMessages}
            className="max-h-[36rem] rounded-xl xsm:max-h-none"
            onRowClick={(row) => router.push(detailHref(row.original))}
            rowClassName={() => "cursor-pointer"}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-neutral-muted/60 px-4 py-3 text-[0.8125rem] tabular-nums xsm:flex-col xsm:items-stretch xsm:text-xs">
          <span className="font-semibold text-foreground">
            Tổng {metricLabel[metric].toLowerCase()}
          </span>
          <span className="text-muted-foreground">{data.length} phụ trách</span>
          {years.map((y, i) => (
            <span
              key={y}
              className="flex items-center gap-1.5 xsm:justify-between"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: yearColor(i, n) }}
                />
                {y}
              </span>
              <b className="font-semibold">{money(totals[i]!, true)}</b>
            </span>
          ))}
          <ToneBadge tone={dTotal.tone}>
            {years[0]} → {years[last]}: {dTotal.text}
          </ToneBadge>
        </div>
        <DataTablePagination table={table} messages={viTableMessages} />
      </div>
    </Panel>
  );
}
