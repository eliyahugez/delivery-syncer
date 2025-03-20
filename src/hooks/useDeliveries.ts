import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Delivery } from "@/types/delivery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { STORAGE_KEYS } from "@/utils/localStorage";

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [deliveryStatusOptions, setDeliveryStatusOptions] = useState<DeliveryStatusOption[]>([
    { value: "pending", label: "ממתין" },
    { value: "in_progress", label: "בדרך" },
    { value: "delivered", label: "נמסר" },
    { value: "failed", label: "נכשל" },
    { value: "returned", label: "הוחזר" }
  ]);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if we have pending updates in local storage
    const checkPendingUpdates = () => {
      const offlineChangesJson = localStorage.getItem(STORAGE_KEYS.OFFLINE_CHANGES);
      if (offlineChangesJson) {
        try {
          const offlineChanges = JSON.parse(offlineChangesJson);
          setPendingUpdates(offlineChanges.length || 0);
        } catch (e) {
          console.error("Error parsing offline changes:", e);
          setPendingUpdates(0);
        }
      } else {
        setPendingUpdates(0);
      }
    };

    checkPendingUpdates();
    const intervalId = setInterval(checkPendingUpdates, 30000); // Check every 30 seconds

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  // Load any cached status options from local storage
  useEffect(() => {
    const cachedOptionsJson = localStorage.getItem(STORAGE_KEYS.STATUS_OPTIONS);
    if (cachedOptionsJson) {
      try {
        const cachedOptions = JSON.parse(cachedOptionsJson);
        if (Array.isArray(cachedOptions) && cachedOptions.length > 0) {
          setDeliveryStatusOptions(cachedOptions);
          console.info("Loaded status options from cache:", cachedOptions);
        }
      } catch (e) {
        console.error("Error parsing cached status options:", e);
      }
    }
  }, []);

  // Fetch status options from Google Sheets
  const fetchStatusOptions = useCallback(async () => {
    if (!user?.sheetsUrl || !isOnline) return;

    try {
      const response = await supabase.functions.invoke("sync-sheets", {
        body: {
          action: "getStatusOptions",
          sheetsUrl: user.sheetsUrl
        }
      });

      if (response.data?.statusOptions && Array.isArray(response.data.statusOptions)) {
        setDeliveryStatusOptions(response.data.statusOptions);
        localStorage.setItem(STORAGE_KEYS.STATUS_OPTIONS, JSON.stringify(response.data.statusOptions));
        console.info("Loaded status options from sheets:", response.data.statusOptions);
      }
    } catch (error) {
      console.error("Error fetching status options:", error);
    }
  }, [user, isOnline]);

  // Fetch deliveries from Supabase or local storage
  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let fetchedDeliveries: Delivery[] = [];
      
      // First, always check if we have cached data
      const cachedDataJson = localStorage.getItem(STORAGE_KEYS.DELIVERIES_CACHE);
      let cachedData: Delivery[] = [];
      
      if (cachedDataJson) {
        try {
          cachedData = JSON.parse(cachedDataJson);
          console.log("Loaded cached deliveries:", cachedData.length);
        } catch (e) {
          console.error("Error parsing cached data:", e);
        }
      }
      
      // If online and we have a sheets URL, try to fetch fresh data
      if (isOnline && user?.sheetsUrl) {
        try {
          console.log("Fetching deliveries from Supabase...");
          
          const response = await supabase.functions.invoke("sync-sheets", {
            body: { 
              sheetsUrl: user.sheetsUrl
            }
          });
          
          if (response.error) {
            throw new Error(response.error.message);
          }
          
          if (response.data?.deliveries) {
            fetchedDeliveries = response.data.deliveries;
            
            // Save to local storage
            localStorage.setItem(STORAGE_KEYS.DELIVERIES_CACHE, JSON.stringify(fetchedDeliveries));
            const now = new Date();
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
            setLastSyncTime(now);
            
            console.log("Fetched and cached deliveries:", fetchedDeliveries.length);
            
            // Also fetch status options
            await fetchStatusOptions();
          }
        } catch (e) {
          console.error("Error fetching from Supabase:", e);
          
          // If we have cached data and fetch fails, use cached data
          if (cachedData.length > 0) {
            fetchedDeliveries = cachedData;
            
            const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
            if (lastSyncStr) {
              setLastSyncTime(new Date(lastSyncStr));
            }
            
            toast({
              title: "שגיאה בסנכרון נתונים",
              description: "מציג נתונים מהמטמון המקומי",
              variant: "destructive",
            });
          } else {
            throw new Error("לא ניתן לטעון משלוחים. אנא בדוק את החיבור שלך ונסה שוב.");
          }
        }
      } else {
        // If offline or no sheets URL, use cached data
        if (cachedData.length > 0) {
          fetchedDeliveries = cachedData;
          
          const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
          if (lastSyncStr) {
            setLastSyncTime(new Date(lastSyncStr));
          }
          
          if (!isOnline) {
            toast({
              title: "מצב לא מקוון",
              description: "מציג נתונים מהמטמון המקומי",
            });
          }
        } else {
          // No connection and no cached data
          throw new Error("אין חיבור לאינטרנט ולא נמצאו נתונים מקומיים");
        }
      }
      
      setDeliveries(fetchedDeliveries);
    } catch (err) {
      console.error("Error in fetchDeliveries:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, user, toast, fetchStatusOptions]);
  
  // Initial fetch
  useEffect(() => {
    fetchDeliveries();
    
    // Set up interval for periodic refetching when online
    const intervalId = setInterval(() => {
      if (isOnline) {
        fetchDeliveries();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes when online
    
    return () => clearInterval(intervalId);
  }, [fetchDeliveries, isOnline]);

  // Update delivery status
  const updateStatus = useCallback(async (deliveryId: string, newStatus: string, updateType: string = "single") => {
    if (!deliveryId || !newStatus) {
      toast({
        title: "שגיאה בעדכון",
        description: "מזהה משלוח או סטטוס חדש חסרים",
        variant: "destructive",
      });
      return;
    }
    
    // First, update the local state immediately for responsive UI
    setDeliveries(currentDeliveries => {
      if (updateType === "batch") {
        // Find the delivery to get the customer name
        const targetDelivery = currentDeliveries.find(d => d.id === deliveryId);
        if (!targetDelivery || !targetDelivery.name) return currentDeliveries;
        
        // Update all deliveries with the same customer name
        return currentDeliveries.map(delivery => {
          if (delivery.name === targetDelivery.name) {
            return {
              ...delivery,
              status: newStatus,
              statusDate: new Date().toISOString()
            };
          }
          return delivery;
        });
      } else {
        // Just update the single delivery
        return currentDeliveries.map(delivery => {
          if (delivery.id === deliveryId) {
            return {
              ...delivery,
              status: newStatus,
              statusDate: new Date().toISOString()
            };
          }
          return delivery;
        });
      }
    });
    
    // Also update the local storage cache
    const cachedDataJson = localStorage.getItem(STORAGE_KEYS.DELIVERIES_CACHE);
    if (cachedDataJson) {
      try {
        const cachedData: Delivery[] = JSON.parse(cachedDataJson);
        let updatedCache: Delivery[];
        
        if (updateType === "batch") {
          // Find the delivery to get the customer name
          const targetDelivery = cachedData.find(d => d.id === deliveryId);
          if (!targetDelivery || !targetDelivery.name) {
            updatedCache = cachedData;
          } else {
            // Update all deliveries with the same customer name
            updatedCache = cachedData.map(delivery => {
              if (delivery.name === targetDelivery.name) {
                return {
                  ...delivery,
                  status: newStatus,
                  statusDate: new Date().toISOString()
                };
              }
              return delivery;
            });
          }
        } else {
          // Just update the single delivery
          updatedCache = cachedData.map(delivery => {
            if (delivery.id === deliveryId) {
              return {
                ...delivery,
                status: newStatus,
                statusDate: new Date().toISOString()
              };
            }
            return delivery;
          });
        }
        
        localStorage.setItem(STORAGE_KEYS.DELIVERIES_CACHE, JSON.stringify(updatedCache));
      } catch (e) {
        console.error("Error updating cache:", e);
      }
    }
    
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
        const updateData = {
          id: deliveryId,
          status: newStatus,
          timestamp: new Date().toISOString(),
          updateType
        };
        
        // Add to offline changes queue
        const offlineChangesJson = localStorage.getItem(STORAGE_KEYS.OFFLINE_CHANGES) || "[]";
        try {
          const offlineChanges = JSON.parse(offlineChangesJson);
          offlineChanges.push(updateData);
          localStorage.setItem(STORAGE_KEYS.OFFLINE_CHANGES, JSON.stringify(offlineChanges));
          setPendingUpdates(offlineChanges.length);
          
          toast({
            title: "שמירה במצב לא מקוון",
            description: "העדכון יסונכרן כאשר החיבור יחזור",
          });
        } catch (error) {
          console.error("Error saving offline change:", error);
        }
      }
    } else {
      // Store the update for later syncing
      const updateData = {
        id: deliveryId,
        status: newStatus,
        timestamp: new Date().toISOString(),
        updateType
      };
      
      // Add to offline changes queue
      const offlineChangesJson = localStorage.getItem(STORAGE_KEYS.OFFLINE_CHANGES) || "[]";
      try {
        const offlineChanges = JSON.parse(offlineChangesJson);
        offlineChanges.push(updateData);
        localStorage.setItem(STORAGE_KEYS.OFFLINE_CHANGES, JSON.stringify(offlineChanges));
        setPendingUpdates(offlineChanges.length);
        
        toast({
          title: "שמירה במצב לא מקוון",
          description: "העדכון יסונכרן כאשר החיבור יחזור",
        });
      } catch (error) {
        console.error("Error saving offline change:", error);
      }
    }
  }, [isOnline, user, toast]);

  // Sync pending updates
  const syncPendingUpdates = useCallback(async () => {
    if (!isOnline || !user?.sheetsUrl) {
      toast({
        title: "אין חיבור",
        description: "לא ניתן לסנכרן במצב לא מקוון",
        variant: "destructive",
      });
      return;
    }
    
    const offlineChangesJson = localStorage.getItem(STORAGE_KEYS.OFFLINE_CHANGES);
    if (!offlineChangesJson) {
      setPendingUpdates(0);
      return;
    }
    
    try {
      const offlineChanges = JSON.parse(offlineChangesJson);
      if (!offlineChanges.length) {
        setPendingUpdates(0);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      // Process each update sequentially to avoid race conditions
      for (const update of offlineChanges) {
        try {
          const response = await supabase.functions.invoke("sync-sheets", {
            body: {
              action: "updateStatus",
              deliveryId: update.id,
              newStatus: update.status,
              updateType: update.updateType,
              sheetsUrl: user.sheetsUrl
            }
          });
          
          if (response.error) {
            throw new Error(response.error.message);
          }
          
          successCount++;
        } catch (e) {
          console.error("Error syncing update:", e);
          failCount++;
        }
      }
      
      // Clear synced updates
      if (successCount === offlineChanges.length) {
        localStorage.removeItem(STORAGE_KEYS.OFFLINE_CHANGES);
        setPendingUpdates(0);
        
        toast({
          title: "סנכרון הושלם",
          description: `${successCount} עדכונים סונכרנו בהצלחה`,
        });
      } else {
        // Keep only the failed ones
        const remainingUpdates = offlineChanges.slice(successCount);
        localStorage.setItem(STORAGE_KEYS.OFFLINE_CHANGES, JSON.stringify(remainingUpdates));
        setPendingUpdates(remainingUpdates.length);
        
        toast({
          title: "סנכרון חלקי",
          description: `${successCount} עדכונים סונכרנו, ${failCount} נכשלו`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in syncPendingUpdates:", error);
      toast({
        title: "שגיאת סנכרון",
        description: "אירעה שגיאה בסנכרון העדכונים",
        variant: "destructive",
      });
    }
  }, [isOnline, user, toast]);

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    fetchDeliveries,
    updateStatus,
    pendingUpdates,
    syncPendingUpdates,
    deliveryStatusOptions,
  };
}
