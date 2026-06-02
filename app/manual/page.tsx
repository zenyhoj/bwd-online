import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getSessionUser, getCurrentProfile } from "@/lib/auth";
import { roleHome } from "@/lib/routes";

export default async function UserManualPage() {
  const user = await getSessionUser();
  let backHref = "/";
  let manualFile = "USER.md";
  let title = "User Manual";
  
  if (user) {
    try {
      const profile = await getCurrentProfile();
      backHref = roleHome[profile.role];
      if (profile.role === "admin") {
        manualFile = "ADMIN.md";
        title = "Admin Manual";
      }
    } catch (e) {
      // Fallback to home if profile fetch fails
    }
  }

  const manualPath = path.join(process.cwd(), manualFile);
  const content = fs.readFileSync(manualPath, "utf8");

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl animate-fade-in-up">
      <div className="mb-6">
        <Link href={backHref}>
          <Button variant="ghost" className="gap-2 rounded-full font-bold">
            <ChevronLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-xl bg-background/60 backdrop-blur-md">
        <CardHeader className="border-b border-border/50 bg-primary/5 pb-8 pt-10 px-8 lg:px-12">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/70">Official Documentation</p>
            <CardTitle className="text-4xl font-extrabold tracking-tight lg:text-5xl">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-10 lg:px-12 lg:py-16">
          <article className="prose prose-slate dark:prose-invert max-w-none text-foreground
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
            prose-h1:text-4xl prose-h2:text-2xl prose-h2:mt-12 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/50
            prose-p:text-foreground prose-p:leading-relaxed prose-p:font-normal
            prose-li:text-foreground
            prose-strong:text-foreground prose-strong:font-medium
            prose-hr:border-border/50
            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>

      <div className="mt-12 text-center text-xs text-muted-foreground font-medium">
        © {new Date().getFullYear()} Buenavista Water District (BWD). All rights reserved.
      </div>
    </div>
  );
}
