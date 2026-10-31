import budgetsJson from "./budgets.json";
import detailsJson from "./details.json";

export type BudgetRow = {
  Id: number;
  EmployeeId: number;
  EmployeeName: string | null;
  BranchCode: string | null;
  BudgetDate: string;
  BudgetAmount: number | null;
  TotalRevAmount: number | null;
  CompanyAmount: number | null;
  TotalProfitAmount: number | null;
};

export type DetailRow = {
  Id: number;
  pId: number;
  CustomerName: string | null;
  CustomerCode: string | null;
  ProductCostInfo: string | null;
  ItemCatgName: string | null;
  EmployeeName: string | null;
  Amount: number;
  RevAmount: number | null;
  WinRate: number | null;
  ProfitAmount: number | null;
};

export const fixtureBudgets = budgetsJson as BudgetRow[];
export const fixtureDetails = detailsJson as DetailRow[];
