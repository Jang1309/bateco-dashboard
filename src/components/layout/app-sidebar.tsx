"use client";

import Image from "next/image";
import Link from "next/link";
import { NavMain } from "@/components/layout/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { GitCompareArrowsIcon, LayoutDashboardIcon } from "lucide-react";

const data = {
  navMain: [
    { title: "Tổng quan doanh thu", url: "/", icon: <LayoutDashboardIcon /> },
    {
      title: "So sánh",
      icon: <GitCompareArrowsIcon />,
      items: [
        { title: "Các năm", url: "/so-sanh-nam" },
        { title: "Nhân sự", url: "/so-sanh-nhan-su" },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-0 border-b border-white/10 px-4 pt-5 pb-4">
        <Link
          href="/"
          className="flex items-center rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Image
            src="/d-logo-white.png"
            alt="Bateco"
            width={140}
            height={38}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-4">
        <NavMain items={data.navMain} label="Điều hướng" />
      </SidebarContent>
    </Sidebar>
  );
}
