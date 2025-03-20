
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";
import { getValueByField } from "./columnUtils.ts";
import { formatPhoneNumber } from "./sheetUtils.ts";
import { normalizeStatus } from "./statusUtils.ts";

// Process a single row from the sheets data and convert to a delivery object
export async function processDeliveryRow(
  row: any, 
  index: number, 
  columnMap: Record<string, number>, 
  seenTrackingNumbers: Set<string>,
  supabase: any
): Promise<{ 
  delivery: any, 
  dbRecord: any, 
  error?: string,
  isNew?: boolean,
  existingId?: string
}> {
  try {
    if (!row.c) {
      return { 
        delivery: null, 
        dbRecord: null, 
        error: 'Row has no cells' 
      };
    }

    // Extract values from each cell, handling null/undefined values
    const values = row.c.map((cell: any) => {
      if (!cell) return '';
      
      // Handle date objects from Google Sheets
      if (cell.v !== undefined && cell.v !== null) {
        // Check if it's a date string (Google Sheets format)
        if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
          try {
            // Parse Date(yyyy,m,d) format - note months are 0-indexed in JS Date
            const dateMatch = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
            if (dateMatch) {
              const [_, year, month, day] = dateMatch;
              const date = new Date(parseInt(year), parseInt(month)-1, parseInt(day));
              return date.toLocaleDateString('he-IL'); // Format as Israeli date
            }
          } catch (e) {
            console.log("Error parsing date:", cell.v);
          }
        }
        return String(cell.v);
      }
      return '';
    });
    
    // Skip completely empty rows
    if (values.every((v: string) => v === '')) {
      return { 
        delivery: null, 
        dbRecord: null, 
        error: 'Row is empty' 
      };
    }

    // Extract delivery data using column mapping
    let trackingNumber = getValueByField(values, 'trackingNumber', columnMap);
    
    // Log raw value for debugging
    console.log(`Raw tracking number: ${trackingNumber}, Row: ${index}`);
    
    // Look for valid tracking numbers that match the TM format pattern
    if (!trackingNumber || trackingNumber === '' || trackingNumber.startsWith('Date(')) {
      // Check all cells for a value that looks like a tracking number with TM prefix
      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value && (value.startsWith('TM') || value.startsWith('GWD'))) {
          trackingNumber = value;
          console.log(`Found tracking number in column ${i}: ${trackingNumber}`);
          break;
        }
      }
    }
    
    // Skip duplicate tracking numbers
    if (trackingNumber && seenTrackingNumbers.has(trackingNumber)) {
      return { 
        delivery: null, 
        dbRecord: null, 
        error: `Duplicate tracking number: ${trackingNumber}` 
      };
    }
    
    // If we have a tracking number, add it to our set
    if (trackingNumber) {
      seenTrackingNumbers.add(trackingNumber);
    }
    
    // If we don't have a tracking number, generate a unique one using an incrementing counter
    const finalTrackingNumber = trackingNumber || `AUTO-${index}`;
    
    // Get customer name
    let customerName = getValueByField(values, 'name', columnMap);
    
    // Check if customer name looks like a date string and handle it
    if (customerName && (customerName.startsWith('Date(') || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(customerName))) {
      customerName = `לקוח משלוח ${index + 1}`;
    }
    
    // If no customer name is found, or if the customer name is the same as the tracking number,
    // check if there are other columns that might contain it
    if (!customerName || customerName === finalTrackingNumber || customerName.startsWith('GWD') || customerName.startsWith('AUTO-')) {
      // Look for likely customer name columns that weren't identified
      for (let j = 0; j < values.length; j++) {
        // Skip if this column is already mapped to something else
        if (Object.values(columnMap).includes(j)) continue;
        
        const value = values[j];
        // Check if value looks like a customer name (text, not all numbers, not too short, not a tracking number)
        if (value && 
            !/^\d+$/.test(value) && 
            !value.startsWith('Date(') &&
            !value.startsWith('/') &&
            value.length > 2 && 
            value !== finalTrackingNumber &&
            !value.startsWith('GWD') &&
            !value.startsWith('AUTO-')) {
          customerName = value;
          break;
        }
      }
    }
    
    // If still no customer name, or customer name is the same as tracking number,
    // use a generic name to avoid using tracking number as customer name
    if (!customerName || 
        customerName.trim() === '' || 
        customerName === finalTrackingNumber || 
        customerName.startsWith('GWD') || 
        customerName.startsWith('AUTO-') ||
        customerName.startsWith('Date(')) {
      customerName = `לקוח משלוח ${index + 1}`;
    }
    
    // Get other fields from the row
    const scanDate = getValueByField(values, 'scanDate', columnMap) || new Date().toISOString();
    const statusDate = getValueByField(values, 'statusDate', columnMap) || new Date().toISOString(); 
    const status = normalizeStatus(getValueByField(values, 'status', columnMap) || 'pending');
    let phone = formatPhoneNumber(getValueByField(values, 'phone', columnMap) || '');
    let address = getValueByField(values, 'address', columnMap) || '';
    const city = getValueByField(values, 'city', columnMap) || '';
    const assignedTo = getValueByField(values, 'assignedTo', columnMap) || 'לא שויך';
    
    // Get external ID if available (might be used for syncing with external systems)
    const externalId = getValueByField(values, 'externalId', columnMap) || finalTrackingNumber;
    
    // If address is empty, look for address data across all columns
    if (!address || address === 'כתובת לא זמינה') {
      console.log(`Looking for address in row ${index}`);
      
      // Try all columns that have at least 10 characters and might look like addresses
      for (let j = 0; j < values.length; j++) {
        // Skip if this column is already mapped to something else
        if (Object.values(columnMap).includes(j)) continue;
        
        const value = values[j];
        // Check if value looks like an address based on length and content
        if (value && value.length > 10 && (/[א-ת]/.test(value) || /\d/.test(value))) {
          // Avoid using values that are clearly not addresses
          if (!value.startsWith('GWD') && !value.startsWith('TM') && 
              !value.startsWith('Date') && !/^\d+$/.test(value)) {
            address = value;
            console.log(`Found potential address in column ${j}: ${address.substring(0, 30)}...`);
            break;
          }
        }
      }
    }
    
    // If phone is still empty, look for any column that might contain a phone number
    if (!phone) {
      for (let j = 0; j < values.length; j++) {
        // Skip if this column is already mapped to something else
        if (Object.values(columnMap).includes(j)) continue;
        
        const value = values[j];
        // Check if value looks like a phone number
        if (value && /^\+?\d{7,15}$/.test(value.replace(/[\s-()]/g, ''))) {
          phone = formatPhoneNumber(value);
          break;
        }
      }
    }

    // Combine address and city if both exist
    const fullAddress = city && address 
      ? `${address}, ${city}` 
      : address 
        ? address 
        : city 
          ? city 
          : 'כתובת לא זמינה';

    // Generate a UUID for the delivery ID
    const id = uuidv4();

    // Create the delivery object for the response
    const delivery = {
      id,
      trackingNumber: finalTrackingNumber,
      scanDate,
      statusDate,
      status,
      name: customerName,
      phone,
      address: fullAddress,
      assignedTo,
      externalId
    };

    // Prepare database record - using the correct column names as defined in our SQL schema
    const dbRecord = {
      id,
      tracking_number: finalTrackingNumber,
      scan_date: new Date(scanDate).toISOString(),
      status_date: new Date(statusDate).toISOString(),
      status,
      name: customerName,
      phone,
      address: fullAddress,
      assigned_to: assignedTo,
      external_id: externalId
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
        
        // Enhanced error logging for debugging
        if (lookupError.code === "42703") {
          // Column does not exist error - log table structure
          const { data: tableInfo, error: tableError } = await supabase
            .rpc('debug_table_columns', { table_name: 'deliveries' })
            .select();
            
          if (!tableError && tableInfo) {
            console.log("Deliveries table columns:", tableInfo);
          } else {
            console.log("Unable to get table structure:", tableError);
          }
        }
      }
      
      return {
        delivery,
        dbRecord,
        isNew: !existingDelivery,
        existingId: existingDelivery?.id
      };
    } catch (error) {
      console.error(`DB query error for tracking number ${finalTrackingNumber}:`, error);
      return {
        delivery,
        dbRecord,
        isNew: true // Assume new if we can't determine
      };
    }
  } catch (error: any) {
    return {
      delivery: null,
      dbRecord: null,
      error: `Error processing row: ${error.message}`
    };
  }
}

