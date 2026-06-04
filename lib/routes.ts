import type { AppRole } from "@/types/domain";

export const publicRoutes = ["/", "/login", "/register", "/privacy-notice", "/accept-invite", "/sw.js", "/manifest.json", "/manual", "/forgot-password", "/auth/callback"];

export const roleHome: Record<AppRole, string> = {
  applicant: "/applicant",
  admin: "/admin",
  inspector: "/inspector"
};

export const rolePrefixes: Record<AppRole, string[]> = {
  applicant: ["/applicant"],
  admin: ["/admin"],
  inspector: ["/inspector"]
};
