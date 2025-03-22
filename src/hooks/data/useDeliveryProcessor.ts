
import { Delivery } from "@/types/delivery";
import { usePhoneFormatter } from "./usePhoneFormatter";
import { cleanCustomerName, cleanAddress, cleanPhoneNumber } from "@/utils/textCleaners";

export function useDeliveryProcessor() {
  const { formatPhoneNumber } = usePhoneFormatter();
  
  // List of known city names that might appear in the customer name field
  const cityNames = [
    "Karnei Shomron", "Karney Shomron", "Karnie Shomron", "Karni Shomron",
    "קרני שומרון", "Ginot Shomron", "גינות שומרון", "Maale Shomron", "מעלה שומרון",
    "Kedumim", "קדומים", "Ariel", "אריאל", "Emanuel", "עמנואל", "D. N. Lev Hashomron",
    "לב השומרון", "Lev Hashomron", "D.N"
  ];
  
  // Process the name field - handle date values and special cases
  const processName = (name: string | undefined, trackingNumber: string | undefined): string => {
    if (!name) return `לקוח ${trackingNumber || 'לא ידוע'}`;
    
    let processedName = name.trim();
    
    // If name is marked as date
    if (processedName.startsWith('[DATE]')) {
      return `לקוח משלוח ${trackingNumber || ''}`;
    }
    // Check if name is in Date() format and convert to a customer name
    else if (processedName.startsWith('Date(') && processedName.endsWith(')')) {
      return `לקוח משלוח ${trackingNumber || ''}`;
    }
    // If name is just a city name, add a prefix
    else if (cityNames.some(city => processedName.toLowerCase() === city.toLowerCase())) {
      return `לקוח ב${processedName}`;
    }
    // Check if name is just "AUTO-" with a number
    else if (processedName.startsWith('לקוח AUTO-')) {
      const autoNumber = processedName.replace('לקוח AUTO-', '');
      return `לקוח משלוח ${trackingNumber || autoNumber}`;
    }
    
    // Clean the name to remove or replace city names
    processedName = cleanCustomerName(processedName, cityNames);
    
    // If after cleaning, the name is too short or empty, use a fallback
    if (!processedName || processedName.length < 3) {
      return `לקוח ${trackingNumber || 'לא ידוע'}`;
    }
    
    return processedName;
  };
  
  // Process a delivery
  const processDelivery = (delivery: Delivery): Delivery => {
    // Process name
    const processedName = processName(delivery.name, delivery.trackingNumber);
    
    // Process address - clean it
    const processedAddress = cleanAddress(delivery.address || '');
    
    // Process phone - special handling for invalid phone numbers
    let processedPhone = '';
    if (delivery.phone) {
      // Skip status info in phone field
      if (delivery.phone.toLowerCase().includes('delivered') || 
          delivery.phone.toLowerCase().includes('נמסר') ||
          delivery.phone.toLowerCase().includes('status')) {
        processedPhone = '';
      } else {
        // Clean the phone number first, then format it
        const cleanedPhone = cleanPhoneNumber(delivery.phone);
        processedPhone = formatPhoneNumber(cleanedPhone);
      }
    }
    
    return {
      ...delivery,
      name: processedName,
      phone: processedPhone,
      address: processedAddress
    };
  };
  
  // Process a list of deliveries
  const processDeliveries = (deliveries: Delivery[]): Delivery[] => {
    return deliveries.map(processDelivery);
  };
  
  return { processDelivery, processDeliveries };
}
