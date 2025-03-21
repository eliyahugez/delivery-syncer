
import { useMemo } from 'react';
import { Delivery } from '@/types/delivery';

export function useDeliveryTableHelpers(deliveries: Delivery[], filter: string) {
  // Group the deliveries by customer name or address
  const customerGroups = useMemo(() => {
    const groups: Record<string, Delivery[]> = {};
    
    deliveries.forEach(delivery => {
      // Skip invalid deliveries
      if (!delivery.trackingNumber) return;
      
      let groupKey = '';
      
      // Check if the name is in date format or marked as a date
      const isDatePattern = delivery.name &&
                          (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(delivery.name) || 
                           delivery.name.startsWith('[DATE]') ||
                           delivery.name.startsWith('תאריך:'));
                            
      // Check if tracking number is AUTO-XX format
      const isAutoTracking = /^AUTO-\d+$/.test(delivery.trackingNumber);
      
      // Check if name is empty or just the tracking number
      const isEmptyOrTrackingName = !delivery.name || 
                                     delivery.name === delivery.trackingNumber ||
                                     delivery.name === 'לא ידוע';
      
      // Determine if we should group by address
      if (isDatePattern || isAutoTracking || isEmptyOrTrackingName) {
        if (delivery.address) {
          // Extract main location from address for better grouping
          const addressParts = delivery.address.split(/[-,]/);
          const mainLocation = addressParts[0]?.trim();
          
          if (mainLocation && mainLocation.length > 2) {
            // Use location as the grouping key
            groupKey = mainLocation;
          } else {
            // Fallback to full address
            groupKey = delivery.address;
          }
        } else {
          groupKey = `לקוח ${delivery.trackingNumber}`;
        }
      } else {
        // Use the customer name as the grouping key
        groupKey = delivery.name;
      }
      
      // If we still don't have a good group key, use tracking number as last resort
      if (!groupKey || groupKey.length < 2) {
        groupKey = `לקוח ${delivery.trackingNumber}`;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(delivery);
    });
    
    return groups;
  }, [deliveries]);

  // Filtered deliveries
  const filteredGroups = useMemo(() => {
    if (!filter) return customerGroups;
    
    const filtered: Record<string, Delivery[]> = {};
    
    Object.entries(customerGroups).forEach(([name, customerDeliveries]) => {
      // Check if customer name matches filter
      if (name.toLowerCase().includes(filter.toLowerCase())) {
        filtered[name] = customerDeliveries;
        return;
      }
      
      // Check if any of this customer's deliveries match filter
      const matchingDeliveries = customerDeliveries.filter(delivery => 
        delivery.trackingNumber.toLowerCase().includes(filter.toLowerCase()) ||
        (delivery.address && delivery.address.toLowerCase().includes(filter.toLowerCase())) ||
        (delivery.phone && delivery.phone.toLowerCase().includes(filter.toLowerCase()))
      );
      
      if (matchingDeliveries.length > 0) {
        filtered[name] = matchingDeliveries;
      }
    });
    
    return filtered;
  }, [customerGroups, filter]);

  const handleWhatsApp = (phone: string) => {
    // Format the phone number (remove +, spaces, etc.)
    const formattedPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent('היי זה שליח');
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleNavigation = (address: string) => {
    // Open in navigation app
    const encodedAddress = encodeURIComponent(address);
    
    // Check if on mobile device
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // On mobile, try to use Waze
      window.open(`https://waze.com/ul?q=${encodedAddress}`, '_blank');
    } else {
      // On desktop, open in Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  return {
    customerGroups,
    filteredGroups,
    handleWhatsApp,
    handleNavigation
  };
}
