export type Director = {
  id: string;
  name: string;
  initials: string;
  region: string;
  branch: string;
  role: string;
  target: number;
  expected: number;
  actual: number;
  completion: number;
  bids: number;
  won: number;
  winRate: number;
  teams: number;
  sparkline: number[];
  monthly: number[];
};

export const MONTHS = [
  "Th1",
  "Th2",
  "Th3",
  "Th4",
  "Th5",
  "Th6",
  "Th7",
  "Th8",
  "Th9",
  "Th10",
  "Th11",
  "Th12",
] as const;

export const currentUser = {
  name: "Nguyễn Văn An",
  email: "an.nguyen@bateco.vn",
  avatar: "",
  role: "Giám đốc miền Bắc",
};

export const overviewKpis = {
  actual: 1_425_000,
  actualYoY: 12.4,
  expected: 1_380_000,
  expectedDelta: 3.3,
  companyTarget: 1_500_000,
  branchCount: 12,
  year: 2026,
  variance: -75_000,
  variancePct: 95,
  bids: 96,
  bidsWon: 42,
  bidsPendingOrLost: 54,
  winRate: 43.8,
};

export const monthlyRevenue = MONTHS.map((month, i) => {
  const actual =
    [95, 102, 110, 118, 125, 132, 128, 140, 148, 155, 162, 170][i]! * 1000;
  const expected =
    [90, 98, 105, 112, 120, 128, 130, 135, 142, 150, 155, 160][i]! * 1000;
  const company =
    [100, 105, 110, 120, 125, 130, 135, 140, 145, 150, 155, 160][i]! * 1000;
  return { month, actual, expected, company };
});

export const quarterlyWaterfall = [
  { name: "Chỉ tiêu", value: 1_500_000, type: "total" as const },
  { name: "Q1", value: -8_000, type: "neg" as const },
  { name: "Q2", value: -14_000, type: "neg" as const },
  { name: "Q3", value: -17_000, type: "neg" as const },
  { name: "Q4", value: -36_000, type: "neg" as const },
  { name: "Thực tế", value: 1_425_000, type: "total" as const },
];

export const regionalBars = [
  { name: "Khối B2B", actual: 104, expected: 101, alert: false },
  { name: "Miền Bắc", actual: 98, expected: 96, alert: false },
  { name: "Miền Nam", actual: 94, expected: 97, alert: false },
  { name: "Khối bán lẻ & SME", actual: 91, expected: 93, alert: false },
  { name: "Miền Trung", actual: 89, expected: 92, alert: true },
];

export const regionShare = [
  { name: "bac", label: "Miền Bắc", value: 570_000, pct: 40 },
  { name: "nam", label: "Miền Nam", value: 498_750, pct: 35 },
  { name: "trung", label: "Miền Trung", value: 356_250, pct: 25 },
];

export const monthlyBids = MONTHS.map((month, i) => {
  const bids = [6, 7, 8, 9, 8, 10, 7, 9, 8, 11, 7, 6][i]!;
  const winRate = [38, 42, 45, 40, 48, 52, 41, 44, 46, 50, 43, 39][i]!;
  return {
    month,
    bids,
    won: Math.round((bids * winRate) / 100),
    winRate,
  };
});

export const bidResults = [
  { name: "won", label: "Trúng", value: 42, pct: "43.8%" },
  { name: "pending", label: "Đang chấm", value: 23, pct: "24.0%" },
  { name: "lost", label: "Trượt", value: 31, pct: "32.3%" },
];

export const funnelStages = [
  { name: "Cơ hội mới", value: 1240, pct: null as string | null },
  { name: "Đủ điều kiện", value: 710, pct: "57%" },
  { name: "Báo giá", value: 380, pct: "54%" },
  { name: "Ký hợp đồng", value: 168, pct: "44%" },
];

