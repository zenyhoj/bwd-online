import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="mx-auto max-w-[800px] space-y-10 text-center">
        <div className="flex flex-col items-center">
          <div className="mb-8 h-24 w-24 overflow-hidden rounded-3xl shadow-2xl shadow-primary/20 transition-transform hover:scale-105">
            <img
              src="/logo-main.jpg"
              alt="BWD Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-4">BWD Online</p>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            The future of water service applications.
          </h1>
          <p className="mt-8 text-lg font-medium text-muted-foreground/80 leading-relaxed max-w-2xl">
            From online seminar to final installation—apply, track, and manage your water services with ease and efficiency.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/25">
            <Link href="/login">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
            <Link href="/register">Create Account</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
