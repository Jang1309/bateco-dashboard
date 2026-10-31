"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { cn } from "cn"

const emptySubscribe = () => () => {}
const useIsMounted = () =>
  useSyncExternalStore(emptySubscribe, () => true, () => false)

const options = [
  { value: "light", label: "Giao diện sáng", icon: SunIcon },
  { value: "dark", label: "Giao diện tối", icon: MoonIcon },
] as const

/** Đổi class trên <html> ngay trong startViewTransition (next-themes chỉ apply qua useEffect). */
function applyThemeClass(value: "light" | "dark") {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(value)
  root.style.colorScheme = value
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useIsMounted()

  const select = (value: "light" | "dark") => {
    if (resolvedTheme === value) return
    const go = () => {
      applyThemeClass(value)
      setTheme(value)
    }
    if (typeof document.startViewTransition !== "function") {
      go()
      return
    }
    document.startViewTransition(go)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Chế độ giao diện"
      className="flex items-center gap-0.5 rounded-full border bg-muted p-0.5"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = mounted && resolvedTheme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => select(value)}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-secondary text-secondary-foreground hover:text-secondary-foreground dark:bg-primary dark:text-primary-foreground dark:hover:text-primary-foreground"
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
