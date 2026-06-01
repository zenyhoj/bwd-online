"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { savePushSubscriptionAction } from "@/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushPromptCard() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (typeof window !== "undefined" && !window.isSecureContext) return;
    if (!VAPID_PUBLIC_KEY) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      if (!registration) return;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });

      const result = await savePushSubscriptionAction(JSON.stringify(sub));
      if (result.success) {
        setPermission("granted");
      }
    } catch (error: any) {
      console.error("Failed to subscribe to push notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!supported || permission === "granted" || permission === "denied") {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden lg:hidden">
      <div className="absolute right-0 top-0 text-primary/10 translate-x-1/4 -translate-y-1/4 pointer-events-none">
        <Bell className="w-32 h-32" />
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-primary flex items-center gap-2">
          <Bell className="w-5 h-5 fill-primary/20" />
          Turn on Notifications
        </CardTitle>
        <CardDescription className="text-foreground/80 max-w-[90%] relative z-10">
          Get instantly notified when your application or inspection status changes. Never miss an important update.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={subscribe} disabled={loading} className="font-bold relative z-10">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enable Push Notifications
        </Button>
      </CardContent>
    </Card>
  );
}
