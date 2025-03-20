
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { handleSingleStatusUpdate } from "./handlers/updateStatusHandler.ts";
import { handleStatusOptionsRequest } from "./handlers/statusOptionsHandler.ts";
import { handleSyncRequest } from "./handlers/syncHandler.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json();
    const { sheetsUrl, action, deliveryId, newStatus, updateType } = reqBody;

    console.log("Request body:", JSON.stringify(reqBody, null, 2));

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not configured on the server' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // For status update action
    if (action === "updateStatus") {
      if (!deliveryId || !newStatus) {
        return new Response(
          JSON.stringify({ error: 'Delivery ID and new status are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let result;
      // Handle single and batch updates through the same handler
      result = await handleSingleStatusUpdate(supabase, deliveryId, newStatus, updateType, sheetsUrl);
      
      return new Response(
        JSON.stringify(result.body),
        { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For fetching status options - enhanced to better handle Hebrew and matching against sheets
    if (action === "getStatusOptions") {
      const result = await handleStatusOptionsRequest(sheetsUrl);
      return new Response(
        JSON.stringify(result.body),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default action: Sync all data
    if (!sheetsUrl) {
      return new Response(
        JSON.stringify({ error: 'Google Sheets URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await handleSyncRequest(sheetsUrl, supabase);
    
    return new Response(
      JSON.stringify(result.body),
      { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack ? error.stack.split("\n").slice(0, 3).join("\n") : null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
