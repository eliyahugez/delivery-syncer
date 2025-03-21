
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
      // Skip invalid deliveries
      if (!delivery.trackingNumber) {
        console.log("Skipping delivery with no tracking number");
        return;
      }
      
      // IMPROVED: Use a better grouping algorithm
      // 1. If name contains actual person name, group by name
      // 2. If name is a date, group by address
      // 3. If name is AUTO-, group by address if possible
      
      let customerName = delivery.name?.trim() || '';
      let groupKey = '';
      let shouldUseAddressGrouping = false;
      
      // Check if the name is in date format or marked as a date
      const isDatePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(customerName) || 
                            customerName.startsWith('[DATE]') ||
                            customerName.startsWith('תאריך:');
                            
      // Check if tracking number is AUTO-XX format
      const isAutoTracking = /^AUTO-\d+$/.test(delivery.trackingNumber);
      
      // Check if name is empty or just the tracking number
      const isEmptyOrTrackingName = !customerName || 
                                     customerName === delivery.trackingNumber ||
                                     customerName === 'לא ידוע';
      
      // Determine if we should group by address
      if (isDatePattern || isAutoTracking || isEmptyOrTrackingName) {
        shouldUseAddressGrouping = true;
      }
      
      // If we should use address grouping and there is an address, use that
      if (shouldUseAddressGrouping && delivery.address) {
        // Extract main location from address for better grouping
        const addressParts = delivery.address.split(/[-,]/);
        const mainLocation = addressParts[0]?.trim();
        
        if (mainLocation && mainLocation.length > 2) {
          // Use location as the grouping key
          groupKey = mainLocation;
          customerName = mainLocation;
          console.log(`Using address "${mainLocation}" as grouping key`);
        } else {
          // Fallback to full address if we can't extract a good main location
          groupKey = delivery.address;
          customerName = delivery.address;
        }
      } else {
        // Use the customer name as the grouping key
        groupKey = customerName;
      }
      
      // If we still don't have a good group key, use tracking number as last resort
      if (!groupKey || groupKey.length < 2) {
        groupKey = `לקוח ${delivery.trackingNumber}`;
        customerName = groupKey;
      }
      
      // Initialize the group if it doesn't exist
      if (!groups[groupKey]) {
        groups[groupKey] = {
          customerName: customerName,
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
      
      // Add unique phone (only if it's not status information)
      if (delivery.phone && 
          !delivery.phone.toLowerCase().includes('delivered') &&
          !delivery.phone.toLowerCase().includes('נמסר') &&
          !delivery.phone.toLowerCase().includes('status') &&
          !groups[groupKey].phones.includes(delivery.phone)) {
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
