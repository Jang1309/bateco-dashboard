"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavLink = { title: string; url: string };
/** Mục đơn có url; mục cha có items (thu/mở được), không có url riêng. */
type NavItem =
  | (NavLink & { icon: React.ReactNode; items?: undefined })
  | { title: string; icon: React.ReactNode; items: NavLink[]; url?: undefined };

const isActiveUrl = (pathname: string, url: string) =>
  pathname === url.split("?")[0] && !url.includes("?");

export function NavMain({
  items,
  label,
}: {
  label?: string;
  items: NavItem[];
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="px-2 py-0">
      {label && (
        <SidebarGroupLabel className="mb-1.5 px-2 text-[0.625rem] font-medium tracking-[0.14em] text-sidebar-foreground/45 uppercase">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu className="gap-1">
        {items.map((item) =>
          item.items ? (
            <NavParent key={item.title} item={item} pathname={pathname} />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                isActive={isActiveUrl(pathname, item.url)}
                tooltip={item.title}
                render={<Link href={item.url} />}
                className="h-9 rounded-lg px-3 text-[0.8125rem]"
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ),
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function NavParent({
  item,
  pathname,
}: {
  item: Extract<NavItem, { items: NavLink[] }>;
  pathname: string;
}) {
  const childActive = item.items.some((c) => isActiveUrl(pathname, c.url));
  // vừa vào một trang con thì tự mở; sau đó người dùng vẫn thu/mở tùy ý
  const [open, setOpen] = useState(childActive);
  const [wasActive, setWasActive] = useState(childActive);
  if (childActive !== wasActive) {
    setWasActive(childActive);
    if (childActive) setOpen(true);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={
          <SidebarMenuButton
            tooltip={item.title}
            isActive={childActive && !open}
            className="h-9 rounded-lg px-3 text-[0.8125rem]"
          />
        }
      >
        {item.icon}
        <span>{item.title}</span>
        <ChevronRightIcon
          className={cn(
            "ml-auto size-3.5 opacity-60 transition-transform duration-200",
            open && "rotate-90",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mx-3.5 mt-1 mb-1 gap-0.5 border-sidebar-foreground/15 py-1">
          {item.items.map((c) => (
            <SidebarMenuSubItem key={c.title}>
              <SidebarMenuSubButton
                isActive={isActiveUrl(pathname, c.url)}
                render={<Link href={c.url} />}
                className="h-8 rounded-md text-[0.8125rem]"
              >
                <span>{c.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
