"use client";

import { useSyncExternalStore } from "react";

// cùng mốc với variant xsm (tailwind.config: max 639px) — dùng cho prop JS (trục recharts…) không đổi được bằng class
const XSM = "(max-width: 639px)";

export function useXsm() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(XSM);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(XSM).matches,
    () => false,
  );
}
