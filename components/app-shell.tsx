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
  X,
  Download
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { signOutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentPurgeButton } from "@/components/admin/document-purge-button";
import type { AppRole, Profile } from "@/types";

type AppShellProps = {
  profile: Profile;
  applicantNavMode?: "preseminar" | "hasApplication" | "newApplication";
  navBadges?: Record<string, number>;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
};

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; download?: boolean };

const navByRole: Record<AppRole, NavItem[]> = {
  applicant: [
    { href: "/applicant/seminar", label: "Seminar", icon: BookOpenText },
    { href: "/applicant/applications/new", label: "Information", icon: FileCheck2 },
    { href: "/applicant", label: "Dashboard", icon: Home },
    { href: "/applicant/documents", label: "Documents", icon: ShieldCheck },
    { href: "/applicant/plumbers", label: "Plumbers", icon: BriefcaseBusiness },
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
    { href: "/admin/concessionaires", label: "Concessionaires", icon: UserRoundCheck },
    { href: "/admin/export", label: "Export Docs (ZIP)", icon: Download }
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

function getApplicantNavItems(mode: "preseminar" | "hasApplication" | "newApplication"): NavItem[] {
  if (mode === "preseminar") {
    return [
      { href: "/applicant/seminar", label: "Seminar", icon: BookOpenText },
      { href: "/applicant", label: "Dashboard", icon: Home },
      { href: "/applicant/documents", label: "Documents", icon: ShieldCheck },
      { href: "/applicant/plumbers", label: "Plumbers", icon: BriefcaseBusiness },
      { href: "/applicant/payments", label: "Payments", icon: CreditCard }
    ];
  }

  if (mode === "hasApplication") {
    return [
      { href: "/applicant", label: "Applicants", icon: FileCheck2 },
      { href: "/applicant/applications/new", label: "Add applicant", icon: FileCheck2 },
      { href: "/applicant/seminar", label: "Seminar", icon: BookOpenText },
      { href: "/applicant/documents", label: "Documents", icon: ShieldCheck },
      { href: "/applicant/plumbers", label: "Plumbers", icon: BriefcaseBusiness },
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
  isSuperAdmin,
  onClose
}: {
  navItems: NavItem[];
  pathname: string;
  navBadges: Record<string, number>;
  profile: Profile;
  isSuperAdmin?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="mb-6 p-1">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">BWD Online</p>
          <p className="text-2xl font-bold leading-tight tracking-tight">{profile.full_name}</p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
              {roleCopy[profile.role].label}
            </span>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground font-medium">
          {roleCopy[profile.role].blurb}
        </p>
      </div>
      <div className="mb-3 flex items-center justify-between px-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Navigation</p>
      </div>
      <nav className="space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            !item.download && (pathname === item.href || (item.href !== `/${profile.role}` && pathname.startsWith(`${item.href}/`)));
          const badge = navBadges[item.href] ?? 0;

          const sharedClasses = `group flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm transition-all ${
            isActive
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground font-medium"
          }`;

          const content = (
            <>
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center transition-colors ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </span>
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none shadow-sm",
                  isActive 
                    ? "bg-white text-primary" 
                    : "bg-primary text-primary-foreground"
                )}>
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </>
          );

          if (item.download) {
            return (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                download
                onClick={onClose}
                className={sharedClasses}
              >
                {content}
              </a>
            );
          }

          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href as never}
              aria-current={isActive ? "page" : undefined}
              onClick={onClose}
              className={sharedClasses}
            >
              {content}
            </Link>
          );
        })}
      </nav>
      {isSuperAdmin && (
        <div className="mt-4 px-4 pt-4 border-t border-border">
          <DocumentPurgeButton className="group flex w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition-all text-muted-foreground hover:bg-secondary hover:text-foreground" />
        </div>
      )}
      <div className="mt-auto px-1 pt-8">
        <form action={signOutAction}>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center rounded-full border border-border bg-background px-6 py-2 text-sm font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-[0.98]"
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

export function AppShell({ profile, applicantNavMode = "newApplication", navBadges = {}, isSuperAdmin = false, children }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    profile.role === "applicant"
      ? getApplicantNavItems(applicantNavMode)
      : navByRole[profile.role];

  return (
    <div className="min-h-screen bg-transparent print:bg-white">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-4 lg:hidden print:hidden">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">BWD Online</p>
          <p className="text-sm font-bold leading-none">{profile.full_name}</p>
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
              isSuperAdmin={isSuperAdmin}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:px-6 lg:py-8 lg:grid-cols-[240px_1fr] print:block print:max-w-none print:p-0 print:m-0">
        {/* Desktop sidebar */}
        <Card className="relative hidden h-fit overflow-hidden border-border p-4 lg:block print:hidden shadow-none bg-background/50">
          <NavContent
            navItems={navItems}
            pathname={pathname}
            navBadges={navBadges}
            profile={profile}
            isSuperAdmin={isSuperAdmin}
          />
        </Card>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
