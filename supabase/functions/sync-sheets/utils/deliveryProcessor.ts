
import { getValueByField } from "./columnUtils.ts";
import { normalizeStatus } from "./statusUtils.ts";
import { v4 as uuid } from "https://deno.land/std@0.177.0/uuid/mod.ts";

// Process a single row from Google Sheets into a delivery object
export async function processDeliveryRow(
  row: any, 
  rowIndex: number, 
  columnMap: Record<string, number>,
  seenTrackingNumbers: Set<string>,
  supabase: any
) {
  try {
    if (!row.c) {
      return { error: "Invalid row format - missing cells array" };
    }
    
    // Extract cell values
    const cellValues = row.c.map((cell: any) => {
      if (!cell) return '';
      
      // Handle date objects that come from Google Sheets in the format "Date(2025,2,18)"
      if (typeof cell.v === 'string' && cell.v.startsWith('Date(') && cell.v.endsWith(')')) {
        try {
          // Extract date components from the string
          const dateString = cell.v.substring(5, cell.v.length - 1);
          const [year, month, day] = dateString.split(',').map(Number);
          
          // Format as DD/MM/YYYY for Israeli date format
          // Note: month is 0-indexed in JavaScript Date
          return `${day}/${month + 1}/${year}`;
        } catch (e) {
          console.error("Error parsing date value:", cell.v, e);
          return cell.v;
        }
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
        if (value.includes('TM') || value.includes('GWD')) {
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
    
    // Check if name looks like a date value from Google Sheets
    if (name.startsWith('Date(') && name.endsWith(')')) {
      try {
        // Extract date components
        const dateString = name.substring(5, name.length - 1);
        const [year, month, day] = dateString.split(',').map(Number);
        
        // Format as DD/MM/YYYY for Israeli date format
        name = `${day}/${month + 1}/${year}`;
        console.log(`Converted date in name field: ${name}`);
      } catch (e) {
        console.error("Error parsing date in name:", name, e);
      }
    }
    
    // Get or infer address - prioritize concatenating address and city if available
    let address = getValueByField(cellValues, 'address', columnMap);
    const city = getValueByField(cellValues, 'city', columnMap);
    
    // If no address found or it's very short, look for a longer text field
    if (!address || address.length < 5) {
      // Try to find a column that has longer text likely to be an address
      for (let i = 0; i < cellValues.length; i++) {
        const value = String(cellValues[i] || '');
        if (value.length > 10 && value.includes(' ') && !value.includes('@') && !value.includes('TM')) {
          // Skip columns that are already mapped to something else
          const isAlreadyMapped = Object.values(columnMap).includes(i);
          if (!isAlreadyMapped) {
            address = value;
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
    if (phone) {
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
    let assignedTo = getValueByField(cellValues, 'assignedTo', columnMap) || "";
    
    // Get external ID if available
    const externalId = getValueByField(cellValues, 'externalId', columnMap) || trackingNumber;
    
    // Check for duplicate tracking numbers
    if (seenTrackingNumbers.has(trackingNumber)) {
      console.warn(`Duplicate tracking number found: ${trackingNumber}`);
      // Append a suffix to make it unique
      trackingNumber = `${trackingNumber}-DUP-${rowIndex}`;
    }
    seenTrackingNumbers.add(trackingNumber);
    
    // Generate a unique ID for the delivery
    const id = uuid();
    
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
      row_index: rowIndex
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
      scanDate
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
