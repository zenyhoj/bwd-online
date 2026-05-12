"use client";

import { createClient } from "@/lib/supabase/client";

export async function savePushSubscriptionAction(subscriptionJson: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      user_id: user.id,
      subscription_json: JSON.parse(subscriptionJson),
    }, {
      onConflict: "user_id, subscription_json"
    });

  if (error) {
    console.error("Error saving push subscription:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Note: This file is actually a client-side action that uses the browser client.
// For sending notifications, we'll need a real server-side action.
