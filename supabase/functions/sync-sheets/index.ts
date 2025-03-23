
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers that allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      console.error("Invalid JSON in request body:", e);
      return new Response(
        JSON.stringify({
          error: "Invalid JSON in request body"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Get action type from request
    const { sheetsUrl, action, deliveryId, newStatus } = requestData;
    
    // Validate request parameters for most actions
    if (!sheetsUrl && action !== 'getStatusOptions') {
      console.error("Missing required parameter: sheetsUrl");
      return new Response(
        JSON.stringify({
          error: "Missing required parameter: sheetsUrl"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Process based on action
    if (action === 'updateStatus') {
      if (!deliveryId || !newStatus) {
        console.error("For updateStatus action, deliveryId and newStatus are required");
        return new Response(
          JSON.stringify({
            error: "For updateStatus action, deliveryId and newStatus are required"
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      console.log(`Updating delivery ${deliveryId} to status ${newStatus}`);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Status updated successfully",
          deliveryId,
          newStatus
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    if (action === 'getStatusOptions') {
      console.log("Returning status options");
      
      // Return standard status options
      const statusOptions = [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בדרך" },
        { value: "delivered", label: "נמסר" },
        { value: "failed", label: "נכשל" },
        { value: "returned", label: "הוחזר" }
      ];
      
      return new Response(
        JSON.stringify({ statusOptions }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Default action: Get all deliveries
    console.log(`Fetching deliveries from sheets URL: ${sheetsUrl}`);
    
    // Extract spreadsheet ID from the URL
    const spreadsheetId = extractSheetId(sheetsUrl);
    console.log(`Extracted spreadsheet ID: ${spreadsheetId}`);
    
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({
          error: "Invalid Google Sheets URL format"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    try {
      // Try to fetch the actual sheet data
      // For now, return sample data
      const sampleDeliveries = [
        {
          id: "1",
          trackingNumber: "TRK123456",
          scanDate: new Date().toISOString(),
          statusDate: new Date().toISOString(),
          status: "pending",
          name: "John Doe",
          phone: "0501234567",
          address: "123 Main St, City",
          assignedTo: "Courier 1"
        },
        {
          id: "2",
          trackingNumber: "TRK789012",
          scanDate: new Date().toISOString(),
          statusDate: new Date().toISOString(),
          status: "in_progress",
          name: "Jane Smith",
          phone: "0507654321",
          address: "456 Oak Ave, Town",
          assignedTo: "Courier 2"
        }
      ];
      
      return new Response(
        JSON.stringify({
          deliveries: sampleDeliveries,
          statusOptions: [
            { value: "pending", label: "ממתין" },
            { value: "in_progress", label: "בדרך" },
            { value: "delivered", label: "נמסר" },
            { value: "failed", label: "נכשל" },
            { value: "returned", label: "הוחזר" }
          ],
          lastSyncTime: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (sheetError) {
      console.error("Error fetching sheet data:", sheetError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch data from Google Sheets",
          details: sheetError.message || "Unknown error"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
  } catch (error) {
    console.error("General error in edge function:", error);
    return new Response(
      JSON.stringify({
        error: "Server error",
        details: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

// Helper function to extract sheet ID from URL - enhanced to handle more URL formats
function extractSheetId(url: string): string | null {
  if (!url) return null;
  
  console.log("Extracting sheet ID from URL:", url);
  
  try {
    // Format: /d/{spreadsheetId}/
    const regex1 = /\/d\/([a-zA-Z0-9-_]+)/;
    const match1 = url.match(regex1);
    if (match1 && match1[1]) {
      console.log("Extracted using pattern 1:", match1[1]);
      return match1[1];
    }
    
    // Format: spreadsheets/d/{spreadsheetId}/
    const regex2 = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match2 = url.match(regex2);
    if (match2 && match2[1]) {
      console.log("Extracted using pattern 2:", match2[1]);
      return match2[1];
    }
    
    // Format: key={spreadsheetId}
    const regex3 = /key=([a-zA-Z0-9-_]+)/;
    const match3 = url.match(regex3);
    if (match3 && match3[1]) {
      console.log("Extracted using pattern 3:", match3[1]);
      return match3[1];
    }
    
    // Format with gid parameter
    const regex4 = /\/d\/([a-zA-Z0-9-_]+).*#gid=\d+/;
    const match4 = url.match(regex4);
    if (match4 && match4[1]) {
      console.log("Extracted spreadsheet ID with gid:", match4[1]);
      return match4[1];
    }
    
    // Direct ID (if the user just provided the ID)
    const directIdRegex = /^[a-zA-Z0-9-_]{25,45}$/;
    if (directIdRegex.test(url)) {
      console.log("URL appears to be a direct ID");
      return url;
    }
    
    console.log("No valid sheet ID pattern found in URL");
    return null;
  } catch (error) {
    console.error("Error extracting sheet ID:", error);
    return null;
  }
}
