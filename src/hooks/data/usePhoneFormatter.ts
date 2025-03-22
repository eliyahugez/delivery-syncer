import { cleanPhoneNumber } from '@/utils/textCleaners';

export function usePhoneFormatter() {
  // Format phone number to international format
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Skip if the phone field contains status information
    if (phone.toLowerCase().includes('delivered') || 
        phone.toLowerCase().includes('נמסר') ||
        phone.toLowerCase().includes('status')) {
      return '';
    }
    
    // Clean the phone number first, removing any non-digit characters
    const cleanedPhone = cleanPhoneNumber(phone);
    
    // Validate the phone number - must have at least 9 digits to be valid
    if (cleanedPhone.length < 9) {
      return '';
    }
    
    // Format to international format (+972)
    if (cleanedPhone.startsWith("972")) {
      return `+${cleanedPhone}`;
    } else if (cleanedPhone.startsWith("0")) {
      return `+972${cleanedPhone.substring(1)}`;
    }
    
    // If it's not starting with 0 or 972, and it has 9-10 digits, assume it's a local number
    if (cleanedPhone.length >= 9 && cleanedPhone.length <= 10) {
      return `+972${cleanedPhone}`;
    }
    
    // Otherwise, return as is if it has enough digits
    return cleanedPhone.length >= 9 ? phone : '';
  };
  
  return { formatPhoneNumber };
}
