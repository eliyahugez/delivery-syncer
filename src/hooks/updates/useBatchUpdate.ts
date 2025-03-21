
import { useCallback } from 'react';
import { Delivery } from "@/types/delivery";

export function useBatchUpdate() {
  // Update multiple deliveries for a batch update
  const updateBatchDeliveries = useCallback((
    deliveries: Delivery[],
    deliveryId: string,
    newStatus: string
  ): Delivery[] => {
    // First find the delivery to update
    const deliveryToUpdate = deliveries.find(d => d.id === deliveryId);
    
    if (!deliveryToUpdate) {
      console.warn(`Delivery with ID ${deliveryId} not found for batch update`);
      return [...deliveries];
    }
    
    // Find all deliveries with the same name
    const deliveryName = deliveryToUpdate.name;
    const updatedDeliveries = deliveries.map(delivery => {
      if (delivery.name === deliveryName) {
        // Update the status for all deliveries with the same name
        return {
          ...delivery,
          status: newStatus,
          statusDate: new Date().toISOString()
        };
      }
      return delivery;
    });
    
    return updatedDeliveries;
  }, []);

  return { updateBatchDeliveries };
}
