
import { useState, useEffect, useCallback } from "react";
import { Delivery, DELIVERY_STATUS_OPTIONS } from "@/types/delivery";
import {
  saveToStorage,
  getFromStorage,
  storageKeys,
} from "@/utils/localStorage";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

// Define the type for the pending updates to avoid deep type instantiation
interface PendingUpdate {
  deliveryId: string;
  newStatus: string;
  note?: string;
  updateType?: string;
}

export const useDeliveries = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isTestData, setIsTestData] = useState<boolean>(false);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>({});
  const [deliveryHistory, setDeliveryHistory] = useState<Record<string, Delivery[]>>({});
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [statusOptions, setStatusOptions] = useState(DELIVERY_STATUS_OPTIONS);

  // Check if we're online
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Set up online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // When back online, try to sync pending updates
      syncPendingUpdates();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load status options from Google Sheets
  const fetchStatusOptionsFromSheets = useCallback(async () => {
    if (!user?.sheetsUrl || !isOnline) return;
    
    try {
      const response = await supabase.functions.invoke('sync-sheets', {
        body: {
          action: 'getStatusOptions',
          sheetsUrl: user.sheetsUrl
        }
      });
      
      if (response.data && response.data.statusOptions) {
        setStatusOptions(response.data.statusOptions);
        console.log('Loaded status options from sheets:', response.data.statusOptions);
      }
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  }, [user?.sheetsUrl, isOnline]);

  // Sync pending updates
  const syncPendingUpdates = useCallback(async () => {
    const updates = getFromStorage<PendingUpdate[]>(
      storageKeys.OFFLINE_CHANGES, 
      []
    );
    
    if (updates.length === 0) return;
    
    // Explicitly type the array to avoid deep type instantiation
    let failedUpdates: PendingUpdate[] = [];
    
    for (const update of updates) {
      try {
        if (isOnline) {
          // Update via the Edge Function
          await supabase.functions.invoke('sync-sheets', {
            body: {
              action: 'updateStatus',
              deliveryId: update.deliveryId,
              newStatus: update.newStatus,
              updateType: update.updateType,
              sheetsUrl: user?.sheetsUrl
            }
          });
        } else {
          failedUpdates.push(update);
        }
      } catch (error) {
        console.error("Failed to sync update:", error);
        failedUpdates.push(update);
      }
    }
    
    // Save the failed updates back to storage
    setPendingUpdates(failedUpdates);
    saveToStorage(storageKeys.OFFLINE_CHANGES, failedUpdates);
    
    if (updates.length > failedUpdates.length) {
      toast({
        title: "סנכרון הצליח",
        description: `סונכרנו ${updates.length - failedUpdates.length} עדכונים בהצלחה`,
      });
    }
    
    if (failedUpdates.length > 0) {
      toast({
        title: "סנכרון חלקי",
        description: `${failedUpdates.length} עדכונים עדיין ממתינים לסנכרון`,
        variant: "destructive",
      });
    }
  }, [isOnline, user?.sheetsUrl]);

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
    
    // Load pending updates
    const updates = getFromStorage<PendingUpdate[]>(
      storageKeys.OFFLINE_CHANGES,
      []
    );
    setPendingUpdates(updates);
    
    // Load cached status options
    const cachedOptions = getFromStorage(
      storageKeys.STATUS_OPTIONS, 
      DELIVERY_STATUS_OPTIONS
    );
    setStatusOptions(cachedOptions);
    
    // Load deliveries from Supabase on mount
    fetchDeliveriesFromDB();
    
    // Fetch status options from sheets
    fetchStatusOptionsFromSheets();
  }, []);

  // Function to load deliveries from Supabase
  const fetchDeliveriesFromDB = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load deliveries from the database
      const { data: dbDeliveries, error: dbError } = await supabase
        .from('deliveries')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (dbError) throw dbError;
      
      if (dbDeliveries && dbDeliveries.length > 0) {
        // Convert data to Delivery format
        const formattedDeliveries: Delivery[] = dbDeliveries.map(delivery => ({
          id: delivery.id,
          trackingNumber: delivery.tracking_number,
          scanDate: delivery.scan_date,
          statusDate: delivery.status_date,
          status: delivery.status,
          name: delivery.name || "ללא שם",
          phone: delivery.phone || "לא זמין",
          address: delivery.address || "כתובת לא זמינה",
          assignedTo: delivery.assigned_to || "לא שויך",
          history: [] // Will load separately
        }));
        
        // Load delivery history
        for (const delivery of formattedDeliveries) {
          const { data: historyData, error: historyError } = await supabase
            .from('delivery_history')
            .select('*')
            .eq('delivery_id', delivery.id)
            .order('timestamp', { ascending: true });
            
          if (!historyError && historyData) {
            delivery.history = historyData.map(entry => ({
              timestamp: entry.timestamp,
              status: entry.status,
              note: entry.note || "",
              courier: entry.courier || ""
            }));
          }
        }
        
        setDeliveries(formattedDeliveries);
        saveToStorage(storageKeys.DELIVERIES_CACHE, formattedDeliveries);
        
        const now = new Date();
        setLastSyncTime(now);
        saveToStorage(storageKeys.LAST_SYNC, now.toISOString());
      } else if (user?.sheetsUrl) {
        // If no data in the database, try to load from Google Sheets
        await fetchDeliveries();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching deliveries from DB:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בטעינת משלוחים מהדאטאבייס";
      
      // If there's an error loading from the database, try to load from Google Sheets
      if (user?.sheetsUrl) {
        try {
          await fetchDeliveries();
        } catch (sheetErr) {
          setError(errorMessage);
          setIsLoading(false);
        }
      } else {
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [user?.sheetsUrl]);

  // Fetch deliveries from Google Sheets via Edge Function
  const fetchDeliveries = useCallback(async () => {
    if (!user?.sheetsUrl) {
      setError("לא סופק קישור לגליון Google");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching deliveries from Edge Function...");
      
      const response = await supabase.functions.invoke('sync-sheets', {
        body: { sheetsUrl: user.sheetsUrl }
      });
      
      if (!response.data) {
        throw new Error('קבלת תשובה ריקה מהשרת');
      }
      
      const { deliveries: fetchedDeliveries, columnMap: newDetectedColumns } = response.data;
      
      console.log(`Fetched ${fetchedDeliveries?.length} deliveries`);
      
      if (newDetectedColumns) {
        setDetectedColumns(newDetectedColumns);
        saveToStorage(storageKeys.DETECTED_COLUMNS, newDetectedColumns);
      }

      if (!fetchedDeliveries || fetchedDeliveries.length === 0) {
        console.warn("No deliveries fetched");
        toast({
          title: "לא נמצאו משלוחים",
          description: "לא נמצאו משלוחים בגליון. ודא שהגליון מכיל את העמודות הנדרשות.",
          variant: "destructive",
        });
      } else {
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
      }
      
      // Also fetch status options
      await fetchStatusOptionsFromSheets();

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בטעינת משלוחים";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [user, deliveryHistory]);

  // Update delivery status with option for batch updates
  const updateStatus = useCallback(
    async (deliveryId: string, newStatus: string, updateType = "single") => {
      if (!user?.sheetsUrl) {
        throw new Error("לא סופק קישור לגליון Google");
      }

      // If offline, save the update locally and to the pending updates queue
      if (!isOnline) {
        const updatedPendingUpdates: PendingUpdate[] = [
          ...pendingUpdates, 
          { deliveryId, newStatus, updateType }
        ];
        
        setPendingUpdates(updatedPendingUpdates);
        saveToStorage(storageKeys.OFFLINE_CHANGES, updatedPendingUpdates);
        
        // Local update
        const now = new Date().toISOString();
        
        setDeliveries((prevDeliveries) => {
          // If batch update, find all deliveries with the same name
          if (updateType === "batch") {
            const targetDelivery = prevDeliveries.find(d => d.id === deliveryId);
            if (!targetDelivery) return prevDeliveries;
            
            const targetName = targetDelivery.name;
            
            return prevDeliveries.map(delivery => {
              if (delivery.name === targetName) {
                const historyEntry = {
                  timestamp: now,
                  status: newStatus,
                  note: `סטטוס שונה מ-${delivery.status} ל-${newStatus} (עדכון קבוצתי, מקומי)`,
                  courier: user.name
                };
                
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
          } else {
            // Single delivery update
            return prevDeliveries.map((delivery) => {
              if (delivery.id === deliveryId) {
                const historyEntry = {
                  timestamp: now,
                  status: newStatus,
                  note: `סטטוס שונה מ-${delivery.status} ל-${newStatus} (מקומי)`,
                  courier: user.name
                };
                
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
          }
        });
        
        // Update local storage
        const updatedDeliveries = deliveries.map(delivery => {
          // For batch updates
          if (updateType === "batch") {
            const targetDelivery = deliveries.find(d => d.id === deliveryId);
            if (!targetDelivery) return delivery;
            
            if (delivery.name === targetDelivery.name) {
              const historyEntry = {
                timestamp: now,
                status: newStatus,
                note: `סטטוס שונה מ-${delivery.status} ל-${newStatus} (עדכון קבוצתי, מקומי)`,
                courier: user.name
              };
              
              const updatedHistory = delivery.history || [];
              updatedHistory.push(historyEntry);
              
              return {
                ...delivery,
                status: newStatus,
                statusDate: now,
                history: updatedHistory
              };
            }
          } else if (delivery.id === deliveryId) {
            // Single delivery update
            const historyEntry = {
              timestamp: now,
              status: newStatus,
              note: `סטטוס שונה מ-${delivery.status} ל-${newStatus} (מקומי)`,
              courier: user.name
            };
            
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
        
        toast({
          title: "עדכון מקומי",
          description: "הסטטוס עודכן מקומית ויסונכרן כשהחיבור לאינטרנט יחזור",
          variant: "destructive",
        });
        
        return true;
      }

      try {
        // Online update - send to Edge Function
        const response = await supabase.functions.invoke('sync-sheets', {
          body: {
            action: 'updateStatus',
            deliveryId,
            newStatus,
            updateType,
            sheetsUrl: user.sheetsUrl
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message || 'Failed to update status');
        }
        
        const now = new Date().toISOString();
        
        // Update locally
        setDeliveries((prevDeliveries) => {
          // For batch updates
          if (updateType === "batch") {
            const targetDelivery = prevDeliveries.find(d => d.id === deliveryId);
            if (!targetDelivery) return prevDeliveries;
            
            const targetName = targetDelivery.name;
            
            return prevDeliveries.map(delivery => {
              if (delivery.name === targetName) {
                const historyEntry = {
                  timestamp: now,
                  status: newStatus,
                  note: `סטטוס שונה מ-${delivery.status} ל-${newStatus} (עדכון קבוצתי)`,
                  courier: user.name
                };
                
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
          } else {
            // Single delivery update
            return prevDeliveries.map((delivery) => {
              if (delivery.id === deliveryId) {
                const historyEntry = {
                  timestamp: now,
                  status: newStatus,
                  note: `סטטוס שונה מ-${delivery.status} ל-${newStatus}`,
                  courier: user.name
                };
                
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
          }
        });

        // Update cache
        const updatedDeliveries = [...deliveries];
        
        // For batch updates
        if (updateType === "batch") {
          const targetDelivery = updatedDeliveries.find(d => d.id === deliveryId);
          if (targetDelivery) {
            const targetName = targetDelivery.name;
            
            for (let i = 0; i < updatedDeliveries.length; i++) {
              if (updatedDeliveries[i].name === targetName) {
                const historyEntry = {
                  timestamp: now,
                  status: newStatus,
                  note: `סטטוס שונה מ-${updatedDeliveries[i].status} ל-${newStatus} (עדכון קבוצתי)`,
                  courier: user.name
                };
                
                const updatedHistory = updatedDeliveries[i].history || [];
                updatedHistory.push(historyEntry);
                
                updatedDeliveries[i] = {
                  ...updatedDeliveries[i],
                  status: newStatus,
                  statusDate: now,
                  history: updatedHistory
                };
              }
            }
          }
        } else {
          // Single delivery update
          const index = updatedDeliveries.findIndex(d => d.id === deliveryId);
          if (index !== -1) {
            const historyEntry = {
              timestamp: now,
              status: newStatus,
              note: `סטטוס שונה מ-${updatedDeliveries[index].status} ל-${newStatus}`,
              courier: user.name
            };
            
            const updatedHistory = updatedDeliveries[index].history || [];
            updatedHistory.push(historyEntry);
            
            updatedDeliveries[index] = {
              ...updatedDeliveries[index],
              status: newStatus,
              statusDate: now,
              history: updatedHistory
            };
          }
        }
        
        saveToStorage(storageKeys.DELIVERIES_CACHE, updatedDeliveries);

        // Update delivery history
        const targetDelivery = deliveries.find(d => d.id === deliveryId);
        if (targetDelivery) {
          // For batch updates, update all related deliveries
          if (updateType === "batch") {
            const relatedDeliveries = deliveries.filter(d => d.name === targetDelivery.name);
            
            for (const delivery of relatedDeliveries) {
              setDeliveryHistory(prev => {
                const deliveryHistoryArray = prev[delivery.id] || [];
                const updatedDelivery = {
                  ...delivery,
                  status: newStatus,
                  statusDate: now,
                  history: [
                    ...(delivery.history || []),
                    {
                      timestamp: now,
                      status: newStatus,
                      note: `סטטוס שונה מ-${delivery.status} ל-${newStatus} (עדכון קבוצתי)`,
                      courier: user.name
                    }
                  ]
                };
                
                const updated = {
                  ...prev,
                  [delivery.id]: [...deliveryHistoryArray, updatedDelivery]
                };
                return updated;
              });
            }
          } else {
            // Single delivery update
            setDeliveryHistory(prev => {
              const deliveryHistoryArray = prev[deliveryId] || [];
              const updatedDelivery = {
                ...targetDelivery,
                status: newStatus,
                statusDate: now,
                history: [
                  ...(targetDelivery.history || []),
                  {
                    timestamp: now,
                    status: newStatus,
                    note: `סטטוס שונה מ-${targetDelivery.status} ל-${newStatus}`,
                    courier: user.name
                  }
                ]
              };
              
              const updated = {
                ...prev,
                [deliveryId]: [...deliveryHistoryArray, updatedDelivery]
              };
              saveToStorage(storageKeys.DELIVERY_HISTORY, updated);
              return updated;
            });
          }
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
    [deliveries, isOnline, user, pendingUpdates]
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
    getDeliveryHistory,
    deliveryStatusOptions: statusOptions,
    pendingUpdates: pendingUpdates.length,
    syncPendingUpdates
  };
};
