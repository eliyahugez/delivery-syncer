// Helper function to extract sheet ID from URL - enhanced to handle more URL formats
export function extractSheetId(url: string): string | null {
  if (!url) return null;
  
  console.log("Extracting sheet ID from URL:", url);
  
  try {
    // Format: /d/{spreadsheetId}/
    const regex1 = /\/d\/([a-zA-Z0-9-_]+)/;
    const match1 = url.match(regex1);
    if (match1 && match1[1]) {
      console.log("Extracted using pattern 1:", match1[1]);
      return match1[1];
    }
    
    // Format: spreadsheets/d/{spreadsheetId}/
    const regex2 = /spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match2 = url.match(regex2);
    if (match2 && match2[1]) {
      console.log("Extracted using pattern 2:", match2[1]);
      return match2[1];
    }
    
    // Format: key={spreadsheetId}
    const regex3 = /key=([a-zA-Z0-9-_]+)/;
    const match3 = url.match(regex3);
    if (match3 && match3[1]) {
      console.log("Extracted using pattern 3:", match3[1]);
      return match3[1];
    }
    
    // Format with gid parameter
    const regex4 = /\/d\/([a-zA-Z0-9-_]+).*#gid=\d+/;
    const match4 = url.match(regex4);
    if (match4 && match4[1]) {
      console.log("Extracted spreadsheet ID with gid:", match4[1]);
      return match4[1];
    }
    
    // Direct ID (if the user just provided the ID)
    const directIdRegex = /^[a-zA-Z0-9-_]{25,45}$/;
    if (directIdRegex.test(url)) {
      console.log("URL appears to be a direct ID");
      return url;
    }
    
    console.log("No valid sheet ID pattern found in URL");
    return url; // As a fallback, return the entire URL and let the Google API handle it
  } catch (error) {
    console.error("Error extracting sheet ID:", error);
    return url; // Return the complete URL as a last resort
  }
}

// Function to fetch data from Google Sheets
export async function fetchSheetsData(spreadsheetId: string) {
  // Using the sheets API with json output
  const apiUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  
  console.log(`Fetching Google Sheets: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch Google Sheets: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch Google Sheets: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log("Response received, length:", text.length);
    
    // Log the first 500 characters of the response for debugging
    console.log("Response preview:", text.substring(0, 500));
    
    // Check if we got an HTML error page instead of JSON
    if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
      console.error("Received HTML instead of JSON data");
      throw new Error("Invalid response format from Google Sheets (received HTML). Please check if the sheet is publicly accessible or has been shared with the correct permissions.");
    }
    
    // Google's response is wrapped in a function call that we need to parse
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    
    if (jsonStart < 0 || jsonEnd <= 0) {
      console.error("Invalid response format, cannot find JSON:", text.substring(0, 200));
      throw new Error('Invalid response format from Google Sheets. Please check if the sheet is publicly accessible.');
    }
    
    const jsonString = text.substring(jsonStart, jsonEnd);
    console.log("JSON data extracted, parsing...");
    
    try {
      const parsedData = JSON.parse(jsonString);
      console.log("Data parsed successfully");
      
      // Check if we have valid data structure 
      if (!parsedData.table || !parsedData.table.rows || !Array.isArray(parsedData.table.rows)) {
        console.error("Invalid data structure:", JSON.stringify(parsedData, null, 2).substring(0, 500));
        throw new Error('The Google Sheet does not contain valid data. Please check the sheet format.');
      }
      
      return parsedData;
    } catch (error) {
      console.error('Error parsing Google Sheets response:', error);
      console.error('Problematic JSON string:', jsonString.substring(0, 200) + "...");
      throw new Error('Failed to parse Google Sheets data. The sheet might not be in the expected format.');
    }
  } catch (error) {
    console.error("Error in fetchSheetsData:", error);
    throw error;
  }
}

// Format phone number to international format
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  
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
}
