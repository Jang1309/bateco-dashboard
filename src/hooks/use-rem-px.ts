"use client";

import { useSyncExternalStore } from "react";

/* Kích thước viết theo rem; thư viện cần px (recharts, độ rộng cột TanStack) nên quy đổi
   theo cỡ chữ gốc của <html> (co giãn theo độ rộng màn hình), cập nhật khi đổi kích thước cửa sổ. */
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const readRootPx = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** Trả về hàm đổi rem → px theo cỡ chữ gốc hiện tại. */
export function useRemPx() {
  const root = useSyncExternalStore(subscribeResize, readRootPx, () => 16);
  return (rem: number) => rem * root;
}

/** Cỡ chữ gốc (px) — dùng làm dependency khi cần memo theo kích thước. */
export function useRootPx() {
  return useSyncExternalStore(subscribeResize, readRootPx, () => 16);
}
