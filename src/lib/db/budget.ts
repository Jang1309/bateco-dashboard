import { query } from "@/lib/db/sqlserver"

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts.at(-1)![0] ?? ""}`.toUpperCase()
}

function shortName(name: string, max = 28) {
  const t = name.trim().replace(/\s+/g, " ")
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** Fiscal / plan year = YEAR(vB30Budget.BudgetDate) */
export function resolveBudgetYear(raw?: string | number | null) {
  const n = Number(raw)
  if (Number.isInteger(n) && n >= 2000 && n <= 2100) return n
  return new Date().getFullYear()
}

export async function getAvailableBudgetYears(): Promise<number[]> {
  const res = await query<{ y: number }>(`
    SELECT DISTINCT YEAR(b.BudgetDate) AS y
    FROM dbo.vB30Budget b
    WHERE b.IsActive = 1 AND b.BudgetDate IS NOT NULL
    ORDER BY y DESC
  `)
  const years = res.recordset.map((r) => num(r.y)).filter((y) => y > 0)
  return years.length > 0 ? years : [new Date().getFullYear()]
}

export type BudgetOwner = {
  id: string
  employeeId: number
  name: string
  initials: string
  branch: string
  budgetCount: number
  plan: number
  expected: number
  company: number
  profit: number
  opportunities: number
  avgWinRate: number
  completion: number
  coverage: number
}

export type BudgetOverview = {
  currency: "VND"
  year: number
  availableYears: number[]
  owners: BudgetOwner[]
  kpis: {
    expected: number
    plan: number
    company: number
    profit: number
    variance: number
    variancePct: number
    coveragePct: number
    opportunities: number
    highWin: number
    midWin: number
    lowWin: number
    avgWinRate: number
  }
  categories: {
    name: string
    amount: number
    expected: number
    profit: number
    count: number
    winRate: number
    marginPct: number
  }[]
  ownerBars: {
    name: string
    fullName: string
    plan: number
    expected: number
    company: number
    profit: number
    coverage: number
    gap: number
  }[]
  topCustomers: {
    name: string
    short: string
    amount: number
    expected: number
    winRate: number
  }[]
  winBuckets: { key: string; label: string; count: number; amount: number }[]
}

const YEAR_FILTER = `b.IsActive = 1 AND b.BudgetDate IS NOT NULL AND YEAR(b.BudgetDate) = @year`

export async function getBudgetOverview(
  yearInput?: string | number | null
): Promise<BudgetOverview> {
  const availableYears = await getAvailableBudgetYears()
  let year = resolveBudgetYear(yearInput)
  if (!availableYears.includes(year)) {
    year = availableYears[0] ?? year
  }

  const inputs = { year }

  const [ownersRes, detailRes, catRes, winRes, cusRes] = await Promise.all([
    query<{
      EmployeeId: number
      EmployeeName: string
      BranchCode: string
      budgets: number
      planAmt: number
      expectedAmt: number
      companyAmt: number
      profitAmt: number
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
      WHERE ${YEAR_FILTER}
      GROUP BY b.EmployeeId, b.EmployeeName, b.BranchCode
      ORDER BY planAmt DESC
    `,
      inputs
    ),
    query<{
      EmployeeId: number
      n: number
      avgWin: number
    }>(
      `
      SELECT
        b.EmployeeId,
        COUNT(d.Id) AS n,
        AVG(CAST(ISNULL(d.WinRate, 0) AS float)) AS avgWin
      FROM dbo.vB30Budget b
      INNER JOIN dbo.vB30BudgetDetail d ON d.pId = b.Id
      WHERE ${YEAR_FILTER}
      GROUP BY b.EmployeeId
    `,
      inputs
    ),
    query<{
      cat: string
      n: number
      amt: number
      rev: number
      profit: number
      win: number
    }>(
      `
      SELECT TOP 8
        ISNULL(NULLIF(LTRIM(RTRIM(d.ItemCatgName)), N''), N'Khác') AS cat,
        COUNT(*) AS n,
        SUM(ISNULL(d.Amount, 0)) AS amt,
        SUM(ISNULL(d.RevAmount, 0)) AS rev,
        SUM(ISNULL(d.ProfitAmount, 0)) AS profit,
        AVG(CAST(ISNULL(d.WinRate, 0) AS float)) AS win
      FROM dbo.vB30BudgetDetail d
      INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
      WHERE ${YEAR_FILTER}
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(d.ItemCatgName)), N''), N'Khác')
      ORDER BY amt DESC
    `,
      inputs
    ),
    query<{
      high: number
      mid: number
      low: number
      highAmt: number
      midAmt: number
      lowAmt: number
      total: number
      avgWin: number
    }>(
      `
      SELECT
        SUM(CASE WHEN d.WinRate >= 0.8 THEN 1 ELSE 0 END) AS high,
        SUM(CASE WHEN d.WinRate >= 0.5 AND d.WinRate < 0.8 THEN 1 ELSE 0 END) AS mid,
        SUM(CASE WHEN d.WinRate < 0.5 OR d.WinRate IS NULL THEN 1 ELSE 0 END) AS low,
        SUM(CASE WHEN d.WinRate >= 0.8 THEN ISNULL(d.Amount, 0) ELSE 0 END) AS highAmt,
        SUM(CASE WHEN d.WinRate >= 0.5 AND d.WinRate < 0.8 THEN ISNULL(d.Amount, 0) ELSE 0 END) AS midAmt,
        SUM(CASE WHEN d.WinRate < 0.5 OR d.WinRate IS NULL THEN ISNULL(d.Amount, 0) ELSE 0 END) AS lowAmt,
        COUNT(*) AS total,
        AVG(CAST(ISNULL(d.WinRate, 0) AS float)) AS avgWin
      FROM dbo.vB30BudgetDetail d
      INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
      WHERE ${YEAR_FILTER}
    `,
      inputs
    ),
    query<{
      cus: string
      amt: number
      rev: number
      win: number
    }>(
      `
      SELECT TOP 8
        ISNULL(NULLIF(LTRIM(RTRIM(d.CustomerName)), N''), N'(Không tên)') AS cus,
        SUM(ISNULL(d.Amount, 0)) AS amt,
        SUM(ISNULL(d.RevAmount, 0)) AS rev,
        AVG(CAST(ISNULL(d.WinRate, 0) AS float)) AS win
      FROM dbo.vB30BudgetDetail d
      INNER JOIN dbo.vB30Budget b ON d.pId = b.Id
      WHERE ${YEAR_FILTER}
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(d.CustomerName)), N''), N'(Không tên)')
      ORDER BY amt DESC
    `,
      inputs
    ),
  ])

  const detailByEmp = new Map(
    detailRes.recordset.map((r) => [
      Number(r.EmployeeId),
      { n: num(r.n), avgWin: num(r.avgWin) },
    ])
  )

  const owners: BudgetOwner[] = ownersRes.recordset.map((r) => {
    const employeeId = Number(r.EmployeeId)
    const plan = num(r.planAmt)
    const expected = num(r.expectedAmt)
    const company = num(r.companyAmt)
    const profit = num(r.profitAmt)
    const d = detailByEmp.get(employeeId) ?? { n: 0, avgWin: 0 }
    const base = company > 0 ? company : plan
    const completion = base > 0 ? Math.round((expected / base) * 100) : 0
    const coverage = plan > 0 ? Math.round((expected / plan) * 100) : 0
    const name = r.EmployeeName?.trim() || `NV ${employeeId}`
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
      avgWinRate: Math.round(d.avgWin * 1000) / 10,
      completion,
      coverage,
    }
  })

  const expected = owners.reduce((s, o) => s + o.expected, 0)
  const plan = owners.reduce((s, o) => s + o.plan, 0)
  const company = owners.reduce((s, o) => s + o.company, 0)
  const profit = owners.reduce((s, o) => s + o.profit, 0)
  const win = winRes.recordset[0]
  const varianceBase = company > 0 ? company : plan
  const variance = expected - varianceBase
  const variancePct =
    varianceBase > 0 ? Math.round((expected / varianceBase) * 100) : 0
  const coveragePct = plan > 0 ? Math.round((expected / plan) * 100) : 0

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
      variance,
      variancePct,
      coveragePct,
      opportunities: num(win?.total),
      highWin: num(win?.high),
      midWin: num(win?.mid),
      lowWin: num(win?.low),
      avgWinRate: Math.round(num(win?.avgWin) * 1000) / 10,
    },
    categories: catRes.recordset.map((c) => {
      const amount = num(c.amt)
      const profitAmt = num(c.profit)
      return {
        name: c.cat,
        amount,
        expected: num(c.rev),
        profit: profitAmt,
        count: num(c.n),
        winRate: Math.round(num(c.win) * 1000) / 10,
        marginPct: amount > 0 ? Math.round((profitAmt / amount) * 1000) / 10 : 0,
      }
    }),
    ownerBars: owners.map((o) => ({
      name: o.name.split(/\s+/).slice(-2).join(" "),
      fullName: o.name,
      plan: o.plan,
      expected: o.expected,
      company: o.company,
      profit: o.profit,
      coverage: o.coverage,
      gap: o.plan - o.expected,
    })),
    topCustomers: cusRes.recordset.map((c) => ({
      name: c.cus,
      short: shortName(c.cus, 34),
      amount: num(c.amt),
      expected: num(c.rev),
      winRate: Math.round(num(c.win) * 1000) / 10,
    })),
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
  }
}

export async function getBudgetDetails(
  budgetOwnerId: number,
  yearInput?: string | number | null,
  take = 50
) {
  const year = resolveBudgetYear(yearInput)
  const limit = Math.min(200, Math.max(1, Math.floor(take)))
  const res = await query<{
    Id: number
    CustomerName: string
    ProductCostInfo: string
    ItemCatgName: string
    EmployeeName: string
    Amount: number
    RevAmount: number
    WinRate: number
    ProfitAmount: number
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
    WHERE ${YEAR_FILTER}
      AND b.EmployeeId = @employeeId
    ORDER BY d.Amount DESC
    `,
    { year, employeeId: budgetOwnerId }
  )
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
  }))
}
