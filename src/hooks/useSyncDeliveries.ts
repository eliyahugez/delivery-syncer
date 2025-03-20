
import { useCallback } from 'react';
import { useFetchDeliveries } from './useFetchDeliveries';
import { useLocalDeliveryUpdates } from './useLocalDeliveryUpdates';
import { useSyncPendingUpdates } from './useSyncPendingUpdates';
import { useOfflineMode } from './useOfflineMode';

export function useSyncDeliveries() {
  const { isOnline, getOfflineChanges, clearOfflineChanges, markChangeFailed } = useOfflineMode();
  const { fetchDeliveries } = useFetchDeliveries(isOnline);
  const { updateLocalDeliveries } = useLocalDeliveryUpdates();
  const { syncPendingUpdates } = useSyncPendingUpdates(
    isOnline, 
    getOfflineChanges, 
    clearOfflineChanges, 
    markChangeFailed
  );
  
  return {
    fetchDeliveries,
    updateLocalDeliveries,
    syncPendingUpdates
  };
}
