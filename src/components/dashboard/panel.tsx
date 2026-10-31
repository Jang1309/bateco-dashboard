import { CheckIcon, TriangleAlertIcon } from "lucide-react"
import { cn } from "cn"
import { formatPct } from "@/lib/money"

const badgeTone = {
  warning: "bg-warning-muted text-warning",
  destructive: "bg-destructive-muted text-destructive",
  success: "bg-success-muted text-success",
  muted: "bg-muted text-foreground",
  neutral: "bg-neutral-muted text-foreground",
}

export type Tone = keyof typeof badgeTone

export function ToneBadge({
  tone,
  children,
}: {
  tone: Tone
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[0.8125rem] leading-[1.0625rem] font-medium whitespace-nowrap",
        badgeTone[tone],
      )}
    >
      {children}
    </span>
  )
}

/** Khung card viền kép dùng chung các trang dashboard. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    // viền kép: khay ngoài mỏng + lõi trắng, bán kính đồng tâm (1.75rem − 6px)
    <section
      className={cn(
        "flex flex-col rounded-[1.75rem] bg-foreground/[0.025] p-1.5 shadow-[0_24px_48px_-28px_rgba(22,46,77,0.18)] ring-1 ring-foreground/[0.06]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:ease-fluid motion-safe:fill-mode-both",
        className,
      )}
    >
      <div className="flex flex-1 flex-col overflow-hidden rounded-[calc(1.75rem-0.375rem)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(22,46,77,0.05)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <header className="flex items-center gap-3 px-6 pt-5 pb-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <h2 className="text-[1.0625rem] leading-6 font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-[0.8125rem] leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
          {action}
        </header>
        {children}
      </div>
    </section>
  )
}

/** Nhãn win rate / tỷ lệ kỳ vọng: màu trạng thái luôn đi kèm icon. */
export function RatePill({ value }: { value: number }) {
  const { tone, Icon } =
    value < 50
      ? {
          tone: "bg-destructive-muted text-destructive",
          Icon: TriangleAlertIcon,
        }
      : value < 80
        ? { tone: "bg-neutral-muted text-foreground", Icon: null }
        : { tone: "bg-success-muted text-success", Icon: CheckIcon }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.8125rem] leading-5 font-semibold tabular-nums",
        tone,
      )}
    >
      {Icon && <Icon className="size-3" aria-hidden />}
      {formatPct(value)}
    </span>
  )
}