export const directors: Director[] = [
  {
    id: "na",
    name: "Nguyễn Văn An",
    initials: "NA",
    region: "Miền Bắc",
    branch: "Chi nhánh Hà Nội",
    role: "Giám đốc miền Bắc",
    target: 250_000,
    expected: 245_000,
    actual: 260_000,
    completion: 104,
    bids: 22,
    won: 12,
    winRate: 54.5,
    teams: 4,
    sparkline: [18, 20, 19, 22, 21, 24, 23, 25, 24, 26, 27, 28],
    monthly: [18, 20, 19, 22, 21, 24, 23, 25, 24, 26, 27, 28].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "tm",
    name: "Trần Thị Mai",
    initials: "TM",
    region: "Miền Nam",
    branch: "Chi nhánh TP.HCM",
    role: "Giám đốc miền Nam",
    target: 280_000,
    expected: 270_000,
    actual: 268_000,
    completion: 95.7,
    bids: 24,
    won: 11,
    winRate: 45.8,
    teams: 5,
    sparkline: [20, 21, 22, 23, 22, 24, 25, 24, 26, 25, 27, 26],
    monthly: [20, 21, 22, 23, 22, 24, 25, 24, 26, 25, 27, 26].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "ln",
    name: "Lê Hoàng Nam",
    initials: "LN",
    region: "Miền Trung",
    branch: "Chi nhánh Đà Nẵng",
    role: "Giám đốc miền Trung",
    target: 220_000,
    expected: 200_000,
    actual: 180_400,
    completion: 82,
    bids: 18,
    won: 5,
    winRate: 27.8,
    teams: 3,
    sparkline: [16, 15, 17, 14, 15, 16, 14, 15, 13, 14, 15, 14],
    monthly: [16, 15, 17, 14, 15, 16, 14, 15, 13, 14, 15, 14].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "ph",
    name: "Phạm Thu Hà",
    initials: "PH",
    region: "B2B",
    branch: "Khối doanh nghiệp",
    role: "Giám đốc B2B",
    target: 300_000,
    expected: 295_000,
    actual: 312_000,
    completion: 104,
    bids: 20,
    won: 10,
    winRate: 50,
    teams: 4,
    sparkline: [22, 23, 24, 25, 26, 27, 26, 28, 29, 28, 30, 31],
    monthly: [22, 23, 24, 25, 26, 27, 26, 28, 29, 28, 30, 31].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "vt",
    name: "Võ Minh Tuấn",
    initials: "VT",
    region: "Retail/SME",
    branch: "Khối bán lẻ",
    role: "Giám đốc Retail",
    target: 200_000,
    expected: 190_000,
    actual: 182_000,
    completion: 91,
    bids: 12,
    won: 4,
    winRate: 33.3,
    teams: 3,
    sparkline: [14, 15, 14, 16, 15, 17, 16, 15, 16, 17, 16, 15],
    monthly: [14, 15, 14, 16, 15, 17, 16, 15, 16, 17, 16, 15].map(
      (n) => n * 1000,
    ),
  },
];

