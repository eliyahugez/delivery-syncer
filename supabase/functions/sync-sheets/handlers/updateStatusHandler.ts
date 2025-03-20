
import { supabase } from "../supabase.ts";
import { cleanSheetUrl, extractSheetId } from "../utils/sheetUtils.ts";

// Handle updating status for a single delivery
export async function handleSingleStatusUpdate(
  supabaseClient: any,
  deliveryId: string,
  newStatus: string,
  updateType: string = "single",
  sheetsUrl?: string
) {
  console.log(`Updating status for delivery ${deliveryId} to ${newStatus}`);
  
  try {
    // First, get the current delivery details
    const { data: delivery, error: getError } = await supabaseClient
      .from("deliveries")
      .select("id, tracking_number, name, assigned_to")
      .eq("id", deliveryId)
      .maybeSingle();
    
    if (getError) {
      console.error("Error fetching delivery:", getError.message);
      return {
        status: 500,
        body: { error: `Error fetching delivery: ${getError.message}` }
      };
    }
    
    if (!delivery) {
      return {
        status: 404,
        body: { error: `Delivery with ID ${deliveryId} not found` }
      };
    }
    
    // For batch updates, we'll get all deliveries for this customer
    let deliveries = [delivery];
    if (updateType === "batch") {
      const { data: relatedDeliveries, error: relatedError } = await supabaseClient
        .from("deliveries")
        .select("id, tracking_number, name, assigned_to")
        .eq("name", delivery.name)
        .neq("id", deliveryId); // Don't include the original one again
      
      if (!relatedError && relatedDeliveries.length > 0) {
        deliveries = [...deliveries, ...relatedDeliveries];
      }
    }
    
    console.log(`Updating ${deliveries.length} deliveries with status ${newStatus}`);
    
    const updatedIds = [];
    const historyEntries = [];
    
    // Update all the appropriate deliveries
    for (const del of deliveries) {
      // Update the delivery status
      const { error: updateError } = await supabaseClient
        .from("deliveries")
        .update({ 
          status: newStatus,
          status_date: new Date().toISOString()
        })
        .eq("id", del.id);
      
      if (updateError) {
        console.error(`Error updating delivery ${del.id}:`, updateError);
        continue;
      }
      
      updatedIds.push(del.id);
      
      // Add to history
      historyEntries.push({
        delivery_id: del.id,
        status: newStatus,
        courier: del.assigned_to || "unknown",
        timestamp: new Date().toISOString()
      });
    }
    
    // Record the status changes in history if we have any successful updates
    if (historyEntries.length > 0) {
      const { error: historyError } = await supabaseClient
        .from("delivery_history")
        .insert(historyEntries);
      
      if (historyError) {
        console.error("Error recording history:", historyError);
        // Not critical, we can continue
      }
    }
    
    // If we have a Google Sheet URL, also try to update the sheet
    if (sheetsUrl && updatedIds.length > 0) {
      try {
        // This would be implemented to push updates back to Google Sheets
        // if needed in the future
        console.log("Would update Google Sheet with new status", sheetsUrl);
      } catch (sheetError) {
        console.error("Error updating sheet:", sheetError);
        // Not critical for the main operation
      }
    }
    
    return {
      status: 200,
      body: {
        success: true,
        message: `Updated ${updatedIds.length} deliveries to status: ${newStatus}`,
        updatedIds
      }
    };
  } catch (error) {
    console.error("Error in handleSingleStatusUpdate:", error);
    
    return {
      status: 500,
      body: {
        error: "Internal server error updating status",
        details: error.message
      }
    };
  }
}
