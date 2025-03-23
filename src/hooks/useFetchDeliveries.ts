
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { STORAGE_KEYS } from '@/utils/localStorage';
import { cleanSheetUrl, isValidSheetUrl } from '@/utils/sheetUrlUtils';

export function useFetchDeliveries(isOnline: boolean) {
  const { toast } = useToast();
  
  // Fetch deliveries from server or cache
  const fetchDeliveries = useCallback(async (sheetsUrl: string, forceRefresh = false): Promise<{
    deliveries: Delivery[];
    statusOptions: any[];
    lastSyncTime: Date | null;
  }> => {
    try {
      // Validate the sheets URL
      if (!sheetsUrl || !isValidSheetUrl(sheetsUrl)) {
        throw new Error("קישור לטבלה לא תקין או חסר. אנא הגדר קישור תקין בהגדרות המשתמש.");
      }
      
      // Check for cached data
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
          
          // Clean up the sheetsUrl
          const cleanedUrl = cleanSheetUrl(sheetsUrl);
          console.log("Using cleaned sheets URL:", cleanedUrl);
          
          if (!cleanedUrl) {
            throw new Error("לא ניתן לחלץ מזהה תקין מהקישור לטבלה");
          }
          
          console.log(`Fetching deliveries with forceRefresh=${forceRefresh}`);
          
          // Invoke the edge function to get the data
          const response = await supabase.functions.invoke("sync-sheets", {
            body: { 
              sheetsUrl: cleanedUrl,
              forceRefresh: forceRefresh
            }
          });
          
          // Check for errors in the response
          if (response.error) {
            console.error("Supabase function error:", response.error);
            throw new Error(response.error.message || "שגיאה בחיבור לשרת");
          }
          
          console.log("Sync-sheets response:", response);
          
          // Validate the response data
          if (!response.data) {
            throw new Error("לא התקבלו נתונים מהשרת");
          }
          
          const { deliveries: fetchedDeliveries, statusOptions, lastSyncTime } = response.data;
          
          if (!fetchedDeliveries || !Array.isArray(fetchedDeliveries)) {
            throw new Error("מבנה הנתונים שהתקבל מהשרת אינו תקין");
          }
          
          // Save to cache
          localStorage.setItem(STORAGE_KEYS.DELIVERIES_CACHE, JSON.stringify(fetchedDeliveries));
          
          if (statusOptions && Array.isArray(statusOptions)) {
            localStorage.setItem(STORAGE_KEYS.STATUS_OPTIONS, JSON.stringify(statusOptions));
          }
          
          const syncTime = lastSyncTime ? new Date(lastSyncTime) : new Date();
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, syncTime.toISOString());
          
          toast({
            title: "עדכון נתונים הושלם",
            description: `נטענו ${fetchedDeliveries.length} משלוחים`,
          });
          
          return {
            deliveries: fetchedDeliveries,
            statusOptions: statusOptions || cachedOptions,
            lastSyncTime: syncTime
          };
        } catch (err) {
          console.error("Error fetching from Supabase:", err);
          
          // Check for CORS errors or connection issues
          const errorMessage = err instanceof Error ? err.message : String(err);
          
          if (
            errorMessage.includes("CORS") || 
            errorMessage.includes("Failed to fetch") || 
            errorMessage.includes("Failed to send")
          ) {
            toast({
              title: "שגיאת תקשורת",
              description: "לא ניתן להתחבר לשרת המרוחק. אנא נסה שוב מאוחר יותר.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "שגיאת התחברות",
              description: errorMessage || "לא ניתן להתחבר לשרת",
              variant: "destructive",
            });
          }
          
          // If we have cached data, return that
          if (cachedData.length > 0) {
            const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
            const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null;
            
            toast({
              title: "נטען ממטמון מקומי",
              description: "משתמש בנתונים שנשמרו מקומית",
            });
            
            return {
              deliveries: cachedData,
              statusOptions: cachedOptions,
              lastSyncTime
            };
          }
          
          throw err;
        }
      } else {
        // Offline or no URL, use cached data
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
        } else if (!isOnline) {
          throw new Error("אין חיבור לאינטרנט ולא נמצאו נתונים מקומיים");
        } else {
          throw new Error("קישור לטבלה לא תקין או חסר");
        }
      }
    } catch (err) {
      console.error("Error in fetchDeliveries:", err);
      throw err;
    }
  }, [isOnline, toast]);

  return { fetchDeliveries };
}
