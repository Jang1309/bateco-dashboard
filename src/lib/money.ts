/** Format VND compact for BI cards/charts. */
export function formatVnd(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} nghìn tỷ`
  }
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`
  }
  return `${sign}${abs.toLocaleString("vi-VN")} ₫`
}

export function formatVndShort(n: number) {
  const sign = n < 0 ? "-" : ""
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)} tỷ`
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(0)}tr`
  return `${sign}${abs.toLocaleString("vi-VN")}`
}
