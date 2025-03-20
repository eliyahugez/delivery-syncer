
import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Delivery } from "@/types/delivery";
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '@/utils/localStorage';
import { useOfflineMode, OfflineChange } from './useOfflineMode';

export function useSyncDeliveries() {
  const { toast } = useToast();
  const { 
    isOnline, 
    getOfflineChanges, 
    clearOfflineChanges, 
    markChangeFailed 
  } = useOfflineMode();
  
  // Fetch deliveries from server or cache
  const fetchDeliveries = useCallback(async (sheetsUrl: string): Promise<{
    deliveries: Delivery[];
    statusOptions: any[];
    lastSyncTime: Date | null;
  }> => {
    try {
      let fetchedDeliveries: Delivery[] = [];
      let statusOptions = [];
      
      // First, check if we have cached data
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
      
      // Get cached status options
      const cachedOptionsJson = localStorage.getItem(STORAGE_KEYS.STATUS_OPTIONS);
      let cachedOptions = [];
      if (cachedOptionsJson) {
        try {
          cachedOptions = JSON.parse(cachedOptionsJson);
        } catch (e) {
          console.error("Error parsing cached options:", e);
        }
      }
      
      // If online and we have a sheets URL, try to fetch fresh data
      if (isOnline && sheetsUrl) {
        try {
          console.log("Fetching deliveries from Supabase...");
          
          // Clean up the sheetsUrl to ensure it's valid
          const cleanedUrl = cleanSheetUrl(sheetsUrl);
          console.log("Using cleaned sheets URL:", cleanedUrl);
          
          const response = await supabase.functions.invoke("sync-sheets", {
            body: { 
              sheetsUrl: cleanedUrl
            }
          });
          
          if (response.error) {
            console.error("Supabase function error:", response.error);
            throw new Error(response.error.message);
          }
          
          if (response.data?.deliveries) {
            fetchedDeliveries = response.data.deliveries;
            
            // Try to get status options
            if (response.data?.statusOptions) {
              statusOptions = response.data.statusOptions;
              localStorage.setItem(STORAGE_KEYS.STATUS_OPTIONS, JSON.stringify(statusOptions));
            } else {
              statusOptions = cachedOptions;
            }
            
            // Save to local storage
            localStorage.setItem(STORAGE_KEYS.DELIVERIES_CACHE, JSON.stringify(fetchedDeliveries));
            const now = new Date();
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
            
            return {
              deliveries: fetchedDeliveries,
              statusOptions,
              lastSyncTime: now
            };
          }
        } catch (e) {
          console.error("Error fetching from Supabase:", e);
          
          // If we have cached data and fetch fails, use cached data
          if (cachedData.length > 0) {
            const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
            const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null;
            
            toast({
              title: "שגיאה בסנכרון נתונים",
              description: "מציג נתונים מהמטמון המקומי",
              variant: "destructive",
            });
            
            return {
              deliveries: cachedData,
              statusOptions: cachedOptions,
              lastSyncTime
            };
          } else {
            throw new Error("לא ניתן לטעון משלוחים. אנא בדוק את החיבור שלך ונסה שוב.");
          }
        }
      } else {
        // If offline or no sheets URL, use cached data
        if (cachedData.length > 0) {
          const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
          const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null;
          
          if (!isOnline) {
            toast({
              title: "מצב לא מקוון",
              description: "מציג נתונים מהמטמון המקומי",
            });
          }
          
          return {
            deliveries: cachedData,
            statusOptions: cachedOptions,
            lastSyncTime
          };
        } else {
          // No connection and no cached data
          throw new Error("אין חיבור לאינטרנט ולא נמצאו נתונים מקומיים");
        }
      }
      
      // Fallback return with empty data
      return {
        deliveries: [],
        statusOptions: [],
        lastSyncTime: null
      };
    } catch (err) {
      console.error("Error in fetchDeliveries:", err);
      throw err;
    }
  }, [isOnline, toast]);
  
  // Helper function to clean up Google Sheets URLs
  const cleanSheetUrl = (url: string): string => {
    // If it's already just an ID, return it
    if (/^[a-zA-Z0-9-_]{25,45}$/.test(url)) {
      return url;
    }
    
    // Extract the spreadsheet ID
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/edit`;
    }
    
    // Return the original if we couldn't clean it
    return url;
  };
  
  // Update delivery status in cache
  const updateLocalDeliveries = useCallback((
    deliveries: Delivery[],
    deliveryId: string,
    newStatus: string,
    updateType: 'single' | 'batch' = 'single'
  ): Delivery[] => {
    let updatedDeliveries: Delivery[];
    
    if (updateType === 'batch') {
      // Find the delivery to get the customer name
      const targetDelivery = deliveries.find(d => d.id === deliveryId);
      if (!targetDelivery || !targetDelivery.name) return deliveries;
      
      // Update all deliveries with the same customer name
      updatedDeliveries = deliveries.map(delivery => {
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
      updatedDeliveries = deliveries.map(delivery => {
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
    
    // Update the cache
    saveToStorage(STORAGE_KEYS.DELIVERIES_CACHE, updatedDeliveries);
    
    return updatedDeliveries;
  }, []);
  
  // Sync pending offline updates
  const syncPendingUpdates = useCallback(async (sheetsUrl: string): Promise<{
    success: number;
    failed: number;
  }> => {
    if (!isOnline || !sheetsUrl) {
      toast({
        title: "אין חיבור",
        description: "לא ניתן לסנכרן במצב לא מקוון",
        variant: "destructive",
      });
      return { success: 0, failed: 0 };
    }
    
    const offlineChanges = getOfflineChanges();
    if (!offlineChanges.length) {
      return { success: 0, failed: 0 };
    }
    
    let successCount = 0;
    let failCount = 0;
    const successfulIds: string[] = [];
    
    // Clean the sheets URL
    const cleanedUrl = cleanSheetUrl(sheetsUrl);
    
    // Process each update sequentially to avoid race conditions
    for (const update of offlineChanges) {
      try {
        const response = await supabase.functions.invoke("sync-sheets", {
          body: {
            action: "updateStatus",
            deliveryId: update.id,
            newStatus: update.status,
            updateType: update.updateType,
            sheetsUrl: cleanedUrl
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        successCount++;
        successfulIds.push(update.id);
      } catch (e) {
        console.error("Error syncing update:", e);
        markChangeFailed(update.id);
        failCount++;
      }
    }
    
    // Clear synced updates
    if (successCount > 0) {
      clearOfflineChanges(successfulIds);
    }
    
    // Show appropriate toast
    if (successCount === offlineChanges.length) {
      toast({
        title: "סנכרון הושלם",
        description: `${successCount} עדכונים סונכרנו בהצלחה`,
      });
    } else if (successCount > 0) {
      toast({
        title: "סנכרון חלקי",
        description: `${successCount} עדכונים סונכרנו, ${failCount} נכשלו`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "שגיאת סנכרון",
        description: "לא ניתן היה לסנכרן את השינויים",
        variant: "destructive",
      });
    }
    
    return { success: successCount, failed: failCount };
  }, [isOnline, toast, getOfflineChanges, clearOfflineChanges, markChangeFailed]);
  
  return {
    fetchDeliveries,
    updateLocalDeliveries,
    syncPendingUpdates
  };
}
