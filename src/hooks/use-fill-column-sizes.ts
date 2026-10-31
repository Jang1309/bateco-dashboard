"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRootPx } from "@/hooks/use-rem-px";

/**
 * Độ rộng cột (px) cho DataTable sao cho bảng lấp đầy khung: mỗi cột có độ rộng gốc
 * theo rem (`base`), phần khung còn thừa chia cho các cột theo tỷ trọng `grow`.
 * Khung hẹp hơn tổng độ rộng gốc thì giữ độ rộng gốc (bảng cuộn ngang như thường).
 * Truyền `base`/`grow` là hằng số ngoài component để memo ổn định.
 */
export function useFillColumnSizes<K extends string>(
  base: Readonly<Record<K, number>>,
  grow: Readonly<Partial<Record<K, number>>>,
) {
  const root = useRootPx();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sizes = useMemo(() => {
    const keys = Object.keys(base) as K[];
    const total = keys.reduce((s, k) => s + base[k] * root, 0);
    // trừ viền khung bảng (2px) để không sinh thanh cuộn ngang
    const extra = Math.max(0, width - 2 - total);
    const weight = keys.reduce((s, k) => s + (grow[k] ?? 0), 0) || 1;
    return Object.fromEntries(
      keys.map((k) => [k, Math.floor(base[k] * root + (extra * (grow[k] ?? 0)) / weight)]),
    ) as Record<K, number>;
  }, [base, grow, root, width]);

  return { ref, sizes, root };
}
