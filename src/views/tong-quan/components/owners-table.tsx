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
import { formatPct, formatTy } from "@/lib/money";
import { useFillColumnSizes } from "@/hooks/use-fill-column-sizes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { FilterBuilder } from "@/components/filter/filter-builder";
import { FilterChips } from "@/components/filter/filter-chips";
import { Panel } from "@/components/dashboard/panel";

// % đạt = kỳ vọng ÷ mốc (chỉ tiêu Cty nếu đã giao, không thì kế hoạch)
const baseOf = (o: BudgetOwner) => (o.company > 0 ? o.company : o.plan);
const achieved = (o: BudgetOwner) => {
  const base = baseOf(o);
  return base > 0 ? (o.expected / base) * 100 : 0;
};
const money = (n: number) => (n ? `${formatTy(n)} tỷ ₫` : "—");

function WinBadge({ value }: { value: number }) {
  const tone =
    value >= 80
      ? "bg-success-muted text-success"
      : value >= 50
        ? "bg-muted text-foreground"
        : "bg-destructive-muted text-destructive";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        tone,
      )}
    >
      {formatPct(value, value % 1 ? 1 : 0)}
    </span>
  );
}

function Achieved({ value, thin }: { value: number; thin?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          "w-[4.5rem] overflow-hidden rounded-full bg-muted",
          thin ? "h-1.5" : "h-2",
        )}
      >
        <span
          className={cn(
            "block h-full rounded-full",
            value < 50 ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </span>
      <span className="font-semibold tabular-nums">
        {formatPct(value, value % 1 ? 1 : 0)}
      </span>
    </span>
  );
}

const helper = createDataTableColumnHelper<BudgetOwner>();
// căn trái cho thẳng với tiêu đề cột (tiêu đề DataTable luôn căn trái)
const num = (v: React.ReactNode) => <div className="tabular-nums">{v}</div>;

// trường tiền nhập theo tỷ ₫; "% Đạt" là giá trị tính, không phải cột dữ liệu
const MONEY_FIELDS = new Set(["plan", "expected", "company"]);
const getFilterValue = (o: BudgetOwner, field: FieldDefinition) => {
  if (field.name === "achieved") return achieved(o);
  const v = o[field.name as keyof BudgetOwner];
  return MONEY_FIELDS.has(field.name) ? Number(v) / 1e9 : v;
};

type OwnersTableProps = {
  owners: BudgetOwner[];
  year: number;
  avgWinRate: number;
};

/** Bộ lọc theo cột (Chi nhánh bằng…, Kế hoạch lớn hơn…) bọc quanh bảng. */
export function OwnersTable(props: OwnersTableProps) {
  const [adapter] = useState(() => createMemoryAdapter());
  const fields = useMemo<FieldDefinition[]>(
    () => [
      { name: "name", label: "Phụ trách", type: "text" },
      {
        name: "branch",
        label: "Chi nhánh",
        type: "select",
        options: [...new Set(props.owners.map((o) => o.branch))].map((b) => ({
          label: b,
          value: b,
        })),
      },
      { name: "plan", label: "Kế hoạch (tỷ ₫)", type: "number" },
      { name: "expected", label: "Kỳ vọng (tỷ ₫)", type: "number" },
      { name: "company", label: "Chỉ tiêu công ty (tỷ ₫)", type: "number" },
      { name: "achieved", label: "% Đạt", type: "number" },
      { name: "opportunities", label: "Hạng mục", type: "number" },
      { name: "avgWinRate", label: "Win rate (%)", type: "number" },
    ],
    [props.owners],
  );
  return (
    // áp dụng bộ lọc mới thì quay về trang 1
    <FilterProvider
      fields={fields}
      adapter={adapter}
      messages={viFilterMessages}
      onApply={() => resetPagePatch()}
    >
      <OwnersTableInner {...props} />
    </FilterProvider>
  );
}

// độ rộng gốc (rem) và tỷ trọng nhận phần khung còn thừa
const BASE = {
  name: 11,
  branch: 6.75,
  plan: 6.5,
  expected: 6.5,
  company: 7.75,
  achieved: 7.5,
  opportunities: 5,
  avgWinRate: 6.5,
  action: 7,
};
const GROW = {
  name: 2,
  branch: 0.5,
  plan: 0.5,
  expected: 0.5,
  company: 0.5,
  achieved: 1,
  opportunities: 0.3,
  avgWinRate: 0.4,
};

