import { cn } from "cn";
import { Panel } from "@/components/dashboard/panel";

type Term = {
  term: string;
  meaning: string;
  /** ví dụ bằng số liệu thật trên dashboard (tại 31/10/2026) */
  example: string;
  formula?: string;
};
type Section = {
  id: string;
  title: string;
  description: string;
  terms: Term[];
};

// giữ khớp với cách tính trong src/lib/db/budget.ts và src/views/so-sanh-nam/lib/format.ts; chỉ ghi công thức bằng lời, không ghi tên cột DB
const SECTIONS: Section[] = [
  {
    id: "du-lieu",
    title: "Dữ liệu gốc",
    description:
      "Mỗi phụ trách lập một kế hoạch cho mỗi năm; mỗi kế hoạch gồm nhiều hạng mục — mỗi hạng mục là một việc bán cụ thể cho một khách.",
    terms: [
      {
        term: "Kế hoạch",
        meaning: "Bản kế hoạch doanh thu của một phụ trách trong một năm.",
        example:
          "Năm 2026 có 3 kế hoạch, của Tăng Bá Khoa, Đàm Kiên và Chu Thị Thủy.",
      },
      {
        term: "Hạng mục",
        meaning:
          "Một việc cụ thể trong kế hoạch: bán gì, cho khách nào, trị giá bao nhiêu, khả năng chốt bao nhiêu %. Có thể là một dự án (mã DA…) hoặc hàng cung cấp định kỳ (ví dụ BK201 Quý II). Mỗi kế hoạch là danh sách nhiều hạng mục, như các dòng trong một bảng Excel. Hạng mục trị giá 0 bị bỏ qua.",
        example:
          "Kế hoạch 2026 của Tăng Bá Khoa có hạng mục: Trung tu hệ nước · Nhiệt điện Quảng Ninh · Dịch vụ · 4,18 tỷ · win rate 30%. Cả năm 2026 có 84 hạng mục.",
      },
      {
        term: "Phụ trách",
        meaning: "Người sở hữu bản kế hoạch, chịu trách nhiệm con số cả năm.",
        example: "Tăng Bá Khoa phụ trách kế hoạch 415,2 tỷ năm 2026.",
      },
      {
        term: "Người bán",
        meaning:
          "Người trực tiếp theo từng hạng mục. Một kế hoạch có thể có nhiều người bán, nên danh sách người bán khác danh sách phụ trách.",
        example:
          "Hạng mục hóa chất chống kết khối cho Đạm Cà Mau nằm trong kế hoạch của Đàm Kiên nhưng do Lê Huỳnh Em bán. Năm 2026 có 3 phụ trách nhưng 8 người bán.",
      },
      {
        term: "Khách hàng",
        meaning:
          "Khách của hạng mục. Trang So sánh nhận diện khách theo mã khách, nên hai khách trùng tên vẫn tính riêng.",
        example:
          "Nhiệt điện Quảng Ninh; năm 2026 có 42 khách hàng có hạng mục.",
      },
      {
        term: "Nhóm hàng",
        meaning:
          "Loại sản phẩm của hạng mục. Hạng mục chưa ghi nhóm nằm trong “Khác”.",
        example:
          "Vật tư Thiết bị, Dịch vụ, Hóa chất Nalco… Năm 2026 Vật tư Thiết bị lớn nhất với 368,0 tỷ pipeline.",
      },
      {
        term: "Chi nhánh",
        meaning: "Mã chi nhánh của kế hoạch.",
        example: "Cả 3 kế hoạch năm 2026 đều thuộc chi nhánh A01.",
      },
      {
        term: "Năm kế hoạch",
        meaning:
          "Năm của ngày kế hoạch, không phải năm nhập liệu hay năm ghi trong mã sản phẩm.",
        example:
          "Hạng mục “2027-Đạm Cà Mau-Hóa chất chống kết khối” vẫn thuộc năm 2026, vì kế hoạch chứa nó có ngày trong năm 2026.",
      },
    ],
  },
  {
    id: "tien",
    title: "Các con số tiền",
    description:
      "Pipeline là tổng giá trị nếu thắng hết; kỳ vọng là phần dự kiến thật sự thu về, nên kỳ vọng luôn ≤ pipeline. Đơn vị: tỷ ₫ (1 tỷ = 1.000.000.000 đồng).",
    terms: [
      {
        term: "Pipeline / Kế hoạch",
        meaning:
          "Tổng giá trị các hạng mục đang theo, chưa tính khả năng thắng. “Kế hoạch (pipeline)” trên dashboard là một con số.",
        example:
          "Pipeline năm 2026 của cả công ty là 594,8 tỷ (84 hạng mục cộng lại).",
        formula: "Σ giá trị các hạng mục",
      },
      {
        term: "Kỳ vọng",
        meaning: "Doanh thu dự kiến thu được, sau khi nhân với win rate.",
        example:
          "Hạng mục Nhiệt điện Quảng Ninh 4,18 tỷ × 30% = kỳ vọng 1,25 tỷ. Cộng cả năm 2026 được 271,5 tỷ.",
        formula: "Σ (giá trị × win rate từng hạng mục)",
      },
      {
        term: "Pipeline còn lại",
        meaning:
          "Phần pipeline chưa được tính vào kỳ vọng — phần nhạt trên các biểu đồ cột.",
        example: "Tăng Bá Khoa: 415,2 − 165,5 = 249,7 tỷ.",
        formula: "pipeline − kỳ vọng",
      },
      {
        term: "Còn thiếu / Vượt kế hoạch",
        meaning:
          "Khoảng cách từ kỳ vọng lên đến đủ kế hoạch. Âm thì hiện “Vượt kế hoạch”.",
        example: "Năm 2026: 594,8 − 271,5 = còn thiếu 323,3 tỷ.",
        formula: "kế hoạch − kỳ vọng",
      },
      {
        term: "Chỉ tiêu công ty",
        meaning:
          "Mục tiêu công ty giao cho phụ trách, khác với kế hoạch phụ trách tự lập. Bằng 0 nghĩa là chưa giao, không phải chỉ tiêu bằng 0.",
        example:
          "Năm 2026 mới giao 12,0 tỷ cho Chu Thị Thủy; Tăng Bá Khoa và Đàm Kiên chưa được giao.",
        formula: "do công ty giao",
      },
      {
        term: "Lợi nhuận",
        meaning: "Lợi nhuận dự kiến của các hạng mục.",
        example: "Lợi nhuận dự kiến năm 2026 là 45,1 tỷ.",
        formula: "Σ lợi nhuận từng hạng mục",
      },
    ],
  },
  {
    id: "ty-le",
    title: "Các tỷ lệ",
    description:
      "Win rate gộp của một nhóm tính theo giá trị, không phải trung bình cộng: một hạng mục 100 tỷ nặng hơn mười hạng mục 1 tỷ.",
    terms: [
      {
        term: "Win rate (một hạng mục)",
        meaning: "Khả năng thắng hạng mục đó, do người bán ước lượng.",
        example: "Hạng mục Nhiệt điện Quảng Ninh có win rate 30%.",
        formula: "do người bán nhập",
      },
      {
        term: "Win rate (nhóm) / Win rate bình quân",
        meaning:
          "Khả năng thắng chung của cả nhóm, người hoặc công ty, tính theo giá trị.",
        example:
          "Vật tư Thiết bị năm 2026: kỳ vọng 138,7 ÷ pipeline 368,0 = 37,7%.",
        formula: "Σ kỳ vọng ÷ Σ pipeline",
      },
      {
        term: "Tỷ lệ kỳ vọng",
        meaning:
          "Kế hoạch đã chắc được bao nhiêu phần. Mục tiêu 80%, dưới 50% là cần chú ý. Vì kế hoạch của mỗi người đúng bằng tổng giá trị hạng mục, con số này hiện trùng với win rate bình quân.",
        example:
          "Năm 2026: 271,5 ÷ 594,8 = 45,6%, dưới ngưỡng 50%. Riêng Tăng Bá Khoa 39,9%.",
        formula: "kỳ vọng ÷ kế hoạch",
      },
      {
        term: "% Đạt",
        meaning:
          "Kỳ vọng so với mốc của phụ trách: chỉ tiêu công ty nếu đã giao, chưa giao thì so với kế hoạch.",
        example:
          "Đàm Kiên chưa được giao chỉ tiêu nên so với kế hoạch: 106,0 ÷ 179,6 = 59%.",
        formula: "kỳ vọng ÷ (chỉ tiêu hoặc kế hoạch)",
      },
      {
        term: "Tỷ trọng",
        meaning:
          "Phần trăm giá trị pipeline nằm trong một nhóm (một ngưỡng, một nhóm hàng…).",
        example: "Vật tư Thiết bị chiếm 368,0 ÷ 594,8 = 62% pipeline năm 2026.",
        formula: "pipeline của nhóm ÷ tổng pipeline",
      },
      {
        term: "≥ 80% · chắc",
        meaning: "Gần như chắc thắng.",
        example: "Năm 2026: 21 hạng mục, 96,9 tỷ (16,3% pipeline).",
      },
      {
        term: "50 – 80% · vừa",
        meaning: "Có khả năng, cần theo sát.",
        example: "Năm 2026: 37 hạng mục, 129,3 tỷ (21,7% pipeline).",
      },
      {
        term: "< 50% · rủi ro",
        meaning:
          "Dễ trượt. Hạng mục chưa nhập win rate cũng tính vào ngưỡng này.",
        example:
          "Năm 2026: 26 hạng mục, 368,7 tỷ (62,0% pipeline) — phần lớn giá trị đang nằm ở nhóm rủi ro.",
      },
    ],
  },
  {
    id: "so-sanh",
    title: "Trang So sánh các năm",
    description:
      "Chọn 2–5 năm ở ô “Các năm”; các năm luôn xếp từ sớm đến muộn. Mọi chênh lệch là năm cuối trừ năm đầu: dương (xanh) là tăng, âm (đỏ) là giảm. Các ví dụ dưới đây chọn 2026, 2027, 2028.",
    terms: [
      {
        term: "Năm đầu (năm gốc)",
        meaning:
          "Năm sớm nhất trong các năm đã chọn, làm mốc để tính chênh lệch. Màu nhạt nhất trên biểu đồ.",
        example: "Chọn 2026, 2027, 2028 → 2026 là năm đầu.",
      },
      {
        term: "Năm cuối",
        meaning:
          "Năm muộn nhất đã chọn, màu đậm nhất trên biểu đồ. Các năm ở giữa có màu trung gian và chỉ để xem, không dùng để tính chênh lệch.",
        example: "2028 là năm cuối → mọi chênh lệch tính 2026 → 2028.",
      },
      {
        term: "% thay đổi",
        meaning:
          "Với tiền và số lượng: năm cuối tăng/giảm bao nhiêu phần trăm so với năm đầu.",
        example: "Kỳ vọng 271,5 → 241,7 tỷ: (241,7 − 271,5) ÷ 271,5 = −11,0%.",
        formula: "(năm cuối − năm đầu) ÷ năm đầu",
      },
      {
        term: "Chênh lệch chỉ số %",
        meaning:
          "Với tỷ lệ kỳ vọng, win rate, tỷ trọng: lấy hiệu trực tiếp hai con số, không chia.",
        example:
          "Tỷ trọng nhóm ≥ 80% từ 16% lên 27% hiện +10,7%, không phải “tăng 65%”.",
        formula: "năm cuối − năm đầu",
      },
      {
        term: "Mới",
        meaning:
          "Có ở năm cuối nhưng không có ở năm đầu, nên không tính được %.",
        example:
          "Trương Hùng Thái không có kế hoạch 2026 nhưng có ở 2028 → “Mới”.",
      },
      {
        term: "−100%",
        meaning: "Có ở năm đầu nhưng không còn ở năm cuối.",
        example:
          "Tăng Bá Khoa có kế hoạch 2026 (165,5 tỷ kỳ vọng) nhưng không có ở 2028 → −100%.",
      },
      {
        term: "—",
        meaning:
          "Không có ở cả năm đầu lẫn năm cuối (chỉ có ở năm giữa), nên không so được.",
        example:
          "Giang Thanh Nghĩa chỉ có kế hoạch năm 2027 → cột Thay đổi hiện “—”.",
      },
      {
        term: "Chưa giao",
        meaning: "Chỉ tiêu công ty năm đó bằng 0, nên không so được.",
        example:
          "Năm 2028 chưa giao chỉ tiêu → thẻ Chỉ tiêu công ty hiện “Chưa giao”.",
      },
      {
        term: "Khách giữ lại / mới / không còn",
        meaning:
          "Theo mã khách, so năm đầu với năm cuối: giữ lại = có ở cả hai; mới = chỉ có ở năm cuối; không còn (Mất) = chỉ có ở năm đầu.",
        example:
          "2026 → 2028: giữ lại 1 khách, mới 33 khách, không còn 41 khách.",
      },
      {
        term: "Thay đổi đến từ đâu",
        meaning:
          "Biểu đồ cầu nối (waterfall): đi từ tổng năm đầu, cộng/trừ phần thay đổi của từng nhóm, tới tổng năm cuối.",
        example:
          "Kỳ vọng 271,5 tỷ (2026) + 150,5 (Dịch vụ) − 135,6 (Vật tư Thiết bị) + … = 241,7 tỷ (2028).",
      },
      {
        term: "Khác (n)",
        meaning: "Gộp n nhóm thay đổi nhỏ còn lại, để tổng vẫn khớp.",
        example:
          "“Khác (1)” = 1 nhóm nhỏ ngoài 6 thay đổi lớn nhất, gộp lại một cột.",
      },
    ],
  },
];

