
import { extractSheetId } from "./sheetUtils.ts";
import { processDeliveryRow, saveDeliveryToDatabase } from "./deliveryProcessor.ts";
import { getTableColumns } from "./dbDebug.ts";
import { getColumnMappings, saveColumnMappings } from "./sheetProcessing/columnMapping.ts";
import { getStatusOptions } from "./sheetProcessing/statusOptionsProcessor.ts";
import { v4 as uuidv4 } from "https://deno.land/std@0.177.0/uuid/mod.ts";

interface ProcessOptions {
  forceRefresh?: boolean;
  customColumnMappings?: Record<string, number>;
  archiveOld?: boolean;
  courierName?: string;
}

// Function to process Google Sheets data and save to Supabase
export async function processAndSaveData(sheetsData: any, supabase: any, options: ProcessOptions = {}) {
  console.log("Processing sheet data...");
  console.log("Process options:", options);
  
  // Verify database schema before starting
  const deliveriesColumns = await getTableColumns(supabase, 'deliveries');
  
  if (!deliveriesColumns || deliveriesColumns.length === 0) {
    throw new Error('Cannot access database schema or table structure is invalid. Check Supabase permissions and configuration.');
  }
  
  console.log("Database schema verified, proceeding with data processing");
  
  if (!sheetsData || !sheetsData.table || !sheetsData.table.rows || !sheetsData.table.cols) {
    throw new Error('Invalid Google Sheets data structure');
  }

  // Extract spreadsheet ID and get column mappings
  const spreadsheetId = extractSheetId(JSON.stringify(sheetsData)) || '';
  const columnMap = await getColumnMappings(
    sheetsData, 
    supabase, 
    spreadsheetId, 
    options.customColumnMappings
  );

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
  
  // Generate a batch ID for this import (useful for archiving)
  const batchId = uuidv4();
  const importTimestamp = new Date().toISOString();
  
  // Process each row in the sheet
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Log the first few rows for debugging
    if (i < 5) {
      console.log(`Processing row ${i}:`, row);
    }
    
    try {
      // Add import metadata for archiving purposes
      const processingOptions = {
        batchId,
        importTimestamp,
        courierName: options.courierName
      };
      
      const result = await processDeliveryRow(row, i, columnMap, seenTrackingNumbers, supabase, processingOptions);
      
      if (result.error) {
        failedRows.push({ index: i, reason: result.error });
        continue;
      }
      
      if (!result.delivery) {
        continue; // Skip if no delivery was created (e.g., empty row)
      }
      
      deliveries.push(result.delivery);
      
      // Group by customer name
      const customerName = result.delivery.name || 'Unknown';
      if (!customerGroups[customerName]) {
        customerGroups[customerName] = [];
      }
      customerGroups[customerName].push(result.delivery);
      
      // If archiving is enabled and we have an old status date, set the archived flag
      if (options.archiveOld && result.dbRecord.status_date) {
        const statusDate = new Date(result.dbRecord.status_date);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        if (statusDate < twoWeeksAgo) {
          result.dbRecord.archived = true;
          result.dbRecord.archive_date = importTimestamp;
          result.dbRecord.archive_batch = batchId;
          result.dbRecord.archived_by = options.courierName || 'system';
        }
      }
      
      // Save to database
      const saveResult = await saveDeliveryToDatabase(result, supabase);
      
      if (!saveResult.success) {
        failedRows.push({ 
          index: i, 
          reason: saveResult.error,
          data: result.dbRecord
        });
      }
    } catch (error) {
      console.error(`Error processing row ${i}:`, error);
      failedRows.push({ 
        index: i, 
        reason: error instanceof Error ? error.message : "Unknown error",
        row: JSON.stringify(row).substring(0, 100) + "..."
      });
    }
  }

  // If all rows failed, but we have some partial data, return what we have
  if (failedRows.length === rows.length && deliveries.length === 0) {
    console.error(`Failed to process all ${rows.length} rows. Check sheet format.`);
    return {
      deliveries: [],
      columnMap,
      failedRows,
      count: 0,
      error: `Couldn't process any rows from the sheet`
    };
  }
  
  if (failedRows.length > 0) {
    console.error(`Failed to process ${failedRows.length} out of ${rows.length} rows:`, failedRows);
  }

  // Save column mappings
  await saveColumnMappings(supabase, spreadsheetId || 'last_mapping', columnMap);
    
  // Get unique status options
  const statusOptions = await getStatusOptions(spreadsheetId);

  return {
    deliveries,
    columnMap,
    customerGroups: Object.keys(customerGroups).map(name => ({
      name,
      count: customerGroups[name].length
    })),
    statusOptions,
    count: deliveries.length,
    batchId,
    importTimestamp,
    failedRows: failedRows.length > 0 ? failedRows : undefined
  };
}
