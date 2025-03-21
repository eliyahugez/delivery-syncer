
import { getValueByField, isSheetDateValue, formatSheetDate } from "./columnUtils.ts";
import { normalizeStatus } from "./statusUtils.ts";
import { v4 as uuidv4 } from "https://deno.land/std@0.177.0/uuid/mod.ts";

// Function to clean and format phone numbers
function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except + (for international format)
  return phone.replace(/[^\d+]/g, '');
}

// Function to clean addresses by removing special characters
function cleanAddress(address: string): string {
  if (!address) return '';
  
  // Remove extra spaces, redundant dashes and commas
  let cleaned = address.replace(/\s+/g, ' ');  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/^[-,.\s]+|[-,.\s]+$/g, ''); // Remove special chars at start/end
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Process a single row from Google Sheets into a delivery object
export async function processDeliveryRow(
  row: any, 
  rowIndex: number, 
  columnMap: Record<string, number>,
  seenTrackingNumbers: Set<string>,
  supabase: any,
  options: any = {}
) {
  try {
    if (!row.c) {
      return { error: "Invalid row format - missing cells array" };
    }
    
    // Extract cell values
    const cellValues = row.c.map((cell: any) => {
      if (!cell) return '';
      
      // Handle date objects that come from Google Sheets in the format "Date(2025,2,18)"
      if (typeof cell.v === 'string' && isSheetDateValue(cell.v)) {
        return formatSheetDate(cell.v);
      }
      
      // Convert any other value to string
      return cell.v !== undefined && cell.v !== null ? String(cell.v) : '';
    });
    
    // Print the first few rows for debugging
    if (rowIndex < 3) {
      console.log(`Row ${rowIndex} values:`, cellValues);
    }
    
    // Skip empty rows
    if (cellValues.every(v => !v)) {
      return { error: "Empty row" };
    }
    
    // Get tracking number using the defined column mapping
    let trackingNumber = getValueByField(cellValues, 'trackingNumber', columnMap);
    
    // Special handling for tracking numbers - look for TM or GWD patterns in any column
    if (!trackingNumber || trackingNumber === 'undefined' || trackingNumber === 'null') {
      // Try to find a tracking number in any column
      for (let i = 0; i < cellValues.length; i++) {
        const value = String(cellValues[i] || '');
        if (value.includes('TM') || value.includes('GWD') || value.includes('TK')) {
          trackingNumber = value;
          console.log(`Found tracking number in column ${i}: ${trackingNumber}`);
          break;
        }
      }
      
      // If still no tracking number, generate an auto tracking number
      if (!trackingNumber || trackingNumber === 'undefined' || trackingNumber === 'null') {
        trackingNumber = `AUTO-${rowIndex}`;
        console.log(`Generated auto tracking number for row ${rowIndex}: ${trackingNumber}`);
      }
    }
    
    // Get customer name
    let name = getValueByField(cellValues, 'name', columnMap);
    
    // Common city names that could appear in the name field
    const cityNames = [
      "Karnei Shomron", "Karney Shomron", "Karnie Shomron", "Karni Shomron",
      "קרני שומרון", "Ginot Shomron", "גינות שומרון", "Maale Shomron", "מעלה שומרון"
    ];
    
    // Check if name is just a city
    if (name && cityNames.some(city => 
      name.toLowerCase() === city.toLowerCase() || 
      name.toLowerCase().includes(city.toLowerCase())
    )) {
      console.log(`Name appears to be just a city: "${name}"`);
      const cityName = cityNames.find(city => 
        name.toLowerCase() === city.toLowerCase() || 
        name.toLowerCase().includes(city.toLowerCase())
      );
      
      if (cityName) {
        name = `לקוח ב${cityName}`;
      }
    }
    
    // ENHANCED: Check if name looks like a date value from Google Sheets
    if (isSheetDateValue(name)) {
      name = formatSheetDate(name);
      console.log(`Converted date in name field to formatted date: ${name}`);
      
      // ENHANCEMENT: Try to find a real name elsewhere in the row
      for (let i = 0; i < cellValues.length; i++) {
        const value = String(cellValues[i] || '');
        // A real name would typically have more than one word and not be a date/numeric
        if (value && value.includes(' ') && 
            !isSheetDateValue(value) && 
            !/^\d+$/.test(value) &&
            !Object.values(columnMap).includes(i) &&
            value !== trackingNumber) {
          name = value;
          console.log(`Found better name value in column ${i}: ${name}`);
          break;
        }
      }
    }
    
    // ENHANCED: If name is just a date, mark as missing
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(name)) {
      // This is most likely a date, not an actual customer name
      // Store the date, but mark it so the UI can identify it properly
      const dateValue = name;
      name = `[DATE] ${dateValue}`;
      console.log(`Name is just a date (${dateValue}), marking as date value`);
    }
    
    // Get or infer address - prioritize concatenating address and city if available
    let address = getValueByField(cellValues, 'address', columnMap);
    const city = getValueByField(cellValues, 'city', columnMap);
    
    // Clean the address
    if (address) {
      address = cleanAddress(address);
    }
    
    // If no address found or it's very short, look for a longer text field
    if (!address || address.length < 5) {
      // Try to find a column that has longer text likely to be an address
      for (let i = 0; i < cellValues.length; i++) {
        const value = String(cellValues[i] || '');
        if (value.length > 10 && value.includes(' ') && !value.includes('@') && !value.includes('TM')) {
          // Skip columns that are already mapped to something else
          const isAlreadyMapped = Object.values(columnMap).includes(i);
          if (!isAlreadyMapped) {
            address = cleanAddress(value);
            console.log(`Inferred address from column ${i}: ${address}`);
            break;
          }
        }
      }
    }
    
    // Combine address and city if both exist
    if (address && city && !address.includes(city)) {
      address = `${address}, ${city}`;
    } else if (!address && city) {
      address = city;
    }
    
    // Format phone number to international format
    let phone = getValueByField(cellValues, 'phone', columnMap);
    
    // ENHANCED: Check if phone field contains status information instead
    if (phone && (
        phone.toLowerCase().includes('delivered') || 
        phone.toLowerCase().includes('נמסר') || 
        phone.toLowerCase().includes('pending') || 
        phone.toLowerCase().includes('ממתין') ||
        phone.toLowerCase().includes('status')
    )) {
      console.log(`Phone field contains status information: "${phone}"`);
      
      // Try to find an actual phone number in the row
      let foundPhone = false;
      for (let i = 0; i < cellValues.length; i++) {
        const value = String(cellValues[i] || '');
        // Check for phone number patterns
        if (/^0\d{8,9}$/.test(value.replace(/[\s-]/g, '')) || 
            /^\+972\d{8,9}$/.test(value.replace(/[\s-]/g, ''))) {
          phone = value;
          foundPhone = true;
          console.log(`Found actual phone number in column ${i}: ${phone}`);
          break;
        }
      }
      
      if (!foundPhone) {
        // Store the original value as possible status and clear phone
        const possibleStatus = phone;
        phone = '';
        
        // Use this as status if we don't have a status yet
        if (!getValueByField(cellValues, 'status', columnMap)) {
          // Create a temporary status mapping to use this column
          let tempColumnMap = {...columnMap};
          const phoneColIndex = columnMap['phone'];
          if (phoneColIndex !== undefined) {
            tempColumnMap['status'] = phoneColIndex;
            console.log(`Using phone column as status column instead`);
          }
        }
      }
    }
    
    if (phone) {
      // Clean the phone number
      phone = cleanPhoneNumber(phone);
      phone = formatPhoneNumber(phone);
    }
    
    // Get status or default to "pending"
    const statusValue = getValueByField(cellValues, 'status', columnMap);
    const status = statusValue ? normalizeStatus(statusValue) : 'pending';
    
    // Get or generate dates
    const now = new Date().toISOString();
    const statusDate = getValueByField(cellValues, 'statusDate', columnMap) || now;
    const scanDate = getValueByField(cellValues, 'scanDate', columnMap) || now;
    
    // Get assigned courier
    let assignedTo = getValueByField(cellValues, 'assignedTo', columnMap) || options.courierName || "";
    
    // Get external ID if available
    const externalId = getValueByField(cellValues, 'externalId', columnMap) || trackingNumber;
    
    // Check for duplicate tracking numbers
    if (seenTrackingNumbers.has(trackingNumber)) {
      console.warn(`Duplicate tracking number found: ${trackingNumber}`);
      // Append a suffix to make it unique
      trackingNumber = `${trackingNumber}-DUP-${rowIndex}`;
    }
    seenTrackingNumbers.add(trackingNumber);
    
    // Generate a unique ID for the delivery - using crypto.randomUUID()
    let id;
    try {
      // Try using the built-in crypto API first
      id = crypto.randomUUID();
      console.log("Generated UUID using crypto.randomUUID()");
    } catch (error) {
      // Fallback to uuidv4 if crypto is not available
      try {
        id = uuidv4();
        console.log("Generated UUID using uuidv4");
      } catch (error2) {
        // If all fails, generate a simple unique ID
        id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        console.log("Generated fallback UUID:", id);
      }
    }
    
    // Import metadata from options
    const { batchId, importTimestamp } = options;
    
    // Create the delivery record
    const deliveryRecord = {
      tracking_number: trackingNumber,
      status,
      name: name || 'ללא שם',
      phone: phone || '',
      address: address || 'כתובת לא זמינה',
      assigned_to: assignedTo || 'לא שויך',
      external_id: externalId,
      status_date: statusDate,
      scan_date: scanDate,
      row_index: rowIndex,
      import_batch: batchId,
      import_timestamp: importTimestamp
    };
    
    // Create the delivery object for the return value
    const delivery = {
      id,
      trackingNumber,
      status,
      name: name || 'ללא שם',
      phone: phone || '',
      address: address || 'כתובת לא זמינה',
      assignedTo: assignedTo || 'לא שויך',
      externalId,
      statusDate,
      scanDate,
      importBatch: batchId
    };
    
    return { delivery, dbRecord: deliveryRecord };
  } catch (err) {
    console.error(`Error processing row ${rowIndex}:`, err);
    return { error: err instanceof Error ? err.message : "Unknown error processing row" };
  }
}

