
// Follow Deno and Supabase edge function patterns

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { processAndSaveData } from "./utils/sheetsDataProcessor.ts";
import { fetchSheetsData, extractSheetId } from "./utils/sheetUtils.ts";
import { statusUtils } from "./utils/statusUtils.ts";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    const reqData = await req.json();
    const sheetsUrl = reqData.sheetsUrl;
    const forceRefresh = reqData.forceRefresh || false;
    const previewMode = reqData.preview || false;
    
    console.log(`Request received: URL=${sheetsUrl}, forceRefresh=${forceRefresh}, preview=${previewMode}`);
    
    if (!sheetsUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing sheetsUrl parameter' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Extract the sheet ID from the URL
    const spreadsheetId = extractSheetId(sheetsUrl);
    
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Invalid Google Sheets URL. Could not extract sheet ID.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Fetch the data from Google Sheets
    const rawData = await fetchSheetsData(spreadsheetId);
    
    if (previewMode) {
      // For preview, return a limited set of data without processing
      const previewData = [];
      
      // Try to generate a sample of data (first 5 rows)
      if (rawData && rawData.table && rawData.table.rows) {
        // Get column headers from first row
        const headerRow = rawData.table.rows[0];
        const headers = headerRow.c.map((cell: any) => cell ? (cell.v || '') : '');
        
        // Get data from first 5 rows
        for (let i = 1; i < Math.min(6, rawData.table.rows.length); i++) {
          const row = rawData.table.rows[i];
          if (row && row.c) {
            const rowData: Record<string, any> = {};
            
            // Map column values to headers
            row.c.forEach((cell: any, index: number) => {
              if (index < headers.length) {
                rowData[headers[index]] = cell ? (cell.v || '') : '';
              }
            });
            
            previewData.push(rowData);
          }
        }
      }
      
      return new Response(
        JSON.stringify({ 
          previewData,
          totalRows: rawData?.table?.rows?.length || 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      // Process the data for a full import
      const processedData = await processAndSaveData(rawData, spreadsheetId);
      
      if (processedData.error) {
        return new Response(
          JSON.stringify({ error: processedData.error }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        );
      }
      
      // Get status options
      const statusOptions = statusUtils.getStatusOptions();
      
      // Return the processed data
      return new Response(
        JSON.stringify({
          deliveries: processedData.deliveries,
          statusOptions,
          lastSyncTime: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
  } catch (error) {
    console.error("Error in sync-sheets function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
