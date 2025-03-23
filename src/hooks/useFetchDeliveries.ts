
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
          
          // Now fetch the full data with force refresh flag if needed
          console.log(`Fetching deliveries with forceRefresh=${forceRefresh}`);
          
          // Add retry mechanism
          const maxRetries = 3;
          let retryCount = 0;
          let response = null;
          
          while (retryCount < maxRetries) {
            try {
              response = await supabase.functions.invoke("sync-sheets", {
                body: { 
                  sheetsUrl: cleanedUrl,
                  forceRefresh: forceRefresh
                }
              });
              break; // Success, exit retry loop
            } catch (retryError) {
              retryCount++;
              console.error(`Attempt ${retryCount} failed:`, retryError);
              
              if (retryCount >= maxRetries) {
                throw retryError; // Rethrow after max retries
              }
              
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
            }
          }
          
          console.log("Sync-sheets response:", response);
          
          if (response?.error) {
            console.error("Supabase function error:", response.error);
            
            // If the response error indicates the server-side Error, but we have a data response,
            // we may still have valid data with warnings or partial errors
            if (response.data && response.data.deliveries) {
              console.log("Response contains data despite error, proceeding with caution");
              // Continue processing below as we have some data
            } else {
              // Check for specific error types with Hebrew messages
              let errorMessage = response.error.message || "שגיאה בטעינת נתוני משלוחים מהשרת";
              
              if (errorMessage.includes("column") && errorMessage.includes("does not exist")) {
                errorMessage = "שגיאה במבנה הטבלה: עמודה חסרה או לא תקינה";
              } else if (errorMessage.includes("Invalid") && errorMessage.includes("format")) {
                errorMessage = "פורמט טבלה לא תקין. ודא שיש לך הרשאות גישה לטבלה.";
              } else if (errorMessage.includes("Edge Function returned a non-2xx status code")) {
                // This particular error needs special handling
                // Check if we can recover data from error response
                if (response.error && response.error.response) {
                  try {
                    const errorData = await response.error.response.json();
                    console.log("Error response data:", errorData);
                    
                    if (errorData && errorData.deliveries) {
                      // We actually got data despite the error
                      fetchedDeliveries = errorData.deliveries;
                      if (errorData.statusOptions) {
                        statusOptions = errorData.statusOptions;
                      }
                      
                      // Save to cache even though there was an error
                      localStorage.setItem(STORAGE_KEYS.DELIVERIES_CACHE, JSON.stringify(fetchedDeliveries));
                      localStorage.setItem(STORAGE_KEYS.STATUS_OPTIONS, JSON.stringify(statusOptions));
                      
                      const now = new Date();
                      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
                      
                      // Show toast with warning about partial success
                      toast({
                        title: "סנכרון חלקי",
                        description: `נטענו ${fetchedDeliveries.length} משלוחים, אבל היו גם שגיאות.`,
                        variant: "warning",
                      });
                      
                      return {
                        deliveries: fetchedDeliveries,
                        statusOptions,
                        lastSyncTime: now
                      };
                    }
                    
                    // Error information from the response
                    if (errorData && errorData.error) {
                      errorMessage = errorData.error;
                      
                      // Special case for UUID errors
                      if (errorData.failedRows && 
                          errorData.failedRows.length > 0 && 
                          errorData.failedRows[0].reason.includes("uuidv4 is not a function")) {
                        errorMessage = "שגיאה בייצור מזהים במערכת. נסה שוב או פנה לתמיכה טכנית.";
                      }
                    }
                  } catch (parseError) {
                    console.error("Failed to parse error response:", parseError);
                  }
                }
              }
              
              throw new Error(errorMessage);
            }
          }
          
          if (response?.data?.error) {
            console.error("Edge function returned error:", response.data.error);
            
            // Enhanced debugging for edge function errors
            if (response.data.originalError) {
              console.error("Original error:", response.data.originalError);
              console.error("Error details:", response.data.details);
              console.error("Error stack:", response.data.stack);
            }
            
            throw new Error(response.data.error);
          }
          
          if (response?.data?.deliveries) {
            fetchedDeliveries = response.data.deliveries;
            
            // If no deliveries were returned but we have failed rows, show detailed error
            if (fetchedDeliveries.length === 0 && response.data.failedRows && response.data.failedRows.length > 0) {
              console.error("Failed rows:", response.data.failedRows);
              
              // Log the first error for debugging
              const firstError = response.data.failedRows[0];
              console.error(`Row ${firstError.index} failed with error: ${firstError.reason}`);
              
              toast({
                title: "שגיאה בעיבוד נתונים",
                description: `בעיה בעיבוד השורות: ${firstError.reason.substring(0, 50)}. סך הכל ${response.data.failedRows.length} שורות נכשלו.`,
                variant: "destructive",
              });
              
              // Show detailed error for common issues
              if (firstError.reason && firstError.reason.includes("uuid is not a function")) {
                toast({
                  title: "שגיאה בשרת",
                  description: "בעיה בייצור מזהים. נסה שוב או פנה לתמיכה.",
                  variant: "destructive",
                });
                
                throw new Error("שגיאת שרת: בעיה בייצור מזהים. נסה שוב מאוחר יותר.");
              }
            }
            
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
            
            const deliveryCount = fetchedDeliveries.length;
            
            toast({
              title: `סנכרון נתונים הושלם`,
              description: `נטענו ${deliveryCount} משלוחים מהשרת`,
              variant: deliveryCount > 0 ? "default" : "destructive",
            });
                        
            return {
              deliveries: fetchedDeliveries,
              statusOptions,
              lastSyncTime: now
            };
          } else {
            console.error("No deliveries data in response:", response?.data);
            
            throw new Error("לא התקבלו נתוני משלוחים מהשרת. ייתכן בגלל בעיית הרשאות או מבנה טבלה שגוי.");
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
            throw e;
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
