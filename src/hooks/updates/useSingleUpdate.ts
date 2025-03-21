
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";

export function useSingleUpdate() {
  // Update a single delivery
  const updateSingleDelivery = useCallback((
    deliveries: Delivery[],
    deliveryId: string,
    newStatus: string
  ): Delivery[] => {
    // Update just the one delivery with the matching ID
    return deliveries.map(delivery => {
      if (delivery.id === deliveryId) {
        return {
          ...delivery,
          status: newStatus,
          statusDate: new Date().toISOString()
        };
      }
      return delivery;
    });
  }, []);

  return { updateSingleDelivery };
}
