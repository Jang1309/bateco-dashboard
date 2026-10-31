"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";
import { Spinner } from "@/components/ui/spinner";
import { yearColor } from "./format";

/** Chọn nhiều năm để so sánh (tối thiểu 2, tối đa maxYears); luôn xếp tăng dần, năm đầu là mốc. */
export function YearPicker({
  available,
  selected,
  maxYears,
}: {
  available: number[];
  selected: number[];
  maxYears: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const years = [...available].sort((x, y) => x - y);

  const toggle = (y: number) => {
    const next = selected.includes(y)
      ? selected.filter((x) => x !== y)
      : [...selected, y].sort((x, z) => x - z);
    startTransition(() => router.push(`/so-sanh-nam?years=${next.join(",")}`));
  };

  return (
    <div
      role="group"
      aria-label="Chọn các năm để so sánh"
      className="flex h-10 items-center gap-1 rounded-full bg-card py-1 pr-1 pl-3.5 shadow-[0_1px_2px_rgba(22,46,77,0.05)] ring-1 ring-border/70 xsm:w-full xsm:overflow-x-auto"
    >
      {pending ? (
        <Spinner className="size-4 shrink-0" />
      ) : (
        <CalendarIcon className="size-4 shrink-0 text-foreground" />
      )}
      <span className="mr-1 text-[0.8125rem] font-medium whitespace-nowrap text-foreground">
        Các năm:
      </span>
      {years.map((y) => {
        const i = selected.indexOf(y);
        const on = i >= 0;
        // giữ tối thiểu 2 năm; không cho chọn quá maxYears
        const locked = on ? selected.length <= 2 : selected.length >= maxYears;
        return (
          <button
            key={y}
            type="button"
            aria-pressed={on}
            disabled={locked || pending}
            title={
              locked
                ? on
                  ? "Cần ít nhất 2 năm để so sánh"
                  : `Tối đa ${maxYears} năm`
                : undefined
            }
            onClick={() => toggle(y)}
            className={cn(
              "flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-medium tabular-nums transition-colors duration-200 ease-fluid disabled:cursor-not-allowed",
              on
                ? "bg-neutral-muted text-foreground ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground disabled:opacity-50",
            )}
          >
            {/* chấm màu khớp với màu năm trên các biểu đồ */}
            {on && (
              <span
                className="size-2 rounded-full"
                style={{ background: yearColor(i, selected.length) }}
              />
            )}
            {y}
          </button>
        );
      })}
    </div>
  );
}
