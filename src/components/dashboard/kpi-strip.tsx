import {
  BriefcaseIcon,
  Building2Icon,
  GaugeIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import type { BudgetOverview } from "@/lib/db/budget";
import { formatPct, formatTy } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export const outlineBtn = cn(
  buttonVariants({ variant: "outline" }),
  "h-10 gap-1.5 rounded-full border-border/70 bg-card px-4 text-[0.8125rem] font-medium shadow-[0_1px_2px_rgba(22,46,77,0.05)] transition-[background-color,transform] duration-300 ease-fluid hover:bg-muted/70 active:scale-[0.98]",
);

// các khối hiện lần lượt khi tải trang
const stagger = (i: number) => ({ animationDelay: `${i * 70}ms` });

/** Dải 5 thẻ KPI — dùng cho trang tổng quan và trang chi tiết một phụ trách. */
export function KpiStrip({ data }: { data: BudgetOverview }) {
  const { kpis, owners } = data;
  const single = owners.length === 1;
  const budgetCount = owners.reduce((s, o) => s + o.budgetCount, 0);
  const coverage = kpis.coveragePct;
  const ownersWithCompany = owners.filter((o) => o.company > 0).length;
  // Chỉ so kỳ vọng với chỉ tiêu khi chỉ tiêu đã giao đủ cho mọi phụ trách, tránh % ảo
  const targetComplete =
    ownersWithCompany > 0 && ownersWithCompany === owners.length;
  const noPlan = kpis.plan === 0;
  const coverageChip = noPlan
    ? { text: "Chưa có kế hoạch", tone: "warning" as const }
    : coverage >= 80
      ? { text: "Đạt mục tiêu 80%", tone: "success" as const }
      : coverage >= 50
        ? { text: "Chưa đạt mục tiêu 80%", tone: "warning" as const }
        : { text: "Tỷ lệ kỳ vọng dưới 50%", tone: "destructive" as const };

  return (
    <div className="grid grid-cols-5 gap-5 xsm:grid-cols-1">
      <KpiCard
        index={0}
        featured
        label="Doanh thu kỳ vọng"
        icon={TrendingUpIcon}
        value={`${formatTy(kpis.expected)} tỷ ₫`}
        chip={noPlan ? undefined : `Bằng ${formatPct(coverage)} kế hoạch`}
        foot="pipeline × win rate, cộng dồn"
      />
      <KpiCard
        index={1}
        label="Kế hoạch (pipeline)"
        icon={TargetIcon}
        value={`${formatTy(kpis.plan)} tỷ ₫`}
        foot={
          single
            ? `${budgetCount} kế hoạch`
            : `${budgetCount} kế hoạch · ${owners.length} phụ trách`
        }
      />
      <KpiCard
        index={2}
        label={noPlan || kpis.gap > 0 ? "Còn thiếu" : "Vượt kế hoạch"}
        icon={GaugeIcon}
        value={noPlan ? "—" : `${formatTy(Math.abs(kpis.gap))} tỷ ₫`}
        chip={coverageChip.text}
        chipTone={coverageChip.tone}
        foot="kế hoạch − kỳ vọng"
      />
      <KpiCard
        index={3}
        label="Chỉ tiêu công ty"
        icon={Building2Icon}
        value={kpis.company ? `${formatTy(kpis.company)} tỷ ₫` : "Chưa giao"}
        chip={
          targetComplete
            ? `Kỳ vọng đạt ${formatPct((kpis.expected / kpis.company) * 100)}`
            : single
              ? "Chưa giao chỉ tiêu"
              : `Mới giao ${ownersWithCompany}/${owners.length} phụ trách`
        }
        chipTone={targetComplete ? undefined : "warning"}
        foot={
          targetComplete ? "kỳ vọng ÷ chỉ tiêu" : "chưa đủ để so với kỳ vọng"
        }
      />
      <KpiCard
        index={4}
        label="Hạng mục đang theo"
        icon={BriefcaseIcon}
        value={String(kpis.opportunities)}
        chip={`${kpis.lowWinCount} hạng mục rủi ro`}
        chipTone={kpis.lowWinCount > 0 ? "destructive" : "success"}
        foot={`${kpis.customers} khách hàng · ${data.sellers.length} người bán`}
      />
    </div>
  );
}

function KpiCard({
  index,
  label,
  icon: Icon,
  value,
  chip,
  chipTone,
  foot,
  featured,
}: {
  index: number;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  chip?: string;
  chipTone?: "success" | "warning" | "destructive";
  foot: string;
  featured?: boolean;
}) {
  return (
    // viền kép: khay ngoài + lõi, bán kính đồng tâm; nhấc nhẹ khi hover
    <div
      style={stagger(index)}
      className={cn(
        "group rounded-[1.5rem] p-1.5 ring-1 transition-transform duration-500 ease-fluid hover:-translate-y-0.5",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:ease-fluid motion-safe:fill-mode-both",
        featured
          ? "bg-[#162e4d]/10 shadow-[0_24px_40px_-24px_rgba(22,46,77,0.55)] ring-[#162e4d]/15"
          : "bg-foreground/[0.025] shadow-[0_20px_40px_-28px_rgba(22,46,77,0.18)] ring-foreground/[0.06]",
      )}
    >
      <div
        className={cn(
          "flex h-full flex-col gap-3 rounded-[calc(1.5rem-0.375rem)] px-5 py-5",
          featured
            ? "bg-[radial-gradient(120%_120%_at_0%_0%,#2f5788_0%,#162e4d_62%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
            : "bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(22,46,77,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        )}
      >
        <div className="flex items-start gap-2">
          <p
            className={cn(
              "flex-1 text-[0.78125rem] leading-4 font-medium",
              featured ? "text-white/75" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full transition-transform duration-500 ease-fluid group-hover:scale-105",
              featured
                ? "bg-white/12 text-white ring-1 ring-white/15"
                : "bg-muted text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        {/* số lớn dùng chữ số tỷ lệ (không tabular) cho đẹp */}
        <p className="text-[1.6875rem] leading-8 font-semibold tracking-[-0.025em]">
          {value}
        </p>
        <div className="mt-auto flex flex-col items-start gap-1.5">
          {chip && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.6875rem] leading-4 font-medium",
                featured && "bg-white/12 text-white",
                !featured && !chipTone && "bg-neutral-muted text-foreground",
                chipTone === "success" && "bg-success-muted text-success",
                chipTone === "warning" && "bg-warning-muted text-warning",
                chipTone === "destructive" &&
                  "bg-destructive-muted text-destructive",
              )}
            >
              {chip}
            </span>
          )}
          <p
            className={cn(
              "text-[0.71875rem] leading-4",
              featured ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {foot}
          </p>
        </div>
      </div>
    </div>
  );
}
