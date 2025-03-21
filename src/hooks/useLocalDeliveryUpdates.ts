
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { useSingleUpdate } from './updates/useSingleUpdate';
import { useBatchUpdate } from './updates/useBatchUpdate';

export function useLocalDeliveryUpdates() {
  const { updateSingleDelivery } = useSingleUpdate();
  const { updateBatchDeliveries } = useBatchUpdate();

  // Update deliveries locally
  const updateLocalDeliveries = useCallback((
    deliveries: Delivery[],
    deliveryId: string,
    newStatus: string,
    updateType: 'single' | 'batch'
  ): Delivery[] => {
    if (updateType === 'batch') {
      return updateBatchDeliveries(deliveries, deliveryId, newStatus);
    } else {
      return updateSingleDelivery(deliveries, deliveryId, newStatus);
    }
  }, [updateSingleDelivery, updateBatchDeliveries]);

  return { updateLocalDeliveries };
}
