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
  SearchCheck,
  ShieldCheck,
  UserCog,
  UserRoundCheck,
  Users
} from "lucide-react";
import { usePathname } from "next/navigation";

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

export function AppShell({ profile, applicantNavMode = "newApplication", navBadges = {}, children }: AppShellProps) {
  const pathname = usePathname();
  const navItems =
    profile.role === "applicant"
      ? getApplicantNavItems(applicantNavMode)
      : navByRole[profile.role];

  return (
    <div className="min-h-screen bg-transparent print:bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_1fr] print:block print:max-w-none print:p-0 print:m-0">
        <Card className="relative h-fit border-border/70 p-4 shadow-sm print:hidden">
          <div className="mb-6 space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">BWD Online</p>
            <h1 className="text-lg font-semibold">{profile.full_name}</h1>
            <p className="text-sm capitalize text-muted-foreground">{profile.role}</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== `/${profile.role}` && pathname.startsWith(`${item.href}/`));
              const badge = navBadges[item.href] ?? 0;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href as never}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
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
          <form action={signOutAction} className="mt-8">
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </Card>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
