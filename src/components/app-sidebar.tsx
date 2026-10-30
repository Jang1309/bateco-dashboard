"use client"

import * as React from "react"
import Link from "next/link"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { currentUser } from "@/data/seed"
import {
  TargetIcon,
  GitCompareArrowsIcon,
  TrophyIcon,
  UsersIcon,
  UserRoundCogIcon,
  PieChartIcon,
  TrendingUpIcon,
  ClipboardCheckIcon,
  BellIcon,
  SettingsIcon,
  LifeBuoyIcon,
  Building2Icon,
} from "lucide-react"

const soon = (slug: string) => `/coming-soon?from=${slug}`

const data = {
  user: currentUser,
  navMain: [
    { title: "So sánh các năm", url: soon("so-sanh-nam"), icon: <GitCompareArrowsIcon /> },
  ],
  navSoon: [
    { title: "Chỉ tiêu công ty", url: soon("chi-tieu"), icon: <TargetIcon /> },
    { title: "Xếp hạng chi nhánh", url: soon("xep-hang"), icon: <TrophyIcon /> },
  ],
  navManage: [
    { title: "Giám đốc vùng", url: soon("giam-doc"), icon: <UserRoundCogIcon /> },
    { title: "Đội bán hàng", url: soon("doi-ban"), icon: <UsersIcon /> },
    { title: "Phân bổ chỉ tiêu", url: soon("phan-bo"), icon: <PieChartIcon /> },
  ],
  navAnalysis: [
    { title: "Phân tích YoY", url: soon("yoy"), icon: <TrendingUpIcon /> },
    { title: "Kiểm toán ngân sách", url: soon("kiem-toan"), icon: <ClipboardCheckIcon /> },
  ],
  navSecondary: [
    { title: "Thông báo", url: soon("thong-bao"), icon: <BellIcon /> },
    { title: "Cài đặt", url: soon("cai-dat"), icon: <SettingsIcon /> },
    { title: "Hỗ trợ", url: soon("ho-tro"), icon: <LifeBuoyIcon /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/coming-soon" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Building2Icon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Bateco</span>
                <span className="truncate text-xs text-sidebar-foreground/65">
                  Revenue BI
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} label="CHÍNH" />
        <NavMain items={data.navSoon} label="CÁC MỤC KHÁC" />
        <NavMain items={data.navManage} label="QUẢN LÝ" />
        <NavMain items={data.navAnalysis} label="PHÂN TÍCH" />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
