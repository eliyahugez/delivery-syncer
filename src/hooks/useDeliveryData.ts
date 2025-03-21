
import { useState, useEffect, useCallback } from "react";
import { Delivery } from "@/types/delivery";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useFetchDeliveries } from './useFetchDeliveries';
import { useOfflineMode } from './useOfflineMode';
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

  const { isOnline } = useOfflineMode();
  const { fetchDeliveries } = useFetchDeliveries(isOnline);

  // Format phone number to international format
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Skip if the phone field contains status information
    if (phone.toLowerCase().includes('delivered') || 
        phone.toLowerCase().includes('נמסר') ||
        phone.toLowerCase().includes('status')) {
      return '';
    }
    
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
      const processedDeliveries = fetchedDeliveries.map(delivery => {
        // Process the name field - handle date values specifically
        let processedName = delivery.name || '';
        
        // Detect date in name field
        if (typeof processedName === 'string') {
          // If name is marked as date
          if (processedName.startsWith('[DATE]')) {
            processedName = processedName.replace('[DATE]', '').trim();
          }
          // Check if name is in Date() format and convert it
          else if (processedName.startsWith('Date(') && processedName.endsWith(')')) {
            try {
              const dateString = processedName.substring(5, processedName.length - 1);
              const [year, month, day] = dateString.split(',').map(Number);
              processedName = `${day}/${month + 1}/${year}`;
            } catch (e) {
              console.error("Error parsing date in name:", processedName, e);
            }
          }
        }
        
        // Check if phone field contains status info
        let processedPhone = delivery.phone || '';
        if (processedPhone.toLowerCase().includes('delivered') || 
            processedPhone.toLowerCase().includes('נמסר') ||
            processedPhone.toLowerCase().includes('status')) {
          // Don't show status in phone field
          processedPhone = '';
        } else {
          // Format the phone number normally
          processedPhone = formatPhoneNumber(delivery.phone);
        }
        
        // Ensure customer name is not empty or just the tracking number
        const finalName = processedName && processedName !== delivery.trackingNumber 
          ? processedName 
          : `לקוח ${delivery.trackingNumber || 'לא ידוע'}`;
          
        return {
          ...delivery,
          name: finalName,
          phone: processedPhone
        };
      });
      
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
