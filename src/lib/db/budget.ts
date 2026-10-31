import {
  fixtureBudgets,
  fixtureDetails,
  type BudgetRow,
  type DetailRow,
} from "@/lib/db/fixture";
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

function yearOf(date: string | Date) {
  return new Date(date).getFullYear();
}

function nz(s: string | null | undefined, fallback: string) {
  const t = s?.trim();
  return t ? t : fallback;
}

/** Vercel / BUDGET_SOURCE=json → fixture; local có SQL → live. */
function isFixtureSource() {
  return (
    process.env.BUDGET_SOURCE === "json" ||
    process.env.VERCEL === "1" ||
    !process.env.SQLSERVER_HOST
  );
}

async function loadBudgets(): Promise<BudgetRow[]> {
  if (isFixtureSource()) return fixtureBudgets;
  const res = await query<BudgetRow>(`
    SELECT
      b.Id, b.EmployeeId, b.EmployeeName, b.BranchCode, b.BudgetDate,
      b.BudgetAmount, b.TotalRevAmount, b.CompanyAmount, b.TotalProfitAmount
    FROM dbo.vB30Budget b
    WHERE b.IsActive = 1 AND b.IsGroup = 0 AND b.BudgetDate IS NOT NULL
  `);
  return res.recordset.map((r) => ({
    ...r,
    BudgetDate: new Date(r.BudgetDate as string).toISOString(),
  }));
}

async function loadDetails(): Promise<DetailRow[]> {
  if (isFixtureSource()) return fixtureDetails;
  const res = await query<DetailRow>(`
    SELECT
      d.Id, d.pId, d.CustomerName, d.CustomerCode, d.ProductCostInfo,
      d.ItemCatgName, d.EmployeeName, d.Amount, d.RevAmount, d.WinRate,
      d.ProfitAmount
    FROM dbo.vB30BudgetDetail d
    INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
    WHERE b.IsActive = 1 AND b.IsGroup = 0 AND b.BudgetDate IS NOT NULL
      AND d.IsActive = 1 AND d.IsGroup = 0 AND d.Amount > 0
  `);
  return res.recordset;
}

/** Fiscal / plan year = YEAR(vB30Budget.BudgetDate) */
export function resolveBudgetYear(raw?: string | number | null) {
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 2000 && n <= 2100) return n;
  return new Date().getFullYear();
}