export function ThuatNguView() {
  return (
    <div className="flex flex-col pb-12">
      <div className="flex flex-col gap-2.5 px-10 pt-10 pb-2 xsm:px-4 xsm:pt-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:ease-fluid">
        <span className="w-fit rounded-full bg-card px-3 py-1 text-[0.625rem] font-medium tracking-[0.2em] text-muted-foreground uppercase ring-1 ring-foreground/[0.06]">
          Hướng dẫn đọc số liệu
        </span>
        <h1 className="text-[2.125rem] leading-10 font-semibold tracking-[-0.03em] text-foreground">
          Thuật ngữ
        </h1>
        <p className="max-w-2xl text-[0.8125rem] leading-5 text-muted-foreground">
          Mọi con số trên dashboard đi ra từ một phép nhân:{" "}
          <b className="font-semibold text-foreground">
            kỳ vọng = pipeline × win rate
          </b>
          , cộng dồn trên từng hạng mục của kế hoạch năm.
        </p>
        <nav
          aria-label="Các phần"
          className="flex flex-wrap gap-1.5 pt-2 print:hidden"
        >
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="h-8 rounded-full bg-card px-3 text-[0.8125rem] leading-8 font-medium text-muted-foreground ring-1 ring-foreground/[0.08] transition-colors duration-300 ease-fluid hover:text-foreground"
            >
              {s.title}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-7 px-10 pt-7 xsm:px-4">
        {SECTIONS.map((s) => (
          // id cho link nhảy tới phần; chừa chỗ header dính ở trên
          <div key={s.id} id={s.id} className="scroll-mt-20">
            <Panel title={s.title} description={s.description}>
              <dl className="px-6 pb-4 xsm:px-4">
                {s.terms.map((t) => (
                  <div
                    key={t.term}
                    className={cn(
                      "grid gap-x-6 gap-y-1 border-b border-border/40 py-3 text-[0.8125rem] leading-5 last:border-0 xsm:grid-cols-1",
                      // phần nào không có công thức thì bỏ cột thứ 3 cho khỏi trống
                      s.terms.some((x) => x.formula)
                        ? "grid-cols-[13rem_minmax(0,1fr)_15rem]"
                        : "grid-cols-[13rem_minmax(0,1fr)]",
                    )}
                  >
                    <dt className="font-semibold text-foreground">{t.term}</dt>
                    <dd className="flex flex-col gap-1.5 text-muted-foreground">
                      {t.meaning}
                      <span className="border-l-2 border-chart-2/60 pl-2.5 text-foreground">
                        <span className="font-medium text-muted-foreground">
                          Ví dụ:{" "}
                        </span>
                        {t.example}
                      </span>
                    </dd>
                    {t.formula && (
                      <dd className="xsm:text-xs">
                        <span className="rounded-md bg-neutral-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
                          {t.formula}
                        </span>
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            </Panel>
          </div>
        ))}
      </div>
    </div>
  );
}
