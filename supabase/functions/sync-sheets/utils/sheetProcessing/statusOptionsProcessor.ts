
import { fetchStatusOptionsFromSheets } from "../../handlers/statusOptionsHandler.ts";

export async function getStatusOptions(spreadsheetId: string) {
  let statusOptions = [];
  try {
    const statusOptionsResult = await fetchStatusOptionsFromSheets(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`);
    statusOptions = statusOptionsResult || [];
  } catch (error) {
    console.error("Error fetching status options:", error);
    // Use default status options
    statusOptions = [
      { value: "pending", label: "ממתין" },
      { value: "in_progress", label: "בדרך" },
      { value: "delivered", label: "נמסר" },
      { value: "failed", label: "נכשל" },
      { value: "returned", label: "הוחזר" }
    ];
  }
  
  return statusOptions;
}
