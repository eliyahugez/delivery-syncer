
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineMode } from './useOfflineMode';
import { useSyncDeliveries } from './useSyncDeliveries';
import { supabase } from "@/integrations/supabase/client";

export function useDeliveryStatusUpdates(
  deliveries: Delivery[],
  setDeliveries: (deliveries: Delivery[]) => void
) {
  const { toast } = useToast();
  const { isOnline, addOfflineChange } = useOfflineMode();
  const { updateLocalDeliveries, syncPendingUpdates } = useSyncDeliveries();

  // Update delivery status
  const updateStatus = useCallback(async (
    deliveryId: string, 
    newStatus: string, 
    updateType: string = "single"
  ) => {
    if (!deliveryId || !newStatus) {
      toast({
        title: "שגיאה בעדכון",
        description: "מזהה משלוח או סטטוס חדש חסרים",
        variant: "destructive",
      });
      return;
    }
    
    // First, update local state immediately for responsive UI
    const updatedDeliveries = updateLocalDeliveries(
      deliveries, 
      deliveryId, 
      newStatus, 
      updateType as 'single' | 'batch'
    );
    
    setDeliveries(updatedDeliveries);
    
    // If online, update Supabase
    if (isOnline) {
      try {
        const response = await supabase.functions.invoke("sync-sheets", {
          body: {
            action: "updateStatus",
            deliveryId,
            newStatus,
            updateType,
            sheetsUrl: null // Will be added in the edge function from user context
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        console.log("Status update response:", response.data);
        
        toast({
          title: "סטטוס עודכן",
          description: updateType === "batch" ? "כל המשלוחים של לקוח זה עודכנו" : "המשלוח עודכן בהצלחה",
        });
        
        // Update cached data
        localStorage.setItem('cached_deliveries', JSON.stringify(updatedDeliveries));
      } catch (e) {
        console.error("Error updating status in Supabase:", e);
        
        // Store the failed update to retry later
        addOfflineChange({
          id: deliveryId,
          status: newStatus,
          updateType: updateType as 'single' | 'batch'
        });
        
        toast({
          title: "שמירה במצב לא מקוון",
          description: "העדכון יסונכרן כאשר החיבור יחזור",
        });
      }
    } else {
      // Store the update for later syncing
      addOfflineChange({
        id: deliveryId,
        status: newStatus,
        updateType: updateType as 'single' | 'batch'
      });
      
      toast({
        title: "שמירה במצב לא מקוון",
        description: "העדכון יסונכרן כאשר החיבור יחזור",
      });
      
      // Update cached data even when offline
      localStorage.setItem('cached_deliveries', JSON.stringify(updatedDeliveries));
    }
  }, [deliveries, isOnline, toast, updateLocalDeliveries, addOfflineChange, setDeliveries]);

  // Handle syncing pending updates
  const handleSyncPendingUpdates = useCallback(async (sheetsUrl: string) => {
    if (!isOnline) {
      toast({
        title: "אין חיבור לאינטרנט",
        description: "לא ניתן לסנכרן במצב לא מקוון",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await syncPendingUpdates(sheetsUrl);
      toast({
        title: "סנכרון הושלם",
        description: "כל העדכונים סונכרנו בהצלחה",
      });
    } catch (err) {
      console.error("Error syncing updates:", err);
      toast({
        title: "שגיאה בסנכרון",
        description: "לא ניתן לסנכרן חלק מהעדכונים, נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    }
  }, [syncPendingUpdates, toast, isOnline]);

  return {
    updateStatus,
    syncPendingUpdates: handleSyncPendingUpdates
  };
}
