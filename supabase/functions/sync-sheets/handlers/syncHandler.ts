
import { extractSheetId, fetchSheetsData } from "../utils/sheetUtils.ts";
import { processAndSaveData } from "../utils/sheetsDataProcessor.ts";
import { getTableColumns } from "../utils/dbDebug.ts";

export async function handleSyncRequest(sheetsUrl: string, supabase: any) {
  console.log("Processing Google Sheets URL:", sheetsUrl);

  // First check database schema to verify connectivity
  try {
    const deliveriesColumns = await getTableColumns(supabase, 'deliveries');
    console.log("Deliveries columns:", deliveriesColumns);
    
    if (!deliveriesColumns || deliveriesColumns.length === 0) {
      return {
        status: 500,
        body: { 
          error: 'Database schema verification failed', 
          details: 'Could not retrieve database table structure. Check permissions and configuration.' 
        }
      };
    }
    
    // Check for required columns
    const requiredColumns = ['id', 'tracking_number', 'status', 'name'];
    const columnNames = deliveriesColumns.map(col => col.column_name);
    
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    if (missingColumns.length > 0) {
      return {
        status: 500,
        body: { 
          error: 'Database schema is missing required columns', 
          details: `Missing columns: ${missingColumns.join(', ')}` 
        }
      };
    }
    
    console.log("Database schema verified successfully");
  } catch (dbError) {
    console.error("Error verifying database schema:", dbError);
    return {
      status: 500,
      body: { 
        error: 'שגיאה בגישה לבסיס הנתונים', 
        details: 'בדוק הרשאות ותצורת Supabase.',
        originalError: dbError.message
      }
    };
  }

  // Validate input
  if (!sheetsUrl || sheetsUrl.trim() === "") {
    return {
      status: 400,
      body: { error: 'חסר קישור לטבלת Google Sheets' }
    };
  }

  // Extract sheets ID from URL
  const spreadsheetId = extractSheetId(sheetsUrl);
  if (!spreadsheetId) {
    return {
      status: 400,
      body: { error: 'לא ניתן לחלץ מזהה תקין מהקישור לטבלה' }
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
    } else {
      console.warn("No data rows found in sheet response");
    }
    
    // Check if we have data to process
    if (!response.table || !response.table.rows || response.table.rows.length === 0) {
      return {
        status: 404,
        body: { 
          error: 'לא נמצאו נתונים בטבלה',
          details: 'הטבלה ריקה או שאין לך הרשאות גישה אליה'
        }
      };
    }
    
    // Process the data and save to Supabase
    const result = await processAndSaveData(response, supabase);
    
    if (result.error) {
      console.error("Error processing data:", result.error);
      return {
        status: 500,
        body: result
      };
    }

    return {
      status: 200,
      body: result
    };
  } catch (error: any) {
    console.error("Error fetching/processing sheets data:", error);
    
    // Check for specific error types
    let errorMessage = 'שגיאה בעיבוד נתוני הטבלה';
    let errorDetails = null;
    
    if (error.message?.includes("Invalid response format")) {
      errorMessage = 'פורמט תגובה לא תקין מ-Google Sheets';
      errorDetails = 'ייתכן שאין לך הרשאות גישה לטבלה. ודא שהטבלה משותפת לציבור לקריאה לפחות.';
    } else if (error.message?.includes("Failed to fetch")) {
      errorMessage = 'בעיית התחברות ל-Google Sheets';
      errorDetails = 'בדוק את חיבור האינטרנט שלך ונסה שוב.';
    } else if (error.message?.includes("column") && error.message?.includes("does not exist")) {
      errorMessage = 'מבנה טבלה לא תקין';
      errorDetails = 'חסרות עמודות נדרשות בטבלה או במסד הנתונים. בדוק את מבנה הטבלה.';
    } else if (error.message?.includes("uuid") || error.message?.includes("uuidv4")) {
      errorMessage = 'שגיאה בייצור מזהים';
      errorDetails = 'בעיה ביצירת מזהים ייחודיים. השגיאה תוקנה, נא לנסות שוב.';
    }
    
    // Enhanced error object to provide more details to the client
    return {
      status: 500,
      body: { 
        error: errorMessage,
        originalError: error.message || 'Error processing Google Sheets data',
        details: errorDetails || error.details || null,
        stack: error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null,
        spreadsheetId 
      }
    };
  }
}
