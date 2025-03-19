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
import { supabase } from "@/integrations/supabase/client";

export const useDeliveries = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isTestData, setIsTestData] = useState<boolean>(false);
  const [detectedColumns, setDetectedColumns] = useState<Record<string, string>>({});
  const [deliveryHistory, setDeliveryHistory] = useState<Record<string, Delivery[]>>({});
  const [pendingUpdates, setPendingUpdates] = useState<Array<{deliveryId: string, newStatus: string, note?: string}>>([]);

  // Check if we're online
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Set up online/offline event listeners
    const handleOnline = () => {
      setIsOnline(true);
      // כאשר יש חיבור לאינטרנט, ננסה לסנכרן את העדכונים הממתינים
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

  // סנכרון עדכונים שממתינים
  const syncPendingUpdates = useCallback(async () => {
    const updates = getFromStorage<{deliveryId: string, newStatus: string, note?: string}[]>(
      storageKeys.OFFLINE_CHANGES, 
      []
    );
    
    if (updates.length === 0) return;
    
    let failedUpdates: typeof updates = [];
    
    for (const update of updates) {
      try {
        if (isOnline) {
          await updateStatus(update.deliveryId, update.newStatus, update.note);
        } else {
          failedUpdates.push(update);
        }
      } catch (error) {
        console.error("Failed to sync update:", error);
        failedUpdates.push(update);
      }
    }
    
    // שמור את העדכונים שנכשלו חזרה באחסון
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
        variant: "warning",
      });
    }
  }, [isOnline]);

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
    const updates = getFromStorage<{deliveryId: string, newStatus: string, note?: string}[]>(
      storageKeys.OFFLINE_CHANGES,
      []
    );
    setPendingUpdates(updates);
    
    // Load deliveries from Supabase on mount
    fetchDeliveriesFromDB();
  }, []);

  // פונקציה לטעינת משלוחים מסופאבייס
  const fetchDeliveriesFromDB = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // טעינת משלוחים מהדאטאבייס
      const { data: dbDeliveries, error: dbError } = await supabase
        .from('deliveries')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (dbError) throw dbError;
      
      if (dbDeliveries && dbDeliveries.length > 0) {
        // המרת הנתונים לפורמט של Delivery
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
          history: [] // יטען בנפרד
        }));
        
        // טעינת היסטוריית משלוחים
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
        // אם אין נתונים בדאטאבייס, ננסה לטעון מגוגל שיטס
        await fetchDeliveries();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching deliveries from DB:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בטעינת משלוחים מהדאטאבייס";
      
      // אם יש שגיאה בטעינה מהדאטאבייס, ננסה לטעון מגוגל שיטס או להשתמש בנתונים מהאחסון המקומי
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

  // שמירת משלוח יחיד בדאטאבייס
  const saveDeliveryToDB = async (delivery: Delivery) => {
    if (!isOnline) return false;
    
    try {
      // המרת המשלוח לפורמט הדאטאבייס
      const deliveryData = {
        id: delivery.id,
        tracking_number: delivery.trackingNumber,
        scan_date: delivery.scanDate,
        status_date: delivery.statusDate,
        status: delivery.status,
        name: delivery.name,
        phone: delivery.phone,
        address: delivery.address,
        assigned_to: delivery.assignedTo
      };
      
      // בדיקה אם המשלוח כבר קיים
      const { data: existingDelivery } = await supabase
        .from('deliveries')
        .select('id')
        .eq('id', delivery.id)
        .maybeSingle();
        
      let result;
      
      if (existingDelivery) {
        // עדכון משלוח קיים
        result = await supabase
          .from('deliveries')
          .update(deliveryData)
          .eq('id', delivery.id);
      } else {
        // הוספת משלוח חדש
        result = await supabase
          .from('deliveries')
          .insert(deliveryData);
      }
      
      if (result.error) throw result.error;
      
      // שמירת ההיסטוריה, אם יש
      if (delivery.history && delivery.history.length > 0) {
        // מחיקת היסטוריה קיימת ויצירתה מחדש
        await supabase
          .from('delivery_history')
          .delete()
          .eq('delivery_id', delivery.id);
          
        // הוספת ההיסטוריה החדשה
        const historyData = delivery.history.map(entry => ({
          delivery_id: delivery.id,
          status: entry.status,
          timestamp: entry.timestamp,
          note: entry.note || null,
          courier: entry.courier || null
        }));
        
        const { error: historyError } = await supabase
          .from('delivery_history')
          .insert(historyData);
          
        if (historyError) throw historyError;
      }
      
      return true;
    } catch (error) {
      console.error("Error saving delivery to DB:", error);
      return false;
    }
  };

  // שמירת כל המשלוחים בדאטאבייס
  const saveAllDeliveriesToDB = async () => {
    if (!isOnline || deliveries.length === 0) return false;
    
    try {
      let successCount = 0;
      
      for (const delivery of deliveries) {
        const success = await saveDeliveryToDB(delivery);
        if (success) successCount++;
      }
      
      toast({
        title: "סנכרון לדאטאבייס",
        description: `${successCount} מתוך ${deliveries.length} משלוחים סונכרנו בהצלחה`,
        variant: successCount === deliveries.length ? "default" : "warning",
      });
      
      return successCount === deliveries.length;
    } catch (error) {
      console.error("Error saving all deliveries to DB:", error);
      toast({
        title: "שגיאה בסנכרון",
        description: "אירעה שגיאה בעת סנכרון הנתונים לדאטאבייס",
        variant: "destructive",
      });
      return false;
    }
  };

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
        
        // שמירת התאמות העמודות בדאטאבייס
        if (isOnline && !usingTestData) {
          const { error } = await supabase
            .from('column_mappings')
            .upsert({
              sheet_url: user.sheetsUrl,
              mappings: newDetectedColumns,
              user_id: user?.name || null
            }, { onConflict: 'sheet_url' });
            
          if (error) {
            console.error("Error saving column mappings to DB:", error);
          }
        }
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
      
      // שמירת המשלוחים לדאטאבייס
      if (isOnline && !usingTestData) {
        await saveAllDeliveriesToDB();
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error fetching deliveries:", err);
      const errorMessage = err instanceof Error ? err.message : "שגיאה בטעינת משלוחים מ-Google Sheets";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [user, deliveryHistory, isOnline]);

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
    
    // שמירת המשלוח לדאטאבייס אם יש חיבור לאינטרנט
    if (isOnline) {
      saveDeliveryToDB(delivery).then(success => {
        if (!success) {
          toast({
            title: 'שגיאה בשמירה',
            description: 'המשלוח לא נשמר בדאטאבייס, אך נשמר באופן מקומי',
            variant: "warning",
          });
        }
      });
    }
    
    toast({
      title: 'משלוח חדש',
      description: `נוסף משלוח חדש: ${delivery.trackingNumber}`,
    });
    
    return delivery;
  }, [user?.name, isOnline]);

  // Update delivery status - can handle single or multiple deliveries
  const updateStatus = useCallback(
    async (deliveryId: string, newStatus: string, note?: string) => {
      if (!user?.sheetsUrl) {
        throw new Error("לא סופק קישור לגליון Google");
      }

      // אם אין חיבור לאינטרנט, שמור את העדכון מקומית ולתור העדכונים העתידיים
      if (!isOnline) {
        const updatedPendingUpdates = [...pendingUpdates, { deliveryId, newStatus, note }];
        setPendingUpdates(updatedPendingUpdates);
        saveToStorage(storageKeys.OFFLINE_CHANGES, updatedPendingUpdates);
        
        // עדכון מקומי
        const now = new Date().toISOString();
        
        setDeliveries((prevDeliveries) =>
          prevDeliveries.map((delivery) => {
            if (delivery.id === deliveryId) {
              const historyEntry = {
                timestamp: now,
                status: newStatus,
                note: note || `סטטוס שונה מ-${delivery.status} ל-${newStatus} (מקומי, ממתין לסנכרון)`,
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
          })
        );
        
        // עדכון האחסון המקומי
        const updatedDeliveries = deliveries.map((delivery) => {
          if (delivery.id === deliveryId) {
            const historyEntry = {
              timestamp: now,
              status: newStatus,
              note: note || `סטטוס שונה מ-${delivery.status} ל-${newStatus} (מקומי, ממתין לסנכרון)`,
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
          variant: "warning",
        });
        
        return true;
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
          
          // עדכון בדאטאבייס
          if (isOnline) {
            await saveDeliveryToDB(updatedDelivery);
          }
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
    [deliveries, isOnline, isTestData, user, pendingUpdates]
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
    deliveryStatusOptions: DELIVERY_STATUS_OPTIONS,
    pendingUpdates: pendingUpdates.length,
    syncDatabase: saveAllDeliveriesToDB,
    syncPendingUpdates
  };
};
