
import { useState, useEffect, useCallback } from 'react';
import { saveToStorage, getFromStorage, STORAGE_KEYS } from '@/utils/localStorage';
import { useToast } from "@/components/ui/use-toast";

export interface OfflineChange {
  id: string;
  status: string;
  timestamp: string;
  updateType: 'single' | 'batch';
  customerName?: string;
  retry?: number;
}

export function useOfflineMode() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUpdates, setPendingUpdates] = useState<number>(0);
  
  // Check online status and update pending changes count
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "חיבור אינטרנט זוהה",
        description: pendingUpdates > 0 
          ? `${pendingUpdates} עדכונים ממתינים לסנכרון` 
          : "כל הנתונים מסונכרנים",
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "אין חיבור אינטרנט",
        description: "המערכת עברה למצב לא מקוון. השינויים יישמרו באופן מקומי.",
        variant: "destructive",
      });
    };

    // Set up event listeners for online/offline status
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Check for pending updates in local storage
    const checkPendingUpdates = () => {
      const offlineChanges = getOfflineChanges();
      setPendingUpdates(offlineChanges.length);
    };
    
    checkPendingUpdates();
    const intervalId = setInterval(checkPendingUpdates, 30000); // Check every 30 seconds
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(intervalId);
    };
  }, [toast, pendingUpdates]);
  
  // Add change to offline queue
  const addOfflineChange = useCallback((change: Omit<OfflineChange, 'timestamp' | 'retry'>) => {
    const offlineChange: OfflineChange = {
      ...change,
      timestamp: new Date().toISOString(),
      retry: 0
    };
    
    const offlineChanges = getOfflineChanges();
    offlineChanges.push(offlineChange);
    
    saveToStorage(STORAGE_KEYS.OFFLINE_CHANGES, offlineChanges);
    setPendingUpdates(offlineChanges.length);
    
    return offlineChanges.length;
  }, []);
  
  // Get all pending offline changes
  const getOfflineChanges = useCallback((): OfflineChange[] => {
    return getFromStorage<OfflineChange[]>(STORAGE_KEYS.OFFLINE_CHANGES, []);
  }, []);
  
  // Clear specific offline changes (typically after successful sync)
  const clearOfflineChanges = useCallback((changeIds: string[]) => {
    const offlineChanges = getOfflineChanges();
    const remainingChanges = offlineChanges.filter(change => 
      !changeIds.includes(change.id));
    
    saveToStorage(STORAGE_KEYS.OFFLINE_CHANGES, remainingChanges);
    setPendingUpdates(remainingChanges.length);
    
    return remainingChanges.length;
  }, []);
  
  // Clear all offline changes
  const clearAllOfflineChanges = useCallback(() => {
    saveToStorage(STORAGE_KEYS.OFFLINE_CHANGES, []);
    setPendingUpdates(0);
  }, []);
  
  // Mark change as failed (increment retry counter)
  const markChangeFailed = useCallback((changeId: string) => {
    const offlineChanges = getOfflineChanges();
    const updatedChanges = offlineChanges.map(change => {
      if (change.id === changeId) {
        return {
          ...change,
          retry: (change.retry || 0) + 1
        };
      }
      return change;
    });
    
    saveToStorage(STORAGE_KEYS.OFFLINE_CHANGES, updatedChanges);
  }, []);
  
  return {
    isOnline,
    pendingUpdates,
    addOfflineChange,
    getOfflineChanges,
    clearOfflineChanges,
    clearAllOfflineChanges,
    markChangeFailed
  };
}
