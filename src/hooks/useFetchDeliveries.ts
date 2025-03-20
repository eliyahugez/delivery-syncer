
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '@/utils/localStorage';
import { cleanSheetUrl } from '@/utils/sheetUrlUtils';

export function useFetchDeliveries(isOnline: boolean) {
  const { toast } = useToast();
  
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
          
          // First try to get just the status options to check if the sheet is accessible
          const optionsResponse = await supabase.functions.invoke("sync-sheets", {
            body: { 
              action: "getStatusOptions",
              sheetsUrl: cleanedUrl
            }
          });
          
          if (optionsResponse.error) {
            console.error("Error fetching status options:", optionsResponse.error);
            throw new Error(`Error accessing Google Sheet: ${optionsResponse.error.message}`);
          }
          
          // Now fetch the full data
          const response = await supabase.functions.invoke("sync-sheets", {
            body: { 
              sheetsUrl: cleanedUrl
            }
          });
          
          if (response.error) {
            console.error("Supabase function error:", response.error);
            throw new Error(response.error.message || "Error fetching deliveries from server");
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
          } else {
            console.error("No deliveries data in response:", response.data);
            throw new Error("No delivery data returned from server");
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
    } catch (err) {
      console.error("Error in fetchDeliveries:", err);
      throw err;
    }
  }, [isOnline, toast]);

  return { fetchDeliveries };
}
