
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Create a Supabase client for server-side use in the edge function
// with explicit typing for better error detection
export const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Validate environment variables on initialization
if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
  console.error("Missing Supabase environment variables. Check edge function secrets.");
}
