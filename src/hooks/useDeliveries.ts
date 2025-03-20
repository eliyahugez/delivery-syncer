
import { useDeliveryData } from "./useDeliveryData";
import { useDeliveryStatusUpdates } from "./useDeliveryStatusUpdates";
import { useOfflineMode } from './useOfflineMode';
import { useDeliveryGroups } from './useDeliveryGroups';
import { useAuth } from "@/context/AuthContext";

export interface DeliveryStatusOption {
  value: string;
  label: string;
}

export function useDeliveries() {
  const { user } = useAuth();
  const {
    deliveries,
    setDeliveries,
    isLoading,
    error,
    lastSyncTime,
    fetchDeliveries,
    deliveryStatusOptions
  } = useDeliveryData();

  const { isOnline, pendingUpdates } = useOfflineMode();
  
  const {
    updateStatus,
    syncPendingUpdates
  } = useDeliveryStatusUpdates(deliveries, setDeliveries);
  
  const deliveryGroups = useDeliveryGroups(deliveries);

  // Handle syncing pending updates with correct sheetsUrl
  const handleSyncPendingUpdates = async () => {
    if (user?.sheetsUrl) {
      await syncPendingUpdates(user.sheetsUrl);
    }
  };

  return {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    fetchDeliveries,
    updateStatus,
    pendingUpdates,
    syncPendingUpdates: handleSyncPendingUpdates,
    deliveryStatusOptions,
    ...deliveryGroups
  };
}
