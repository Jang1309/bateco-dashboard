"use client";

import type {
  BudgetDetail,
  BudgetOverview,
  PipelineGroup,
} from "@/lib/db/budget";

/** Một cột khi xuất: tiền tính theo tỷ ₫, phần trăm lưu dạng tỉ lệ (0,456 = 45,6%). */
type Col<T> = {
  header: string;
  width: number;
  fmt?: "ty" | "pct" | "int";
  value: (row: T) => string | number;
};
type Sheet<T> = { name: string; cols: Col<T>[]; rows: T[] };

const ty = (n: number) => n / 1e9;
const pct = (n: number) => n / 100;
const FMT = { ty: "#,##0.0", pct: "0.0%", int: "#,##0" } as const;

function groupSheet(
  name: string,
  label: string,
  groups: PipelineGroup[],
  total: number,
): Sheet<PipelineGroup> {
  return {
    name,
    rows: groups,
    cols: [
      { header: label, width: 42, value: (g) => g.name },
      {
        header: "Pipeline (tỷ ₫)",
        width: 16,
        fmt: "ty",
        value: (g) => ty(g.amount),
      },
      {
        header: "Kỳ vọng (tỷ ₫)",
        width: 16,
        fmt: "ty",
        value: (g) => ty(g.expected),
      },
      {
        header: "Win rate",
        width: 12,
        fmt: "pct",
        value: (g) => pct(g.winRate),
      },
      { header: "Số hạng mục", width: 10, fmt: "int", value: (g) => g.count },
      {
        header: "% tổng pipeline",
        width: 16,
        fmt: "pct",
        value: (g) => (total > 0 ? g.amount / total : 0),
      },
    ],
  };
}

type Owner = BudgetOverview["owners"][number];
const ownerSheet = (owners: Owner[]): Sheet<Owner> => ({
  name: "Phụ trách",
  rows: owners,
  cols: [
    { header: "Phụ trách", width: 24, value: (o) => o.name },
    { header: "Mã NV", width: 10, value: (o) => o.employeeId },
    { header: "Chi nhánh", width: 11, value: (o) => o.branch },
    {
      header: "Số kế hoạch",
      width: 12,
      fmt: "int",
      value: (o) => o.budgetCount,
    },
    {
      header: "Kế hoạch (tỷ ₫)",
      width: 16,
      fmt: "ty",
      value: (o) => ty(o.plan),
    },
    {
      header: "Kỳ vọng (tỷ ₫)",
      width: 16,
      fmt: "ty",
      value: (o) => ty(o.expected),
    },
    {
      header: "Chỉ tiêu công ty (tỷ ₫)",
      width: 18,
      fmt: "ty",
      value: (o) => ty(o.company),
    },
    {
      header: "Tỷ lệ kỳ vọng (kỳ vọng ÷ kế hoạch)",
      width: 26,
      fmt: "pct",
      value: (o) => (o.plan > 0 ? o.expected / o.plan : 0),
    },
    { header: "Hạng mục", width: 9, fmt: "int", value: (o) => o.opportunities },
    {
      header: "Win rate",
      width: 11,
      fmt: "pct",
      value: (o) => pct(o.avgWinRate),
    },
  ],
});

const detailSheet = (details: BudgetDetail[]): Sheet<BudgetDetail> => ({
  name: "Hạng mục",
  rows: details,
  cols: [
    { header: "Khách hàng", width: 48, value: (d) => d.customer },
    { header: "Sản phẩm", width: 56, value: (d) => d.product },
    { header: "Nhóm hàng", width: 18, value: (d) => d.category },
    { header: "Người bán", width: 20, value: (d) => d.seller },
    {
      header: "Pipeline (tỷ ₫)",
      width: 16,
      fmt: "ty",
      value: (d) => ty(d.amount),
    },
    { header: "Win rate", width: 11, fmt: "pct", value: (d) => pct(d.winRate) },
    {
      header: "Kỳ vọng (tỷ ₫)",
      width: 16,
      fmt: "ty",
      value: (d) => ty(d.expected),
    },
    {
      header: "Lợi nhuận (tỷ ₫)",
      width: 16,
      fmt: "ty",
      value: (d) => ty(d.profit),
    },
  ],
});

type Kv = { label: string; value: string | number; fmt?: Col<unknown>["fmt"] };
function summarySheet(data: BudgetOverview, title: string): Sheet<Kv> {
  const k = data.kpis;
  const rows: Kv[] = [
    { label: "Báo cáo", value: title },
    { label: "Năm kế hoạch", value: data.year },
    { label: "Ngày xuất", value: new Date().toLocaleString("vi-VN") },
    { label: "Doanh thu kỳ vọng (tỷ ₫)", value: ty(k.expected), fmt: "ty" },
    { label: "Kế hoạch / pipeline (tỷ ₫)", value: ty(k.plan), fmt: "ty" },
    { label: "Còn thiếu so với kế hoạch (tỷ ₫)", value: ty(k.gap), fmt: "ty" },
    {
      label: "Tỷ lệ kỳ vọng (kỳ vọng ÷ kế hoạch)",
      value: k.coveragePct / 100,
      fmt: "pct",
    },
    { label: "Chỉ tiêu công ty (tỷ ₫)", value: ty(k.company), fmt: "ty" },
    { label: "Số hạng mục", value: k.opportunities, fmt: "int" },
    { label: "Hạng mục win rate < 50%", value: k.lowWinCount, fmt: "int" },
    { label: "Số khách hàng", value: k.customers, fmt: "int" },
    {
      label: "Win rate bình quân (theo giá trị)",
      value: pct(k.avgWinRate),
      fmt: "pct",
    },
  ];
  return {
    name: "Tổng quan",
    rows,
    cols: [
      { header: "Chỉ số", width: 36, value: (r) => r.label },
      { header: "Giá trị", width: 26, value: (r) => r.value },
    ],
  };
}

