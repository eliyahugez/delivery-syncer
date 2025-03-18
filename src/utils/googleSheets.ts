import { Delivery } from "@/types/delivery";
import Papa from "papaparse";

// Function to parse Google Sheets URL and get spreadsheet ID
export const getSpreadsheetIdFromUrl = (url: string): string => {
  try {
    const regex = /\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : "";
  } catch (error) {
    console.error("Error parsing spreadsheet ID:", error);
    throw new Error("Invalid Google Sheets URL");
  }
};

// Function to convert Google Sheets URL to a public CSV export URL with CORS proxy
export const getCSVExportUrl = (spreadsheetId: string, sheetId = 0): string => {
  // First create the direct Google Sheets export URL
  const directUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;

  // Use multiple CORS proxies for fallback
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    `https://cors-anywhere.herokuapp.com/${directUrl}`,
  ];

  // Return the first proxy in the list (we'll try them in sequence if needed)
  return corsProxies[0];
};

// Generate test data for development/offline use
const generateTestData = (): Delivery[] => {
  const currentDate = new Date().toISOString();
  return [
    {
      id: "1",
      trackingNumber: "GWD003912139",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "delivered",
      name: "Caroline Spector",
      phone: "972528301402",
      address: "D. N. Lev Hashomron-Maale Shomron 48",
      assignedTo: "שליח 1",
    },
    {
      id: "2",
      trackingNumber: "GWD003903250",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "delivered",
      name: "Aryeh Feigin",
      phone: "972544820544",
      address: "Maale Shomron-18 Arnon Street",
      assignedTo: "שליח 1",
    },
    {
      id: "3",
      trackingNumber: "GWD003912434",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "delivered",
      name: "Ariel Urman",
      phone: "524822305",
      address: "Karnei Shomron-Arnon 32",
      assignedTo: "שליח 2",
    },
    {
      id: "4",
      trackingNumber: "TMU003444926",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "delivered",
      name: "אירנה רביץ",
      phone: "545772273",
      address: "Karnei Shomron-יעלים 5 מעלה שומרון",
      assignedTo: "שליח 2",
    },
    {
      id: "5",
      trackingNumber: "TMU003377273",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "delivered",
      name: "", // Empty name to demonstrate fallback
      phone: "", // Empty phone to demonstrate fallback
      address: "", // Empty address to demonstrate fallback
      assignedTo: "שליח 3",
    },
  ];
};

