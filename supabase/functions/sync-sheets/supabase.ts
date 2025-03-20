
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Create a Supabase client for server-side use in the edge function
export const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);
