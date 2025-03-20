import { useState, useEffect, useCallback } from "react";
import { Delivery } from "@/types/delivery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useSyncDeliveries } from './useSyncDeliveries';
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '@/utils/localStorage';

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

  const { fetchDeliveries } = useSyncDeliveries();

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

  // Initial fetch
  useEffect(() => {
    if (user?.sheetsUrl) {
      loadDeliveries();
    }
    
    // Set up interval for periodic refetching when online
    const intervalId = setInterval(() => {
      if (user?.sheetsUrl) {
        loadDeliveries();
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    
    return () => clearInterval(intervalId);
  }, [user]);

  return {
    deliveries,
    setDeliveries,
    isLoading,
    error,
    lastSyncTime,
    fetchDeliveries: loadDeliveries,
    deliveryStatusOptions
  };
}
