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
      // If it doesn't look like a phone number, but it has at least some digits,
      // format them anyway as it might be partial information
      if (cleanedPhone.length > 0) {
        return cleanedPhone;
      }
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
    
    // Check if it might be an international number already
    if (cleanedPhone.length > 10) {
      return `+${cleanedPhone}`;
    }
    
    // Otherwise, return as is if it has enough digits
    return cleanedPhone.length >= 9 ? phone : cleanedPhone;
  };
  
  return { formatPhoneNumber };
}
