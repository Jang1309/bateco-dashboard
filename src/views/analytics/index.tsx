import { SpendingHeatmap } from "@/components/analytics/spending-heatmap"
import { CategoryDonut } from "@/components/analytics/category-donut"
import { MonthComparison } from "@/components/analytics/month-comparison"
import { RecurringDetector } from "@/components/analytics/recurring-detector"
import { AiInsights } from "@/components/analytics/ai-insights"

export function AnalyticsView() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <SpendingHeatmap />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryDonut />
        <MonthComparison />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecurringDetector />
        <AiInsights />
      </div>
    </div>
  )
}
