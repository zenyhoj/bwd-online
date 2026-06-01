"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, MonitorSmartphone } from "lucide-react";

export function InstallPWAButton({ className, variant = "default" }: { className?: string, variant?: "default" | "outline" | "ghost" | "secondary" }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || !deferredPrompt) return null;

  return (
    <Button 
      variant={variant} 
      size="sm" 
      onClick={handleInstallClick} 
      className={className}
    >
      <MonitorSmartphone className="h-4 w-4 mr-2" />
      Install App
    </Button>
  );
}
