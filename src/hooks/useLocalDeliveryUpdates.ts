
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";
import { saveToStorage, STORAGE_KEYS } from '@/utils/localStorage';

export function useLocalDeliveryUpdates() {
  // Update delivery status in cache
  const updateLocalDeliveries = useCallback((
    deliveries: Delivery[],
    deliveryId: string,
    newStatus: string,
    updateType: 'single' | 'batch' = 'single'
  ): Delivery[] => {
    let updatedDeliveries: Delivery[];
    
    if (updateType === 'batch') {
      // Find the delivery to get the customer name
      const targetDelivery = deliveries.find(d => d.id === deliveryId);
      if (!targetDelivery || !targetDelivery.name) return deliveries;
      
      // Update all deliveries with the same customer name
      updatedDeliveries = deliveries.map(delivery => {
        if (delivery.name === targetDelivery.name) {
          return {
            ...delivery,
            status: newStatus,
            statusDate: new Date().toISOString()
          };
        }
        return delivery;
      });
    } else {
      // Just update the single delivery
      updatedDeliveries = deliveries.map(delivery => {
        if (delivery.id === deliveryId) {
          return {
            ...delivery,
            status: newStatus,
            statusDate: new Date().toISOString()
          };
        }
        return delivery;
      });
    }
    
    // Update the cache
    saveToStorage(STORAGE_KEYS.DELIVERIES_CACHE, updatedDeliveries);
    
    return updatedDeliveries;
  }, []);

  return { updateLocalDeliveries };
}
