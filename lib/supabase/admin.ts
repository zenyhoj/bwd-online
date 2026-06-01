import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/public-env";

export const adminClient = createClient(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
