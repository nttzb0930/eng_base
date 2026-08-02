"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/app/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "@/app/utils/cn";

import {
  adminNavigation,
  isAdminNavigationParent,
  isAdminPathActive,
  type AdminNavigationItem,
} from "./admin-navigation";

type AdminNavigationContentProps = {
  collapsed: boolean;
  onNavigate(): void;
  pathname: string;
};

function navigationLinkClass(active: boolean, nested = false) {
  return cn(
    "flex min-h-9 items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    nested ? "gap-2.5 px-3" : "gap-3 px-3",
    active
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
  );
}

function SimpleNavigationItem({
  collapsed,
  item,
  onNavigate,
  pathname,
}: AdminNavigationContentProps & { item: AdminNavigationItem }) {
  const active = isAdminPathActive(pathname, item.href);
  const Icon = item.icon;
  const link = (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        navigationLinkClass(active),
        collapsed && "size-9 justify-center p-0",
      )}
      href={item.href}
      onClick={onNavigate}
    >
      <Icon className="size-4 shrink-0" />
      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function AdminNavigationContent({
  collapsed,
  onNavigate,
  pathname,
}: AdminNavigationContentProps) {
  return (
    <nav aria-label="Điều hướng quản trị" className="space-y-5 px-3 py-4">
      {adminNavigation.map((group) => (
        <section className="space-y-1" key={group.id}>
          {collapsed ? null : (
            <h2 className="px-3 pb-1 text-xs font-medium text-muted-foreground">
              {group.label}
            </h2>
          )}

          {group.items.map((item) => {
            if (!isAdminNavigationParent(item)) {
              return (
                <SimpleNavigationItem
                  collapsed={collapsed}
                  item={item}
                  key={item.href}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              );
            }

            const active = item.children.some((child) =>
              isAdminPathActive(pathname, child.href),
            );
            const Icon = item.icon;

            if (collapsed) {
              return (
                <DropdownMenu key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label={item.label}
                          className={cn(
                            "size-9",
                            active && "bg-accent text-accent-foreground",
                          )}
                          size="icon"
                          variant="ghost"
                        >
                          <Icon />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start" side="right">
                    <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childActive = isAdminPathActive(
                        pathname,
                        child.href,
                      );
                      return (
                        <DropdownMenuItem asChild key={child.href}>
                          <Link
                            aria-current={childActive ? "page" : undefined}
                            href={child.href}
                            onClick={onNavigate}
                          >
                            <ChildIcon />
                            {child.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <Collapsible defaultOpen={active} key={`${item.id}-${pathname}`}>
                <CollapsibleTrigger asChild>
                  <Button
                    className={cn(
                      "group h-9 w-full justify-start gap-3 px-3 font-medium text-muted-foreground hover:text-foreground",
                      active && "text-foreground",
                    )}
                    variant="ghost"
                  >
                    <Icon />
                    <span>{item.label}</span>
                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]:rotate-90" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-4 space-y-1 border-l pl-3 pt-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const childActive = isAdminPathActive(pathname, child.href);
                    return (
                      <Link
                        aria-current={childActive ? "page" : undefined}
                        className={navigationLinkClass(childActive, true)}
                        href={child.href}
                        key={child.href}
                        onClick={onNavigate}
                      >
                        <ChildIcon className="size-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
