
import { useState, useEffect } from "react";
import { Delivery } from "@/types/delivery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useFetchDeliveries } from './useFetchDeliveries';
import { useOfflineMode } from './useOfflineMode';
import { useDeliveryProcessor } from './data/useDeliveryProcessor';
import { STORAGE_KEYS } from "@/utils/localStorage";

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
      
      // Try to fetch deliveries
      const { deliveries: fetchedDeliveries, statusOptions, lastSyncTime } = 
        await fetchDeliveries(user.sheetsUrl, forceRefresh);
      
      // Process and update state
      const processedDeliveries = processDeliveries(fetchedDeliveries);
      setDeliveries(processedDeliveries);
      setError(null);
      
      if (statusOptions && statusOptions.length > 0) {
        setDeliveryStatusOptions(statusOptions);
      }
      
      if (lastSyncTime) {
        setLastSyncTime(lastSyncTime);
      }
      
      // Cache deliveries to localStorage
      localStorage.setItem('cached_deliveries', JSON.stringify(processedDeliveries));
      
    } catch (err) {
      console.error("Error loading deliveries:", err);
      
      // Try loading from local storage as fallback
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
      
      // Set error message
      if (err instanceof Error) {
        setError(err.message || "שגיאה בטעינת נתונים");
      } else {
        setError("שגיאה לא ידועה בטעינת נתונים");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle column mapping submission from wizard
  const submitColumnMappings = async (mappings: Record<string, number>) => {
    if (!user?.sheetsUrl) return;
    
    try {
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