// Function to fetch deliveries from Google Sheets
export const fetchDeliveriesFromSheets = async (
  sheetsUrl: string
): Promise<{ deliveries: Delivery[]; isTestData: boolean }> => {
  try {
    console.log("Fetching from Google Sheets URL:", sheetsUrl);

    const spreadsheetId = getSpreadsheetIdFromUrl(sheetsUrl);
    if (!spreadsheetId) {
      console.error("Invalid Google Sheets URL:", sheetsUrl);
      throw new Error("Invalid Google Sheets URL");
    }

    // Try with CORS proxy
    let csvText: string | null = null;
    let proxyIndex = 0;
    const corsProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
      )}`,
      `https://corsproxy.io/?${encodeURIComponent(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
      )}`,
      `https://cors-anywhere.herokuapp.com/https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
    ];

    while (proxyIndex < corsProxies.length && !csvText) {
      const corsUrl = corsProxies[proxyIndex];
      try {
        console.log(
          `Attempting to fetch from proxy ${proxyIndex + 1}:`,
          corsUrl
        );

        const response = await fetch(corsUrl, {
          method: "GET",
          headers: {
            "Content-Type": "text/csv",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch data: ${response.status} ${response.statusText}`
          );
        }

        csvText = await response.text();
        console.log("Successfully fetched CSV data");

        // Quick validation to ensure it's actually CSV data
        if (!csvText.includes(",") || csvText.includes("<!DOCTYPE html>")) {
          console.log("Received HTML instead of CSV, trying next proxy");
          console.log("Response preview:", csvText.substring(0, 200));
          csvText = null;
          proxyIndex++;
        }
      } catch (err) {
        console.error(`Proxy ${proxyIndex + 1} attempt failed:`, err);
        proxyIndex++;
      }
    }

    if (csvText) {
      const parsedDeliveries = parseCSVToDeliveries(csvText);
      if (parsedDeliveries.length > 0) {
        return { deliveries: parsedDeliveries, isTestData: false };
      }
    }

    // If all proxies fail or parsing returns no results, fallback to test data
    console.warn(
      "All proxies failed or no data parsed, falling back to test data"
    );
    return { deliveries: generateTestData(), isTestData: true };
  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);

    // Return test data as fallback
    console.warn("Returning test data due to fetch error");
    return { deliveries: generateTestData(), isTestData: true };
  }
};

// Function to parse CSV data to Delivery objects
export const parseCSVToDeliveries = (csvText: string): Delivery[] => {
  try {
    console.log("Parsing CSV data...");
    console.log("CSV preview:", csvText.substring(0, 500));

    // Configure PapaParse with helpful error handling options
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transform: (value) => {
        // Trim whitespace from values
        return typeof value === "string" ? value.trim() : value;
      },
      transformHeader: (header) => {
        // Clean header names to help with matching
        return header.trim();
      },
      // Add delimiter detect as a failsafe
      delimiter: "", // auto-detect
    });

    if (result.errors.length > 0) {
      console.error("CSV parsing errors:", result.errors);
      // Continue anyway, we'll try to salvage what we can
    }

    // Log the headers we found to help with debugging
    console.log("Found CSV headers:", result.meta.fields);

    // Map parsed data to Delivery objects
    return result.data.map((row: any, index) => {
      // Handle various column names for flexibility
      const trackingField = findField(row, [
        "Tracking",
        "trackingNumber",
        "מספר מעקב",
        "tracking",
        "TrackingNumber",
        "מספר משלוח",
        "מספר הזמנה",
      ]);
      const scanDateField = findField(row, [
        "Date Scanned",
        "scanDate",
        "תאריך סריקה",
        "scan date",
        "DateScanned",
        "תאריך",
      ]);
      const statusDateField = findField(row, [
        "Status date",
        "statusDate",
        "תאריך סטטוס",
        "status date",
        "StatusDate",
      ]);
      const statusField = findField(row, ["Status", "status", "סטטוס", "מצב"]);
      const nameField = findField(row, [
        "Name",
        "name",
        "שם",
        "שם לקוח",
        "Customer Name",
      ]);
      const phoneField = findField(row, [
        "Phone Number",
        "phone",
        "טלפון",
        "Phone",
        "PhoneNumber",
        "מספר טלפון",
        "נייד",
      ]);
      const addressField = findField(row, [
        "Address",
        "address",
        "כתובת",
        "כתובת למשלוח",
        "Shipping Address",
      ]);
      const assignedToField = findField(row, [
        "Assigned To",
        "assignedTo",
        "שליח",
        "Courier",
        "שייך ל",
        "delivery person",
      ]);

      const trackingNumber = row[trackingField] || `delivery-${index}`;
      const scanDate = row[scanDateField] || new Date().toISOString();
      const statusDate =
        row[statusDateField] || scanDate || new Date().toISOString();
      let status = row[statusField] || "pending";
      const name = row[nameField] || "";
      const phone = row[phoneField] || "";
      const address = row[addressField] || "";
      const assignedTo = row[assignedToField] || "";

      console.log(
        `Parsed delivery: ${trackingNumber}, status: ${status}, name: ${
          name || "No name"
        }`
      );

      // Map Hebrew/English status text to our standard statuses
      status = normalizeStatus(status);

      return {
        id: trackingNumber + "-" + index.toString(),
        trackingNumber,
        scanDate,
        statusDate,
        status,
        name,
        phone,
        address,
        assignedTo,
      };
    });
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return [];
  }
};

// Helper function to find a matching field in the row with more flexibility
const findField = (row: any, possibleNames: string[]): string => {
  // First try exact match
  for (const name of possibleNames) {
    if (row.hasOwnProperty(name)) {
      return name;
    }
  }

  // Try case-insensitive match as fallback
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const match = rowKeys.find((key) => key.toLowerCase() === lowerName);
    if (match) {
      return match;
    }
  }

  // Try partial match as a last resort
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const partialMatch = rowKeys.find(
      (key) =>
        key.toLowerCase().includes(lowerName) ||
        lowerName.includes(key.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch;
    }
  }

  return "";
};

// Helper function to normalize status values
const normalizeStatus = (status: string): string => {
  const statusLower = status.toLowerCase();

  if (
    statusLower.includes("delivered") ||
    statusLower.includes("נמסר") ||
    statusLower.includes("completed") ||
    statusLower.includes("הושלם")
  ) {
    return "delivered";
  }
  if (
    statusLower.includes("pending") ||
    statusLower.includes("ממתין") ||
    statusLower.includes("waiting") ||
    statusLower.includes("new") ||
    statusLower.includes("חדש")
  ) {
    return "pending";
  }
  if (
    statusLower.includes("in_progress") ||
    statusLower.includes("בדרך") ||
    statusLower.includes("out for delivery") ||
    statusLower.includes("בדרך למסירה") ||
    statusLower.includes("delivery in progress") ||
    statusLower.includes("בתהליך")
  ) {
    return "in_progress";
  }
  if (
    statusLower.includes("failed") ||
    statusLower.includes("נכשל") ||
    statusLower.includes("customer not answer") ||
    statusLower.includes("לקוח לא ענה") ||
    statusLower.includes("problem") ||
    statusLower.includes("בעיה")
  ) {
    return "failed";
  }
  if (
    statusLower.includes("return") ||
    statusLower.includes("חבילה חזרה") ||
    statusLower.includes("החזרה") ||
    statusLower.includes("הוחזר")
  ) {
    return "returned";
  }

  return "pending";
};

// Function to update a delivery status in Google Sheets
export const updateDeliveryStatus = async (
  sheetsUrl: string,
  deliveryId: string,
  newStatus: string
): Promise<void> => {
  console.log(
    `Updating delivery ${deliveryId} to status ${newStatus} in sheet ${sheetsUrl}`
  );

  try {
    // Extract tracking number from the delivery ID (format is trackingNumber-index)
    const trackingNumber = deliveryId.split("-")[0];
    if (!trackingNumber) {
      throw new Error("Invalid delivery ID format");
    }

    // In a production environment, we would use the Google Sheets API with proper authentication
    // For this implementation, we'll log the update details for demonstration purposes
    // and simulate a successful update

    console.log(
      `Would update tracking number ${trackingNumber} to status ${newStatus} in Google Sheets`
    );
    console.log(
      "Note: Real Google Sheets API integration requires OAuth2 authentication"
    );

    // Simulate API latency
    return new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    /* 
    // Real implementation would look something like this:
    const spreadsheetId = getSpreadsheetIdFromUrl(sheetsUrl);
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Sheet1!A:Z', // Adjust range as needed
    });
    
    const rows = response.result.values;
    let rowIndex = -1;
    
    // Find the row with the matching tracking number
    rows.forEach((row, index) => {
      if (row[0] === trackingNumber) { // Assuming tracking number is in column A
        rowIndex = index;
      }
    });
    
    if (rowIndex !== -1) {
      // Update the status column (assuming it's column C)
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Sheet1!C${rowIndex + 1}`,
        valueInputOption: 'RAW',
        resource: {
          values: [[newStatus]]
        }
      });
    }
    */
  } catch (error) {
    console.error("Error updating Google Sheets:", error);
    throw new Error("Failed to update status in Google Sheets");
  }
};

