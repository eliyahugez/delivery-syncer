
import { extractSheetId } from "./sheetUtils.ts";
import { analyzeColumns } from "./columnUtils.ts";
import { processDeliveryRow, saveDeliveryToDatabase } from "./deliveryProcessor.ts";
import { fetchStatusOptionsFromSheets } from "../handlers/statusOptionsHandler.ts";

// Function to process Google Sheets data and save to Supabase
export async function processAndSaveData(sheetsData: any, supabase: any) {
  console.log("Processing sheet data...");
  
  if (!sheetsData || !sheetsData.table || !sheetsData.table.rows || !sheetsData.table.cols) {
    throw new Error('Invalid Google Sheets data structure');
  }

  const columns = sheetsData.table.cols.map((col: any) => col.label || "");
  console.log('Detected columns:', columns);

  // Map columns to our expected fields
  const columnMap = analyzeColumns(columns);
  console.log('Column mapping:', columnMap);

  const rows = sheetsData.table.rows;
  const deliveries: any[] = [];
  const customerGroups: Record<string, any[]> = {};
  
  // Check if we have valid data in the sheet
  if (rows.length === 0) {
    throw new Error('No data found in the Google Sheet');
  }
  
  console.log(`Processing ${rows.length} rows from sheet`);
  
  // Track failed rows for debugging
  const failedRows: any[] = [];
  
  // Track seen tracking numbers to avoid duplicates
  const seenTrackingNumbers = new Set<string>();
  
  // Process each row in the sheet
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Log the first few rows for debugging
    if (i < 5) {
      console.log(`Processing row ${i}:`, row);
    }
    
    const result = await processDeliveryRow(row, i, columnMap, seenTrackingNumbers, supabase);
    
    if (result.error) {
      failedRows.push({ index: i, reason: result.error });
      continue;
    }
    
    if (!result.delivery) {
      continue; // Skip if no delivery was created (e.g., empty row)
    }
    
    deliveries.push(result.delivery);
    
    // Group by customer name
    if (!customerGroups[result.delivery.name]) {
      customerGroups[result.delivery.name] = [];
    }
    customerGroups[result.delivery.name].push(result.delivery);
    
    // Save to database
    const saveResult = await saveDeliveryToDatabase(result, supabase);
    
    if (!saveResult.success) {
      failedRows.push({ 
        index: i, 
        reason: saveResult.error,
        data: result.dbRecord
      });
    } else {
      console.log(`Successfully processed delivery ${saveResult.id}`);
    }
  }

  // If all rows failed, throw an error
  if (failedRows.length === rows.length) {
    throw new Error(`Failed to process all ${rows.length} rows. Check sheet format.`);
  }
  
  if (failedRows.length > 0) {
    console.error(`Failed to process ${failedRows.length} out of ${rows.length} rows:`, failedRows);
  }

  // Save column mappings
  try {
    await supabase
      .from('column_mappings')
      .insert(
        {
          sheet_url: extractSheetId(JSON.stringify(sheetsData)) || 'last_mapping',
          mappings: columnMap
        }
      )
      .select();
  } catch (error) {
    console.error("Error saving column mappings:", error);
  }
    
  // Get unique status options
  const spreadsheetId = extractSheetId(JSON.stringify(sheetsData));
  const statusOptions = await fetchStatusOptionsFromSheets(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  return {
    deliveries,
    columnMap,
    customerGroups: Object.keys(customerGroups).map(name => ({
      name,
      count: customerGroups[name].length
    })),
    statusOptions,
    count: deliveries.length,
    failedRows: failedRows.length > 0 ? failedRows : undefined
  };
}
