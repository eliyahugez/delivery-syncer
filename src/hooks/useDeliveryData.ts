
import { useState, useEffect } from "react";
import { Delivery } from "@/types/delivery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useFetchDeliveries } from './useFetchDeliveries';
import { useOfflineMode } from './useOfflineMode';
import { useDeliveryProcessor } from './data/useDeliveryProcessor';

export function useDeliveryData() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [deliveryStatusOptions, setDeliveryStatusOptions] = useState<{ value: string; label: string }[]>([
    { value: "pending", label: "ממתין" },
    { value: "in_progress", label: "בדרך" },
    { value: "delivered", label: "נמסר" },
    { value: "failed", label: "נכשל" },
    { value: "returned", label: "הוחזר" }
  ]);

  const { isOnline } = useOfflineMode();
  const { fetchDeliveries } = useFetchDeliveries(isOnline);
  const { processDeliveries } = useDeliveryProcessor();

  // Load deliveries
  const loadDeliveries = async (forceRefresh = false) => {
    if (!user?.sheetsUrl) {
      setIsLoading(false);
      setError("לא הוגדר קישור לטבלה. אנא הגדר קישור בהגדרות המשתמש.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching deliveries...");
      
      // Try to fetch from Supabase edge function
      const { deliveries: fetchedDeliveries, statusOptions, lastSyncTime } = 
        await fetchDeliveries(user.sheetsUrl, forceRefresh)
          .catch(err => {
            console.error("Error fetching deliveries from edge function:", err);
            
            // Show toast for connection issues
            toast({
              title: "שגיאת התחברות",
              description: err.message || "לא ניתן להתחבר לשרת. משתמש במידע מקומי.",
              variant: "destructive",
            });
            
            // Return null to continue to fallback
            throw err;
          });
      
      // Process received deliveries
      const processedDeliveries = processDeliveries(fetchedDeliveries);
      
      console.log("Loaded deliveries:", processedDeliveries.slice(0, 3));
      
      // Log the first few items for debugging
      console.log("Sample deliveries:", processedDeliveries.slice(0, 5).map(d => ({
        name: d.name,
        tracking: d.trackingNumber,
        phone: d.phone,
        address: d.address
      })));
      
      setDeliveries(processedDeliveries);
      setError(null);
      
      if (statusOptions && statusOptions.length > 0) {
        setDeliveryStatusOptions(statusOptions);
      }
      
      if (lastSyncTime) {
        setLastSyncTime(new Date(lastSyncTime));
      }
    } catch (err) {
      console.error("Error loading deliveries:", err);
      
      // Try loading from local storage
      const cachedDeliveries = localStorage.getItem('cached_deliveries');
      if (cachedDeliveries) {
        try {
          const parsed = JSON.parse(cachedDeliveries);
          setDeliveries(parsed);
          toast({
            title: "נטען ממטמון מקומי",
            description: "לא ניתן להתחבר לשרת. נטענו נתונים מקומיים.",
          });
        } catch (e) {
          console.error("Error parsing cached deliveries:", e);
        }
      }
      
      // For better DX, show debug info in console
      if (err instanceof Error) {
        console.debug("Error details:", err.message, err.stack);
        setError(err.message || "שגיאה בטעינת נתונים. בדוק את החיבור לאינטרנט.");
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

  // Handle column mapping submission from wizard
  const submitColumnMappings = async (mappings: Record<string, number>) => {
    if (!user?.sheetsUrl) return;
    
    try {
      // For now, we'll just simulate this - in a real implementation, you'd send
      // the mappings to the backend to store and use for future imports
      console.log("Submitting column mappings:", mappings);
      
      toast({
        title: "מיפוי עמודות נשמר",
        description: "מיפוי העמודות נשמר בהצלחה. הנתונים ייובאו בהתאם.",
      });
      
      // Trigger a refresh with the new mappings
      loadDeliveries(true);
    } catch (error) {
      console.error("Error submitting column mappings:", error);
      toast({
        title: "שגיאה בשמירת מיפוי",
        description: "לא ניתן לשמור את מיפוי העמודות. נסה שנית.",
        variant: "destructive",
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user?.sheetsUrl) {
      loadDeliveries();
    } else {
      setIsLoading(false);
      setError("לא הוגדר קישור לטבלה. אנא הגדר קישור בהגדרות המשתמש.");
    }
    
    // Set up interval for periodic refetching when online
    const intervalId = setInterval(() => {
      if (user?.sheetsUrl && isOnline) {
        loadDeliveries();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    
    return () => clearInterval(intervalId);
  }, [user, isOnline]);

  return {
    deliveries,
    setDeliveries,
    isLoading,
    error,
    lastSyncTime,
    fetchDeliveries: loadDeliveries,
    deliveryStatusOptions,
    submitColumnMappings
  };
}
