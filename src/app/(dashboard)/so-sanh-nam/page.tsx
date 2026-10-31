import {
  getAvailableBudgetYears,
  getBudgetOverview,
  getYearBreakdown,
} from "@/lib/db/budget";
import { SoSanhNamView } from "@/views/so-sanh-nam";

// thang màu theo năm chỉ kiểm định tới 5 bậc
const MAX_YEARS = 5;

/**
 * So sánh nhiều năm kế hoạch: ?years=2026,2027,2028 (xếp tăng dần, năm đầu là mốc).
 * Vẫn nhận link cũ ?a=&b=. Thiếu hoặc không đủ 2 năm hợp lệ → các năm gần nhất có dữ liệu.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { years: yearsParam, a, b } = await searchParams;
  const available = await getAvailableBudgetYears();
  const raw =
    typeof yearsParam === "string"
      ? yearsParam.split(",")
      : [a, b].filter((v): v is string => typeof v === "string");
  let years = [...new Set(raw.map(Number))]
    .filter((y) => available.includes(y))
    .sort((x, y) => x - y)
    .slice(-MAX_YEARS);
  if (years.length < 2)
    years = [...available].sort((x, y) => x - y).slice(-MAX_YEARS);

  const data = await Promise.all(
    years.map(async (year) => {
      const [overview, breakdown] = await Promise.all([
        getBudgetOverview(year),
        getYearBreakdown(year),
      ]);
      return { year, overview, breakdown };
    }),
  );
  return <SoSanhNamView data={data} available={available} maxYears={MAX_YEARS} />;
}
