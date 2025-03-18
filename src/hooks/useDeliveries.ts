
import { useState, useEffect, useCallback } from 'react';
import { Delivery } from '@/types/delivery';
import { fetchDeliveriesFromSheets, updateDeliveryStatus } from '@/utils/googleSheets';
import { saveToStorage, getFromStorage, storageKeys } from '@/utils/localStorage';
import { useAuth } from '@/context/AuthContext';

export const useDeliveries = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check if we're online
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    // Set up online/offline event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cached deliveries on component mount
  useEffect(() => {
    const cachedDeliveries = getFromStorage<Delivery[]>(storageKeys.DELIVERIES_CACHE, []);
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
      setError('No Google Sheets URL provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedDeliveries = await fetchDeliveriesFromSheets(user.sheetsUrl);
      setDeliveries(fetchedDeliveries);
      saveToStorage(storageKeys.DELIVERIES_CACHE, fetchedDeliveries);
      
      const now = new Date();
      setLastSyncTime(now);
      saveToStorage(storageKeys.LAST_SYNC, now.toISOString());
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setError('Failed to fetch deliveries from Google Sheets');
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
      console.log('Auto-syncing deliveries...');
      fetchDeliveries();
    }, 5 * 60 * 1000); // Sync every 5 minutes

    return () => clearInterval(syncInterval);
  }, [isOnline, user?.sheetsUrl, fetchDeliveries]);

  // Update delivery status
  const updateStatus = useCallback(async (deliveryId: string, newStatus: string) => {
    if (!user?.sheetsUrl) {
      throw new Error('No Google Sheets URL provided');
    }

    try {
      if (isOnline) {
        // Update in Google Sheets
        await updateDeliveryStatus(user.sheetsUrl, deliveryId, newStatus);
      }

      // Update locally
      setDeliveries(prevDeliveries => 
        prevDeliveries.map(delivery => 
          delivery.id === deliveryId 
            ? { ...delivery, status: newStatus, statusDate: new Date().toISOString() } 
            : delivery
        )
      );

      // Update cache
      const updatedDeliveries = deliveries.map(delivery => 
        delivery.id === deliveryId 
          ? { ...delivery, status: newStatus, statusDate: new Date().toISOString() } 
          : delivery
      );
      saveToStorage(storageKeys.DELIVERIES_CACHE, updatedDeliveries);

      return;
    } catch (err) {
      console.error('Error updating delivery status:', err);
      throw new Error('Failed to update delivery status');
    }
  }, [user?.sheetsUrl, deliveries, isOnline]);

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    fetchDeliveries,
    updateStatus,
  };
};
