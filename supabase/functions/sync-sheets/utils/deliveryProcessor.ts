
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
  isNew?: boolean 
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
      return cell.v !== undefined && cell.v !== null ? String(cell.v) : '';
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
    const trackingNumber = getValueByField(values, 'trackingNumber', columnMap);
    
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
      name: customerName,
      phone,
      address: fullAddress,
      assignedTo
    };

    // Prepare database record
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
      external_id: finalTrackingNumber
    };

    // Check if this tracking number already exists in the database
    const { data: existingDelivery, error: lookupError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('tracking_number', finalTrackingNumber)
      .maybeSingle();
      
    if (lookupError) {
      console.error(`Error checking for existing delivery with tracking number ${finalTrackingNumber}:`, lookupError);
    }
    
    return {
      delivery,
      dbRecord,
      isNew: !existingDelivery,
      existingId: existingDelivery?.id
    };
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
  const { delivery, dbRecord, isNew, existingId } = deliveryData;
  
  try {
    if (isNew) {
      // Insert new delivery
      const { error: insertError } = await supabase
        .from('deliveries')
        .insert(dbRecord);
        
      if (insertError) {
        console.error(`Error inserting delivery ${dbRecord.id}:`, insertError);
        return { 
          success: false, 
          error: `DB error: ${insertError.message}`, 
          id: dbRecord.id 
        };
      }
      
      // Create a history entry for new deliveries
      const { error: historyError } = await supabase
        .from('delivery_history')
        .insert({
          delivery_id: dbRecord.id,
          status: dbRecord.status,
          timestamp: new Date().toISOString(),
          courier: dbRecord.assigned_to
        });
        
      if (historyError) {
        console.error(`Error creating history for ${dbRecord.id}:`, historyError);
        // Don't fail the whole operation for history error
      }
      
      return { success: true, id: dbRecord.id };
    } else {
      // Update the existing delivery
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          status: dbRecord.status,
          status_date: dbRecord.status_date,
          name: dbRecord.name,
          phone: dbRecord.phone,
          address: dbRecord.address,
          assigned_to: dbRecord.assigned_to
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
      id: dbRecord.id 
    };
  }
}
