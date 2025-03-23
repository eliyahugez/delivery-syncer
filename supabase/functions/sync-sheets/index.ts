
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Define CORS headers that allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

// Helper for handling CORS preflight requests
function handleCors(req: Request): Response | null {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  // For non-OPTIONS requests, return null to continue processing
  return null;
}

// Helper for standardized error responses
function handleError(error: any, status = 500): Response {
  console.error("Edge function error:", error);
  
  const errorMessage = error instanceof Error 
    ? error.message 
    : "An unknown error occurred";
  
  return new Response(
    JSON.stringify({
      error: errorMessage,
      details: error instanceof Error ? error.stack : null,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

// Helper for successful responses
function handleSuccess(data: any, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (e) {
      return handleError({
        message: "Invalid JSON in request body"
      }, 400);
    }

    // Validate request parameters
    const { sheetsUrl, action, deliveryId, newStatus } = requestData;
    if (!sheetsUrl && action !== 'getStatusOptions') {
      return handleError({
        message: "Missing required parameter: sheetsUrl"
      }, 400);
    }

    // Process based on action
    if (action === 'updateStatus') {
      if (!deliveryId || !newStatus) {
        return handleError({
          message: "For updateStatus action, deliveryId and newStatus are required"
        }, 400);
      }
      
      // Here you would implement the actual logic to update a delivery status
      // This is a placeholder for the implementation
      console.log(`Would update delivery ${deliveryId} to status ${newStatus}`);
      
      return handleSuccess({
        success: true,
        message: "Status updated successfully",
        deliveryId,
        newStatus
      });
    }
    
    if (action === 'getStatusOptions') {
      // Return status options
      const statusOptions = [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בדרך" },
        { value: "delivered", label: "נמסר" },
        { value: "failed", label: "נכשל" },
        { value: "returned", label: "הוחזר" }
      ];
      
      return handleSuccess({ statusOptions });
    }

    // Default action: Get all deliveries
    console.log(`Fetching deliveries from sheets URL: ${sheetsUrl}`);
    
    // This would normally fetch from Google Sheets or a database
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
    
    return handleSuccess({
      deliveries: sampleDeliveries,
      statusOptions: [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בדרך" },
        { value: "delivered", label: "נמסר" },
        { value: "failed", label: "נכשל" },
        { value: "returned", label: "הוחזר" }
      ],
      lastSyncTime: new Date().toISOString()
    });
    
  } catch (error) {
    return handleError(error);
  }
});
