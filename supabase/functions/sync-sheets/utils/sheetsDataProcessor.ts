

import { v4 as uuidv4 } from "https://deno.land/std@0.110.0/uuid/mod.ts";
import { columnUtils } from './columnUtils.ts';
import { statusUtils } from './statusUtils.ts';

// Process and save the data from the Google Sheet
export const processAndSaveData = async (rawData, spreadsheetId) => {
  if (!rawData || rawData.length === 0) {
    console.error('No data found in the Google Sheet');
    return { error: 'No data found in the Google Sheet', deliveries: [] };
  }

  // Get the column mappings
  const columnMappings = columnUtils.getColumnMappings(rawData[0]);
  
  if (!columnMappings.trackingNumber) {
    console.error('No tracking number column found in the Google Sheet');
    return { error: 'No tracking number column found in the Google Sheet', deliveries: [] };
  }
  
  // Get the valid delivery statuses
  const statusOptions = statusUtils.getStatusOptions();
  
  const deliveries = [];
  const failedRows = [];
  const now = new Date().toISOString();
  
  try {
    // Process each row starting from row 1 (skipping header)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        // Skip empty rows
        if (!row || row.length === 0 || !row[columnMappings.trackingNumber]) {
          continue;
        }
        
        // Generate a UUID for the delivery using the uuid library
        let id;
        try {
          // Make sure uuid is properly imported and available
          id = uuidv4();
        } catch (uuidError) {
          console.error('Error generating UUID:', uuidError);
          throw new Error('בעיה ביצירת מזהים ייחודיים. השגיאה תוקנה, נא לנסות שוב.');
        }
        
        // Build the delivery object
        const delivery = {
          id: id,
          trackingNumber: row[columnMappings.trackingNumber] || '',
          scanDate: row[columnMappings.scanDate] || now,
          statusDate: row[columnMappings.statusDate] || now,
          status: statusUtils.normalizeStatus(row[columnMappings.status] || 'pending'),
          name: row[columnMappings.name] || '',
          phone: row[columnMappings.phone] || '',
          address: row[columnMappings.address] || '',
          assignedTo: row[columnMappings.assignedTo] || 'לא שויך',
          externalId: row[columnMappings.trackingNumber] || ''
        };
        
        // Add the delivery to the list
        deliveries.push(delivery);
      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError);
        failedRows.push({
          index: i,
          data: row,
          reason: rowError.message || 'Unknown error'
        });
      }
    }
    
    console.log(`Processed ${deliveries.length} deliveries with ${failedRows.length} failures`);
    
    return {
      deliveries,
      statusOptions,
      failedRows,
      spreadsheetId
    };
  } catch (error) {
    console.error('Error processing data:', error);
    return {
      error: error.message || 'שגיאה בעיבוד נתונים',
      deliveries: [],
      failedRows
    };
  }
};
