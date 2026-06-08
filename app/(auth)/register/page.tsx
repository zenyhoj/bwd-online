import Image from "next/image";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh w-full flex-col bg-background md:h-screen md:flex-row">
      {/* Left Column: Branding */}
      <div className="shrink-0 border-b border-border/50 bg-primary/5 px-4 py-6 text-center md:flex md:flex-1 md:flex-col md:items-center md:justify-center md:border-b-0 md:border-r md:p-8">
        <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-3 md:space-y-4">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden border border-border/50 bg-white md:h-20 md:w-20">
            <Image
              src="/logo-main.jpg"
              alt="BWD Logo"
              fill
              priority
              className="object-contain p-1"
            />
          </div>
          <div className="space-y-2 md:space-y-3">
            <h1 className="text-2xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Join BWD Online
            </h1>
            <p className="mx-auto max-w-[400px] text-sm font-medium leading-relaxed text-muted-foreground/70">
              Create your account to start your water service application journey.
            </p>
          </div>
          
          <div className="hidden justify-center gap-2 pt-2 md:flex md:pt-4">
             <div className="h-1 w-3 rounded-full bg-primary/20" />
             <div className="h-1 w-10 rounded-full bg-primary" />
             <div className="h-1 w-3 rounded-full bg-primary/20" />
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto bg-white p-4 md:items-center md:p-6">
        <div className="w-full max-w-sm space-y-2 py-1 md:py-2">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold tracking-tight">Create your account</h2>
            <p className="text-xs text-muted-foreground font-medium">Join thousands of households getting seamless water service.</p>
          </div>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
