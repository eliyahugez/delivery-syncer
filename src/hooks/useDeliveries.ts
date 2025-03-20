
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
    
    try {
      console.log("Fetching deliveries...");
      
      // Try to fetch from Supabase edge function
      const { deliveries: fetchedDeliveries, statusOptions, lastSyncTime } = 
        await fetchDeliveries(user.sheetsUrl)
          .catch(err => {
            console.error("Error fetching deliveries from edge function:", err);
            
            // Show toast for connection issues
            toast({
              title: "שגיאת התחברות",
              description: "לא ניתן להתחבר לשרת. משתמש במידע מקומי.",
              variant: "destructive",
            });
            
            // Return null to continue to fallback
            throw err;
          });
      
      // Enhance phone numbers to international format if needed
      const enhancedDeliveries = fetchedDeliveries.map(delivery => ({
        ...delivery,
        phone: formatPhoneNumber(delivery.phone),
        // Ensure customer name is not empty or just the tracking number
        name: delivery.name && delivery.name !== delivery.trackingNumber 
          ? delivery.name 
          : "לקוח " + delivery.trackingNumber
      }));
      
      console.log("Loaded deliveries:", enhancedDeliveries.slice(0, 3));
      
      // Log the first few items for debugging
      console.log("Customer groups:", enhancedDeliveries.slice(0, 5).map(d => ({
        name: d.name,
        tracking: d.trackingNumber,
        phone: d.phone
      })));
      
      setDeliveries(enhancedDeliveries);
      setError(null);
      
      if (statusOptions && statusOptions.length > 0) {
        setDeliveryStatusOptions(statusOptions);
      }
      
      if (lastSyncTime) {
        setLastSyncTime(new Date(lastSyncTime));
      }
    } catch (err) {
      console.error("Error loading deliveries:", err);
      
      // For better DX, show debug info in console
      if (err instanceof Error) {
        console.debug("Error details:", err.message, err.stack);
        
        // Check if we have any cached deliveries we can use
        const cachedDeliveriesStr = localStorage.getItem('cached_deliveries');
        if (cachedDeliveriesStr) {
          try {
            const cachedDeliveries = JSON.parse(cachedDeliveriesStr);
            console.log("Loaded cached deliveries:", cachedDeliveries.length);
            setDeliveries(cachedDeliveries);
            
            // Set a different error message to indicate we're using cached data
            setError("משתמש בנתונים מהמטמון. לא ניתן להתחבר לשרת.");
          } catch (cacheErr) {
            console.error("Error parsing cached deliveries:", cacheErr);
            setError("שגיאה בטעינת נתונים. בדוק את החיבור לאינטרנט.");
          }
        } else {
          setError("לא ניתן לטעון נתונים ואין נתונים מקומיים. בדוק את החיבור לאינטרנט.");
        }
      } else {
        setError("שגיאה לא ידועה בטעינת נתונים.");
      }
    } finally {
      setIsLoading(false);
      
      // Always cache the current deliveries for offline use
      if (deliveries.length > 0) {
        localStorage.setItem('cached_deliveries', JSON.stringify(deliveries));
      }
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
  }, [deliveries, isOnline, user, toast, updateLocalDeliveries, addOfflineChange]);

  // Handle syncing pending updates
  const handleSyncPendingUpdates = useCallback(async () => {
    if (!isOnline) {
      toast({
        title: "אין חיבור לאינטרנט",
        description: "לא ניתן לסנכרן במצב לא מקוון",
        variant: "destructive",
      });
      return;
    }
    
    if (user?.sheetsUrl) {
      try {
        await syncPendingUpdates(user.sheetsUrl);
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
    } else {
      toast({
        title: "שגיאה בסנכרון",
        description: "לא נמצא קישור לגיליון Google Sheets",
        variant: "destructive",
      });
    }
  }, [user, syncPendingUpdates, toast, isOnline]);

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
