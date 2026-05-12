import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex h-screen w-full flex-col md:flex-row bg-background overflow-hidden">
      {/* Left Column: Branding */}
      <div className="flex flex-1 flex-col items-center justify-center bg-primary/5 p-8 text-center md:p-10 border-r border-border/50">
        <div className="max-w-md w-full flex flex-col items-center space-y-6">
          <div className="h-24 w-24 flex items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl shadow-primary/10 border border-border/50">
            <img
              src="/logo-main.jpg"
              alt="BWD Logo"
              className="max-h-full max-w-full object-contain p-1"
            />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-foreground leading-[1.1]">
              BWD Online Water Application
            </h1>
            <p className="mx-auto max-w-[450px] text-base font-medium text-muted-foreground/70 leading-relaxed">
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
      <div className="flex flex-1 items-center justify-center p-8 md:p-10 overflow-y-auto bg-white">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground font-medium">Welcome back! Please enter your details.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
