import { notFound } from "next/navigation";
import { getBudgetDetails, getBudgetOverview } from "@/lib/db/budget";
import { PhuTrachView } from "@/views/phu-trach";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { year } = await searchParams;
  const employeeId = Number(id);
  if (!Number.isInteger(employeeId) || employeeId <= 0) notFound();

  const data = await getBudgetOverview(
    typeof year === "string" ? year : null,
    employeeId,
  );
  const details = data.owners[0]
    ? await getBudgetDetails(employeeId, data.year, 200)
    : [];
  return <PhuTrachView data={data} employeeId={employeeId} details={details} />;
}