function OwnersTableInner({ owners, year, avgWinRate }: OwnersTableProps) {
  const router = useRouter();
  const { ref: wrapRef, sizes, root } = useFillColumnSizes(BASE, GROW);
  const detailHref = (o: BudgetOwner) =>
    `/phu-trach/${o.employeeId}?year=${year}`;

  // độ rộng cột viết theo rem, đổi ra px cho TanStack
  const columns = useMemo(() => {
    const px = (rem: number) => Math.round(rem * root);
    return [
      helper.accessor("name", {
        header: "Phụ trách",
        size: sizes.name,
        meta: {
          defaultPinned: "start",
          fitMaxSize: Math.max(sizes.name, px(18)),
        },
        cell: ({ row }) => {
          const o = row.original;
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
                  {o.initials}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-foreground">
                  {o.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  ID {o.employeeId}
                </span>
              </span>
            </span>
          );
        },
      }),
      helper.accessor("branch", {
        header: "Chi nhánh",
        size: sizes.branch,
        cell: ({ getValue }) => (
          <span className="rounded-full bg-neutral-muted px-2 py-0.5 text-xs font-medium">
            {getValue()}
          </span>
        ),
      }),
      helper.accessor("plan", {
        header: "Kế hoạch",
        size: sizes.plan,
        cell: ({ getValue }) => num(money(getValue())),
      }),
      helper.accessor("expected", {
        header: "Kỳ vọng",
        size: sizes.expected,
        cell: ({ getValue }) =>
          num(<span className="font-semibold">{money(getValue())}</span>),
      }),
      helper.accessor("company", {
        header: "Chỉ tiêu công ty",
        size: sizes.company,
        cell: ({ getValue }) => num(money(getValue())),
      }),
      helper.accessor((o) => achieved(o), {
        id: "achieved",
        header: "% Đạt",
        size: sizes.achieved,
        cell: ({ getValue }) => <Achieved value={getValue()} />,
      }),
      helper.accessor("opportunities", {
        header: "Hạng mục",
        size: sizes.opportunities,
        cell: ({ getValue }) => num(getValue()),
      }),
      helper.accessor("avgWinRate", {
        header: "Win rate",
        size: sizes.avgWinRate,
        cell: ({ row, getValue }) =>
          num(
            row.original.opportunities > 0 ? (
              <WinBadge value={getValue()} />
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
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
    // detailHref chỉ phụ thuộc year
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, sizes, year]);

  const table = useDataTable({
    data: owners,
    columns,
    getRowId: (o) => o.id,
    getFilterValue,
    storageKey: "bateco-owners-table",
    layoutVersion: 3,
    searchColumns: ["name", "branch"],
    url: {
      defaultSorting: [{ id: "plan", desc: true }],
      defaultPageSize: 10,
      pageSizes: [10, 20, 50],
    },
  });

  const total = owners.reduce(
    (s, o) => ({
      plan: s.plan + o.plan,
      expected: s.expected + o.expected,
      company: s.company + o.company,
      base: s.base + baseOf(o),
      opportunities: s.opportunities + o.opportunities,
    }),
    { plan: 0, expected: 0, company: 0, base: 0, opportunities: 0 },
  );
  const branches = new Set(owners.map((o) => o.branch)).size;

  return (
    <Panel
      title="Kế hoạch theo người phụ trách"
      description="Nhấp vào dòng để xem chi tiết"
    >
      <div className="flex flex-col gap-3 px-6 pb-6">
        <DataTableToolbar table={table} messages={viTableMessages}>
          <DataTableSearch
            table={table}
            messages={viTableMessages}
            placeholder="Tìm phụ trách, chi nhánh…"
            className="h-9 w-72 rounded-full border-border bg-card px-1 shadow-[0_1px_2px_rgba(22,46,77,0.05)] transition-shadow duration-300 ease-fluid focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_15%,transparent)] xsm:w-full"
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
        {/* dòng tổng: Σ kỳ vọng ÷ Σ mốc, cùng định nghĩa % đạt với từng dòng */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-neutral-muted/60 px-4 py-3 text-[0.8125rem] tabular-nums">
          <span className="font-semibold text-foreground">
            Tổng cộng (năm {year})
          </span>
          <span className="text-muted-foreground">{branches} chi nhánh</span>
          <span>
            Kế hoạch <b className="font-semibold">{money(total.plan)}</b>
          </span>
          <span>
            Kỳ vọng <b className="font-semibold">{money(total.expected)}</b>
          </span>
          <span>
            Chỉ tiêu <b className="font-semibold">{money(total.company)}</b>
          </span>
          <Achieved
            value={total.base > 0 ? (total.expected / total.base) * 100 : 0}
            thin
          />
          <span>
            Hạng mục <b className="font-semibold">{total.opportunities}</b>
          </span>
          <span>
            Win rate <b className="font-semibold">{formatPct(avgWinRate)}</b>
          </span>
        </div>
        <DataTablePagination table={table} messages={viTableMessages} />
      </div>
    </Panel>
  );
}
