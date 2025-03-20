
/**
 * Utility functions for handling Google Sheets URLs
 */

/**
 * Cleans a Google Sheets URL to extract just the spreadsheet ID
 */
export const cleanSheetUrl = (url: string): string => {
  if (!url) return "";
  
  // If it's already just an ID, return it
  if (/^[a-zA-Z0-9-_]{25,45}$/.test(url)) {
    return url;
  }
  
  try {
    // Extract the spreadsheet ID
    // Format: /d/{spreadsheetId}/
    let match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1]; // Just return the ID to avoid URL format issues
    }
    
    // Format: spreadsheets/d/{spreadsheetId}/
    match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1]; // Just return the ID to avoid URL format issues
    }
    
    // Format: key={spreadsheetId}
    match = url.match(/key=([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1]; // Just return the ID to avoid URL format issues
    }
    
    // Format with gid parameter
    match = url.match(/\/d\/([a-zA-Z0-9-_]+).*#gid=\d+/);
    if (match && match[1]) {
      return match[1]; // Return just the ID without the gid
    }
  } catch (error) {
    console.error("Error cleaning sheet URL:", error);
  }
  
  // Return the original if we couldn't clean it
  return url;
};
