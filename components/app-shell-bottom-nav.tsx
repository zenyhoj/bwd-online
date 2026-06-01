"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; isMore?: boolean };

export function AppShellBottomNav({
  items,
  onMoreClick,
  navBadges = {},
  applicantNavMode
}: {
  items: NavItem[];
  onMoreClick: () => void;
  navBadges?: Record<string, number>;
  applicantNavMode?: "preseminar" | "hasApplication" | "newApplication" | "converted";
}) {
  const pathname = usePathname() ?? "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border/60 bg-background/95 pb-safe backdrop-blur-md lg:hidden print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {items.map((item) => {
        if (item.isMore) {
          return (
            <button
              key="more-btn"
              onClick={onMoreClick}
              className="flex h-full flex-1 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground active:bg-secondary/50"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        }

        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
        const badge = navBadges[item.href] ?? 0;

        return (
          <Link
            key={item.href}
            href={item.href as never}
            className={cn(
              "relative flex h-full flex-1 flex-col items-center justify-center gap-1 transition-colors active:bg-secondary/50",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "fill-primary/20 stroke-[2.5px]")} />
            <span className={cn("text-[10px] font-medium leading-none", isActive && "font-bold")}>
              {item.label}
            </span>
            {badge > 0 && (
              <span className="absolute right-1/4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground shadow-sm">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
