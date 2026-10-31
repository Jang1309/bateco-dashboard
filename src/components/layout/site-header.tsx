"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  SettingsIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { currentUser } from "@/data/seed";

const titles: Record<string, string> = {
  "/": "Tổng quan doanh thu",
  "/so-sanh-nam": "So sánh các năm",
  "/so-sanh-nhan-su": "So sánh nhân sự",
  "/thuat-ngu": "Thuật ngữ",
  "/sap-ra-mat": "Sắp ra mắt",
};

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-card/80 px-8 backdrop-blur-xl xsm:px-3 supports-[backdrop-filter]:bg-card/70">
      <SidebarTrigger className="-ml-2" />
      <nav
        aria-label="Breadcrumb"
        className="flex shrink-0 items-center gap-2 text-[0.8125rem] leading-[1.125rem]"
      >
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground xsm:hidden"
        >
          Bảng điều khiển
        </Link>
        <ChevronRightIcon className="size-4 text-foreground xsm:hidden" />
        <span className="font-medium text-foreground">
          {titles[pathname] ??
            (pathname.startsWith("/phu-trach/")
              ? "Chi tiết phụ trách"
              : "Bảng điều khiển")}
        </span>
      </nav>
      <InputGroup className="h-9 border-border w-80 bg-card xsm:hidden">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Tìm phụ trách, khách hàng…"
          aria-label="Tìm kiếm"
        />
      </InputGroup>
      <div className="flex-1" />
      <button
        type="button"
        aria-label="Thông báo"
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-card text-foreground hover:bg-muted"
      >
        <BellIcon className="size-4" />
        <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive ring-2 ring-card" />
      </button>
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Tài khoản"
              className="flex h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 hover:bg-muted data-popup-open:bg-muted xsm:hidden [&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 data-popup-open:[&>svg:last-child]:rotate-180"
            />
          }
        >
          <Avatar>
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              NA
            </AvatarFallback>
          </Avatar>
          <span className="flex flex-col items-start text-left">
            <span className="text-[0.8125rem] leading-[1.125rem] font-semibold text-foreground">
              {currentUser.name}
            </span>
            <span className="text-xs leading-4 text-muted-foreground">
              Ban giám đốc
            </span>
          </span>
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-xl p-1.5 shadow-[0_16px_40px_-12px_rgba(22,46,77,0.25)]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col px-2 py-1.5">
              <span className="text-[0.8125rem] font-semibold text-foreground">
                {currentUser.name}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Ban giám đốc
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {/* chưa có trang cài đặt → trang "Sắp ra mắt" như các mục chưa làm trên sidebar */}
            <DropdownMenuItem
              render={<Link href="/sap-ra-mat?from=cai-dat" />}
              className="gap-2.5 rounded-lg px-2 py-2 text-[0.8125rem]"
            >
              <SettingsIcon className="size-4" />
              Cài đặt
              <span className="ml-auto rounded-full bg-muted px-1.5 text-[0.6875rem] text-muted-foreground">
                Sắp có
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/thuat-ngu" />}
              className="gap-2.5 rounded-lg px-2 py-2 text-[0.8125rem]"
            >
              <BookOpenIcon className="size-4" />
              Thuật ngữ
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
