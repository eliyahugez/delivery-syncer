
/**
 * Utility functions for cleaning and formatting text data
 */

// Clean phone numbers by removing special characters
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except + (for international format)
  return phone.replace(/[^\d+]/g, '');
}

// Clean addresses by removing redundant spaces and certain special characters
export function cleanAddress(address: string): string {
  if (!address) return '';
  
  // Remove extra spaces, dashes, and other special characters that might cause issues
  let cleaned = address.replace(/\s+/g, ' ');  // Replace multiple spaces with a single space
  cleaned = cleaned.replace(/^[-,.\s]+|[-,.\s]+$/g, ''); // Remove special chars at start/end
  cleaned = cleaned.trim();
  
  return cleaned;
}

// Remove city name from customer name if it appears to be just a location
export function cleanCustomerName(name: string, cityNames: string[]): string {
  if (!name) return '';
  
  let cleanName = name.trim();
  
  // Check if the name is just a city name
  for (const city of cityNames) {
    if (cleanName.toLowerCase() === city.toLowerCase() || 
        cleanName.toLowerCase().includes(city.toLowerCase() + ' ') ||
        cleanName.toLowerCase().includes(' ' + city.toLowerCase())) {
      // If name is just a city or contains city name, mark it for better UI display
      return `לקוח ב${city}`;
    }
  }
  
  return cleanName;
}

// Translate address to Hebrew for better Waze navigation
export async function translateAddressToHebrew(address: string): Promise<string> {
  // For common English names of Israeli settlements, provide direct Hebrew translations
  const commonTranslations: Record<string, string> = {
    'karnei shomron': 'קרני שומרון',
    'karney shomron': 'קרני שומרון',
    'karnie shomron': 'קרני שומרון',
    'karni shomron': 'קרני שומרון',
    'karnei': 'קרני',
    'karney': 'קרני',
    'karnie': 'קרני',
    'karni': 'קרני',
    'shomron': 'שומרון',
    'maale shomron': 'מעלה שומרון',
    'ginot shomron': 'גינות שומרון',
    'kedumim': 'קדומים',
    'ariel': 'אריאל',
    'emanuel': 'עמנואל'
  };
  
  // Simple word-by-word translation for known terms
  let translatedAddress = address.toLowerCase();
  
  for (const [english, hebrew] of Object.entries(commonTranslations)) {
    // Use regex to match whole words only
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translatedAddress = translatedAddress.replace(regex, hebrew);
  }
  
  // If no translations were applied, return the original address
  if (translatedAddress === address.toLowerCase()) {
    return address;
  }
  
  return translatedAddress;
}
