
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
    console.log("Starting sync-sheets function");
    const { sheetsUrl } = await req.json();

    if (!sheetsUrl) {
      console.error("Error: Missing Google Sheets URL");
      return new Response(
        JSON.stringify({ error: 'Google Sheets URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log(`Processing sheet: ${sheetsUrl}`);

    // Extract sheets ID from URL
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      console.error("Error: Invalid Google Sheets URL");
      return new Response(
        JSON.stringify({ error: 'Invalid Google Sheets URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Google Sheets data
    console.log("Fetching data from Google Sheets...");
    const response = await fetchSheetsData(spreadsheetId);
    
    // Process the data and save to Supabase
    console.log("Processing and saving data...");
    const result = await processAndSaveData(response, supabase, sheetsUrl);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to extract sheet ID from URL
function extractSheetId(url: string): string | null {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Function to fetch data from Google Sheets
async function fetchSheetsData(spreadsheetId: string): Promise<any> {
  // Using the sheets API with json output
  const apiUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  
  console.log(`Fetching Google Sheets: ${apiUrl}`);
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    console.error(`Fetch error: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch Google Sheets: ${response.status} ${response.statusText}`);
  }
  
  const text = await response.text();
  
  // Google's response is wrapped in a function call that we need to parse
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  
  if (jsonStart < 0 || jsonEnd <= 0) {
    console.error("Invalid response format");
    throw new Error('Invalid response format from Google Sheets');
  }
  
  const jsonString = text.substring(jsonStart, jsonEnd);
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Error parsing Google Sheets response:', error);
    throw new Error('Failed to parse Google Sheets data');
  }
}

// Function to process Google Sheets data and save to Supabase
async function processAndSaveData(sheetsData: any, supabase: any, sheetsUrl: string): Promise<any> {
  if (!sheetsData || !sheetsData.table || !sheetsData.table.rows || !sheetsData.table.cols) {
    console.error("Invalid data structure", sheetsData);
    throw new Error('Invalid Google Sheets data structure');
  }

  const columns = sheetsData.table.cols.map((col: any) => col.label || col.id);
  console.log('Detected columns:', columns);

  // Map columns to our expected fields
  const columnMap = analyzeColumns(columns);
  console.log('Column mapping:', columnMap);

  const rows = sheetsData.table.rows;
  const deliveries = [];
  const dbOperations = [];
  const courierMap = new Map(); // Group by courier
  const dateMap = new Map(); // Group by date within courier
  
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
    const external_id = `sheet-${spreadsheetId}-${trackingNumber}`; // External ID for tracking source

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
      assignedTo,
      external_id
    };

    deliveries.push(delivery);

    // Group by courier
    if (!courierMap.has(assignedTo)) {
      courierMap.set(assignedTo, []);
    }
    courierMap.get(assignedTo).push(delivery);

    // Group by date within courier
    const dateKey = new Date(statusDate).toISOString().split('T')[0]; // Get just the date part
    const courierDateKey = `${assignedTo}-${dateKey}`;
    if (!dateMap.has(courierDateKey)) {
      dateMap.set(courierDateKey, []);
    }
    dateMap.get(courierDateKey).push(delivery);

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
      external_id
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
        sheet_url: sheetsUrl,
        mappings: columnMap
      },
      { onConflict: 'sheet_url' }
    );

  // Log the data groupings for debugging
  console.log(`Grouped deliveries by courier: ${courierMap.size} couriers`);
  for (const [courier, items] of courierMap.entries()) {
    console.log(`- Courier "${courier}": ${items.length} deliveries`);
  }

  console.log(`Grouped deliveries by courier+date: ${dateMap.size} combinations`);

  return {
    deliveries,
    columnMap,
    count: deliveries.length,
    groupedByCourier: Object.fromEntries(courierMap),
    groupedByDate: Object.fromEntries(dateMap)
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
