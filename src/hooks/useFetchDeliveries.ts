
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '@/utils/localStorage';
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
          
          // Fetch with retry logic
          const MAX_RETRIES = 2;
          let error = null;
          
          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
              if (attempt > 0) {
                console.log(`Retry attempt ${attempt}/${MAX_RETRIES}...`);
              }
              
              const response = await supabase.functions.invoke("sync-sheets", {
                body: { 
                  sheetsUrl: cleanedUrl,
                  forceRefresh: forceRefresh
                }
              });
              
              if (response.error) {
                throw response.error;
              }
              
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
              console.error(`Error on attempt ${attempt}:`, err);
              error = err;
              // Wait a bit before retrying (exponential backoff)
              if (attempt < MAX_RETRIES) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
              }
            }
          }
          
          // If we get here, all retries failed
          throw error || new Error("כל נסיונות החיבור לשרת נכשלו");
        } catch (err) {
          console.error("Error fetching from Supabase:", err);
          
          // Check for CORS errors
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (
            errorMessage.includes("CORS") || 
            errorMessage.includes("Failed to fetch") || 
            errorMessage.includes("Failed to send")
          ) {
            toast({
              title: "שגיאת תקשורת",
              description: "שגיאת CORS בהתחברות לשרת. אנא נסה שוב מאוחר יותר או פנה לתמיכה.",
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
