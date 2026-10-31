import {
  getAvailableBudgetYears,
  getPeople,
  resolveBudgetYear,
  type PersonKind,
} from "@/lib/db/budget";
import { SoSanhNhanSuView, type Pick } from "@/views/so-sanh-nhan-su";

// bảng màu phân loại chỉ kiểm định 5 màu
const MAX_PEOPLE = 5;

/**
 * So sánh nhân sự trong một năm: ?year=2026&type=owner|seller&p=<ô màu>~<mã người>&p=…
 * Mã người: mã NV với phụ trách, tên với người bán. Thiếu/sai → 3 người pipeline lớn nhất.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { year: yearParam, type, p } = await searchParams;
  const available = await getAvailableBudgetYears();
  // giống trang tổng quan: mặc định năm hiện tại, năm không có dữ liệu → năm mới nhất
  const wanted = resolveBudgetYear(
    typeof yearParam === "string" ? yearParam : null,
  );
  const year = available.includes(wanted) ? wanted : available[0]!;
  const kind: PersonKind = type === "seller" ? "seller" : "owner";
  const people = await getPeople(year, kind);

  const picks: Pick[] = [];
  for (const raw of [p].flat()) {
    if (typeof raw !== "string") continue;
    const at = raw.indexOf("~");
    const slot = Number(raw.slice(0, at));
    const key = raw.slice(at + 1);
    // ô màu hợp lệ, chưa ai dùng; người có trong năm này và chưa được chọn
    if (
      at > 0 &&
      Number.isInteger(slot) &&
      slot >= 0 &&
      slot < MAX_PEOPLE &&
      people.some((x) => x.key === key) &&
      !picks.some((x) => x.slot === slot || x.key === key)
    )
      picks.push({ slot, key });
  }
  if (picks.length < Math.min(2, people.length)) {
    picks.length = 0;
    // mặc định: 3 người pipeline lớn nhất (getPeople đã sắp giảm dần)
    [...people]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .forEach((x, i) => picks.push({ slot: i, key: x.key }));
  }
  picks.sort((a, b) => a.slot - b.slot);

  return (
    <SoSanhNhanSuView
      year={year}
      available={available}
      kind={kind}
      people={people}
      picks={picks}
      maxPeople={MAX_PEOPLE}
    />
  );
}
