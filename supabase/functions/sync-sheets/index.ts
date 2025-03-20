
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { handleSingleStatusUpdate } from "./handlers/updateStatusHandler.ts";
import { handleStatusOptionsRequest } from "./handlers/statusOptionsHandler.ts";
import { handleSyncRequest } from "./handlers/syncHandler.ts";
import { supabase } from "./supabase.ts";
import { verifyDatabaseSchema } from "./utils/dbDebug.ts";

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Edge function called");
    
    // Verify supabase client is initialized
    if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(
        JSON.stringify({ 
          error: 'Supabase configuration error',
          details: 'Missing required environment variables'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For debugging and tracing
    console.log("Supabase URL:", Deno.env.get("SUPABASE_URL"));
    
    // Check database schema
    try {
      await verifyDatabaseSchema(supabase);
    } catch (dbError) {
      console.error("Database verification error:", dbError);
      // Continue anyway as we don't want this to block functionality
    }
    
    // Parse request body
    let reqBody;
    try {
      reqBody = await req.json();
    } catch (jsonError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { sheetsUrl, action, deliveryId, newStatus, updateType, forceRefresh } = reqBody;

    console.log("Request body:", JSON.stringify(reqBody, null, 2));
    
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
    
    // For fetching status options
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

    // Pass the forceRefresh flag to the sync handler
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
