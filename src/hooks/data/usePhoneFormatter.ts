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
    
    // Remove non-digit characters
    let digits = phone.replace(/\D/g, "");
    
    // Format to international format (+972)
    if (digits.startsWith("972")) {
      return `+${digits}`;
    } else if (digits.startsWith("0")) {
      return `+972${digits.substring(1)}`;
    }
    
    // If it's not starting with 0 or 972, and it has 9-10 digits, assume it's a local number
    if (digits.length >= 9 && digits.length <= 10) {
      return `+972${digits}`;
    }
    
    // Otherwise, return as is
    return phone;
  };
  
  return { formatPhoneNumber };
}
