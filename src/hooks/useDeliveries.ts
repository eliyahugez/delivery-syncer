
import { useState, useEffect, useCallback } from "react";
import { Delivery } from "@/types/delivery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useOfflineMode } from './useOfflineMode';
import { useSyncDeliveries } from './useSyncDeliveries';
import { useDeliveryGroups } from './useDeliveryGroups';
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryStatusOption {
  value: string;
  label: string;
}

export function useDeliveries() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [deliveryStatusOptions, setDeliveryStatusOptions] = useState<DeliveryStatusOption[]>([
    { value: "pending", label: "ממתין" },
    { value: "in_progress", label: "בדרך" },
    { value: "delivered", label: "נמסר" },
    { value: "failed", label: "נכשל" },
    { value: "returned", label: "הוחזר" }
  ]);

  // Use our custom hooks
  const { isOnline, pendingUpdates, addOfflineChange } = useOfflineMode();
  const { fetchDeliveries, updateLocalDeliveries, syncPendingUpdates } = useSyncDeliveries();
  const deliveryGroups = useDeliveryGroups(deliveries);

  // Initial fetch
  useEffect(() => {
    if (user?.sheetsUrl) {
      loadDeliveries();
    }
    
    // Set up interval for periodic refetching when online
    const intervalId = setInterval(() => {
      if (isOnline && user?.sheetsUrl) {
        loadDeliveries();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes when online
    
    return () => clearInterval(intervalId);
  }, [isOnline, user]);
  
  // Load deliveries
  const loadDeliveries = async () => {
    if (!user?.sheetsUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { deliveries: fetchedDeliveries, statusOptions, lastSyncTime } = 
        await fetchDeliveries(user.sheetsUrl);
      
      // Enhance phone numbers to international format if needed
      const enhancedDeliveries = fetchedDeliveries.map(delivery => ({
        ...delivery,
        phone: formatPhoneNumber(delivery.phone)
      }));
      
      console.log("Loaded deliveries:", enhancedDeliveries.slice(0, 3));
      
      // Log the first few items for debugging
      console.log("Customer groups:", enhancedDeliveries.slice(0, 5).map(d => ({
        name: d.name,
        tracking: d.trackingNumber,
        phone: d.phone
      })));
      
      setDeliveries(enhancedDeliveries);
      
      if (statusOptions && statusOptions.length > 0) {
        setDeliveryStatusOptions(statusOptions);
      }
      
      if (lastSyncTime) {
        setLastSyncTime(lastSyncTime);
      }
    } catch (err) {
      console.error("Error loading deliveries:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Format phone number to international format
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
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
  };

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
    if (isOnline && user?.sheetsUrl) {
      try {
        const response = await supabase.functions.invoke("sync-sheets", {
          body: {
            action: "updateStatus",
            deliveryId,
            newStatus,
            updateType,
            sheetsUrl: user.sheetsUrl
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
    }
  }, [deliveries, isOnline, user, toast, updateLocalDeliveries, addOfflineChange]);

  // Handle syncing pending updates
  const handleSyncPendingUpdates = useCallback(async () => {
    if (user?.sheetsUrl) {
      await syncPendingUpdates(user.sheetsUrl);
    } else {
      toast({
        title: "שגיאה בסנכרון",
        description: "לא נמצא קישור לגיליון Google Sheets",
        variant: "destructive",
      });
    }
  }, [user, syncPendingUpdates, toast]);

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    fetchDeliveries: loadDeliveries,
    updateStatus,
    pendingUpdates,
    syncPendingUpdates: handleSyncPendingUpdates,
    deliveryStatusOptions,
    ...deliveryGroups
  };
}
