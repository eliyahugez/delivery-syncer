
import { useDeliveryData } from "./useDeliveryData";
import { useDeliveryStatusUpdates } from "./useDeliveryStatusUpdates";
import { useOfflineMode } from './useOfflineMode';
import { useDeliveryGroups } from './useDeliveryGroups';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

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

  const { isOnline, pendingUpdates } = useOfflineMode();
  
  const {
    updateStatus,
    syncPendingUpdates
  } = useDeliveryStatusUpdates(deliveries, setDeliveries);
  
  const deliveryGroups = useDeliveryGroups(deliveries);

  // Handle syncing pending updates with correct sheetsUrl
  const handleSyncPendingUpdates = async () => {
    if (user?.sheetsUrl) {
      await syncPendingUpdates(user.sheetsUrl);
    }
  };
  
  // Function to clear all deliveries from local state and storage
  const clearDeliveries = () => {
    try {
      // Clear deliveries from state
      setDeliveries([]);
      
      // Clear localStorage cache
      localStorage.removeItem('cached_deliveries');
      
      console.log("All deliveries cleared");
      
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
    ...deliveryGroups
  };
}
