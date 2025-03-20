
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";
import { extractSheetId, fetchSheetsData, formatPhoneNumber } from "../utils/sheetUtils.ts";
import { analyzeColumns, getValueByField } from "../utils/columnUtils.ts";
import { normalizeStatus } from "../utils/statusUtils.ts";
import { fetchStatusOptionsFromSheets } from "./statusOptionsHandler.ts";

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
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      if (!row.c) {
        failedRows.push({ index: i, reason: 'Row has no cells' });
        continue;
      }

      // Extract values from each cell, handling null/undefined values
      const values = row.c.map((cell: any) => {
        if (!cell) return '';
        return cell.v !== undefined && cell.v !== null ? String(cell.v) : '';
      });
      
      // Skip completely empty rows
      if (values.every((v: string) => v === '')) {
        failedRows.push({ index: i, reason: 'Row is empty' });
        continue;
      }

      // Extract delivery data using column mapping
      const trackingNumber = getValueByField(values, 'trackingNumber', columnMap);
      
      // Skip duplicate tracking numbers
      if (trackingNumber && seenTrackingNumbers.has(trackingNumber)) {
        console.log(`Skipping duplicate tracking number: ${trackingNumber}`);
        continue;
      }
      
      // If we have a tracking number, add it to our set
      if (trackingNumber) {
        seenTrackingNumbers.add(trackingNumber);
      }
      
      // If we don't have a tracking number, generate a unique one using an incrementing counter
      const finalTrackingNumber = trackingNumber || `AUTO-${i}`;
      
      // Get customer name - this is the key change to ensure we get actual customer names
      let customerName = getValueByField(values, 'name', columnMap);
      
      // If no customer name is found, check if there are other columns that might contain it
      if (!customerName || customerName === finalTrackingNumber) {
        // Look for likely customer name columns that weren't identified
        for (let j = 0; j < values.length; j++) {
          // Skip if this column is already mapped to something else
          if (Object.values(columnMap).includes(j)) continue;
          
          const value = values[j];
          // Check if value looks like a customer name (text, not all numbers, not too short)
          if (value && !/^\d+$/.test(value) && value.length > 3 && value !== finalTrackingNumber) {
            customerName = value;
            break;
          }
        }
      }
      
      // If still no customer name, use tracking number as fallback
      if (!customerName || customerName.trim() === '') {
        customerName = finalTrackingNumber;
      }
      
      // Log the first few rows for debugging
      if (i < 5) {
        console.log(`Row ${i}: Customer name: "${customerName}", Tracking: "${finalTrackingNumber}"`);
      }
      
      // Get other fields from the row
      const scanDate = getValueByField(values, 'scanDate', columnMap) || new Date().toISOString();
      const statusDate = getValueByField(values, 'statusDate', columnMap) || new Date().toISOString(); 
      const status = normalizeStatus(getValueByField(values, 'status', columnMap) || 'pending');
      const phone = formatPhoneNumber(getValueByField(values, 'phone', columnMap) || '');
      const address = getValueByField(values, 'address', columnMap) || 'כתובת לא זמינה';
      const city = getValueByField(values, 'city', columnMap) || '';
      const assignedTo = getValueByField(values, 'assignedTo', columnMap) || 'לא שויך';

      // Combine address and city if both exist
      const fullAddress = city && address ? `${address}, ${city}` : address;

      // Generate a UUID for the delivery ID
      const id = uuidv4();

      // Create the delivery object for the response
      const delivery = {
        id,
        trackingNumber: finalTrackingNumber,
        scanDate,
        statusDate,
        status,
        name: customerName, // Use the customerName we determined
        phone,
        address: fullAddress,
        assignedTo
      };

      deliveries.push(delivery);
      
      // Group by customer name
      if (!customerGroups[customerName]) {
        customerGroups[customerName] = [];
      }
      customerGroups[customerName].push(delivery);

      // Prepare database record
      const dbRecord = {
        id,
        tracking_number: finalTrackingNumber,
        scan_date: new Date(scanDate).toISOString(),
        status_date: new Date(statusDate).toISOString(),
        status,
        name: customerName, // Use the customerName we determined
        phone,
        address: fullAddress,
        assigned_to: assignedTo,
        external_id: finalTrackingNumber  // Use tracking number as external_id for easier reference
      };

      // Check if this tracking number already exists in the database
      try {
        const { data: existingDelivery, error: lookupError } = await supabase
          .from('deliveries')
          .select('id')
          .eq('tracking_number', finalTrackingNumber)
          .maybeSingle();
          
        if (lookupError) {
          console.error(`Error checking for existing delivery with tracking number ${finalTrackingNumber}:`, lookupError);
        }
        
        if (existingDelivery) {
          console.log(`Delivery with tracking number ${finalTrackingNumber} already exists, updating it`);
          
          // Update the existing delivery
          const { error: updateError } = await supabase
            .from('deliveries')
            .update({
              status,
              status_date: new Date(statusDate).toISOString(),
              name: customerName, // Update name with correct customer name
              phone,
              address: fullAddress,
              assigned_to: assignedTo
            })
            .eq('id', existingDelivery.id);
            
          if (updateError) {
            console.error(`Error updating delivery ${existingDelivery.id}:`, updateError);
            failedRows.push({ index: i, reason: `DB update error: ${updateError.message}`, data: dbRecord });
          } else {
            console.log(`Successfully updated delivery ${existingDelivery.id}`);
          }
        } else {
          // Insert new delivery
          const { error: insertError } = await supabase
            .from('deliveries')
            .insert(dbRecord);
            
          if (insertError) {
            console.error(`Error inserting delivery ${id}:`, insertError);
            failedRows.push({ index: i, reason: `DB error: ${insertError.message}`, data: dbRecord });
          } else {
            console.log(`Successfully inserted delivery ${id} with tracking ${finalTrackingNumber}`);
            
            // Create a history entry for new deliveries
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
      } catch (error: any) {
        console.error(`Error during database operation for row ${i}:`, error);
        failedRows.push({ index: i, reason: `Database operation failed: ${error.message}`, data: dbRecord });
      }
    } catch (error: any) {
      console.error(`Error processing row ${i}:`, error);
      failedRows.push({ index: i, reason: error.message });
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
  const statusOptions = await fetchStatusOptionsFromSheets(`https://docs.google.com/spreadsheets/d/${extractSheetId(JSON.stringify(sheetsData))}`);

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

export async function handleSyncRequest(sheetsUrl: string, supabase: any) {
  console.log("Processing Google Sheets URL:", sheetsUrl);

  // Extract sheets ID from URL - improved to handle various URL formats
  const spreadsheetId = extractSheetId(sheetsUrl);
  if (!spreadsheetId) {
    return {
      status: 400,
      body: { error: 'Invalid Google Sheets URL' }
    };
  }

  console.log("Extracted spreadsheet ID:", spreadsheetId);

  // Get Google Sheets data
  try {
    console.log("Fetching sheets data for ID:", spreadsheetId);
    const response = await fetchSheetsData(spreadsheetId);
    
    console.log("Successfully received response from Google Sheets API");
    
    // Log first row of data for debugging
    if (response.table && response.table.rows && response.table.rows.length > 0) {
      const firstRow = response.table.rows[0];
      console.log("First row of data:", JSON.stringify(firstRow, null, 2));
    }
    
    // Process the data and save to Supabase
    const result = await processAndSaveData(response, supabase);

    return {
      status: 200,
      body: result
    };
  } catch (error: any) {
    console.error("Error fetching/processing sheets data:", error);
    
    return {
      status: 500,
      body: { 
        error: error.message || 'Error processing Google Sheets data',
        spreadsheetId 
      }
    };
  }
}
