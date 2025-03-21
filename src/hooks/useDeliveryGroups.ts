
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
      // Clean customer name to prevent empty or tracking number groups
      let customerName = delivery.name || '';
      
      // Check if name is just a date marker from the delivery processor
      if (customerName.startsWith('[DATE]')) {
        // Extract just the date for display
        const dateValue = customerName.replace('[DATE]', '').trim();
        customerName = `תאריך: ${dateValue}`;
      }
      
      // If the name is empty, just the tracking number, or looks like an auto-tracking,
      // use a consistent placeholder with the tracking number
      if (!customerName || 
          customerName === delivery.trackingNumber ||
          customerName.trim() === '' ||
          /^AUTO-\d+$/.test(delivery.trackingNumber || '')) {
        customerName = `לקוח ${delivery.trackingNumber || 'לא ידוע'}`;
      }
      
      // Improved delivery grouping
      let groupKey = customerName;
      
      // If the name looks like a date, group by address instead
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(customerName) || customerName.startsWith('תאריך:')) {
        if (delivery.address) {
          // Extract first part of address before comma
          const addressParts = delivery.address.split(',');
          const mainAddress = addressParts[0].trim();
          
          // Use address as primary grouping key instead of date
          groupKey = mainAddress;
          console.log(`Using address "${mainAddress}" as grouping key instead of date "${customerName}"`);
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = {
          customerName: groupKey,
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
      groups[groupKey].deliveries.push(delivery);
      groups[groupKey].totalDeliveries += 1;
      
      // Update latest status if this delivery has a more recent status date
      if (!groups[groupKey].latestStatusDate || 
          (delivery.statusDate && delivery.statusDate > groups[groupKey].latestStatusDate)) {
        groups[groupKey].latestStatus = delivery.status;
        groups[groupKey].latestStatusDate = delivery.statusDate;
      }
      
      // Add unique address
      if (delivery.address && !groups[groupKey].addresses.includes(delivery.address)) {
        groups[groupKey].addresses.push(delivery.address);
      }
      
      // Add unique tracking number
      if (delivery.trackingNumber && !groups[groupKey].trackingNumbers.includes(delivery.trackingNumber)) {
        groups[groupKey].trackingNumbers.push(delivery.trackingNumber);
      }
      
      // Add unique phone
      if (delivery.phone && !groups[groupKey].phones.includes(delivery.phone)) {
        groups[groupKey].phones.push(delivery.phone);
      }
    });
    
    // For debugging
    console.log(`Created ${Object.keys(groups).length} delivery groups from ${deliveries.length} deliveries`);
    
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
