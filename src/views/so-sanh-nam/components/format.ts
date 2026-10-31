import { formatPct, formatTy } from "@/lib/money";

export type Kind = "money" | "pct" | "count";

/**
 * Màu theo thứ tự năm: năm đầu nhạt (chart-plan) → năm cuối đậm (chart-1), các năm giữa trộn đều.
 * Thang 1 sắc độ, đã chạy validate_palette --ordinal cho 2–5 bậc ở cả 2 theme.
 */
export const yearColor = (i: number, n: number) =>
  n <= 1 || i >= n - 1
    ? "var(--chart-1)"
    : i <= 0
      ? "var(--chart-plan)"
      : `color-mix(in oklab, var(--chart-plan), var(--chart-1) ${Math.round((i / (n - 1)) * 100)}%)`;

export const fmt = (v: number, kind: Kind) =>
  kind === "money"
    ? `${formatTy(v)} tỷ ₫`
    : kind === "pct"
      ? formatPct(v)
      : v.toLocaleString("vi-VN");

/** Chênh lệch năm sau so với năm gốc: % thay đổi; chỉ số dạng % thì lấy hiệu trực tiếp (62% → 16% = −45,7%). */
export function delta(a: number, b: number, kind: Kind) {
  const diff = b - a;
  const tone = diff > 0 ? "success" : diff < 0 ? "destructive" : "neutral";
  const sign = diff > 0 ? "+" : "";
  if (kind === "pct")
    return { tone, text: `${sign}${formatPct(diff)}` } as const;
  if (a === 0) return { tone, text: b === 0 ? "0%" : "Mới" } as const;
  return {
    tone,
    text: `${sign}${formatPct((diff / Math.abs(a)) * 100)}`,
  } as const;
}

// viết nguyên văn từng biến: bộ biên dịch CSS bỏ biến không thấy được dùng, chuỗi ghép động (`--person-${n}`) không được tính
const PERSON_COLORS = [
  "var(--person-1)",
  "var(--person-2)",
  "var(--person-3)",
  "var(--person-4)",
  "var(--person-5)",
];

/**
 * Màu của ô màu `slot` (0–4) trên trang so sánh nhân sự (token --person-1..5).
 * Mỗi người giữ ô màu từ lúc được chọn → bỏ một người không làm người khác đổi màu.
 */
export const personColor = (slot: number) =>
  PERSON_COLORS[slot % PERSON_COLORS.length]!;