// Save a processed delivery to the database
export async function saveDeliveryToDatabase(
  deliveryData: { delivery: any, dbRecord: any, isNew?: boolean, existingId?: string },
  supabase: any
): Promise<{ success: boolean, error?: string, id: string }> {
  try {
    const { delivery, dbRecord, isNew, existingId } = deliveryData;
    
    // Add debugging
    console.log(`Saving delivery: isNew=${isNew}, id=${existingId || dbRecord.id}`);
    
    if (isNew) {
      // Insert new delivery with enhanced error handling
      console.log("Inserting new delivery with data:", JSON.stringify(dbRecord, null, 2));
      
      const { data, error: insertError } = await supabase
        .from('deliveries')
        .insert(dbRecord)
        .select();
        
      if (insertError) {
        console.error(`Error inserting delivery ${dbRecord.id}:`, insertError);
        
        // Try to diagnose common issues
        if (insertError.code === "23505") {
          return { 
            success: false, 
            error: `Duplicate key value: ${insertError.message}`, 
            id: dbRecord.id 
          };
        } else if (insertError.code === "42703") {
          return { 
            success: false, 
            error: `Column error: ${insertError.message}`, 
            id: dbRecord.id 
          };
        }
        
        return { 
          success: false, 
          error: `DB error: ${insertError.message}`, 
          id: dbRecord.id 
        };
      }
      
      // Create a history entry for new deliveries
      await supabase
        .from('delivery_history')
        .insert({
          delivery_id: dbRecord.id,
          status: dbRecord.status,
          timestamp: new Date().toISOString(),
          courier: dbRecord.assigned_to
        })
        .then(({ error: historyError }) => {
          if (historyError) {
            console.error(`Error creating history for ${dbRecord.id}:`, historyError);
          }
        });
      
      return { success: true, id: dbRecord.id };
    } else {
      // Update the existing delivery
      console.log("Updating existing delivery:", existingId);
      
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          status: dbRecord.status,
          status_date: dbRecord.status_date,
          name: dbRecord.name,
          phone: dbRecord.phone,
          address: dbRecord.address,
          assigned_to: dbRecord.assigned_to,
          external_id: dbRecord.external_id
        })
        .eq('id', existingId);
        
      if (updateError) {
        console.error(`Error updating delivery ${existingId}:`, updateError);
        return { 
          success: false, 
          error: `DB update error: ${updateError.message}`, 
          id: existingId || dbRecord.id 
        };
      }
      
      return { success: true, id: existingId || dbRecord.id };
    }
  } catch (error: any) {
    console.error(`Error during database operation:`, error);
    return { 
      success: false, 
      error: `Database operation failed: ${error.message}`, 
      id: deliveryData.dbRecord.id 
    };
  }
}
