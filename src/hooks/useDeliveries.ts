import { useState, useEffect, useCallback } from "react";
import { Delivery, COLUMN_SIGNATURES, DELIVERY_STATUS_OPTIONS } from "@/types/delivery";
import {
  fetchDeliveriesFromSheets,
  updateDeliveryStatus,
} from "@/utils/googleSheets";
import {
  saveToStorage,
  getFromStorage,
  storageKeys,
} from "@/utils/localStorage";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";

export const useDeliveries = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isTestData, setIsTestData] = useState<boolean>(false);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>({});
  const [deliveryHistory, setDeliveryHistory] = useState<Record<string, Delivery[]>>({});

  // Check if we're online
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Set up online/offline event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load cached deliveries on component mount
  useEffect(() => {
    const cachedDeliveries = getFromStorage<Delivery[]>(
      storageKeys.DELIVERIES_CACHE,
      []
    );
    if (cachedDeliveries.length > 0) {
      setDeliveries(cachedDeliveries);
      setIsLoading(false);
    }

    const lastSync = getFromStorage<string | null>(storageKeys.LAST_SYNC, null);
    if (lastSync) {
      setLastSyncTime(new Date(lastSync));
    }

    // Load delivery history
    const history = getFromStorage<Record<string, Delivery[]>>(
      storageKeys.DELIVERY_HISTORY, 
      {}
    );
    setDeliveryHistory(history);

    // Load detected columns
    const columns = getFromStorage<Record<string, string>>(
      storageKeys.DETECTED_COLUMNS,
      {}
    );
    setDetectedColumns(columns);
  }, []);

  // Fetch deliveries from Google Sheets
  const fetchDeliveries = useCallback(async () => {
    if (!user?.sheetsUrl) {
      setError("לא סופק קישור לגליון Google");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching deliveries from Google Sheets...");
      const { 
        deliveries: fetchedDeliveries, 
        isTestData: usingTestData,
        detectedColumns: newDetectedColumns 
      } = await fetchDeliveriesFromSheets(user.sheetsUrl, COLUMN_SIGNATURES);

      console.log(
        `Fetched ${fetchedDeliveries.length} deliveries:`,
        fetchedDeliveries
      );
      setIsTestData(usingTestData);

      if (newDetectedColumns) {
        console.log("Detected columns:", newDetectedColumns);
        setDetectedColumns(newDetectedColumns);
        saveToStorage(storageKeys.DETECTED_COLUMNS, newDetectedColumns);
      }

      if (usingTestData) {
        console.log("Using test data due to CORS issues");
        toast({
          title: "שימוש בנתוני דוגמה",
          description:
            "לא ניתן להתחבר ישירות לקובץ Google Sheets. ודא שהקובץ משותף לצפייה ציבורית או השתמש בקישור לתצוגה.",
          variant: "destructive",
        });
      }

      if (fetchedDeliveries.length === 0) {
        console.warn("No deliveries fetched");
        toast({
          title: "לא נמצאו משלוחים",
          description:
            "לא נמצאו משלוחים בגליון. ודא שהגליון מכיל את העמודות הנדרשות.",
          variant: "destructive",
        });
      }

      // Ensure all deliveries have required fields (even if empty)
      const normalizedDeliveries = fetchedDeliveries.map(delivery => ({
        ...delivery,
        name: delivery.name || "ללא שם",
        phone: delivery.phone || "לא זמין",
        address: delivery.address || "כתובת לא זמינה",
        assignedTo: delivery.assignedTo || "לא שויך",
        // Initialize history if not present
        history: delivery.history || [{
          timestamp: new Date().toISOString(),
          status: delivery.status,
          courier: delivery.assignedTo || user.name
        }]
      }));

      // Update delivery history - compare with previous deliveries and update history
      const updatedHistory = { ...deliveryHistory };
      normalizedDeliveries.forEach(delivery => {
        if (!updatedHistory[delivery.id]) {
          updatedHistory[delivery.id] = [delivery];
        } else {
          const lastVersion = updatedHistory[delivery.id][updatedHistory[delivery.id].length - 1];
          if (lastVersion.status !== delivery.status) {
            updatedHistory[delivery.id].push(delivery);
          }
        }
      });
      setDeliveryHistory(updatedHistory);
      saveToStorage(storageKeys.DELIVERY_HISTORY, updatedHistory);

      setDeliveries(normalizedDeliveries);
      saveToStorage(storageKeys.DELIVERIES_CACHE, normalizedDeliveries);

      const now = new Date();
      setLastSyncTime(now);
      saveToStorage(storageKeys.LAST_SYNC, now.toISOString());

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בטעינת משלוחים מ-Google Sheets";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [user?.sheetsUrl, deliveryHistory, user?.name]);

  // Initial fetch
  useEffect(() => {
    if (user?.sheetsUrl) {
      fetchDeliveries();
    }
  }, [user?.sheetsUrl, fetchDeliveries]);

  // Set up periodic sync if online
  useEffect(() => {
    if (!isOnline || !user?.sheetsUrl) return;

    const syncInterval = setInterval(() => {
      console.log("Auto-syncing deliveries...");
      fetchDeliveries();
    }, 5 * 60 * 1000); // Sync every 5 minutes

    return () => clearInterval(syncInterval);
  }, [isOnline, user?.sheetsUrl, fetchDeliveries]);

  // Add a new delivery manually (for offline use)
  const addDelivery = useCallback((newDelivery: Partial<Delivery>) => {
    const id = `manual-${Date.now()}`;
    const now = new Date().toISOString();
    
    const delivery: Delivery = {
      id,
      trackingNumber: newDelivery.trackingNumber || `MAN-${Date.now().toString().slice(-6)}`,
      scanDate: now,
      statusDate: now,
      status: newDelivery.status || 'pending',
      name: newDelivery.name || 'ללא שם',
      phone: newDelivery.phone || 'לא זמין',
      address: newDelivery.address || 'כתובת לא זמינה',
      assignedTo: newDelivery.assignedTo || user?.name || 'לא שויך',
      history: [{
        timestamp: now,
        status: newDelivery.status || 'pending',
        note: 'משלוח נוצר ידנית',
        courier: user?.name || 'לא שויך'
      }]
    };
    
    setDeliveries(prev => {
      const updated = [...prev, delivery];
      saveToStorage(storageKeys.DELIVERIES_CACHE, updated);
      return updated;
    });
    
    // Update delivery history
    setDeliveryHistory(prev => {
      const updated = { ...prev, [id]: [delivery] };
      saveToStorage(storageKeys.DELIVERY_HISTORY, updated);
      return updated;
    });
    
    toast({
      title: 'משלוח חדש',
      description: `נוסף משלוח חדש: ${delivery.trackingNumber}`,
    });
    
    return delivery;
  }, [user?.name]);

  // Update delivery status - can handle single or multiple deliveries
  const updateStatus = useCallback(
    async (deliveryId: string, newStatus: string, note?: string) => {
      if (!user?.sheetsUrl) {
        throw new Error("לא סופק קישור לגליון Google");
      }

      try {
        if (isOnline && !isTestData) {
          // Update in Google Sheets
          await updateDeliveryStatus(user.sheetsUrl, deliveryId, newStatus);
        }

        const now = new Date().toISOString();
        
        // Update locally
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) => {
            if (delivery.id === deliveryId) {
              // Create history entry
              const historyEntry = {
                timestamp: now,
                status: newStatus,
                note: note || `סטטוס שונה מ-${delivery.status} ל-${newStatus}`,
                courier: user.name
              };
              
              // Add history entry to delivery
              const updatedHistory = delivery.history || [];
              updatedHistory.push(historyEntry);
              
              return {
                ...delivery,
                status: newStatus,
                statusDate: now,
                history: updatedHistory
              };
            }
            return delivery;
          })
        );

        // Update cache
        const updatedDeliveries = deliveries.map((delivery) => {
          if (delivery.id === deliveryId) {
            // Create history entry
            const historyEntry = {
              timestamp: now,
              status: newStatus,
              note: note || `סטטוס שונה מ-${delivery.status} ל-${newStatus}`,
              courier: user.name
            };
            
            // Add history entry to delivery
            const updatedHistory = delivery.history || [];
            updatedHistory.push(historyEntry);
            
            return {
              ...delivery,
              status: newStatus,
              statusDate: now,
              history: updatedHistory
            };
          }
          return delivery;
        });
        
        saveToStorage(storageKeys.DELIVERIES_CACHE, updatedDeliveries);

        // Update delivery history
        const targetDelivery = deliveries.find(d => d.id === deliveryId);
        if (targetDelivery) {
          const updatedDelivery = {
            ...targetDelivery,
            status: newStatus,
            statusDate: now,
            history: [
              ...(targetDelivery.history || []),
              {
                timestamp: now,
                status: newStatus,
                note: note || `סטטוס שונה מ-${targetDelivery.status} ל-${newStatus}`,
                courier: user.name
              }
            ]
          };
          
          setDeliveryHistory(prev => {
            const deliveryHistoryArray = prev[deliveryId] || [];
            const updated = {
              ...prev,
              [deliveryId]: [...deliveryHistoryArray, updatedDelivery]
            };
            saveToStorage(storageKeys.DELIVERY_HISTORY, updated);
            return updated;
          });
        }

        if (isTestData) {
          toast({
            title: "מצב דוגמה",
            description: "הסטטוס עודכן מקומית בלבד ולא בגליון Google",
            variant: "default",
          });
        }

        return true;
      } catch (err) {
        console.error("Error updating delivery status:", err);
        toast({
          title: "שגיאה בעדכון סטטוס",
          description: "לא ניתן היה לעדכן את סטטוס המשלוח",
          variant: "destructive",
        });
        throw err;
      }
    },
    [deliveries, isOnline, isTestData, user]
  );

  // Get delivery history for a specific delivery
  const getDeliveryHistory = useCallback((deliveryId: string) => {
    return deliveryHistory[deliveryId] || [];
  }, [deliveryHistory]);

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    isTestData,
    detectedColumns,
    fetchDeliveries,
    updateStatus,
    addDelivery,
    getDeliveryHistory,
    deliveryStatusOptions: DELIVERY_STATUS_OPTIONS
  };
};
