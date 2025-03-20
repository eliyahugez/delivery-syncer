
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../utils/corsHeaders.ts";
import { extractSheetId } from "../utils/sheetUtils.ts";

// Function to handle status updates for a single delivery
export async function handleSingleStatusUpdate(
  supabase: any,
  deliveryId: string,
  newStatus: string,
  sheetsUrl: string
) {
  console.log(`Updating delivery ${deliveryId} to status ${newStatus}`);
  
  // Get the delivery details
  const { data: delivery, error: fetchError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('id', deliveryId)
    .single();
    
  if (fetchError || !delivery) {
    console.error('Error fetching delivery:', fetchError);
    return {
      status: 404,
      body: { error: 'Delivery not found' }
    };
  }
  
  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('deliveries')
    .update({ status: newStatus, status_date: now })
    .eq('id', deliveryId);
    
  if (updateError) {
    console.error('Error updating delivery:', updateError);
    return {
      status: 500,
      body: { error: 'Failed to update delivery' }
    };
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
  
  return {
    status: 200,
    body: { success: true, message: 'Delivery updated' }
  };
}

// Function to handle batch status updates for multiple deliveries
export async function handleBatchStatusUpdate(
  supabase: any,
  deliveryId: string,
  newStatus: string,
  sheetsUrl: string
) {
  console.log(`Batch updating deliveries related to ${deliveryId} to status ${newStatus}`);
  
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('name')
    .eq('id', deliveryId)
    .single();
    
  if (!delivery || !delivery.name) {
    return {
      status: 404,
      body: { error: 'Delivery not found' }
    };
  }
  
  // Get all deliveries for this customer
  const { data: relatedDeliveries } = await supabase
    .from('deliveries')
    .select('id, tracking_number')
    .eq('name', delivery.name);
    
  if (!relatedDeliveries || relatedDeliveries.length === 0) {
    return {
      status: 404,
      body: { error: 'Related deliveries not found' }
    };
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
    return {
      status: 500,
      body: { error: 'Failed to update related deliveries' }
    };
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
  
  return {
    status: 200,
    body: { 
      success: true, 
      message: `Updated ${relatedDeliveries.length} deliveries`,
      updatedIds: relatedDeliveries.map(d => d.id)
    }
  };
}

// New function to update Google Sheets for a batch of deliveries by customer name
async function updateGoogleSheetsForBatchUpdate(
  sheetsUrl: string,
  customerName: string,
  newStatus: string,
  trackingNumbers: string[]
) {
  try {
    console.log(`Updating Google Sheets for customer ${customerName} with ${trackingNumbers.length} deliveries`);
    
    // Extract spreadsheet ID
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error("Invalid Google Sheets URL");
    }
    
    // This is a placeholder for the actual implementation with the Google Sheets API
    console.log(`Would update ${trackingNumbers.length} rows in Google Sheets for customer ${customerName}`);
    console.log("Tracking numbers:", trackingNumbers);
    console.log("New status:", newStatus);
    
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
) {
  try {
    console.log(`Updating Google Sheets for tracking number ${trackingNumber} to status ${newStatus}`);
    
    // Extract spreadsheet ID
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error("Invalid Google Sheets URL");
    }
    
    // This is a placeholder for the actual implementation with the Google Sheets API
    console.log(`Would update row with tracking number ${trackingNumber} to status ${newStatus}`);
    
    return;
  } catch (error) {
    console.error("Error updating Google Sheets:", error);
    throw error;
  }
}
