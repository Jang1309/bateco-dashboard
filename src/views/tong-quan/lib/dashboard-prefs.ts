"use client";

import { useSyncExternalStore } from "react";

/** Các khối trên trang tổng quan, theo thứ tự hiển thị. */
export const SECTIONS = [
  {
    id: "kpi",
    label: "Chỉ số chính (KPI)",
    hint: "5 thẻ kỳ vọng, kế hoạch, còn thiếu, chỉ tiêu, hạng mục",
  },
  {
    id: "owners",
    label: "Tỷ lệ kỳ vọng theo phụ trách",
    hint: "Đồng hồ tròn từng người",
  },
  {
    id: "winRisk",
    label: "Pipeline theo ngưỡng win rate",
    hint: "Donut cơ cấu rủi ro",
  },
  {
    id: "category",
    label: "Pipeline & win rate theo nhóm hàng",
    hint: "Cột đứng",
  },
  {
    id: "seller",
    label: "Xếp hạng người bán",
    hint: "Bảng xếp hạng có thước win rate",
  },
  { id: "customers", label: "Top khách hàng", hint: "Thanh ngang" },
  {
    id: "table",
    label: "Bảng kế hoạch theo phụ trách",
    hint: "Tìm kiếm, lọc, sắp xếp",
  },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export type DashboardPrefs = {
  hidden: SectionId[];
  /** Hiện dòng nhận xét dưới mỗi chart */
  insights: boolean;
};

const KEY = "bateco-dashboard-prefs";
const DEFAULT: DashboardPrefs = { hidden: [], insights: true };
const DEFAULT_RAW = JSON.stringify(DEFAULT);
const EVENT = "bateco-dashboard-prefs";

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // đồng bộ giữa các tab
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
// trả chuỗi (so sánh được bằng ===) để useSyncExternalStore không render lặp
const read = () => localStorage.getItem(KEY) ?? DEFAULT_RAW;

function parse(raw: string): DashboardPrefs {
  try {
    const v = JSON.parse(raw) as Partial<DashboardPrefs>;
    return {
      hidden: Array.isArray(v.hidden)
        ? v.hidden.filter((id) => SECTIONS.some((s) => s.id === id))
        : [],
      insights: v.insights !== false,
    };
  } catch {
    return DEFAULT;
  }
}

export function saveDashboardPrefs(next: DashboardPrefs | null) {
  if (next) localStorage.setItem(KEY, JSON.stringify(next));
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Tùy chọn hiển thị trang tổng quan, lưu trong localStorage. Server render dùng mặc định. */
export function useDashboardPrefs() {
  const raw = useSyncExternalStore(subscribe, read, () => DEFAULT_RAW);
  return parse(raw);
}
