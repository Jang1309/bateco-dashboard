"use client";

import { useMemo, useState } from "react";
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
import type { BudgetDetail } from "@/lib/db/budget";
import { formatTy } from "@/lib/money";
import { useFillColumnSizes } from "@/hooks/use-fill-column-sizes";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableSearch } from "@/components/data-table/data-table-search";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { FilterBuilder } from "@/components/filter/filter-builder";
import { FilterChips } from "@/components/filter/filter-chips";
import { Panel, RatePill } from "@/components/dashboard/panel";

type Band = "all" | "high" | "mid" | "low";
const bands: { key: Band; label: string; test: (w: number) => boolean }[] = [
  { key: "all", label: "Tất cả", test: () => true },
  { key: "high", label: "≥ 80%", test: (w) => w >= 80 },
  { key: "mid", label: "50 – 80%", test: (w) => w >= 50 && w < 80 },
  { key: "low", label: "< 50%", test: (w) => w < 50 },
];

const ty = (n: number) => (n ? `${formatTy(n)} tỷ` : "—");
const helper = createDataTableColumnHelper<BudgetDetail>();
// căn trái cho thẳng với tiêu đề cột (tiêu đề DataTable luôn căn trái)
const num = (v: React.ReactNode) => <div className="tabular-nums">{v}</div>;

// các trường tiền nhập theo tỷ ₫ cho dễ gõ (dữ liệu gốc tính bằng đồng)
const MONEY_FIELDS = new Set(["amount", "expected", "profit"]);
const getFilterValue = (row: BudgetDetail, field: FieldDefinition) => {
  const v = row[field.name as keyof BudgetDetail];
  return MONEY_FIELDS.has(field.name) ? Number(v) / 1e9 : v;
};
const distinct = (values: string[]) =>
  [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "vi"))
    .map((v) => ({ label: v, value: v }));

/** Bộ lọc theo cột (Nhóm hàng bằng…, Win rate nhỏ hơn…) bọc quanh bảng. */
export function OpportunitiesTable({ details }: { details: BudgetDetail[] }) {
  const [adapter] = useState(() => createMemoryAdapter());
  const fields = useMemo<FieldDefinition[]>(
    () => [
      { name: "customer", label: "Khách hàng", type: "text" },
      { name: "product", label: "Sản phẩm", type: "text" },
      {
        name: "category",
        label: "Nhóm hàng",
        type: "select",
        options: distinct(details.map((d) => d.category)),
      },
      {
        name: "seller",
        label: "Người bán",
        type: "select",
        options: distinct(details.map((d) => d.seller)),
      },
      { name: "amount", label: "Pipeline (tỷ ₫)", type: "number" },
      { name: "winRate", label: "Win rate (%)", type: "number" },
      { name: "expected", label: "Kỳ vọng (tỷ ₫)", type: "number" },
      { name: "profit", label: "Lợi nhuận (tỷ ₫)", type: "number" },
    ],
    [details],
  );
  return (
    // áp dụng bộ lọc mới thì quay về trang 1
    <FilterProvider
      fields={fields}
      adapter={adapter}
      messages={viFilterMessages}
      onApply={() => resetPagePatch()}
    >
      <OpportunitiesTableInner details={details} />
    </FilterProvider>
  );
}

// độ rộng gốc (rem) và tỷ trọng nhận phần khung còn thừa
const BASE = {
  customer: 20,
  category: 8,
  seller: 9,
  amount: 6.5,
  winRate: 6.5,
  expected: 6.5,
  profit: 6.5,
};
const GROW = {
  customer: 3,
  category: 1,
  seller: 1,
  amount: 0.4,
  winRate: 0.4,
  expected: 0.4,
  profit: 0.4,
};

