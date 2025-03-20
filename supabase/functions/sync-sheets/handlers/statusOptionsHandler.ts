import { corsHeaders } from "../utils/corsHeaders.ts";
import { extractSheetId, fetchSheetsData } from "../utils/sheetUtils.ts";
import { normalizeStatus, getHebrewLabel } from "../utils/statusUtils.ts";

// Enhanced function to fetch status options from the Google Sheet
export async function fetchStatusOptionsFromSheets(sheetsUrl: string) {
  try {
    console.log(`Fetching status options from: ${sheetsUrl}`);
    const spreadsheetId = extractSheetId(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL');
    }

    // Fetch the whole sheet data
    const data = await fetchSheetsData(spreadsheetId);
    
    // Look for status column
    if (!data || !data.table || !data.table.cols || !data.table.rows) {
      throw new Error('Invalid sheet data structure');
    }

    // Try to find a status column
    const statusColumnIndex = data.table.cols.findIndex((col: any) => {
      const label = (col.label || "").toLowerCase();
      return label.includes("status") || label.includes("סטטוס") || label.includes("מצב");
    });

    console.log(`Status column index: ${statusColumnIndex}`);

    if (statusColumnIndex === -1) {
      console.log('Status column not found, returning default options');
      return [
        { value: "pending", label: "ממתין" },
        { value: "in_progress", label: "בדרך" },
        { value: "delivered", label: "נמסר" },
        { value: "failed", label: "נכשל" },
        { value: "returned", label: "הוחזר" }
      ];
    }

    // Extract unique status values
    const uniqueStatuses = new Set();
    data.table.rows.forEach((row: any) => {
      if (row.c && row.c[statusColumnIndex] && row.c[statusColumnIndex].v) {
        uniqueStatuses.add(row.c[statusColumnIndex].v);
      }
    });

    // Convert to the expected format
    const options = Array.from(uniqueStatuses).map((status: any) => {
      const normalizedStatus = normalizeStatus(status);
      return { 
        value: normalizedStatus, 
        label: getHebrewLabel(normalizedStatus, status)
      };
    });

    console.log('Found status options:', options);
    
    // Sort the options in a logical order
    const statusOrder = ["pending", "in_progress", "delivered", "failed", "returned"];
    
    const sortedOptions = [...options].sort((a: any, b: any) => {
      const indexA = statusOrder.indexOf(a.value);
      const indexB = statusOrder.indexOf(b.value);
      
      // If both statuses are in our predefined order, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only one status is in our order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Otherwise sort alphabetically by label
      return a.label.localeCompare(b.label);
    });
    
    return sortedOptions.length > 0 ? sortedOptions : [
      { value: "pending", label: "ממתין" },
      { value: "in_progress", label: "בדרך" },
      { value: "delivered", label: "נמסר" },
      { value: "failed", label: "נכשל" },
      { value: "returned", label: "הוחזר" }
    ];
  } catch (error) {
    console.error('Error fetching status options:', error);
    // Return default options if there's an error
    return [
      { value: "pending", label: "ממתין" },
      { value: "in_progress", label: "בדרך" },
      { value: "delivered", label: "נמסר" },
      { value: "failed", label: "נכשל" },
      { value: "returned", label: "הוחזר" }
    ];
  }
}

export async function handleStatusOptionsRequest(sheetsUrl: string) {
  console.log("Fetching status options from sheet:", sheetsUrl);
  const statusOptions = await fetchStatusOptionsFromSheets(sheetsUrl);
  console.log("Found status options:", JSON.stringify(statusOptions));
  
  return {
    status: 200,
    body: { statusOptions }
  };
}
