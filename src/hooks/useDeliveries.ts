
import { useDeliveryData } from "./useDeliveryData";
import { useDeliveryStatusUpdates } from "./useDeliveryStatusUpdates";
import { useOfflineMode } from './useOfflineMode';
import { useDeliveryGroups } from './useDeliveryGroups';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { STORAGE_KEYS, removeFromStorage } from "@/utils/localStorage";

export interface DeliveryStatusOption {
  value: string;
  label: string;
}

export function useDeliveries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    deliveries,
    setDeliveries,
    isLoading,
    error,
    lastSyncTime,
    fetchDeliveries,
    deliveryStatusOptions
  } = useDeliveryData();

  const { isOnline, pendingUpdates, clearAllOfflineChanges } = useOfflineMode();
  
  const {
    updateStatus,
    syncPendingUpdates
  } = useDeliveryStatusUpdates(deliveries, setDeliveries);
  
  const deliveryGroups = useDeliveryGroups(deliveries);

  // Handle syncing pending updates with correct sheetsUrl
  const handleSyncPendingUpdates = async () => {
    if (user?.sheetsUrl) {
      try {
        await syncPendingUpdates(user.sheetsUrl);
        toast({
          title: "סנכרון שינויים",
          description: "כל השינויים המקומיים סונכרנו בהצלחה עם השרת",
          variant: "default",
        });
        return true;
      } catch (error) {
        console.error("Error syncing pending updates:", error);
        toast({
          title: "שגיאה בסנכרון שינויים",
          description: "לא ניתן היה לסנכרן את השינויים המקומיים. נסה שנית מאוחר יותר.",
          variant: "destructive",
        });
        return false;
      }
    }
    return false;
  };
  
  // Function to clear all deliveries from local state and storage
  const clearDeliveries = () => {
    try {
      // Clear deliveries from state
      setDeliveries([]);
      
      // Clear localStorage cache
      removeFromStorage('cached_deliveries');
      removeFromStorage(STORAGE_KEYS.DELIVERIES_CACHE);
      
      // Also clear pending updates to avoid the inconsistency
      clearAllOfflineChanges();
      
      console.log("All deliveries and pending updates cleared");
      
      return true;
    } catch (error) {
      console.error("Error clearing deliveries:", error);
      toast({
        title: "שגיאה בניקוי נתונים",
        description: "לא ניתן היה לנקות את המשלוחים. נסה שנית.",
        variant: "destructive",
      });
      
      return false;
    }
  };

  // Handle force refresh with proper error handling
  const forceRefresh = async () => {
    try {
      toast({
        title: "מרענן נתונים",
        description: "מבצע סנכרון מלא מול השרת...",
        variant: "default",
      });
      
      await fetchDeliveries(true); // Pass forceRefresh=true
      return true;
    } catch (error) {
      console.error("Force refresh error:", error);
      toast({
        title: "שגיאה בריענון נתונים",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    fetchDeliveries,
    updateStatus,
    pendingUpdates,
    syncPendingUpdates: handleSyncPendingUpdates,
    deliveryStatusOptions,
    clearDeliveries,
    forceRefresh,
    ...deliveryGroups
  };
}