function OpportunitiesTableInner({ details }: { details: BudgetDetail[] }) {
  const [band, setBand] = useState<Band>("all");
  const { ref: wrapRef, sizes, root } = useFillColumnSizes(BASE, GROW);

  // lọc nhanh theo ngưỡng trước khi đưa vào bảng (tìm kiếm, sắp xếp, phân trang do DataTable lo)
  const data = useMemo(() => {
    const test = bands.find((b) => b.key === band)!.test;
    return details.filter((d) => test(d.winRate));
  }, [details, band]);

  // độ rộng cột viết theo rem, đổi ra px cho TanStack
  const columns = useMemo(() => {
    const px = (rem: number) => Math.round(rem * root);
    return [
      // gộp khách hàng + sản phẩm để ô tìm kiếm tìm được cả mô tả sản phẩm
      helper.accessor((d) => `${d.customer} ${d.product}`, {
        id: "customer",
        header: "Khách hàng · sản phẩm",
        size: sizes.customer,
        // "Vừa nội dung" nới tối đa tới đây (tên dài hơn vẫn rút gọn "…"); kéo tay thì không giới hạn
        meta: {
          defaultPinned: "start",
          fitMaxSize: Math.max(sizes.customer, px(26)),
        },
        cell: ({ row }) => (
          <div className="min-w-0">
            <p
              className="truncate font-medium text-foreground"
              title={row.original.customer}
            >
              {row.original.customer || "(Không tên)"}
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={row.original.product}
            >
              {row.original.product || "—"}
            </p>
          </div>
        ),
      }),
      helper.accessor("category", {
        header: "Nhóm hàng",
        size: sizes.category,
        meta: { fitMaxSize: Math.max(sizes.category, px(12)) },
        cell: ({ getValue }) => getValue() || "—",
      }),
      helper.accessor("seller", {
        header: "Người bán",
        size: sizes.seller,
        meta: { fitMaxSize: Math.max(sizes.seller, px(13)) },
        cell: ({ getValue }) => getValue() || "—",
      }),
      helper.accessor("amount", {
        header: "Pipeline",
        size: sizes.amount,
        cell: ({ getValue }) =>
          num(<span className="font-semibold">{ty(getValue())}</span>),
      }),
      helper.accessor("winRate", {
        header: "Win rate",
        size: sizes.winRate,
        cell: ({ getValue }) => num(<RatePill value={getValue()} />),
      }),
      helper.accessor("expected", {
        header: "Kỳ vọng",
        size: sizes.expected,
        cell: ({ getValue }) => num(ty(getValue())),
      }),
      helper.accessor("profit", {
        header: "Lợi nhuận",
        size: sizes.profit,
        cell: ({ getValue }) =>
          num(<span className="text-muted-foreground">{ty(getValue())}</span>),
      }),
    ];
  }, [root, sizes]);

  const table = useDataTable({
    data,
    columns,
    getRowId: (d) => String(d.id),
    getFilterValue,
    storageKey: "bateco-opportunities-table",
    // tăng khi đổi bộ cột: bỏ bố cục cũ đã lưu trong localStorage
    layoutVersion: 3,
    searchColumns: ["customer", "category", "seller"],
    url: {
      defaultSorting: [{ id: "amount", desc: true }],
      defaultPageSize: 10,
      pageSizes: [10, 20, 50],
    },
  });

  return (
    <Panel
      title="Danh sách hạng mục"
      description={`${details.length} hạng mục · khách hàng, nhóm hàng, người bán và khả năng thắng`}
    >
      <div className="flex flex-col gap-3 px-6 pb-6">
        <DataTableToolbar table={table} messages={viTableMessages}>
          <DataTableSearch
            table={table}
            messages={viTableMessages}
            placeholder="Tìm khách hàng, sản phẩm…"
            className="h-9 w-72 rounded-full border-border bg-card px-1 shadow-[0_1px_2px_rgba(22,46,77,0.05)] transition-shadow duration-300 ease-fluid focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_15%,transparent)] xsm:w-full"
          />
          <FilterBuilder className="h-9 rounded-full px-3.5" />
          <div
            className="flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Lọc theo win rate"
          >
            {bands.map((b) => (
              <button
                key={b.key}
                type="button"
                role="tab"
                aria-selected={band === b.key}
                onClick={() => setBand(b.key)}
                className={cn(
                  "h-8 cursor-pointer rounded-full px-3 text-[0.8125rem] font-medium ring-1 transition-colors duration-300 ease-fluid",
                  band === b.key
                    ? "bg-secondary text-secondary-foreground ring-secondary"
                    : "bg-card text-muted-foreground ring-foreground/[0.08] hover:text-foreground",
                )}
              >
                {b.label}{" "}
                <span className="opacity-60">
                  · {details.filter((d) => b.test(d.winRate)).length}
                </span>
              </button>
            ))}
          </div>
          <FilterChips />
        </DataTableToolbar>
        <div ref={wrapRef}>
          <DataTable
            table={table}
            messages={viTableMessages}
            className="max-h-[40rem] rounded-xl xsm:max-h-none"
          />
        </div>
        <DataTablePagination table={table} messages={viTableMessages} />
      </div>
    </Panel>
  );
}
