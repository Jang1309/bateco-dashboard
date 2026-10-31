"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UsersIcon } from "lucide-react";
import { cn } from "cn";
import type { Person, PersonKind } from "@/lib/db/budget";
import { Spinner } from "@/components/ui/spinner";
import { personColor } from "@/views/so-sanh-nam/components/format";

/** Một người đang được so sánh, kèm ô màu cố định của người đó. */
export type Pick = { slot: number; key: string };

/** Chọn 2–5 người để so sánh; người mới nhận ô màu trống nhỏ nhất, người cũ giữ nguyên màu. */
export function PeoplePicker({
  year,
  kind,
  people,
  picks,
  maxPeople,
}: {
  year: number;
  kind: PersonKind;
  people: Person[];
  picks: Pick[];
  maxPeople: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const sorted = [...people].sort((a, b) => b.amount - a.amount);
  const min = Math.min(2, people.length);

  const go = (next: Pick[]) => {
    const q = new URLSearchParams({ year: String(year), type: kind });
    for (const x of next) q.append("p", `${x.slot}~${x.key}`);
    startTransition(() => router.push(`/so-sanh-nhan-su?${q}`));
  };
  const toggle = (key: string) => {
    if (picks.some((x) => x.key === key))
      return go(picks.filter((x) => x.key !== key));
    const used = new Set(picks.map((x) => x.slot));
    const slot = [...Array(maxPeople).keys()].find((s) => !used.has(s))!;
    go([...picks, { slot, key }]);
  };

  return (
    <div
      role="group"
      aria-label={`Chọn ${kind === "owner" ? "phụ trách" : "người bán"} để so sánh`}
      className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-card p-1.5 shadow-[0_1px_2px_rgba(22,46,77,0.05)] ring-1 ring-border/70"
    >
      <span className="flex items-center gap-1.5 pr-1 pl-2 text-[0.8125rem] font-medium text-foreground">
        {pending ? (
          <Spinner className="size-4" />
        ) : (
          <UsersIcon className="size-4" />
        )}
        So sánh:
      </span>
      {sorted.map((p) => {
        const pick = picks.find((x) => x.key === p.key);
        const on = Boolean(pick);
        // giữ tối thiểu 2 người; không cho chọn quá maxPeople
        const locked = on ? picks.length <= min : picks.length >= maxPeople;
        return (
          <button
            key={p.key}
            type="button"
            aria-pressed={on}
            disabled={locked || pending}
            title={
              locked
                ? on
                  ? "Cần ít nhất 2 người để so sánh"
                  : `Tối đa ${maxPeople} người`
                : undefined
            }
            onClick={() => toggle(p.key)}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium transition-colors duration-200 ease-fluid disabled:cursor-not-allowed",
              on
                ? "bg-neutral-muted text-foreground ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50",
            )}
          >
            {/* chấm màu = màu của người này trên mọi biểu đồ */}
            {pick && (
              <span
                className="size-2.5 rounded-full"
                style={{ background: personColor(pick.slot) }}
              />
            )}
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
