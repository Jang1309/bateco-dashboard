import { TongQuanView } from "@/views/tong-quan"
import { getBudgetOverview } from "@/lib/db/budget"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { year } = await searchParams
  const data = await getBudgetOverview(typeof year === "string" ? year : null)
  return <TongQuanView data={data} />
}
