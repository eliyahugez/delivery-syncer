
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // For status update action
    if (action === "updateStatus") {
      if (!deliveryId || !newStatus) {
        return new Response(
          JSON.stringify({ error: 'Delivery ID and new status are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if we need to batch update for this customer
      
      if (updateType === "batch") {
        console.log(`Batch updating deliveries related to ${deliveryId} to status ${newStatus}`);
        const { data: delivery } = await supabase
          .from('deliveries')
          .select('name')
          .eq('id', deliveryId)
          .single();
          
        if (!delivery || !delivery.name) {
          return new Response(
            JSON.stringify({ error: 'Delivery not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Get all deliveries for this customer
        const { data: relatedDeliveries } = await supabase
          .from('deliveries')
          .select('id, tracking_number')
          .eq('name', delivery.name);
          
        if (!relatedDeliveries || relatedDeliveries.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Related deliveries not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Update all related deliveries
        const now = new Date().toISOString();
        const updates = relatedDeliveries.map(rd => ({
          id: rd.id,
          status: newStatus,
          status_date: now
        }));
        
        const { error: updateError } = await supabase
          .from('deliveries')
          .upsert(updates);
          
        if (updateError) {
          console.error('Error updating related deliveries:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update related deliveries' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Also create history entries for all related deliveries
        const historyEntries = relatedDeliveries.map(rd => ({
          delivery_id: rd.id,
          status: newStatus,
          timestamp: now,
          note: `בעדכון קבוצתי`,
          courier: delivery.name
        }));
        
        const { error: historyError } = await supabase
          .from('delivery_history')
          .insert(historyEntries);
        
        if (historyError) {
          console.error('Error creating history entries:', historyError);
        }
        
        // Update Google Sheets for all related deliveries
        if (sheetsUrl) {
          try {
            await updateGoogleSheetsForBatchUpdate(
              sheetsUrl, 
              delivery.name, 
              newStatus, 
              relatedDeliveries.map(d => d.tracking_number)
            );
          } catch (sheetError) {
            console.error("Error updating Google Sheets:", sheetError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Updated ${relatedDeliveries.length} deliveries`,
            updatedIds: relatedDeliveries.map(d => d.id)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Single delivery update
        console.log(`Updating delivery ${deliveryId} to status ${newStatus}`);
        
        // Get the delivery details
        const { data: delivery, error: fetchError } = await supabase
          .from('deliveries')
          .select('*')
          .eq('id', deliveryId)
          .single();
          
        if (fetchError || !delivery) {
          console.error('Error fetching delivery:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Delivery not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('deliveries')
          .update({ status: newStatus, status_date: now })
          .eq('id', deliveryId);
          
        if (updateError) {
          console.error('Error updating delivery:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update delivery' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { error: historyError } = await supabase
          .from('delivery_history')
          .insert({
            delivery_id: deliveryId,
            status: newStatus,
            timestamp: now
          });
        
        if (historyError) {
          console.error('Error creating history entry:', historyError);
        }
        
        // Update Google Sheets
        if (sheetsUrl && delivery.tracking_number) {
          try {
            await updateGoogleSheets(sheetsUrl, delivery.tracking_number, newStatus);
          } catch (sheetError) {
            console.error("Error updating Google Sheets:", sheetError);
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, message: 'Delivery updated' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // For fetching status options - enhanced to better handle Hebrew and matching against sheets
    if (action === "getStatusOptions") {
      console.log("Fetching status options from sheet:", sheetsUrl);
      const statusOptions = await fetchStatusOptionsFromSheets(sheetsUrl);
      console.log("Found status options:", JSON.stringify(statusOptions));
      return new Response(
        JSON.stringify({ statusOptions }),
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

    console.log("Processing Google Sheets URL:", sheetsUrl);

    // Extract sheets ID from URL - improved to handle various URL formats
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'Invalid Google Sheets URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Extracted spreadsheet ID:", spreadsheetId);

    // Get Google Sheets data
    try {
      const response = await fetchSheetsData(spreadsheetId);
      
      // Process the data and save to Supabase
      const result = await processAndSaveData(response, supabase);
  
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error("Error fetching/processing sheets data:", error);
      
      return new Response(
        JSON.stringify({ 
          error: error.message || 'Error processing Google Sheets data',
          spreadsheetId 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract sheet ID from URL - enhanced to handle more URL formats
function extractSheetId(url: string): string | null {
  console.log("Extracting sheet ID from URL:", url);
  
  // Handle different URL formats
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

// Function to fetch data from Google Sheets
async function fetchSheetsData(spreadsheetId: string): Promise<any> {
  // Using the sheets API with json output
  const apiUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  
  console.log(`Fetching Google Sheets: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheets: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log("Response received, length:", text.length);
    
    // Check if we got an HTML error page instead of JSON
    if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
      console.error("Received HTML instead of JSON data");
      throw new Error("Invalid response format from Google Sheets (received HTML)");
    }
    
    // Google's response is wrapped in a function call that we need to parse
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    
    if (jsonStart < 0 || jsonEnd <= 0) {
      console.error("Invalid response format, cannot find JSON:", text.substring(0, 200));
      throw new Error('Invalid response format from Google Sheets');
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd);
    console.log("JSON data extracted, parsing...");
    
    try {
      const parsedData = JSON.parse(jsonString);
      console.log("Data parsed successfully");
      return parsedData;
    } catch (error) {
      console.error('Error parsing Google Sheets response:', error);
      console.error('Problematic JSON string:', jsonString.substring(0, 200) + "...");
      throw new Error('Failed to parse Google Sheets data');
    }
  } catch (error) {
    console.error("Error in fetchSheetsData:", error);
    throw error;
  }
}

// New function to update Google Sheets for a batch of deliveries by customer name
async function updateGoogleSheetsForBatchUpdate(
  sheetsUrl: string,
  customerName: string,
  newStatus: string,
  trackingNumbers: string[]
): Promise<void> {
  try {
    console.log(`Updating Google Sheets for customer ${customerName} with ${trackingNumbers.length} deliveries`);
    
    // Extract spreadsheet ID
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error("Invalid Google Sheets URL");
    }
    
    // Get the sheet data
    const data = await fetchSheetsData(spreadsheetId);
    
    if (!data?.table?.rows || !data?.table?.cols) {
      throw new Error("Invalid sheet structure");
    }
    
    // Find status and tracking number columns
    const columns = data.table.cols.map((col: any) => col.label || "");
    
    const trackingColIndex = columns.findIndex((col: string) => 
      col.toLowerCase().includes("track") || 
      col.toLowerCase().includes("מעקב") || 
      col.toLowerCase().includes("מספר משלוח"));
      
    const statusColIndex = columns.findIndex((col: string) => 
      col.toLowerCase().includes("status") || 
      col.toLowerCase().includes("סטטוס") || 
      col.toLowerCase().includes("מצב"));
      
    if (trackingColIndex === -1 || statusColIndex === -1) {
      throw new Error("Could not find tracking number or status columns");
    }
    
    console.log(`Found columns: Tracking=${trackingColIndex}, Status=${statusColIndex}`);
    
    // In a real implementation, we would use the Google Sheets API to update the sheet
    console.log(`Would update ${trackingNumbers.length} rows in Google Sheets for customer ${customerName}`);
    console.log("Tracking numbers:", trackingNumbers);
    console.log("New status:", newStatus);
    
    // This is a placeholder for the actual implementation with the Google Sheets API
    return;
  } catch (error) {
    console.error("Error updating Google Sheets for batch update:", error);
    throw error;
  }
}

// New function to update a single delivery in Google Sheets
async function updateGoogleSheets(
  sheetsUrl: string,
  trackingNumber: string,
  newStatus: string
): Promise<void> {
  try {
    console.log(`Updating Google Sheets for tracking number ${trackingNumber} to status ${newStatus}`);
    
    // Extract spreadsheet ID
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error("Invalid Google Sheets URL");
    }
    
    // Get the sheet data
    const data = await fetchSheetsData(spreadsheetId);
    
    if (!data?.table?.rows || !data?.table?.cols) {
      throw new Error("Invalid sheet structure");
    }
    
    // Find status and tracking number columns
    const columns = data.table.cols.map((col: any) => col.label || "");
    
    const trackingColIndex = columns.findIndex((col: string) => 
      col.toLowerCase().includes("track") || 
      col.toLowerCase().includes("מעקב") || 
      col.toLowerCase().includes("מספר משלוח"));
      
    const statusColIndex = columns.findIndex((col: string) => 
      col.toLowerCase().includes("status") || 
      col.toLowerCase().includes("סטטוס") || 
      col.toLowerCase().includes("מצב"));
      
    if (trackingColIndex === -1 || statusColIndex === -1) {
      throw new Error("Could not find tracking number or status columns");
    }
    
    console.log(`Found columns: Tracking=${trackingColIndex}, Status=${statusColIndex}`);
    
    // In a real implementation, we would use the Google Sheets API to update the sheet
    console.log(`Would update row with tracking number ${trackingNumber} to status ${newStatus}`);
    
    // This is a placeholder for the actual implementation with the Google Sheets API
    return;
  } catch (error) {
    console.error("Error updating Google Sheets:", error);
    throw error;
  }
}

// Enhanced function to fetch status options from the Google Sheet
async function fetchStatusOptionsFromSheets(sheetsUrl: string): Promise<any[]> {
  try {
    console.log(`Fetching status options from: ${sheetsUrl}`);
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL');
    }

    // Fetch the whole sheet data
    const data = await fetchSheetsData(spreadsheetId);
    
    // Look for status column
    if (!data || !data.table || !data.table.cols || !data.table.rows) {
      throw new Error('Invalid sheet data structure');
    }

    // Try to find a status column
    const statusColumnIndex = data.table.cols.findIndex((col: any) => {
      const label = (col.label || "").toLowerCase();
      return label.includes("status") || label.includes("סטטוס") || label.includes("מצב");
    });

    console.log(`Status column index: ${statusColumnIndex}`);

    if (statusColumnIndex === -1) {
      console.log('Status column not found, returning default options');
      return [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בדרך" },
        { value: "delivered", label: "נמסר" },
        { value: "failed", label: "נכשל" },
        { value: "returned", label: "הוחזר" }
      ];
    }

    // Extract unique status values
    const uniqueStatuses = new Set();
    data.table.rows.forEach((row: any) => {
      if (row.c && row.c[statusColumnIndex] && row.c[statusColumnIndex].v) {
        uniqueStatuses.add(row.c[statusColumnIndex].v);
      }
    });

    // Convert to the expected format
    const options = Array.from(uniqueStatuses).map((status: any) => {
      const normalizedStatus = normalizeStatus(status);
      return { 
        value: normalizedStatus, 
        label: getHebrewLabel(normalizedStatus, status)
      };
    });

    console.log('Found status options:', options);
    
    // Sort the options in a logical order
    const statusOrder = ["pending", "in_progress", "delivered", "failed", "returned"];
    
    const sortedOptions = [...options].sort((a, b) => {
      const indexA = statusOrder.indexOf(a.value);
      const indexB = statusOrder.indexOf(b.value);
      
      // If both statuses are in our predefined order, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one status is in our order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Otherwise sort alphabetically by label
      return a.label.localeCompare(b.label);
    });
    
    return sortedOptions.length > 0 ? sortedOptions : [
      { value: "pending", label: "ממתין" },
      { value: "in_progress", label: "בדרך" },
      { value: "delivered", label: "נמסר" },
      { value: "failed", label: "נכשל" },
      { value: "returned", label: "הוחזר" }
    ];
  } catch (error) {
    console.error('Error fetching status options:', error);
    // Return default options if there's an error
    return [
      { value: "pending", label: "ממתין" },
      { value: "in_progress", label: "בדרך" },
      { value: "delivered", label: "נמסר" },
      { value: "failed", label: "נכשל" },
      { value: "returned", label: "הוחזר" }
    ];
  }
}

// Helper function to get Hebrew label for status
function getHebrewLabel(normalizedStatus: string, originalStatus: string): string {
  // First try to use the original status if it's in Hebrew
  if (/[\u0590-\u05FF]/.test(originalStatus)) {
    return originalStatus;
  }

  // Otherwise, use default Hebrew translations
  switch (normalizedStatus) {
    case "pending": return "ממתין";
    case "in_progress": return "בדרך";
    case "delivered": return "נמסר";
    case "failed": return "נכשל";
    case "returned": return "הוחזר";
    default: return originalStatus;
  }
}

// Function to process Google Sheets data and save to Supabase
async function processAndSaveData(sheetsData: any, supabase: any): Promise<any> {
  if (!sheetsData || !sheetsData.table || !sheetsData.table.rows || !sheetsData.table.cols) {
    throw new Error('Invalid Google Sheets data structure');
  }

  const columns = sheetsData.table.cols.map((col: any) => col.label || col.id);
  console.log('Detected columns:', columns);

  // Map columns to our expected fields
  const columnMap = analyzeColumns(columns);
  console.log('Column mapping:', columnMap);

  const rows = sheetsData.table.rows;
  const deliveries = [];
  const customerGroups: Record<string, any[]> = {};
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.c) continue;

    const values = row.c.map((cell: any) => cell?.v || '');
    if (values.every((v: any) => v === '')) continue;

    // Extract delivery data using column mapping
    const trackingNumber = getValueByField(values, 'trackingNumber', columnMap) || `unknown-${i}`;
    const scanDate = getValueByField(values, 'scanDate', columnMap) || new Date().toISOString();
    const statusDate = getValueByField(values, 'statusDate', columnMap) || new Date().toISOString(); 
    const status = normalizeStatus(getValueByField(values, 'status', columnMap) || 'pending');
    const name = getValueByField(values, 'name', columnMap) || 'ללא שם';
    const phone = getValueByField(values, 'phone', columnMap) || '';
    const address = getValueByField(values, 'address', columnMap) || 'כתובת לא זמינה';
    const assignedTo = getValueByField(values, 'assignedTo', columnMap) || 'לא שויך';

    // Generate a unique ID (or check if it exists in the database already)
    const id = `${trackingNumber}-${i}`;

    // Create the delivery object for the response
    const delivery = {
      id,
      trackingNumber,
      scanDate,
      statusDate,
      status,
      name,
      phone,
      address,
      assignedTo
    };

    deliveries.push(delivery);
    
    // Group by customer name
    if (!customerGroups[name]) {
      customerGroups[name] = [];
    }
    customerGroups[name].push(delivery);

    // Prepare database record
    const dbRecord = {
      id,
      tracking_number: trackingNumber,
      scan_date: new Date(scanDate).toISOString(),
      status_date: new Date(statusDate).toISOString(),
      status,
      name,
      phone,
      address,
      assigned_to: assignedTo,
      external_id: trackingNumber  // Use tracking number as external_id for easier reference
    };

    // Upsert delivery record
    const { error } = await supabase
      .from('deliveries')
      .upsert(dbRecord, { onConflict: 'id' });

    if (error) {
      console.error(`Error upserting delivery ${id}:`, error);
    } else {
      console.log(`Successfully upserted delivery ${id}`);
      
      // Create a history entry for new deliveries
      const { data: existing } = await supabase
        .from('delivery_history')
        .select('id')
        .eq('delivery_id', id)
        .limit(1);
        
      if (!existing || existing.length === 0) {
        const { error: historyError } = await supabase
          .from('delivery_history')
          .insert({
            delivery_id: id,
            status,
            timestamp: new Date().toISOString(),
            courier: assignedTo
          });
          
        if (historyError) {
          console.error(`Error creating history for ${id}:`, historyError);
        } else {
          console.log(`Created history entry for ${id}`);
        }
      }
    }
  }

  // Save column mappings
  await supabase
    .from('column_mappings')
    .upsert(
      {
        sheet_url: 'last_mapping',
        mappings: columnMap
      },
      { onConflict: 'sheet_url' }
    );
    
  // Get unique status options
  const statusOptions = await fetchStatusOptionsFromSheets(`https://docs.google.com/spreadsheets/d/${extractSheetId(sheetsData)}`);

  return {
    deliveries,
    columnMap,
    customerGroups: Object.keys(customerGroups).map(name => ({
      name,
      count: customerGroups[name].length
    })),
    statusOptions,
    count: deliveries.length
  };
}

// Helper function to get a value using the column mapping
function getValueByField(values: any[], field: string, columnMap: Record<string, number>): string {
  const index = columnMap[field];
  if (index !== undefined && index >= 0 && index < values.length) {
    return String(values[index] || '');
  }
  return '';
}

// Simple column analyzer
function analyzeColumns(columns: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {
    trackingNumber: -1,
    name: -1,
    phone: -1,
    address: -1,
    status: -1,
    statusDate: -1,
    scanDate: -1,
    assignedTo: -1,
  };

  columns.forEach((col, index) => {
    const lowerCol = col.toLowerCase();

    if (
      lowerCol.includes("מספר מעקב") ||
      lowerCol.includes("tracking") ||
      lowerCol.includes("מספר משלוח") ||
      lowerCol.includes("הזמנה")
    ) {
      columnMap.trackingNumber = index;
    } else if (
      lowerCol.includes("שם") ||
      lowerCol.includes("לקוח") ||
      lowerCol.includes("name") ||
      lowerCol.includes("customer")
    ) {
      columnMap.name = index;
    } else if (
      lowerCol.includes("טלפון") ||
      lowerCol.includes("נייד") ||
      lowerCol.includes("phone") ||
      lowerCol.includes("mobile")
    ) {
      columnMap.phone = index;
    } else if (
      lowerCol.includes("כתובת") ||
      lowerCol.includes("address") ||
      lowerCol.includes("location")
    ) {
      columnMap.address = index;
    } else if (
      lowerCol.includes("סטטוס") ||
      lowerCol.includes("status") ||
      lowerCol.includes("מצב")
    ) {
      columnMap.status = index;
    } else if (
      lowerCol.includes("תאריך סטטוס") ||
      lowerCol.includes("status date") ||
      lowerCol.includes("עדכון")
    ) {
      columnMap.statusDate = index;
    } else if (
      lowerCol.includes("תאריך סריקה") ||
      lowerCol.includes("scan date") ||
      lowerCol.includes("נוצר")
    ) {
      columnMap.scanDate = index;
    } else if (
      lowerCol.includes("שליח") ||
      lowerCol.includes("מחלק") ||
      lowerCol.includes("assigned") ||
      lowerCol.includes("courier") ||
      lowerCol.includes("driver")
    ) {
      columnMap.assignedTo = index;
    }
  });

  return columnMap;
}

// Function to normalize status values
function normalizeStatus(status: string): string {
  const statusLower = status.toLowerCase();

  if (
    statusLower.includes("delivered") ||
    statusLower.includes("נמסר") ||
    statusLower.includes("completed") ||
    statusLower.includes("הושלם")
  ) {
    return "delivered";
  }
  if (
    statusLower.includes("pending") ||
    statusLower.includes("ממתין") ||
    statusLower.includes("waiting") ||
    statusLower.includes("new") ||
    statusLower.includes("חדש")
  ) {
    return "pending";
  }
  if (
    statusLower.includes("in_progress") ||
    statusLower.includes("בדרך") ||
    statusLower.includes("out for delivery") ||
    statusLower.includes("בדרך למסירה") ||
    statusLower.includes("delivery in progress") ||
    statusLower.includes("בתהליך")
  ) {
    return "in_progress";
  }
  if (
    statusLower.includes("failed") ||
    statusLower.includes("נכשל") ||
    statusLower.includes("customer not answer") ||
    statusLower.includes("לקוח לא ענה") ||
    statusLower.includes("problem") ||
    statusLower.includes("בעיה")
  ) {
    return "failed";
  }
  if (
    statusLower.includes("return") ||
    statusLower.includes("חבילה חזרה") ||
    statusLower.includes("החזרה") ||
    statusLower.includes("הוחזר")
  ) {
    return "returned";
  }

  return "pending";
}
