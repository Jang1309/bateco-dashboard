import { query } from "@/lib/db/sqlserver";

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts.at(-1)![0] ?? ""}`.toUpperCase();
}

/** Fiscal / plan year = YEAR(vB30Budget.BudgetDate) */
export function resolveBudgetYear(raw?: string | number | null) {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 2000 && n <= 2100) return n;
  return new Date().getFullYear();
}

export async function getAvailableBudgetYears(): Promise<number[]> {
  const res = await query<{ y: number }>(`
    SELECT DISTINCT YEAR(b.BudgetDate) AS y
    FROM dbo.vB30Budget b
    WHERE b.IsActive = 1 AND b.IsGroup = 0 AND b.BudgetDate IS NOT NULL
    ORDER BY y DESC
  `);
  const years = res.recordset.map((r) => num(r.y)).filter((y) => y > 0);
  return years.length > 0 ? years : [new Date().getFullYear()];
}

export type BudgetOwner = {
  id: string;
  employeeId: number;
  name: string;
  initials: string;
  branch: string;
  budgetCount: number;
  plan: number;
  expected: number;
  company: number;
  profit: number;
  opportunities: number;
  avgWinRate: number;
  completion: number;
  coverage: number;
};

/** Một nhóm pipeline (nhóm hàng / người bán / khách hàng). winRate = kỳ vọng ÷ pipeline (%). */
export type PipelineGroup = {
  name: string;
  amount: number;
  expected: number;
  count: number;
  winRate: number;
};

export type BudgetOverview = {
  currency: "VND";
  year: number;
  availableYears: number[];
  owners: BudgetOwner[];
  kpis: {
    expected: number;
    plan: number;
    company: number;
    profit: number;
    /** kế hoạch − kỳ vọng */
    gap: number;
    coveragePct: number;
    opportunities: number;
    customers: number;
    lowWinCount: number;
    avgWinRate: number;
  };
  categories: PipelineGroup[];
  sellers: PipelineGroup[];
  topCustomers: PipelineGroup[];
  winBuckets: { key: string; label: string; count: number; amount: number }[];
};

// Chỉ lấy dòng đang hiệu lực và không phải dòng nhóm (IsGroup = 1 là dòng tổng, cộng vào sẽ trùng)
const YEAR_FILTER = `b.IsActive = 1 AND b.IsGroup = 0 AND b.BudgetDate IS NOT NULL AND YEAR(b.BudgetDate) = @year`;
// Dòng chi tiết Amount = 0 là dòng trống (không có giá trị) → bỏ khỏi số hạng mục và win rate
const DETAIL_FILTER = `d.IsActive = 1 AND d.IsGroup = 0 AND d.Amount > 0`;

/** Win rate theo giá trị: kỳ vọng ÷ pipeline, khớp với kỳ vọng = Σ Amount × WinRate. */
function weightedRate(rev: number, amt: number) {
  return amt > 0 ? Math.round((rev / amt) * 1000) / 10 : 0;
}

type GroupRow = { name: string; n: number; amt: number; rev: number };

function toGroups(rows: GroupRow[]): PipelineGroup[] {
  return rows.map((r) => ({
    name: r.name,
    amount: num(r.amt),
    expected: num(r.rev),
    count: num(r.n),
    winRate: weightedRate(num(r.rev), num(r.amt)),
  }));
}

function groupQuery(
  expr: string,
  fallback: string,
  top: number,
  where: string,
) {
  return `
    SELECT TOP ${top}
      ISNULL(NULLIF(LTRIM(RTRIM(${expr})), N''), N'${fallback}') AS name,
      COUNT(*) AS n,
      SUM(d.Amount) AS amt,
      SUM(ISNULL(d.RevAmount, 0)) AS rev
    FROM dbo.vB30BudgetDetail d
    INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
    WHERE ${where} AND ${DETAIL_FILTER}
    GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(${expr})), N''), N'${fallback}')
    ORDER BY amt DESC
  `;
}

/** Tổng hợp kế hoạch năm; truyền employeeId để chỉ lấy dữ liệu của một phụ trách (trang chi tiết). */
export async function getBudgetOverview(
  yearInput?: string | number | null,
  employeeId?: number,
): Promise<BudgetOverview> {
  const availableYears = await getAvailableBudgetYears();
  let year = resolveBudgetYear(yearInput);
  if (!availableYears.includes(year)) {
    year = availableYears[0] ?? year;
  }

  const inputs = employeeId != null ? { year, employeeId } : { year };
  const where =
    employeeId != null
      ? `${YEAR_FILTER} AND b.EmployeeId = @employeeId`
      : YEAR_FILTER;

  const [ownersRes, detailRes, catRes, sellerRes, cusRes, winRes] =
    await Promise.all([
      query<{
        EmployeeId: number;
        EmployeeName: string;
        BranchCode: string;
        budgets: number;
        planAmt: number;
        expectedAmt: number;
        companyAmt: number;
        profitAmt: number;
      }>(
        `
      SELECT
        b.EmployeeId,
        b.EmployeeName,
        b.BranchCode,
        COUNT(*) AS budgets,
        SUM(ISNULL(b.BudgetAmount, 0)) AS planAmt,
        SUM(ISNULL(b.TotalRevAmount, 0)) AS expectedAmt,
        SUM(ISNULL(b.CompanyAmount, 0)) AS companyAmt,
        SUM(ISNULL(b.TotalProfitAmount, 0)) AS profitAmt
      FROM dbo.vB30Budget b
      WHERE ${where}
      GROUP BY b.EmployeeId, b.EmployeeName, b.BranchCode
      ORDER BY planAmt DESC
    `,
        inputs,
      ),
      query<{ EmployeeId: number; n: number; amt: number; rev: number }>(
        `
      SELECT
        b.EmployeeId,
        COUNT(d.Id) AS n,
        SUM(d.Amount) AS amt,
        SUM(ISNULL(d.RevAmount, 0)) AS rev
      FROM dbo.vB30Budget b
      INNER JOIN dbo.vB30BudgetDetail d ON d.pId = b.Id
      WHERE ${where} AND ${DETAIL_FILTER}
      GROUP BY b.EmployeeId
    `,
        inputs,
      ),
      query<GroupRow>(groupQuery("d.ItemCatgName", "Khác", 10, where), inputs),
      query<GroupRow>(
        groupQuery("d.EmployeeName", "(Chưa gán)", 10, where),
        inputs,
      ),
      query<GroupRow>(
        groupQuery("d.CustomerName", "(Không tên)", 8, where),
        inputs,
      ),
      query<{
        high: number;
        mid: number;
        low: number;
        highAmt: number;
        midAmt: number;
        lowAmt: number;
        total: number;
        amt: number;
        rev: number;
        customers: number;
      }>(
        `
      SELECT
        SUM(CASE WHEN d.WinRate >= 0.8 THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN d.WinRate >= 0.5 AND d.WinRate < 0.8 THEN 1 ELSE 0 END) AS mid,
        SUM(CASE WHEN d.WinRate < 0.5 OR d.WinRate IS NULL THEN 1 ELSE 0 END) AS low,
        SUM(CASE WHEN d.WinRate >= 0.8 THEN d.Amount ELSE 0 END) AS highAmt,
        SUM(CASE WHEN d.WinRate >= 0.5 AND d.WinRate < 0.8 THEN d.Amount ELSE 0 END) AS midAmt,
        SUM(CASE WHEN d.WinRate < 0.5 OR d.WinRate IS NULL THEN d.Amount ELSE 0 END) AS lowAmt,
        COUNT(*) AS total,
        SUM(d.Amount) AS amt,
        SUM(ISNULL(d.RevAmount, 0)) AS rev,
        COUNT(DISTINCT NULLIF(LTRIM(RTRIM(d.CustomerName)), N'')) AS customers
      FROM dbo.vB30BudgetDetail d
      INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
      WHERE ${where} AND ${DETAIL_FILTER}
    `,
        inputs,
      ),
    ]);

  const detailByEmp = new Map(
    detailRes.recordset.map((r) => [
      Number(r.EmployeeId),
      { n: num(r.n), win: weightedRate(num(r.rev), num(r.amt)) },
    ]),
  );

  const owners: BudgetOwner[] = ownersRes.recordset.map((r) => {
    const employeeId = Number(r.EmployeeId);
    const plan = num(r.planAmt);
    const expected = num(r.expectedAmt);
    const company = num(r.companyAmt);
    const profit = num(r.profitAmt);
    const d = detailByEmp.get(employeeId) ?? { n: 0, win: 0 };
    const base = company > 0 ? company : plan;
    const completion = base > 0 ? Math.round((expected / base) * 100) : 0;
    const coverage = plan > 0 ? Math.round((expected / plan) * 100) : 0;
    const name = r.EmployeeName?.trim() || `NV ${employeeId}`;
    return {
      id: String(employeeId),
      employeeId,
      name,
      initials: initials(name),
      branch: r.BranchCode?.trim() || "A01",
      budgetCount: num(r.budgets),
      plan,
      expected,
      company,
      profit,
      opportunities: d.n,
      avgWinRate: d.win,
      completion,
      coverage,
    };
  });

  const expected = owners.reduce((s, o) => s + o.expected, 0);
  const plan = owners.reduce((s, o) => s + o.plan, 0);
  const company = owners.reduce((s, o) => s + o.company, 0);
  const profit = owners.reduce((s, o) => s + o.profit, 0);
  const win = winRes.recordset[0];

  return {
    currency: "VND",
    year,
    availableYears,
    owners,
    kpis: {
      expected,
      plan,
      company,
      profit,
      gap: plan - expected,
      coveragePct: plan > 0 ? (expected / plan) * 100 : 0,
      opportunities: num(win?.total),
      customers: num(win?.customers),
      lowWinCount: num(win?.low),
      avgWinRate: weightedRate(num(win?.rev), num(win?.amt)),
    },
    categories: toGroups(catRes.recordset),
    sellers: toGroups(sellerRes.recordset),
    topCustomers: toGroups(cusRes.recordset),
    winBuckets: [
      {
        key: "high",
        label: "≥ 80% · chắc",
        count: num(win?.high),
        amount: num(win?.highAmt),
      },
      {
        key: "mid",
        label: "50–80% · vừa",
        count: num(win?.mid),
        amount: num(win?.midAmt),
      },
      {
        key: "low",
        label: "< 50% · rủi ro",
        count: num(win?.low),
        amount: num(win?.lowAmt),
      },
    ],
  };
}

export type BudgetDetail = Awaited<ReturnType<typeof getBudgetDetails>>[number];

export async function getBudgetDetails(
  budgetOwnerId: number,
  yearInput?: string | number | null,
  take = 50,
) {
  const year = resolveBudgetYear(yearInput);
  const limit = Math.min(200, Math.max(1, Math.floor(take)));
  const res = await query<{
    Id: number;
    CustomerName: string;
    ProductCostInfo: string;
    ItemCatgName: string;
    EmployeeName: string;
    Amount: number;
    RevAmount: number;
    WinRate: number;
    ProfitAmount: number;
  }>(
    `
    SELECT TOP (${limit})
      d.Id,
      d.CustomerName,
      d.ProductCostInfo,
      d.ItemCatgName,
      d.EmployeeName,
      d.Amount,
      d.RevAmount,
      d.WinRate,
      d.ProfitAmount
    FROM dbo.vB30BudgetDetail d
    INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
    WHERE ${YEAR_FILTER} AND ${DETAIL_FILTER}
      AND b.EmployeeId = @employeeId
    ORDER BY d.Amount DESC
    `,
    { year, employeeId: budgetOwnerId },
  );
  return res.recordset.map((r) => ({
    id: r.Id,
    customer: r.CustomerName ?? "",
    product: r.ProductCostInfo ?? "",
    category: r.ItemCatgName ?? "",
    seller: r.EmployeeName ?? "",
    amount: num(r.Amount),
    expected: num(r.RevAmount),
    winRate: Math.round(num(r.WinRate) * 1000) / 10,
    profit: num(r.ProfitAmount),
  }));
}

/** Nhóm đầy đủ (không cắt top) cho trang so sánh năm; key dùng để ghép 2 năm. */
export type YearGroup = PipelineGroup & { key: string; profit: number };

export type YearBreakdown = {
  categories: YearGroup[];
  sellers: YearGroup[];
  /** key = mã khách hàng, để tính khách mới / giữ lại / mất chính xác */
  customers: YearGroup[];
};

function fullGroupQuery(keyExpr: string, nameExpr: string, fallback: string) {
  const key = `ISNULL(NULLIF(LTRIM(RTRIM(${keyExpr})), N''), N'${fallback}')`;
  return `
    SELECT
      ${key} AS k,
      MAX(ISNULL(NULLIF(LTRIM(RTRIM(${nameExpr})), N''), N'${fallback}')) AS name,
      COUNT(*) AS n,
      SUM(d.Amount) AS amt,
      SUM(ISNULL(d.RevAmount, 0)) AS rev,
      SUM(ISNULL(d.ProfitAmount, 0)) AS profit
    FROM dbo.vB30BudgetDetail d
    INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
    WHERE ${YEAR_FILTER} AND ${DETAIL_FILTER}
    GROUP BY ${key}
    ORDER BY amt DESC
  `;
}

export async function getYearBreakdown(year: number): Promise<YearBreakdown> {
  type Row = GroupRow & { k: string; profit: number };
  const [cat, seller, cus] = await Promise.all([
    query<Row>(fullGroupQuery("d.ItemCatgName", "d.ItemCatgName", "Khác"), {
      year,
    }),
    query<Row>(
      fullGroupQuery("d.EmployeeName", "d.EmployeeName", "(Chưa gán)"),
      { year },
    ),
    query<Row>(
      fullGroupQuery("d.CustomerCode", "d.CustomerName", "(Không mã)"),
      { year },
    ),
  ]);
  const map = (rows: Row[]) =>
    toGroups(rows).map((g, i) => ({
      ...g,
      key: rows[i]!.k,
      profit: num(rows[i]!.profit),
    }));
  return {
    categories: map(cat.recordset),
    sellers: map(seller.recordset),
    customers: map(cus.recordset),
  };
}

export type PersonKind = "owner" | "seller";

/** Một người trên trang So sánh nhân sự; plan/company chỉ có với phụ trách (cấp kế hoạch). */
export type Person = {
  key: string;
  name: string;
  amount: number;
  expected: number;
  profit: number;
  count: number;
  customers: number;
  winRate: number;
  buckets: { key: string; label: string; count: number; amount: number }[];
  categories: YearGroup[];
  plan?: number;
  company?: number;
};

const PERSON_EXPR: Record<PersonKind, { key: string; name: string }> = {
  // phụ trách = chủ kế hoạch; người bán = người theo từng hạng mục
  owner: { key: "CAST(b.EmployeeId AS nvarchar(50))", name: "b.EmployeeName" },
  seller: {
    key: "ISNULL(NULLIF(LTRIM(RTRIM(d.EmployeeName)), N''), N'(Chưa gán)')",
    name: "ISNULL(NULLIF(LTRIM(RTRIM(d.EmployeeName)), N''), N'(Chưa gán)')",
  },
};

/** Toàn bộ phụ trách hoặc người bán của một năm, kèm cơ cấu win rate và nhóm hàng từng người. */
export async function getPeople(
  year: number,
  kind: PersonKind,
): Promise<Person[]> {
  const { key, name } = PERSON_EXPR[kind];
  const cat = `ISNULL(NULLIF(LTRIM(RTRIM(d.ItemCatgName)), N''), N'Khác')`;
  const from = `FROM dbo.vB30BudgetDetail d INNER JOIN dbo.vB30Budget b ON d.pId = b.Id WHERE ${YEAR_FILTER} AND ${DETAIL_FILTER}`;
  const [peopleRes, catRes, overview] = await Promise.all([
    query<{
      k: string;
      name: string;
      n: number;
      amt: number;
      rev: number;
      profit: number;
      customers: number;
      high: number;
      mid: number;
      low: number;
      highAmt: number;
      midAmt: number;
      lowAmt: number;
    }>(
      `
      SELECT
        ${key} AS k,
        MAX(${name}) AS name,
        COUNT(*) AS n,
        SUM(d.Amount) AS amt,
        SUM(ISNULL(d.RevAmount, 0)) AS rev,
        SUM(ISNULL(d.ProfitAmount, 0)) AS profit,
        COUNT(DISTINCT NULLIF(LTRIM(RTRIM(d.CustomerCode)), N'')) AS customers,
        SUM(CASE WHEN d.WinRate >= 0.8 THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN d.WinRate >= 0.5 AND d.WinRate < 0.8 THEN 1 ELSE 0 END) AS mid,
        SUM(CASE WHEN d.WinRate < 0.5 OR d.WinRate IS NULL THEN 1 ELSE 0 END) AS low,
        SUM(CASE WHEN d.WinRate >= 0.8 THEN d.Amount ELSE 0 END) AS highAmt,
        SUM(CASE WHEN d.WinRate >= 0.5 AND d.WinRate < 0.8 THEN d.Amount ELSE 0 END) AS midAmt,
        SUM(CASE WHEN d.WinRate < 0.5 OR d.WinRate IS NULL THEN d.Amount ELSE 0 END) AS lowAmt
      ${from}
      GROUP BY ${key}
      ORDER BY amt DESC
    `,
      { year },
    ),
    query<GroupRow & { k: string; cat: string; profit: number }>(
      `
      SELECT ${key} AS k, ${cat} AS cat, ${cat} AS name,
        COUNT(*) AS n, SUM(d.Amount) AS amt, SUM(ISNULL(d.RevAmount, 0)) AS rev,
        SUM(ISNULL(d.ProfitAmount, 0)) AS profit
      ${from}
      GROUP BY ${key}, ${cat}
      ORDER BY amt DESC
    `,
      { year },
    ),
    // kế hoạch / chỉ tiêu ở cấp kế hoạch — lấy từ tổng quan (đã có cả phụ trách chưa lập hạng mục)
    kind === "owner" ? getBudgetOverview(year) : null,
  ]);

  const people: Person[] = peopleRes.recordset.map((r) => {
    const rows = catRes.recordset.filter((c) => c.k === r.k);
    return {
      key: r.k,
      name: r.name?.trim() || r.k,
      amount: num(r.amt),
      expected: num(r.rev),
      profit: num(r.profit),
      count: num(r.n),
      customers: num(r.customers),
      winRate: weightedRate(num(r.rev), num(r.amt)),
      buckets: [
        {
          key: "high",
          label: "≥ 80% · chắc",
          count: num(r.high),
          amount: num(r.highAmt),
        },
        {
          key: "mid",
          label: "50–80% · vừa",
          count: num(r.mid),
          amount: num(r.midAmt),
        },
        {
          key: "low",
          label: "< 50% · rủi ro",
          count: num(r.low),
          amount: num(r.lowAmt),
        },
      ],
      categories: toGroups(rows).map((g, i) => ({
        ...g,
        key: rows[i]!.cat,
        profit: num(rows[i]!.profit),
      })),
    };
  });

  if (!overview) return people;
  // phụ trách: thêm kế hoạch / chỉ tiêu; người có chỉ tiêu nhưng chưa lập hạng mục vẫn được liệt kê
  return overview.owners.map((o) => {
    const p = people.find((x) => x.key === o.id);
    return {
      ...(p ?? {
        key: o.id,
        name: o.name,
        amount: 0,
        expected: 0,
        profit: 0,
        count: 0,
        customers: 0,
        winRate: 0,
        buckets: [],
        categories: [],
      }),
      name: o.name,
      plan: o.plan,
      company: o.company,
    };
  });
}
