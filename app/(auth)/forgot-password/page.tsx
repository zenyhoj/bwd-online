import Image from "next/image";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex h-screen w-full flex-col md:flex-row bg-background overflow-hidden">
      {/* Left Column: Branding */}
      <div className="flex flex-1 flex-col items-center justify-center bg-primary/5 p-6 text-center md:p-8 border-r border-border/50">
        <div className="max-w-md w-full flex flex-col items-center space-y-4">
          <div className="relative h-20 w-20 flex items-center justify-center overflow-hidden bg-white border border-border/50">
            <Image
              src="/logo-main.jpg"
              alt="BWD Logo"
              fill
              priority
              className="object-contain p-1"
            />
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-foreground leading-[1.1]">
              BWD Online Water Application
            </h1>
            <p className="mx-auto max-w-[400px] text-sm font-medium text-muted-foreground/70 leading-relaxed">
              From online seminar to water installation—your digital gateway to seamless water service.
            </p>
          </div>
          
          <div className="pt-4 flex justify-center gap-2">
             <div className="h-1 w-10 rounded-full bg-primary" />
             <div className="h-1 w-2 rounded-full bg-primary/20" />
             <div className="h-1 w-2 rounded-full bg-primary/20" />
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex flex-1 items-center justify-center p-4 md:p-6 bg-white overflow-hidden">
        <div className="w-full max-w-sm space-y-2 py-2">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold tracking-tight">Forgot password?</h2>
            <p className="text-xs text-muted-foreground font-medium">Enter your email and we'll send you a reset link.</p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
