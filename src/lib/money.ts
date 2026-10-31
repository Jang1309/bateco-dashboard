/** Format VND compact for BI cards/charts. */
export function formatVnd(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} nghìn tỷ`;
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`;
  }
  return `${sign}${abs.toLocaleString("vi-VN")} ₫`;
}

export function formatVndShort(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000)
    return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(0)}tr`;
  return `${sign}${abs.toLocaleString("vi-VN")}`;
}

/** Tỷ đồng, luôn 1 chữ số thập phân, vd 271,5 */
export function formatTy(n: number) {
  return (n / 1_000_000_000).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Phần trăm kiểu vi-VN: 45,6% */
export function formatPct(n: number, digits = 1) {
  return `${n.toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}
