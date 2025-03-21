
import { Delivery } from "@/types/delivery";
import { usePhoneFormatter } from "./usePhoneFormatter";
import { cleanCustomerName, cleanAddress, cleanPhoneNumber } from "@/utils/textCleaners";

export function useDeliveryProcessor() {
  const { formatPhoneNumber } = usePhoneFormatter();
  
  // List of known city names that might appear in the customer name field
  const cityNames = [
    "Karnei Shomron", "Karney Shomron", "Karnie Shomron", "Karni Shomron",
    "קרני שומרון", "Ginot Shomron", "גינות שומרון", "Maale Shomron", "מעלה שומרון",
    "Kedumim", "קדומים", "Ariel", "אריאל", "Emanuel", "עמנואל"
  ];
  
  // Process the name field - handle date values specifically
  const processName = (name: string | undefined, trackingNumber: string | undefined): string => {
    if (!name) return `לקוח ${trackingNumber || 'לא ידוע'}`;
    
    let processedName = name;
    
    // If name is marked as date
    if (processedName.startsWith('[DATE]')) {
      processedName = processedName.replace('[DATE]', '').trim();
    }
    // Check if name is in Date() format and convert it
    else if (processedName.startsWith('Date(') && processedName.endsWith(')')) {
      try {
        const dateString = processedName.substring(5, processedName.length - 1);
        const [year, month, day] = dateString.split(',').map(Number);
        processedName = `${day}/${month + 1}/${year}`;
      } catch (e) {
        console.error("Error parsing date in name:", processedName, e);
      }
    }
    
    // Clean the name to remove or replace city names
    processedName = cleanCustomerName(processedName, cityNames);
    
    return processedName || `לקוח ${trackingNumber || 'לא ידוע'}`;
  };
  
  // Process a delivery
  const processDelivery = (delivery: Delivery): Delivery => {
    // Process name
    const processedName = processName(delivery.name, delivery.trackingNumber);
    
    // Process address - clean it
    const processedAddress = cleanAddress(delivery.address || '');
    
    // Process phone
    let processedPhone = delivery.phone || '';
    if (processedPhone.toLowerCase().includes('delivered') || 
        processedPhone.toLowerCase().includes('נמסר') ||
        processedPhone.toLowerCase().includes('status')) {
      // Don't show status in phone field
      processedPhone = '';
    } else {
      // Clean the phone number first, then format it
      processedPhone = cleanPhoneNumber(processedPhone);
      processedPhone = formatPhoneNumber(processedPhone);
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
