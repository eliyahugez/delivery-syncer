
/**
 * Validates if a string is a valid Google Sheets URL
 */
export const isValidSheetUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a URL to a Google Sheets document
  if (url.includes('docs.google.com/spreadsheets')) {
    return true;
  }
  
  // Check if it's a direct spreadsheet ID
  // Google Sheets IDs are typically 44 characters, but can vary
  if (/^[a-zA-Z0-9-_]{25,45}$/.test(url.trim())) {
    return true;
  }
  
  return false;
};

/**
 * Cleans a Google Sheets URL to extract just the spreadsheet ID
 */
export const cleanSheetUrl = (url: string): string => {
  if (!url) return '';
  
  // Already just an ID
  if (/^[a-zA-Z0-9-_]{25,45}$/.test(url.trim())) {
    return url.trim();
  }
  
  // Try to extract the ID from the URL
  const patterns = [
    /\/d\/([a-zA-Z0-9-_]+)/,                     // Common pattern with /d/
    /spreadsheets\/d\/([a-zA-Z0-9-_]+)/,         // Full URL with spreadsheets/d/
    /key=([a-zA-Z0-9-_]+)/,                      // URL with key parameter
    /spreadsheets\.(google|corp\.google)\.com.*[?&]id=([a-zA-Z0-9-_]+)/ // URL with id parameter
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // For the last pattern, the ID is in group 2, for others it's in group 1
      const group = pattern === patterns[3] ? 2 : 1;
      if (match[group]) {
        return match[group];
      }
    }
  }
  
  // If no pattern matched, return the original URL as a fallback
  return url;
};

/**
 * Extracts the sheet ID from a Google Sheets URL
 */
export const extractSheetId = (url: string): string | null => {
  if (!url) return null;
  
  // Already just an ID
  if (/^[a-zA-Z0-9-_]{25,45}$/.test(url.trim())) {
    return url.trim();
  }
  
  // Try to extract the ID from the URL
  const patterns = [
    /\/d\/([a-zA-Z0-9-_]+)/,                     // Common pattern with /d/
    /spreadsheets\/d\/([a-zA-Z0-9-_]+)/,         // Full URL with spreadsheets/d/
    /key=([a-zA-Z0-9-_]+)/,                      // URL with key parameter
    /spreadsheets\.(google|corp\.google)\.com.*[?&]id=([a-zA-Z0-9-_]+)/ // URL with id parameter
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      // For the last pattern, the ID is in group 2, for others it's in group 1
      const group = pattern === patterns[3] ? 2 : 1;
      if (match[group]) {
        return match[group];
      }
    }
  }
  
  return null;
};
