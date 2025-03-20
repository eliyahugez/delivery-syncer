/**
 * Utility functions for handling Google Sheets URLs
 */

/**
 * Validates if a string is a valid Google Sheets URL or ID
 */
export const isValidSheetUrl = (url: string): boolean => {
  if (!url || url.trim() === "") return false;
  
  // Check if it's already just a valid spreadsheet ID
  if (/^[a-zA-Z0-9-_]{25,45}$/.test(url)) {
    return true;
  }
  
  // Check if it contains a valid Google Sheets URL pattern
  return (
    url.includes("docs.google.com/spreadsheets") || 
    url.includes("/d/") ||
    url.match(/key=[a-zA-Z0-9-_]+/) !== null
  );
};

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

/**
 * Formats a spreadsheet ID into a properly formatted Google Sheets URL
 */
export const formatSheetUrl = (spreadsheetId: string): string => {
  if (!spreadsheetId) return "";
  
  // If it's already a full URL, return it
  if (spreadsheetId.startsWith("https://")) {
    return spreadsheetId;
  }
  
  // Otherwise, format it as a Google Sheets URL
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
};

/**
 * Gets a display-friendly version of the sheet URL (shortened)
 */
export const getDisplaySheetUrl = (url: string): string => {
  const id = cleanSheetUrl(url);
  if (!id) return "";
  
  // Return a shortened display version
  return id.length > 12 
    ? `${id.substring(0, 6)}...${id.substring(id.length - 6)}`
    : id;
};
