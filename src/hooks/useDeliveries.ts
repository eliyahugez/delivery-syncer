import { useState, useEffect, useCallback } from "react";
import { Delivery } from "@/types/delivery";
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
      const { deliveries: fetchedDeliveries, isTestData: usingTestData } =
        await fetchDeliveriesFromSheets(user.sheetsUrl);

      console.log(
        `Fetched ${fetchedDeliveries.length} deliveries:`,
        fetchedDeliveries
      );
      setIsTestData(usingTestData);

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

      setDeliveries(fetchedDeliveries);
      saveToStorage(storageKeys.DELIVERIES_CACHE, fetchedDeliveries);

      const now = new Date();
      setLastSyncTime(now);
      saveToStorage(storageKeys.LAST_SYNC, now.toISOString());

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      setError("שגיאה בטעינת משלוחים מ-Google Sheets");
      setIsLoading(false);
    }
  }, [user?.sheetsUrl]);

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

  // Update delivery status - can handle single or multiple deliveries
  const updateStatus = useCallback(
    async (deliveryId: string, newStatus: string) => {
      if (!user?.sheetsUrl) {
        throw new Error("לא סופק קישור לגליון Google");
      }

      try {
        if (isOnline && !isTestData) {
          // Update in Google Sheets
          await updateDeliveryStatus(user.sheetsUrl, deliveryId, newStatus);
        }

        // Update locally
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) =>
            delivery.id === deliveryId
              ? {
                  ...delivery,
                  status: newStatus,
                  statusDate: new Date().toISOString(),
                }
              : delivery
          )
        );

        // Update cache
        const updatedDeliveries = deliveries.map((delivery) =>
          delivery.id === deliveryId
            ? {
                ...delivery,
                status: newStatus,
                statusDate: new Date().toISOString(),
              }
            : delivery
        );
        saveToStorage(storageKeys.DELIVERIES_CACHE, updatedDeliveries);

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
    [deliveries, isOnline, isTestData, user?.sheetsUrl]
  );

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    isTestData,
    fetchDeliveries,
    updateStatus,
  };
};