/** Extra rows for table pagination (12 total branches) */
export const branchRows: Director[] = [
  ...directors,
  {
    id: "hp",
    name: "Hoàng Phúc",
    initials: "HP",
    region: "Miền Bắc",
    branch: "Chi nhánh Hải Phòng",
    role: "Giám đốc chi nhánh",
    target: 120_000,
    expected: 115_000,
    actual: 118_000,
    completion: 98.3,
    bids: 8,
    won: 4,
    winRate: 50,
    teams: 2,
    sparkline: [9, 10, 9, 11, 10, 10, 11, 10, 11, 12, 11, 12],
    monthly: [9, 10, 9, 11, 10, 10, 11, 10, 11, 12, 11, 12].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "ct",
    name: "Cao Tú",
    initials: "CT",
    region: "Miền Nam",
    branch: "Chi nhánh Cần Thơ",
    role: "Giám đốc chi nhánh",
    target: 110_000,
    expected: 108_000,
    actual: 105_000,
    completion: 95.5,
    bids: 7,
    won: 3,
    winRate: 42.9,
    teams: 2,
    sparkline: [8, 9, 8, 9, 10, 9, 9, 10, 9, 10, 9, 10],
    monthly: [8, 9, 8, 9, 10, 9, 9, 10, 9, 10, 9, 10].map((n) => n * 1000),
  },
  {
    id: "qn",
    name: "Quách Nga",
    initials: "QN",
    region: "Miền Trung",
    branch: "Chi nhánh Quy Nhơn",
    role: "Giám đốc chi nhánh",
    target: 90_000,
    expected: 85_000,
    actual: 78_000,
    completion: 86.7,
    bids: 6,
    won: 2,
    winRate: 33.3,
    teams: 2,
    sparkline: [7, 6, 7, 6, 7, 6, 7, 6, 6, 7, 6, 7],
    monthly: [7, 6, 7, 6, 7, 6, 7, 6, 6, 7, 6, 7].map((n) => n * 1000),
  },
  {
    id: "bd",
    name: "Bùi Đức",
    initials: "BD",
    region: "Miền Nam",
    branch: "Chi nhánh Bình Dương",
    role: "Giám đốc chi nhánh",
    target: 130_000,
    expected: 125_000,
    actual: 128_000,
    completion: 98.5,
    bids: 9,
    won: 5,
    winRate: 55.6,
    teams: 2,
    sparkline: [10, 10, 11, 10, 11, 12, 11, 12, 11, 12, 13, 12],
    monthly: [10, 10, 11, 10, 11, 12, 11, 12, 11, 12, 13, 12].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "dn",
    name: "Đỗ Ngọc",
    initials: "DN",
    region: "B2B",
    branch: "B2B miền Bắc",
    role: "Trưởng nhóm B2B",
    target: 140_000,
    expected: 138_000,
    actual: 145_000,
    completion: 103.6,
    bids: 10,
    won: 6,
    winRate: 60,
    teams: 3,
    sparkline: [11, 12, 11, 12, 13, 12, 13, 14, 13, 14, 15, 14],
    monthly: [11, 12, 11, 12, 13, 12, 13, 14, 13, 14, 15, 14].map(
      (n) => n * 1000,
    ),
  },
  {
    id: "lk",
    name: "Lý Khánh",
    initials: "LK",
    region: "Retail/SME",
    branch: "SME miền Nam",
    role: "Trưởng nhóm SME",
    target: 100_000,
    expected: 95_000,
    actual: 92_000,
    completion: 92,
    bids: 5,
    won: 2,
    winRate: 40,
    teams: 2,
    sparkline: [7, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7],
    monthly: [7, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7].map((n) => n * 1000),
  },
  {
    id: "th",
    name: "Tạ Hạnh",
    initials: "TH",
    region: "Miền Bắc",
    branch: "Chi nhánh Thái Nguyên",
    role: "Giám đốc chi nhánh",
    target: 85_000,
    expected: 80_000,
    actual: 81_000,
    completion: 95.3,
    bids: 4,
    won: 2,
    winRate: 50,
    teams: 1,
    sparkline: [6, 6, 7, 6, 7, 7, 6, 7, 7, 6, 7, 7],
    monthly: [6, 6, 7, 6, 7, 7, 6, 7, 7, 6, 7, 7].map((n) => n * 1000),
  },
];

/** Heatmap: director × month completion % */
export const heatmap: {
  id: string;
  name: string;
  values: number[];
  completion: number;
}[] = directors.map((d) => {
  const monthlyTarget = d.target / 12;
  return {
    id: d.id,
    name: d.name,
    completion: d.completion,
    values: d.monthly.map((v) =>
      Math.min(120, Math.round((v / monthlyTarget) * 100)),
    ),
  };
});

export function formatUsd(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US")}`;
}

export function getDirector(id: string) {
  return (
    branchRows.find((d) => d.id === id) ?? directors.find((d) => d.id === id)
  );
}
