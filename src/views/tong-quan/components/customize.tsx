"use client";

import type { ReactNode } from "react";
import { EyeOffIcon, RotateCcwIcon, SettingsIcon } from "lucide-react";
import { cn } from "cn";
import type { BudgetOverview } from "@/lib/db/budget";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  CategoryChart,
  OwnerPlanChart,
  SellerChart,
  TopCustomersChart,
  WinRiskChart,
} from "./charts";
import {
  SECTIONS,
  saveDashboardPrefs,
  useDashboardPrefs,
  type SectionId,
} from "./dashboard-prefs";
import { KpiStrip, outlineBtn } from "@/components/dashboard/kpi-strip";
import { OwnersTable } from "./owners-table";

// Switch dùng bg-input (trắng ở theme sáng) khi tắt → rãnh vô hình; tô lại cho thấy rõ
const switchCls =
  "data-unchecked:bg-foreground/15 dark:data-unchecked:bg-foreground/25";

/** Khay ngoài + lõi trắng, cùng ngôn ngữ viền kép với chart card. */
function PrefsGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-1 text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <div className="rounded-2xl bg-foreground/[0.03] p-1 ring-1 ring-foreground/[0.06]">
        <div className="divide-y divide-border/70 overflow-hidden rounded-[calc(1rem-1px)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function PrefsRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors duration-200 ease-fluid hover:bg-muted/50",
        !checked && "bg-muted/25",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[0.8125rem] leading-5 font-medium tracking-tight",
            checked ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <span className="text-[0.75rem] leading-4 text-muted-foreground/80">
          {hint}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={switchCls}
      />
    </label>
  );
}

/** Nút "Tùy chỉnh": bảng bên phải để ẩn/hiện các khối của trang tổng quan. */
export function CustomizeButton() {
  const prefs = useDashboardPrefs();
  const hiddenCount = prefs.hidden.length;

  const toggle = (id: SectionId, visible: boolean) =>
    saveDashboardPrefs({
      ...prefs,
      hidden: visible
        ? prefs.hidden.filter((h) => h !== id)
        : [...prefs.hidden, id],
    });

  return (
    <Sheet>
      <SheetTrigger render={<button type="button" className={outlineBtn} />}>
        <SettingsIcon className="size-4" />
        Tùy chỉnh
        {hiddenCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 text-[0.6875rem] font-semibold text-foreground">
            <EyeOffIcon className="size-3" />
            {hiddenCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="w-[24rem] gap-0 p-0 sm:max-w-[24rem]">
        {/* pr-14: chừa chỗ nút X absolute */}
        <SheetHeader className="gap-1 border-b border-border/60 px-6 pt-6 pr-14 pb-4">
          <SheetTitle className="text-lg tracking-tight">
            Tùy chỉnh trang tổng quan
          </SheetTitle>
          <SheetDescription>
            Chọn khối muốn hiển thị. Lựa chọn được lưu trên trình duyệt này.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          <PrefsGroup label="Các khối">
            {SECTIONS.map((s) => {
              const visible = !prefs.hidden.includes(s.id);
              return (
                <PrefsRow
                  key={s.id}
                  label={s.label}
                  hint={s.hint}
                  checked={visible}
                  onCheckedChange={(v) => toggle(s.id, v)}
                />
              );
            })}
          </PrefsGroup>

          <PrefsGroup label="Hiển thị">
            <PrefsRow
              label="Dòng nhận xét dưới chart"
              hint='Ví dụ "62% pipeline có win rate dưới 50%"'
              checked={prefs.insights}
              onCheckedChange={(v) =>
                saveDashboardPrefs({ ...prefs, insights: v })
              }
            />
          </PrefsGroup>
        </div>

        <SheetFooter className="border-t border-border/60 px-5 py-4">
          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-full"
            onClick={() => saveDashboardPrefs(null)}
          >
            <RotateCcwIcon className="size-4" />
            Khôi phục mặc định
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Các hàng chart: [khối, số cột trên lưới 12]. Hàng chỉ còn 1 khối thì khối đó giãn đủ 12 cột.
const ROWS: [SectionId, 5 | 6 | 7 | 12][][] = [
  [
    ["owners", 7],
    ["winRisk", 5],
  ],
  [
    ["category", 6],
    ["seller", 6],
  ],
  [["customers", 12]],
];
// class tĩnh để Tailwind sinh được
const SPAN = {
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  12: "col-span-12",
} as const;

/** Thân trang tổng quan, hiển thị theo tùy chọn trong bảng Tùy chỉnh. */
export function DashboardSections({ data }: { data: BudgetOverview }) {
  const prefs = useDashboardPrefs();
  const show = (id: SectionId) => !prefs.hidden.includes(id);

  const charts = {
    owners: OwnerPlanChart,
    winRisk: WinRiskChart,
    category: CategoryChart,
    seller: SellerChart,
    customers: TopCustomersChart,
  } as const;

  const items = ROWS.flatMap((row) => {
    const visible = row.filter(([id]) => show(id));
    return visible.map(([id, span]) => {
      const Chart = charts[id as keyof typeof charts];
      return (
        <Chart
          key={id}
          data={data}
          className={cn(
            visible.length === 1 ? SPAN[12] : SPAN[span],
            "xsm:col-span-12",
          )}
        />
      );
    });
  });

  return (
    <div
      className={cn(
        "flex flex-col gap-7",
        !prefs.insights && "[&_[data-slot=insight]]:hidden",
      )}
    >
      {show("kpi") && <KpiStrip data={data} />}

      {items.length > 0 && (
        // lưới 12 cột, các card trong hàng cao bằng nhau
        <div className="grid grid-cols-12 gap-7 [&>section:nth-child(2)]:[animation-delay:80ms] [&>section:nth-child(3)]:[animation-delay:160ms] [&>section:nth-child(4)]:[animation-delay:240ms] [&>section:nth-child(5)]:[animation-delay:320ms]">
          {items}
        </div>
      )}

      {show("table") && (
        <OwnersTable
          owners={data.owners}
          year={data.year}
          avgWinRate={data.kpis.avgWinRate}
        />
      )}

      {prefs.hidden.length === SECTIONS.length && (
        <div className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-foreground/[0.025] px-6 py-16 text-center ring-1 ring-foreground/[0.06]">
          <p className="text-lg font-semibold text-foreground">
            Đã ẩn tất cả các khối
          </p>
          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-full"
            onClick={() => saveDashboardPrefs(null)}
          >
            <RotateCcwIcon className="size-4" />
            Khôi phục mặc định
          </Button>
        </div>
      )}
    </div>
  );
}
