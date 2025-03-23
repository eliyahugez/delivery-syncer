
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./utils/corsHeaders.ts";
import { handleSingleStatusUpdate } from "./handlers/updateStatusHandler.ts";
import { handleStatusOptionsRequest } from "./handlers/statusOptionsHandler.ts";
import { handleSyncRequest } from "./handlers/syncHandler.ts";
import { supabase } from "./supabase.ts";
import { verifyDatabaseSchema } from "./utils/dbDebug.ts";
import { formatError, safeApiCall } from "./utils/errorHandler.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { 
      headers: { ...corsHeaders },
      status: 204
    });
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
    
    const { sheetsUrl, action, deliveryId, newStatus, updateType, forceRefresh, columnMappings } = reqBody;

    console.log("Request body:", JSON.stringify({
      action,
      sheetsUrl: sheetsUrl ? `${sheetsUrl.substring(0, 20)}...` : undefined,
      deliveryId, 
      newStatus,
      hasColumnMappings: columnMappings ? 'yes' : 'no'
    }, null, 2));
    
    // For handling custom column mappings
    if (action === "setColumnMappings" && columnMappings) {
      console.log("Saving custom column mappings:", columnMappings);
      
      const mappingResult = await safeApiCall(async () => {
        const mappingId = sheetsUrl || 'default_mapping';
        
        const { error } = await supabase
          .from('column_mappings')
          .upsert(
            {
              sheet_url: mappingId,
              mappings: columnMappings
            },
            { onConflict: 'sheet_url' }
          );
          
        if (error) throw new Error(error.message);
        
        return { success: true, message: 'מיפוי העמודות נשמר בהצלחה' };
      });
      
      if (mappingResult.error) {
        return new Response(
          JSON.stringify({ 
            error: 'שגיאה בשמירת מיפוי העמודות',
            details: mappingResult.error.message
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify(mappingResult.data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For status update action
    if (action === "updateStatus") {
      if (!deliveryId || !newStatus) {
        return new Response(
          JSON.stringify({ error: 'Delivery ID and new status are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await handleSingleStatusUpdate(supabase, deliveryId, newStatus, updateType, sheetsUrl);
      
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

    // Pass the forceRefresh flag and any custom column mappings to the sync handler
    const result = await handleSyncRequest(sheetsUrl, supabase, {
      forceRefresh: !!forceRefresh,
      customColumnMappings: columnMappings
    });
    
    return new Response(
      JSON.stringify(result.body),
      { status: result.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing request:', error);
    
    const formattedError = formatError(error);
    
    return new Response(
      JSON.stringify(formattedError),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
