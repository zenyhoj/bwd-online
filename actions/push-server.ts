"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

const isPushConfigured = Boolean(vapidKeys.publicKey && vapidKeys.privateKey);

async function getConfiguredWebPush() {
  if (!isPushConfigured) {
    return null;
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || "mailto:admin@bwd-online.com",
    vapidKeys.publicKey!,
    vapidKeys.privateKey!
  );

  return webpush;
}

export async function sendPushNotificationAction(userId: string, title: string, body: string, url: string = "/") {
  const webpush = await getConfiguredWebPush();
  if (!webpush) {
    console.warn("Push notification skipped: VAPID keys are not configured.");
    return { success: false, error: "Push notifications are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  
  // Get all subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("subscription_json")
    .eq("user_id", userId);

  if (error || !subscriptions) {
    console.error("Error fetching subscriptions:", error);
    return { success: false, error: error?.message };
  }

  const notifications = subscriptions.map((sub: any) => {
    return webpush.sendNotification(
      sub.subscription_json,
      JSON.stringify({ title, body, url })
    ).catch(err => {
      console.error("Push error:", err);
      // If subscription is expired or invalid, we should ideally remove it
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Delete invalid subscription logic could go here
      }
    });
  });

  await Promise.all(notifications);
  return { success: true };
}

export async function broadcastNotificationAction(title: string, body: string, url: string = "/") {
  const webpush = await getConfiguredWebPush();
  if (!webpush) {
    console.warn("Broadcast notification skipped: VAPID keys are not configured.");
    return { success: false, error: "Push notifications are not configured." };
  }

  const supabase = createSupabaseAdminClient();
  
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("subscription_json");

  if (error || !subscriptions) {
    return { success: false, error: error?.message };
  }

  const notifications = subscriptions.map((sub: any) => {
    return webpush.sendNotification(
      sub.subscription_json,
      JSON.stringify({ title, body, url })
    ).catch(err => console.error("Broadcast push error:", err));
  });

  await Promise.all(notifications);
  return { success: true };
}
