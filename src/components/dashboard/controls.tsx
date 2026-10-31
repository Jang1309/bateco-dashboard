"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  PrinterIcon,
} from "lucide-react";
import type { BudgetDetail, BudgetOverview } from "@/lib/db/budget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportCsv, exportExcel, printReport, slugify } from "./export";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

export function YearSelect({
  year,
  years,
  label = "Năm",
  hrefPrefix,
}: {
  year: number;
  years: number[];
  label?: string;
  /** URL trước số năm, mặc định `${pathname}?year=` */
  hrefPrefix?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // đang tải dữ liệu năm mới (trang server render lại) → hiện vòng xoay thay icon lịch
  const [pending, startTransition] = useTransition();
  const thisYear = new Date().getFullYear();

  return (
    <Select
      value={String(year)}
      onValueChange={(v) => {
        if (v && v !== String(year))
          startTransition(() =>
            router.push(`${hrefPrefix ?? `${pathname}?year=`}${v}`),
          );
      }}
    >
      <SelectTrigger
        aria-label={`Chọn ${label.toLowerCase()}`}
        className="h-10 gap-2 rounded-full border-border/70 bg-card pr-3 pl-4 text-[0.8125rem] font-medium shadow-[0_1px_2px_rgba(22,46,77,0.05)] transition-[background-color,box-shadow] duration-300 ease-fluid hover:bg-muted/60 focus-visible:border-border focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_15%,transparent)] data-[size=default]:h-10 data-popup-open:bg-muted/60 [&>svg:last-child]:text-foreground [&>svg:last-child]:transition-transform [&>svg:last-child]:duration-300 data-popup-open:[&>svg:last-child]:rotate-180"
      >
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <CalendarIcon className="size-4" />
        )}
        <SelectValue>{(v: string) => `${label}: ${v}`}</SelectValue>
      </SelectTrigger>
      <SelectContent
        align="end"
        alignItemWithTrigger={false}
        className="min-w-48 rounded-2xl p-1.5 shadow-[0_16px_40px_-12px_rgba(22,46,77,0.25)]"
      >
        <SelectGroup className="p-0">
          <SelectLabel className="px-2.5 pt-1 pb-1.5 text-[0.6875rem] font-medium tracking-wide uppercase">
            Kế hoạch năm
          </SelectLabel>
          {years.map((y) => (
            <SelectItem
              key={y}
              value={String(y)}
              className="rounded-xl py-2 pl-2.5 text-[0.8125rem] font-medium data-selected:bg-muted/60"
            >
              Năm {y}
              {y === thisYear && (
                <span className="rounded-full bg-primary/12 px-1.5 py-0.5 text-[0.6875rem] font-medium text-primary">
                  năm nay
                </span>
              )}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

type ExportProps = {
  data: BudgetOverview;
  /** Trang chi tiết: danh sách hạng mục của người đó (sheet / CSV "Hạng mục") */
  details?: BudgetDetail[];
  /** Tên trong tên file và tiêu đề báo cáo; bỏ trống = toàn công ty */
  ownerName?: string;
};

export function ExportButton({ data, details, ownerName }: ExportProps) {
  const [busy, setBusy] = useState(false);
  const title = ownerName
    ? `Kế hoạch ${data.year} — ${ownerName}`
    : `Tổng quan kế hoạch ${data.year}`;
  const filename = `bateco-ke-hoach-${data.year}${ownerName ? `-${slugify(ownerName)}` : ""}`;

  const excel = async () => {
    setBusy(true);
    try {
      await exportExcel(data, filename, title, details);
    } catch (e) {
      console.error(e);
      alert("Không xuất được file Excel. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const items = [
    {
      icon: FileSpreadsheetIcon,
      label: "Excel (.xlsx)",
      hint: details
        ? "Tổng quan, danh sách hạng mục và các bảng tổng hợp"
        : "Tổng quan, phụ trách và các bảng tổng hợp",
      run: excel,
    },
    {
      icon: FileTextIcon,
      label: "CSV (.csv)",
      hint: details ? "Danh sách hạng mục" : "Bảng kế hoạch theo phụ trách",
      run: () => exportCsv(data, filename, details),
    },
    {
      icon: PrinterIcon,
      label: "PDF / In",
      hint: "Cả trang kèm biểu đồ — chọn “Lưu dưới dạng PDF”",
      run: printReport,
    },
  ];

  return (
    <DropdownMenu>
      {/* nút chính dạng viên thuốc, icon nằm trong vòng tròn riêng sát mép phải */}
      <DropdownMenuTrigger
        render={
          <Button className="group h-10 gap-2.5 rounded-full py-1 pr-1 pl-5 text-[0.8125rem] font-medium shadow-[0_8px_20px_-8px_rgba(56,165,224,0.6)] transition-transform duration-300 ease-fluid active:scale-[0.98]" />
        }
        disabled={busy}
      >
        {busy ? "Đang xuất…" : "Xuất báo cáo"}
        <span className="flex size-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 ease-fluid group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:scale-105">
          {busy ? (
            <Spinner className="size-4" />
          ) : (
            <DownloadIcon className="size-4" />
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[19rem] rounded-2xl p-1.5 shadow-[0_16px_40px_-12px_rgba(22,46,77,0.25)]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 pt-1 pb-1.5 text-[0.6875rem] font-medium tracking-wide uppercase">
            Xuất{" "}
            {ownerName
              ? `báo cáo của ${ownerName}`
              : `báo cáo năm ${data.year}`}
          </DropdownMenuLabel>
          {items.map((it) => (
            <DropdownMenuItem
              key={it.label}
              onClick={it.run}
              className="items-start gap-3 rounded-xl px-2.5 py-2"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <it.icon className="size-4" />
              </span>
              <span className="flex flex-col">
                <span className="text-[0.8125rem] font-medium text-foreground">
                  {it.label}
                </span>
                <span className="text-xs text-muted-foreground">{it.hint}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
