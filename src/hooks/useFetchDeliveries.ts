
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '@/utils/localStorage';
import { cleanSheetUrl, isValidSheetUrl } from '@/utils/sheetUrlUtils';

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
      
      // Validate the sheets URL
      if (!sheetsUrl || !isValidSheetUrl(sheetsUrl)) {
        throw new Error("קישור לטבלה לא תקין או חסר. אנא הגדר קישור תקין בהגדרות המשתמש.");
      }
      
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
          
          if (!cleanedUrl) {
            throw new Error("לא ניתן לחלץ מזהה תקין מהקישור לטבלה");
          }
          
          // First try to get just the status options to check if the sheet is accessible
          const optionsResponse = await supabase.functions.invoke("sync-sheets", {
            body: { 
              action: "getStatusOptions",
              sheetsUrl: cleanedUrl
            }
          });
          
          if (optionsResponse.error) {
            console.error("Error fetching status options:", optionsResponse.error);
            
            const errorMessage = optionsResponse.error.message || 'שגיאה בגישה לטבלה';
            throw new Error(`שגיאה בגישה לטבלת Google: ${errorMessage}`);
          }
          
          // Now fetch the full data
          const response = await supabase.functions.invoke("sync-sheets", {
            body: { 
              sheetsUrl: cleanedUrl
            }
          });
          
          console.log("Sync-sheets response:", response);
          
          if (response.error) {
            console.error("Supabase function error:", response.error);
            
            // Check for specific error types with Hebrew messages
            let errorMessage = response.error.message || "שגיאה בטעינת נתוני משלוחים מהשרת";
            
            if (errorMessage.includes("column") && errorMessage.includes("does not exist")) {
              errorMessage = "שגיאה במבנה הטבלה: עמודה חסרה או לא תקינה";
            } else if (errorMessage.includes("Invalid") && errorMessage.includes("format")) {
              errorMessage = "פורמט טבלה לא תקין. ודא שיש לך הרשאות גישה לטבלה.";
            }
            
            throw new Error(errorMessage);
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
            throw new Error("לא התקבלו נתוני משלוחים מהשרת");
          }
        } catch (e) {
          console.error("Error fetching from Supabase:", e);
          
          // If we have cached data and fetch fails, use cached data
          if (cachedData.length > 0) {
            const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
            const lastSyncTime = lastSyncStr ? new Date(lastSyncStr) : null;
            
            // Only show toast if this is a real error, not just a first-time setup
            if (!(e instanceof Error && e.message.includes("קישור לטבלה לא תקין או חסר"))) {
              toast({
                title: "שגיאה בסנכרון נתונים",
                description: "מציג נתונים מהמטמון המקומי",
                variant: "destructive",
              });
            }
            
            return {
              deliveries: cachedData,
              statusOptions: cachedOptions,
              lastSyncTime
            };
          } else {
            // No cached data and fetch failed - real error
            throw new Error(e instanceof Error ? e.message : "לא ניתן לטעון משלוחים. אנא בדוק את החיבור שלך ונסה שוב.");
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
        } else if (!isOnline) {
          // No connection and no cached data
          throw new Error("אין חיבור לאינטרנט ולא נמצאו נתונים מקומיים");
        } else {
          // Online but no sheetsUrl and no cached data
          throw new Error("קישור לטבלה לא תקין או חסר. אנא הגדר קישור תקין בהגדרות המשתמש.");
        }
      }
    } catch (err) {
      console.error("Error in fetchDeliveries:", err);
      throw err;
    }
  }, [isOnline, toast]);

  return { fetchDeliveries };
}