export async function getAvailableBudgetYears(): Promise<number[]> {
  const budgets = await loadBudgets();
  const years = [...new Set(budgets.map((b) => yearOf(b.BudgetDate)))].sort(
    (a, b) => b - a,
  );
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

function joinYear(
  budgets: BudgetRow[],
  details: DetailRow[],
  year: number,
  employeeId?: number,
) {
  const budgetById = new Map<number, BudgetRow>();
  const yearBudgets: BudgetRow[] = [];
  for (const b of budgets) {
    if (yearOf(b.BudgetDate) !== year) continue;
    if (employeeId != null && Number(b.EmployeeId) !== employeeId) continue;
    yearBudgets.push(b);
    budgetById.set(Number(b.Id), b);
  }
  const yearDetails = details.filter((d) => budgetById.has(Number(d.pId)));
  return { yearBudgets, yearDetails };
}

function groupBy(
  details: DetailRow[],
  nameOf: (d: DetailRow) => string,
  top: number,
): GroupRow[] {
  const map = new Map<string, GroupRow>();
  for (const d of details) {
    const name = nameOf(d);
    const g = map.get(name) ?? { name, n: 0, amt: 0, rev: 0 };
    g.n += 1;
    g.amt += num(d.Amount);
    g.rev += num(d.RevAmount);
    map.set(name, g);
  }
  return [...map.values()].sort((a, b) => b.amt - a.amt).slice(0, top);
}

/** Tổng hợp kế hoạch năm; truyền employeeId để chỉ lấy dữ liệu của một phụ trách (trang chi tiết). */
export async function getBudgetOverview(
  yearInput?: string | number | null,
  employeeId?: number,
): Promise<BudgetOverview> {
  const [availableYears, budgets, details] = await Promise.all([
    getAvailableBudgetYears(),
    loadBudgets(),
    loadDetails(),
  ]);
  let year = resolveBudgetYear(yearInput);
  if (!availableYears.includes(year)) {
    year = availableYears[0] ?? year;
  }

  const { yearBudgets, yearDetails } = joinYear(
    budgets,
    details,
    year,
    employeeId,
  );
  const empByBudgetId = new Map(
    yearBudgets.map((b) => [Number(b.Id), Number(b.EmployeeId)]),
  );

  type OwnerAgg = {
    EmployeeId: number;
    EmployeeName: string;
    BranchCode: string;
    budgets: number;
    planAmt: number;
    expectedAmt: number;
    companyAmt: number;
    profitAmt: number;
  };
  const ownerMap = new Map<number, OwnerAgg>();
  for (const b of yearBudgets) {
    const id = Number(b.EmployeeId);
    const o = ownerMap.get(id) ?? {
      EmployeeId: id,
      EmployeeName: b.EmployeeName ?? "",
      BranchCode: b.BranchCode ?? "",
      budgets: 0,
      planAmt: 0,
      expectedAmt: 0,
      companyAmt: 0,
      profitAmt: 0,
    };
    o.budgets += 1;
    o.planAmt += num(b.BudgetAmount);
    o.expectedAmt += num(b.TotalRevAmount);
    o.companyAmt += num(b.CompanyAmount);
    o.profitAmt += num(b.TotalProfitAmount);
    if (b.EmployeeName?.trim()) o.EmployeeName = b.EmployeeName;
    if (b.BranchCode?.trim()) o.BranchCode = b.BranchCode;
    ownerMap.set(id, o);
  }

  const detailByEmp = new Map<
    number,
    { n: number; amt: number; rev: number }
  >();
  for (const d of yearDetails) {
    const id = empByBudgetId.get(Number(d.pId));
    if (id == null) continue;
    const cur = detailByEmp.get(id) ?? { n: 0, amt: 0, rev: 0 };
    cur.n += 1;
    cur.amt += num(d.Amount);
    cur.rev += num(d.RevAmount);
    detailByEmp.set(id, cur);
  }

  const owners: BudgetOwner[] = [...ownerMap.values()]
    .sort((a, b) => b.planAmt - a.planAmt)
    .map((r) => {
      const plan = num(r.planAmt);
      const expected = num(r.expectedAmt);
      const company = num(r.companyAmt);
      const profit = num(r.profitAmt);
      const d = detailByEmp.get(r.EmployeeId) ?? { n: 0, amt: 0, rev: 0 };
      const base = company > 0 ? company : plan;
      const completion = base > 0 ? Math.round((expected / base) * 100) : 0;
      const coverage = plan > 0 ? Math.round((expected / plan) * 100) : 0;
      const name = r.EmployeeName?.trim() || `NV ${r.EmployeeId}`;
      return {
        id: String(r.EmployeeId),
        employeeId: r.EmployeeId,
        name,
        initials: initials(name),
        branch: r.BranchCode?.trim() || "A01",
        budgetCount: num(r.budgets),
        plan,
        expected,
        company,
        profit,
        opportunities: d.n,
        avgWinRate: weightedRate(d.rev, d.amt),
        completion,
        coverage,
      };
    });

  const expected = owners.reduce((s, o) => s + o.expected, 0);
  const plan = owners.reduce((s, o) => s + o.plan, 0);
  const company = owners.reduce((s, o) => s + o.company, 0);
  const profit = owners.reduce((s, o) => s + o.profit, 0);

  let high = 0,
    mid = 0,
    low = 0,
    highAmt = 0,
    midAmt = 0,
    lowAmt = 0,
    amt = 0,
    rev = 0;
  const customers = new Set<string>();
  for (const d of yearDetails) {
    const win = d.WinRate == null ? 0 : num(d.WinRate);
    const a = num(d.Amount);
    amt += a;
    rev += num(d.RevAmount);
    const c = d.CustomerName?.trim();
    if (c) customers.add(c);
    if (win >= 0.8) {
      high += 1;
      highAmt += a;
    } else if (win >= 0.5) {
      mid += 1;
      midAmt += a;
    } else {
      low += 1;
      lowAmt += a;
    }
  }

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
      opportunities: yearDetails.length,
      customers: customers.size,
      lowWinCount: low,
      avgWinRate: weightedRate(rev, amt),
    },
    categories: toGroups(
      groupBy(yearDetails, (d) => nz(d.ItemCatgName, "Khác"), 10),
    ),
    sellers: toGroups(
      groupBy(yearDetails, (d) => nz(d.EmployeeName, "(Chưa gán)"), 10),
    ),
    topCustomers: toGroups(
      groupBy(yearDetails, (d) => nz(d.CustomerName, "(Không tên)"), 8),
    ),
    winBuckets: [
      { key: "high", label: "≥ 80% · chắc", count: high, amount: highAmt },
      { key: "mid", label: "50–80% · vừa", count: mid, amount: midAmt },
      { key: "low", label: "< 50% · rủi ro", count: low, amount: lowAmt },
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
  const [budgets, details] = await Promise.all([loadBudgets(), loadDetails()]);
  const { yearDetails } = joinYear(budgets, details, year, budgetOwnerId);
  return yearDetails
    .toSorted((a, b) => num(b.Amount) - num(a.Amount))
    .slice(0, limit)
    .map((r) => ({
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

function fullGroups(
  details: DetailRow[],
  keyOf: (d: DetailRow) => string,
  nameOf: (d: DetailRow) => string,
): YearGroup[] {
  const map = new Map<
    string,
    {
      key: string;
      name: string;
      n: number;
      amt: number;
      rev: number;
      profit: number;
    }
  >();
  for (const d of details) {
    const key = keyOf(d);
    const g = map.get(key) ?? {
      key,
      name: nameOf(d),
      n: 0,
      amt: 0,
      rev: 0,
      profit: 0,
    };
    g.n += 1;
    g.amt += num(d.Amount);
    g.rev += num(d.RevAmount);
    g.profit += num(d.ProfitAmount);
    const n = nameOf(d);
    if (n) g.name = n;
    map.set(key, g);
  }
  return [...map.values()]
    .sort((a, b) => b.amt - a.amt)
    .map((r) => ({
      key: r.key,
      name: r.name,
      amount: r.amt,
      expected: r.rev,
      count: r.n,
      winRate: weightedRate(r.rev, r.amt),
      profit: r.profit,
    }));
}

export async function getYearBreakdown(year: number): Promise<YearBreakdown> {
  const [budgets, details] = await Promise.all([loadBudgets(), loadDetails()]);
  const { yearDetails } = joinYear(budgets, details, year);
  return {
    categories: fullGroups(
      yearDetails,
      (d) => nz(d.ItemCatgName, "Khác"),
      (d) => nz(d.ItemCatgName, "Khác"),
    ),
    sellers: fullGroups(
      yearDetails,
      (d) => nz(d.EmployeeName, "(Chưa gán)"),
      (d) => nz(d.EmployeeName, "(Chưa gán)"),
    ),
    customers: fullGroups(
      yearDetails,
      (d) => nz(d.CustomerCode, "(Không mã)"),
      (d) => nz(d.CustomerName, "(Không mã)"),
    ),
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

/** Toàn bộ phụ trách hoặc người bán của một năm, kèm cơ cấu win rate và nhóm hàng từng người. */
export async function getPeople(
  year: number,
  kind: PersonKind,
): Promise<Person[]> {
  const [budgets, details] = await Promise.all([loadBudgets(), loadDetails()]);
  const { yearBudgets, yearDetails } = joinYear(budgets, details, year);
  const budgetById = new Map(yearBudgets.map((b) => [Number(b.Id), b]));

  type Agg = {
    key: string;
    name: string;
    n: number;
    amt: number;
    rev: number;
    profit: number;
    customers: Set<string>;
    high: number;
    mid: number;
    low: number;
    highAmt: number;
    midAmt: number;
    lowAmt: number;
    cats: Map<
      string,
      {
        key: string;
        name: string;
        n: number;
        amt: number;
        rev: number;
        profit: number;
      }
    >;
  };

  const peopleMap = new Map<string, Agg>();

  for (const d of yearDetails) {
    const b = budgetById.get(Number(d.pId));
    if (!b) continue;
    const key =
      kind === "owner"
        ? String(b.EmployeeId)
        : nz(d.EmployeeName, "(Chưa gán)");
    const name =
      kind === "owner"
        ? b.EmployeeName?.trim() || key
        : nz(d.EmployeeName, "(Chưa gán)");
    const p = peopleMap.get(key) ?? {
      key,
      name,
      n: 0,
      amt: 0,
      rev: 0,
      profit: 0,
      customers: new Set<string>(),
      high: 0,
      mid: 0,
      low: 0,
      highAmt: 0,
      midAmt: 0,
      lowAmt: 0,
      cats: new Map(),
    };
    if (kind === "owner" && b.EmployeeName?.trim())
      p.name = b.EmployeeName.trim();
    p.n += 1;
    const a = num(d.Amount);
    p.amt += a;
    p.rev += num(d.RevAmount);
    p.profit += num(d.ProfitAmount);
    const code = d.CustomerCode?.trim();
    if (code) p.customers.add(code);
    const win = d.WinRate == null ? 0 : num(d.WinRate);
    if (win >= 0.8) {
      p.high += 1;
      p.highAmt += a;
    } else if (win >= 0.5) {
      p.mid += 1;
      p.midAmt += a;
    } else {
      p.low += 1;
      p.lowAmt += a;
    }
    const cat = nz(d.ItemCatgName, "Khác");
    const c = p.cats.get(cat) ?? {
      key: cat,
      name: cat,
      n: 0,
      amt: 0,
      rev: 0,
      profit: 0,
    };
    c.n += 1;
    c.amt += a;
    c.rev += num(d.RevAmount);
    c.profit += num(d.ProfitAmount);
    p.cats.set(cat, c);
    peopleMap.set(key, p);
  }

  const people: Person[] = [...peopleMap.values()]
    .sort((a, b) => b.amt - a.amt)
    .map((r) => ({
      key: r.key,
      name: r.name,
      amount: r.amt,
      expected: r.rev,
      profit: r.profit,
      count: r.n,
      customers: r.customers.size,
      winRate: weightedRate(r.rev, r.amt),
      buckets: [
        {
          key: "high",
          label: "≥ 80% · chắc",
          count: r.high,
          amount: r.highAmt,
        },
        {
          key: "mid",
          label: "50–80% · vừa",
          count: r.mid,
          amount: r.midAmt,
        },
        {
          key: "low",
          label: "< 50% · rủi ro",
          count: r.low,
          amount: r.lowAmt,
        },
      ],
      categories: [...r.cats.values()]
        .sort((a, b) => b.amt - a.amt)
        .map((c) => ({
          key: c.key,
          name: c.name,
          amount: c.amt,
          expected: c.rev,
          count: c.n,
          winRate: weightedRate(c.rev, c.amt),
          profit: c.profit,
        })),
    }));

  if (kind !== "owner") return people;

  const overview = await getBudgetOverview(year);
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
