
import { Delivery } from '@/types/delivery';

export function useAddressGrouping() {
  // Determine if a delivery should be grouped by address instead of customer name
  const shouldUseAddressGrouping = (delivery: Delivery): boolean => {
    // Skip invalid deliveries
    if (!delivery.trackingNumber) {
      return false;
    }
    
    let customerName = delivery.name?.trim() || '';
    
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
    
    return isDatePattern || isAutoTracking || isEmptyOrTrackingName;
  };

  // Extract a good group key from the address
  const getAddressGroupKey = (address: string | undefined): string => {
    if (!address) return '';
    
    // Extract main location from address for better grouping
    const addressParts = address.split(/[-,]/);
    const mainLocation = addressParts[0]?.trim();
    
    if (mainLocation && mainLocation.length > 2) {
      // Use location as the grouping key
      return mainLocation;
    } else {
      // Fallback to full address
      return address;
    }
  };
  
  return {
    shouldUseAddressGrouping,
    getAddressGroupKey
  };
}
