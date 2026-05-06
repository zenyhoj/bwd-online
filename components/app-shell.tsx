"use client";

import Link from "next/link";
import {
  BookOpenText,
  BriefcaseBusiness,
  CreditCard,
  FileCheck2,
  Home,
  HardHat,
  LogOut,
  Menu,
  SearchCheck,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  Users,
  X
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AppRole, Profile } from "@/types";

type AppShellProps = {
  profile: Profile;
  applicantNavMode?: "preseminar" | "hasApplication" | "newApplication";
  navBadges?: Record<string, number>;
  children: React.ReactNode;
};

const navByRole: Record<AppRole, { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  applicant: [
    { href: "/applicant/seminar", label: "Seminar", icon: BookOpenText },
    { href: "/applicant/applications/new", label: "Information", icon: FileCheck2 },
    { href: "/applicant", label: "Dashboard", icon: Home },
    { href: "/applicant/documents", label: "Documents", icon: ShieldCheck },
    { href: "/applicant/payments", label: "Payments", icon: CreditCard }
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/seminars", label: "Seminars", icon: BookOpenText },
    { href: "/admin/plumbers", label: "Plumbers", icon: BriefcaseBusiness },
    { href: "/admin/inspectors", label: "Inspectors", icon: HardHat },
    { href: "/admin/access", label: "Access", icon: UserCog },
    { href: "/admin/inspections", label: "Inspections", icon: SearchCheck },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/concessionaires", label: "Concessionaires", icon: UserRoundCheck }
  ],
  inspector: [
    { href: "/inspector", label: "Assignments", icon: Users }
  ]
};

const roleCopy: Record<AppRole, { label: string; blurb: string }> = {
  admin: {
    label: "Admin control",
    blurb: "Manage seminars, staff access, inspections, and payment workflows."
  },
  applicant: {
    label: "Applicant portal",
    blurb: "Track seminar steps, requirements, documents, and payment progress."
  },
  inspector: {
    label: "Inspector desk",
    blurb: "Review assigned inspections and record field findings with less friction."
  }
};

function getApplicantNavItems(mode: "preseminar" | "hasApplication" | "newApplication") {
  if (mode === "preseminar") {
    return [
      { href: "/applicant/seminar", label: "Seminar", icon: BookOpenText },
      { href: "/applicant", label: "Dashboard", icon: Home },
      { href: "/applicant/documents", label: "Documents", icon: ShieldCheck },
      { href: "/applicant/payments", label: "Payments", icon: CreditCard }
    ];
  }

  if (mode === "hasApplication") {
    return [
      { href: "/applicant", label: "Applicants", icon: FileCheck2 },
      { href: "/applicant/applications/new", label: "Add applicant", icon: FileCheck2 },
      { href: "/applicant/seminar", label: "Seminar", icon: BookOpenText },
      { href: "/applicant/documents", label: "Documents", icon: ShieldCheck },
      { href: "/applicant/payments", label: "Payments", icon: CreditCard }
    ];
  }

  return navByRole.applicant;
}

function NavContent({
  navItems,
  pathname,
  navBadges,
  profile,
  onClose
}: {
  navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
  navBadges: Record<string, number>;
  profile: Profile;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="mb-6 overflow-hidden rounded-2xl border border-border/70 bg-[linear-gradient(160deg,rgba(30,44,74,0.08),rgba(255,164,28,0.12))] p-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">BWD Online</p>
          <p className="text-2xl font-semibold leading-tight">{profile.full_name}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {roleCopy[profile.role].label}
            </span>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium capitalize text-secondary-foreground">
              {profile.role}
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {roleCopy[profile.role].blurb}
        </p>
      </div>
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Navigation</p>
        <span className="text-[11px] text-muted-foreground">{navItems.length} items</span>
      </div>
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== `/${profile.role}` && pathname.startsWith(`${item.href}/`));
          const badge = navBadges[item.href] ?? 0;

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href as never}
              aria-current={isActive ? "page" : undefined}
              onClick={onClose}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-all ${
                isActive
                  ? "bg-[linear-gradient(135deg,rgba(255,164,28,0.14),rgba(30,44,74,0.04))] font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/35 hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  isActive
                    ? "bg-background/85 text-primary shadow-sm ring-1 ring-primary/15"
                    : "text-muted-foreground group-hover:bg-background/75 group-hover:text-foreground"
                }`}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
              </span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 rounded-2xl border border-border/70 bg-muted/20 p-3">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Session</p>
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border/80 bg-background/80 px-3 py-0 text-sm font-medium leading-none text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex h-full items-center justify-center gap-2 leading-none">
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="block leading-none">Sign out</span>
            </span>
          </button>
        </form>
      </div>
    </>
  );
}

export function AppShell({ profile, applicantNavMode = "newApplication", navBadges = {}, children }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    profile.role === "applicant"
      ? getApplicantNavItems(applicantNavMode)
      : navByRole[profile.role];

  return (
    <div className="min-h-screen bg-transparent print:bg-white">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden print:hidden">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">BWD Online</p>
          <p className="text-sm font-semibold leading-none">{profile.full_name}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute left-0 top-0 h-full w-72 border-r border-border/60 bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Menu</p>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Close navigation menu"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavContent
              navItems={navItems}
              pathname={pathname}
              navBadges={navBadges}
              profile={profile}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:px-6 lg:py-8 lg:grid-cols-[240px_1fr] print:block print:max-w-none print:p-0 print:m-0">
        {/* Desktop sidebar */}
        <Card className="relative hidden h-fit overflow-hidden border-border/70 p-4 shadow-sm print:hidden lg:block">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(255,164,28,0.16),transparent_65%)]" />
          <NavContent
            navItems={navItems}
            pathname={pathname}
            navBadges={navBadges}
            profile={profile}
          />
        </Card>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