/** Các sheet của báo cáo; trang chi tiết (có `details`) thêm sheet Hạng mục. */
function buildSheets(
  data: BudgetOverview,
  title: string,
  details?: BudgetDetail[],
) {
  const total = data.winBuckets.reduce((s, b) => s + b.amount, 0);
  const buckets: Sheet<BudgetOverview["winBuckets"][number]> = {
    name: "Ngưỡng win rate",
    rows: data.winBuckets,
    cols: [
      { header: "Ngưỡng win rate", width: 20, value: (b) => b.label },
      {
        header: "Pipeline (tỷ ₫)",
        width: 16,
        fmt: "ty",
        value: (b) => ty(b.amount),
      },
      { header: "Số hạng mục", width: 10, fmt: "int", value: (b) => b.count },
      {
        header: "% tổng pipeline",
        width: 16,
        fmt: "pct",
        value: (b) => (total > 0 ? b.amount / total : 0),
      },
    ],
  };
  return [
    summarySheet(data, title),
    ...(details ? [detailSheet(details)] : [ownerSheet(data.owners)]),
    buckets,
    groupSheet("Nhóm hàng", "Nhóm hàng", data.categories, total),
    groupSheet("Người bán", "Người bán", data.sellers, total),
    groupSheet("Top khách hàng", "Khách hàng", data.topCustomers, total),
  ] as Sheet<unknown>[];
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Excel nhiều sheet: tiêu đề in đậm, cố định hàng đầu, có bộ lọc, định dạng số tiền / %. */
export async function exportExcel(
  data: BudgetOverview,
  filename: string,
  title: string,
  details?: BudgetDetail[],
) {
  // tải thư viện khi bấm xuất, không đưa vào bundle trang
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bateco Revenue BI";
  wb.created = new Date();

  for (const sheet of buildSheets(data, title, details)) {
    const ws = wb.addWorksheet(sheet.name, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.columns = sheet.cols.map((c) => ({ header: c.header, width: c.width }));
    for (const row of sheet.rows) {
      const r = ws.addRow(sheet.cols.map((c) => c.value(row)));
      sheet.cols.forEach((c, i) => {
        const fmt = c.fmt ?? (i > 0 ? (row as Kv).fmt : undefined); // sheet Tổng quan: định dạng theo từng dòng
        if (fmt) r.getCell(i + 1).numFmt = FMT[fmt];
      });
    }
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF162E4D" },
    };
    head.alignment = { vertical: "middle" };
    head.height = 22;
    if (sheet.rows.length > 0 && sheet.name !== "Tổng quan") {
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.cols.length },
      };
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  download(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`,
  );
}

/** CSV của bảng chính (phụ trách, hoặc hạng mục ở trang chi tiết). Có BOM để Excel đọc đúng tiếng Việt. */
export function exportCsv(
  data: BudgetOverview,
  filename: string,
  details?: BudgetDetail[],
) {
  const sheet = (
    details ? detailSheet(details) : ownerSheet(data.owners)
  ) as Sheet<unknown>;
  const cell = (v: string | number) => {
    const s = typeof v === "number" ? String(Math.round(v * 10000) / 10000) : v;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // CSV không có định dạng ô: ghi rõ đơn vị ở tiêu đề, % dạng tỉ lệ đổi lại thành số %
  const header = sheet.cols.map((c) =>
    cell(c.fmt === "pct" ? `${c.header} (%)` : c.header),
  );
  const lines = sheet.rows.map((row) =>
    sheet.cols.map((c) => {
      const v = c.value(row);
      return cell(c.fmt === "pct" && typeof v === "number" ? v * 100 : v);
    }),
  );
  const csv = "﻿" + [header, ...lines].map((l) => l.join(",")).join("\r\n");
  download(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `${filename}.csv`,
  );
}

/**
 * In / lưu PDF: dựng trang đúng khổ A4 ngang ngay trên màn hình (class .printing), đợi chart và
 * bảng tính lại kích thước theo cỡ chữ mới (chúng nghe sự kiện resize), rồi mới mở hộp thoại in.
 * In xong (afterprint) trả lại bố cục cũ.
 */
export function printReport() {
  const html = document.documentElement;
  const restore = () => {
    html.classList.remove("printing");
    window.dispatchEvent(new Event("resize"));
    window.removeEventListener("afterprint", restore);
  };
  html.classList.add("printing");
  window.dispatchEvent(new Event("resize"));
  window.addEventListener("afterprint", restore);
  // 2 khung hình cho React render lại + thời gian cho ResizeObserver của chart
  requestAnimationFrame(() =>
    requestAnimationFrame(() => setTimeout(() => window.print(), 300)),
  );
}

/** Tên file an toàn: bỏ dấu, khoảng trắng → gạch nối. */
export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
