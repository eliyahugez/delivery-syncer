
import { useMemo } from 'react';
import { Delivery } from '@/types/delivery';

export interface DeliveryGroup {
  customerName: string;
  deliveries: Delivery[];
  totalDeliveries: number;
  latestStatus: string;
  latestStatusDate: string;
  addresses: string[];
  trackingNumbers: string[];
  phones: string[];
}

export function useDeliveryGroups(deliveries: Delivery[]) {
  // Group deliveries by customer name
  const deliveryGroups = useMemo(() => {
    const groups: Record<string, DeliveryGroup> = {};
    
    deliveries.forEach(delivery => {
      // Properly extract customer name, with fallback to tracking number
      const customerName = delivery.name && delivery.name !== delivery.trackingNumber 
        ? delivery.name 
        : delivery.trackingNumber || 'Unknown';
      
      if (!groups[customerName]) {
        groups[customerName] = {
          customerName,
          deliveries: [],
          totalDeliveries: 0,
          latestStatus: '',
          latestStatusDate: '',
          addresses: [],
          trackingNumbers: [],
          phones: []
        };
      }
      
      // Add delivery to group
      groups[customerName].deliveries.push(delivery);
      groups[customerName].totalDeliveries += 1;
      
      // Update latest status if this delivery has a more recent status date
      if (!groups[customerName].latestStatusDate || 
          (delivery.statusDate && delivery.statusDate > groups[customerName].latestStatusDate)) {
        groups[customerName].latestStatus = delivery.status;
        groups[customerName].latestStatusDate = delivery.statusDate;
      }
      
      // Add unique address
      if (delivery.address && !groups[customerName].addresses.includes(delivery.address)) {
        groups[customerName].addresses.push(delivery.address);
      }
      
      // Add unique tracking number
      if (delivery.trackingNumber && !groups[customerName].trackingNumbers.includes(delivery.trackingNumber)) {
        groups[customerName].trackingNumbers.push(delivery.trackingNumber);
      }
      
      // Add unique phone
      if (delivery.phone && !groups[customerName].phones.includes(delivery.phone)) {
        groups[customerName].phones.push(delivery.phone);
      }
    });
    
    return Object.values(groups).sort((a, b) => 
      a.customerName.localeCompare(b.customerName, 'he'));
  }, [deliveries]);
  
  // Get a specific group by customer name
  const getGroupByCustomerName = (name: string) => {
    return deliveryGroups.find(group => group.customerName === name);
  };
  
  // Find which group a delivery belongs to
  const findDeliveryGroup = (deliveryId: string) => {
    for (const group of deliveryGroups) {
      const found = group.deliveries.find(d => d.id === deliveryId);
      if (found) {
        return group;
      }
    }
    return null;
  };
  
  // Get all delivery IDs for a specific customer
  const getDeliveryIdsByCustomer = (customerName: string): string[] => {
    const group = getGroupByCustomerName(customerName);
    return group ? group.deliveries.map(d => d.id) : [];
  };
  
  return {
    deliveryGroups,
    getGroupByCustomerName,
    findDeliveryGroup,
    getDeliveryIdsByCustomer
  };
}
