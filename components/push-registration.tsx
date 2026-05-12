"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { savePushSubscriptionAction } from "@/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function PushRegistration() {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setPermission(Notification.permission);
      
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
          setLoading(false);
        });
      });
    } else {
      setLoading(false);
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

      // Save to server
      const result = await savePushSubscriptionAction(JSON.stringify(sub));
      if (result.success) {
        setSubscription(sub);
        setPermission("granted");
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Failed to subscribe to push notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    if (!subscription) return;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      // Optionally remove from server
      setSubscription(null);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Button variant="outline" size="sm" disabled className="w-full whitespace-nowrap"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing...</Button>;
  }

  if (permission === "denied") {
    return (
      <Button variant="outline" size="sm" disabled className="w-full whitespace-nowrap text-muted-foreground opacity-50">
        <BellOff className="h-4 w-4 mr-2" /> Blocked
      </Button>
    );
  }

  if (subscription) {
    return (
      <Button variant="outline" size="sm" onClick={unsubscribe} className="w-full whitespace-nowrap text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200">
        <Bell className="h-4 w-4 mr-2" /> Notifications On
      </Button>
    );
  }

  return (
    <Button variant="default" size="sm" onClick={subscribe} className="w-full whitespace-nowrap shadow-sm px-3 font-bold">
      <Bell className="h-4 w-4 mr-2" /> Enable Notifications
    </Button>
  );
}