// Helper function to save a delivery to the database
export async function saveDeliveryToDatabase(
  deliveryResult: { delivery: any; dbRecord: any; error?: string },
  supabase: any
) {
  if (deliveryResult.error || !deliveryResult.dbRecord) {
    return { success: false, error: deliveryResult.error || "Invalid delivery data" };
  }
  
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .upsert(deliveryResult.dbRecord, {
        onConflict: 'tracking_number',
        returning: 'minimal'
      });
      
    if (error) {
      console.error("Database error saving delivery:", error);
      
      // If column doesn't exist, try removing it and retrying (helps with schema changes)
      if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
        const columnName = error.message.match(/column ["'](.+?)["']/i)?.[1];
        
        if (columnName && deliveryResult.dbRecord[columnName]) {
          console.log(`Removing non-existent column '${columnName}' and retrying`);
          
          // Remove the problematic column and retry
          const { [columnName]: _, ...cleanedRecord } = deliveryResult.dbRecord;
          
          const { error: retryError } = await supabase
            .from('deliveries')
            .upsert(cleanedRecord, {
              onConflict: 'tracking_number',
              returning: 'minimal'
            });
            
          if (retryError) {
            return { success: false, error: retryError.message, details: retryError.details };
          }
          
          return { success: true, id: deliveryResult.delivery.id };
        }
      }
      
      return { success: false, error: error.message, details: error.details };
    }
    
    return { success: true, id: deliveryResult.delivery.id };
  } catch (err) {
    console.error("Error saving delivery to database:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown database error" };
  }
}

// Helper function to format phone number to international format
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // Remove non-digit characters
  let digits = phone.replace(/\D/g, "");
  
  // Format to international format (+972)
  if (digits.startsWith("972")) {
    return `+${digits}`;
  } else if (digits.startsWith("0")) {
    return `+972${digits.substring(1)}`;
  }
  
  // If it's not starting with 0 or 972, and it has 9-10 digits, assume it's a local number
  if (digits.length >= 9 && digits.length <= 10) {
    return `+972${digits}`;
  }
  
  // Otherwise, return as is
  return phone;
}