// Add this function to your existing googleSheets.ts file

export const getStatusOptionsFromSheets = async (sheetsUrl: string) => {
  try {
    // Convert the Google Sheets URL to a format that can be accessed via API
    const sheetId = extractSheetId(sheetsUrl);
    const apiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
    
    const response = await fetch(apiUrl);
    const text = await response.text();
    
    // Google's response is not pure JSON, it's wrapped in a callback
    // We need to extract the JSON part
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.substring(jsonStart, jsonEnd);
    
    const data = JSON.parse(jsonString);
    
    // Look for a table or dropdown with status options
    // This assumes there's a specific sheet or range with status options
    // You might need to adjust this based on your actual sheet structure
    if (data.table && data.table.rows) {
      // Look for a row that might contain status options
      // This is a simplified approach - you might need to look for a specific sheet or range
      const statusOptions = [];
      
      for (const row of data.table.rows) {
        if (row.c && row.c[0] && row.c[1]) {
          const value = row.c[0].v;
          const label = row.c[1].v;
          
          if (value && label) {
            statusOptions.push({ value, label });
          }
        }
      }
      
      return statusOptions;
    }
    
    throw new Error("Status options not found in the sheet");
  } catch (error) {
    console.error("Error fetching status options:", error);
    return null;
  }
};

// Helper function to extract sheet ID from URL
const extractSheetId = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};
