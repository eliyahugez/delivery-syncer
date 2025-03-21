
import { Delivery } from "@/types/delivery";
import { usePhoneFormatter } from "./usePhoneFormatter";

export function useDeliveryProcessor() {
  const { formatPhoneNumber } = usePhoneFormatter();
  
  // Process the name field - handle date values specifically
  const processName = (name: string | undefined): string => {
    if (!name) return '';
    
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
    
    return processedName;
  };
  
  // Process a delivery
  const processDelivery = (delivery: Delivery): Delivery => {
    // Process name
    const processedName = processName(delivery.name);
    
    // Check if phone field contains status info
    let processedPhone = delivery.phone || '';
    if (processedPhone.toLowerCase().includes('delivered') || 
        processedPhone.toLowerCase().includes('נמסר') ||
        processedPhone.toLowerCase().includes('status')) {
      // Don't show status in phone field
      processedPhone = '';
    } else {
      // Format the phone number normally
      processedPhone = formatPhoneNumber(delivery.phone);
    }
    
    // Ensure customer name is not empty or just the tracking number
    const finalName = processedName && processedName !== delivery.trackingNumber 
      ? processedName 
      : `לקוח ${delivery.trackingNumber || 'לא ידוע'}`;
      
    return {
      ...delivery,
      name: finalName,
      phone: processedPhone
    };
  };
  
  // Process a list of deliveries
  const processDeliveries = (deliveries: Delivery[]): Delivery[] => {
    return deliveries.map(processDelivery);
  };
  
  return { processDelivery, processDeliveries };
}
