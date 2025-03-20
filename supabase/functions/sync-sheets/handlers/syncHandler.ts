
import { extractSheetId, fetchSheetsData } from "../utils/sheetUtils.ts";
import { processAndSaveData } from "../utils/sheetsDataProcessor.ts";

export async function handleSyncRequest(sheetsUrl: string, supabase: any) {
  console.log("Processing Google Sheets URL:", sheetsUrl);

  // Extract sheets ID from URL
  const spreadsheetId = extractSheetId(sheetsUrl);
  if (!spreadsheetId) {
    return {
      status: 400,
      body: { error: 'Invalid Google Sheets URL' }
    };
  }

  console.log("Extracted spreadsheet ID:", spreadsheetId);

  // Get Google Sheets data
  try {
    console.log("Fetching sheets data for ID:", spreadsheetId);
    const response = await fetchSheetsData(spreadsheetId);
    
    console.log("Successfully received response from Google Sheets API");
    
    // Log first row of data for debugging
    if (response.table && response.table.rows && response.table.rows.length > 0) {
      const firstRow = response.table.rows[0];
      console.log("First row of data:", JSON.stringify(firstRow, null, 2));
    }
    
    // Process the data and save to Supabase
    const result = await processAndSaveData(response, supabase);

    return {
      status: 200,
      body: result
    };
  } catch (error: any) {
    console.error("Error fetching/processing sheets data:", error);
    
    return {
      status: 500,
      body: { 
        error: error.message || 'Error processing Google Sheets data',
        spreadsheetId 
      }
    };
  }
}
