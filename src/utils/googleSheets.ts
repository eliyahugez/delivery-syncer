import { Delivery } from "@/types/delivery";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

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

// Function to get Google Sheets data as JSON using JSONP approach (avoids CORS)
export const getSheetAsJson = (spreadsheetId: string, sheetId = 0): string => {
  // This URL returns the sheet data as JSON with a callback, which avoids CORS issues
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&gid=${sheetId}`;
};

// Generate test data for development/offline use
const generateTestData = (): Delivery[] => {
  const currentDate = new Date().toISOString();
  return [
    {
      id: "1",
      trackingNumber: "XXXXXXXXXX",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "delivered",
      name: "Caroline Spector",
      phone: "05012345678",
      address: "D. N. Lev Hashomron-Maale Shomron 48",
      assignedTo: "שליח 1",
    },
    {
      id: "2",
      trackingNumber: "YYYYYYYYYY",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "in_progress",
      name: "David Cohen",
      phone: "05087654321",
      address: "Karney Shomron-HaAlon 11/2",
      assignedTo: "שליח 2",
    },
    {
      id: "3",
      trackingNumber: "ZZZZZZZZZZ",
      scanDate: currentDate,
      statusDate: currentDate,
      status: "pending",
      name: "Rachel Levy",
      phone: "05054321678",
      address: "Karnei Shomron-Mishol Hakalanit 4",
      assignedTo: "שליח 3",
    },
  ];
};

// Helper function to analyze JSONP columns and map them to delivery fields
const analyzeJSONPColumns = (columns: string[]): Record<string, number> => {
  const columnMap: Record<string, number> = {
    trackingNumber: -1,
    name: -1,
    phone: -1,
    address: -1,
    status: -1,
    statusDate: -1,
    scanDate: -1,
    assignedTo: -1,
  };

  // Map common column names to our expected fields
  columns.forEach((col, index) => {
    const colLower = col.toLowerCase();

    if (
      colLower.includes("מספר מעקב") ||
      colLower.includes("tracking") ||
      colLower.includes("מספר משלוח")
    ) {
      columnMap.trackingNumber = index;
    } else if (
      colLower.includes("שם") ||
      colLower.includes("לקוח") ||
      colLower.includes("name")
    ) {
      columnMap.name = index;
    } else if (
      colLower.includes("טלפון") ||
      colLower.includes("נייד") ||
      colLower.includes("phone")
    ) {
      columnMap.phone = index;
    } else if (colLower.includes("כתובת") || colLower.includes("address")) {
      columnMap.address = index;
    } else if (colLower.includes("סטטוס") || colLower.includes("status")) {
      columnMap.status = index;
    } else if (
      colLower.includes("תאריך סטטוס") ||
      colLower.includes("status date")
    ) {
      columnMap.statusDate = index;
    } else if (
      colLower.includes("תאריך סריקה") ||
      colLower.includes("scan date")
    ) {
      columnMap.scanDate = index;
    } else if (
      colLower.includes("שליח") ||
      colLower.includes("מחלק") ||
      colLower.includes("assigned")
    ) {
      columnMap.assignedTo = index;
    }
  });

  return columnMap;
};

// Function to parse JSONP response to Delivery objects
export const parseJSONPToDeliveries = (jsonData: any): Delivery[] => {
  try {
    console.log("Parsing JSONP data to deliveries");

    // Extract the table data from the JSONP response
    const table = jsonData.table;
    if (!table || !table.rows || !table.cols) {
      console.error("Invalid JSONP data structure");
      return [];
    }

    // Get column headers
    const columns = table.cols.map((col: any) => col.label || col.id);
    console.log("Detected columns:", columns);

    // Map column indices to expected delivery fields
    const columnMap = analyzeJSONPColumns(columns);
    console.log("Column mapping:", columnMap);

    // Convert rows to Delivery objects
    const deliveries: Delivery[] = [];

    table.rows.forEach((row: any, rowIndex: number) => {
      if (!row.c) return; // Skip invalid rows

      const values = row.c.map((cell: any) => cell?.v || "");

      // Skip empty rows
      if (values.every((v: any) => v === "")) return;

      // Create a delivery object using the column mapping
      const delivery: Partial<Delivery> = {};

      // Map each field using the column mapping
      Object.entries(columnMap).forEach(([field, colIndex]) => {
        if (colIndex !== -1 && colIndex < values.length) {
          (delivery as any)[field] = values[colIndex];
        }
      });

      // Generate an ID if tracking number exists
      if (delivery.trackingNumber) {
        delivery.id = `${delivery.trackingNumber}-${rowIndex}`;
      } else {
        delivery.id = `row-${rowIndex}`;
      }

      // Set default values for missing fields
      delivery.status = delivery.status || "pending";
      delivery.statusDate = delivery.statusDate || new Date().toISOString();
      delivery.scanDate = delivery.scanDate || new Date().toISOString();
      
      // Ensure we have values for required fields (even placeholders)
      delivery.name = delivery.name || "ללא שם";
      delivery.phone = delivery.phone || "לא זמין";
      delivery.address = delivery.address || "כתובת לא זמינה";
      
      // Set a default assignedTo if missing
      delivery.assignedTo = delivery.assignedTo || "לא שויך";

      deliveries.push(delivery as Delivery);
    });

    console.log(`Parsed ${deliveries.length} deliveries from JSONP data`);
    return deliveries;
  } catch (error) {
    console.error("Error parsing JSONP data:", error);
    return [];
  }
};

// Function to fetch deliveries from Google Sheets
export const fetchDeliveriesFromSheets = async (
  sheetsUrl: string,
  columnSignatures?: Record<string, any>
): Promise<{ 
  deliveries: Delivery[]; 
  isTestData: boolean;
  detectedColumns?: Record<string, string>;
  groupedByCourier?: Record<string, Delivery[]>;
  groupedByDate?: Record<string, Delivery[]>;
}> => {
  try {
    console.log("Fetching from Google Sheets URL:", sheetsUrl);

    // Try to use the sync-sheets Supabase Edge Function if possible
    try {
      console.log("Attempting to sync using Supabase Edge Function...");
      const { data, error } = await supabase.functions.invoke('sync-sheets', {
        body: { sheetsUrl }
      });
      
      if (error) {
        console.error("Edge function error:", error);
      } else if (data && data.deliveries && data.deliveries.length > 0) {
        console.log("Successfully synced data via Edge Function:", data);
        
        // Save the data to local storage for offline use
        localStorage.setItem('cached_deliveries', JSON.stringify(data.deliveries));
        localStorage.setItem('cached_courier_groups', JSON.stringify(data.groupedByCourier || {}));
        localStorage.setItem('cached_date_groups', JSON.stringify(data.groupedByDate || {}));
        localStorage.setItem('last_sync_time', new Date().toISOString());
        
        return { 
          deliveries: data.deliveries, 
          isTestData: false,
          detectedColumns: data.columnMap,
          groupedByCourier: data.groupedByCourier,
          groupedByDate: data.groupedByDate
        };
      }
    } catch (err) {
      console.error("Error using Edge Function:", err);
      console.log("Falling back to client-side implementation...");
    }

    const spreadsheetId = getSpreadsheetIdFromUrl(sheetsUrl);
    if (!spreadsheetId) {
      console.error("Invalid Google Sheets URL:", sheetsUrl);
      throw new Error("קישור גיליון Google לא תקין");
    }

    // Try with CORS proxy first
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
          mode: "cors", // Explicitly set CORS mode
          credentials: "omit", // Don't send cookies
          headers: {
            "Content-Type": "text/csv",
            "X-Requested-With": "XMLHttpRequest", // Some CORS proxies require this
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

    // If CORS proxies failed, try the JSONP approach
    if (!csvText) {
      try {
        console.log("All CORS proxies failed, trying JSONP approach...");
        const jsonpUrl = getSheetAsJson(spreadsheetId);

        console.log("Fetching with JSONP approach:", jsonpUrl);
        const response = await fetch(jsonpUrl, {
          method: "GET",
          // No CORS mode needed for JSONP
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch JSONP data: ${response.status} ${response.statusText}`
          );
        }

        const jsonText = await response.text();
        // The response is in the format: /*O_o*/google.visualization.Query.setResponse({...});
        // We need to extract the JSON part
        const jsonStart = jsonText.indexOf("{");
        const jsonEnd = jsonText.lastIndexOf("}") + 1;
        if (jsonStart > 0 && jsonEnd > jsonStart) {
          const jsonData = jsonText.substring(jsonStart, jsonEnd);
          console.log("Successfully fetched JSONP data");

          // Parse the JSON data to deliveries
          const parsedData = JSON.parse(jsonData);
          const deliveries = parseJSONPToDeliveries(parsedData);

          if (deliveries && deliveries.length > 0) {
            console.log(
              `Successfully parsed ${deliveries.length} deliveries from JSONP`
            );
            
            // Group deliveries by courier and date
            const groupedByCourier: Record<string, Delivery[]> = {};
            const groupedByDate: Record<string, Delivery[]> = {};
            
            deliveries.forEach(delivery => {
              // Group by courier
              if (!groupedByCourier[delivery.assignedTo]) {
                groupedByCourier[delivery.assignedTo] = [];
              }
              groupedByCourier[delivery.assignedTo].push(delivery);
              
              // Group by date within courier
              const dateKey = new Date(delivery.statusDate).toISOString().split('T')[0];
              const courierDateKey = `${delivery.assignedTo}-${dateKey}`;
              if (!groupedByDate[courierDateKey]) {
                groupedByDate[courierDateKey] = [];
              }
              groupedByDate[courierDateKey].push(delivery);
            });
            
            // Save to local storage
            localStorage.setItem('cached_deliveries', JSON.stringify(deliveries));
            localStorage.setItem('cached_courier_groups', JSON.stringify(groupedByCourier));
            localStorage.setItem('cached_date_groups', JSON.stringify(groupedByDate));
            localStorage.setItem('last_sync_time', new Date().toISOString());
            
            return { 
              deliveries, 
              isTestData: false, 
              detectedColumns: {},
              groupedByCourier,
              groupedByDate
            };
          } else {
            console.error("No deliveries parsed from JSONP data");
          }
        } else {
          console.error("Invalid JSONP response format");
        }
      } catch (err) {
        console.error("JSONP approach failed:", err);
      }
    } else {
      // We have CSV data, parse it
      const { deliveries: parsedDeliveries, detectedColumns } =
        parseCSVToDeliveries(csvText);

      if (parsedDeliveries && parsedDeliveries.length > 0) {
        console.log(
          `Successfully parsed ${parsedDeliveries.length} deliveries from CSV`
        );
        
        // Group deliveries by courier and date
        const groupedByCourier: Record<string, Delivery[]> = {};
        const groupedByDate: Record<string, Delivery[]> = {};
        
        parsedDeliveries.forEach(delivery => {
          // Group by courier
          if (!groupedByCourier[delivery.assignedTo]) {
            groupedByCourier[delivery.assignedTo] = [];
          }
          groupedByCourier[delivery.assignedTo].push(delivery);
          
          // Group by date within courier
          const dateKey = new Date(delivery.statusDate).toISOString().split('T')[0];
          const courierDateKey = `${delivery.assignedTo}-${dateKey}`;
          if (!groupedByDate[courierDateKey]) {
            groupedByDate[courierDateKey] = [];
          }
          groupedByDate[courierDateKey].push(delivery);
        });
        
        // Save to local storage
        localStorage.setItem('cached_deliveries', JSON.stringify(parsedDeliveries));
        localStorage.setItem('cached_courier_groups', JSON.stringify(groupedByCourier));
        localStorage.setItem('cached_date_groups', JSON.stringify(groupedByDate));
        localStorage.setItem('last_sync_time', new Date().toISOString());
        
        return { 
          deliveries: parsedDeliveries, 
          isTestData: false,
          detectedColumns,
          groupedByCourier,
          groupedByDate
        };
      } else {
        console.error("No deliveries parsed from CSV data");
      }
    }

    // Try to load from local storage if available
    const cachedData = localStorage.getItem('cached_deliveries');
    const cachedCourierGroups = localStorage.getItem('cached_courier_groups');
    const cachedDateGroups = localStorage.getItem('cached_date_groups');
    
    if (cachedData) {
      console.log("Loading cached data from local storage");
      const deliveries = JSON.parse(cachedData);
      const groupedByCourier = cachedCourierGroups ? JSON.parse(cachedCourierGroups) : {};
      const groupedByDate = cachedDateGroups ? JSON.parse(cachedDateGroups) : {};
      
      return { 
        deliveries, 
        isTestData: false,
        detectedColumns: {},
        groupedByCourier,
        groupedByDate
      };
    }

    // If all approaches fail, fallback to test data
    console.warn(
      "All data fetching approaches failed, falling back to test data"
    );
    return { 
      deliveries: generateTestData(), 
      isTestData: true,
      detectedColumns: {} 
    };
  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);

    // Try to load from local storage if available
    const cachedData = localStorage.getItem('cached_deliveries');
    const cachedCourierGroups = localStorage.getItem('cached_courier_groups');
    const cachedDateGroups = localStorage.getItem('cached_date_groups');
    
    if (cachedData) {
      console.log("Loading cached data from local storage");
      const deliveries = JSON.parse(cachedData);
      const groupedByCourier = cachedCourierGroups ? JSON.parse(cachedCourierGroups) : {};
      const groupedByDate = cachedDateGroups ? JSON.parse(cachedDateGroups) : {};
      
      return { 
        deliveries, 
        isTestData: false,
        detectedColumns: {},
        groupedByCourier,
        groupedByDate
      };
    }

    // Return test data as fallback
    console.warn("Returning test data due to fetch error");
    return { 
      deliveries: generateTestData(), 
      isTestData: true,
      detectedColumns: {} 
    };
  }
};

// Function to parse CSV data to Delivery objects
export const parseCSVToDeliveries = (
  csvText: string
): { deliveries: Delivery[]; detectedColumns: Record<string, string> } => {
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

    // Check if we have any data
    if (!result.data || result.data.length === 0) {
      console.error("No data found in CSV");
      return { deliveries: [], detectedColumns: {} };
    }

    // Log a sample row to help with debugging
    console.log("Sample data row:", result.data[0]);

    // Analyze the data to automatically detect column types
    const detectedColumns = analyzeColumns(result.data);
    console.log("Detected column mappings:", detectedColumns);

    // Map parsed data to Delivery objects
    const deliveries = result.data.map((row: any, index) => {
      // Handle various column names for flexibility, using detected columns
      const trackingField = findField(
        row,
        [
          "trackingNumber",
          "Tracking",
          "מספר מעקב",
          "tracking",
          "TrackingNumber",
          "מספר משלוח",
          "מספר הזמנה",
          "Order Number",
          "Shipment ID",
          "מספר",
        ],
        detectedColumns
      );

      const scanDateField = findField(
        row,
        [
          "scanDate",
          "Scan Date",
          "תאריך סריקה",
          "Date Scanned",
          "Scan Time",
          "Created Date",
          "תאריך יצירה",
          "Date",
          "תאריך",
        ],
        detectedColumns
      );

      const statusDateField = findField(
        row,
        [
          "statusDate",
          "Status Date",
          "תאריך סטטוס",
          "Last Updated",
          "עדכון אחרון",
          "Update Date",
          "תאריך עדכון",
        ],
        detectedColumns
      );

      const statusField = findField(
        row,
        [
          "status",
          "Status",
          "סטטוס",
          "מצב",
          "Delivery Status",
          "מצב משלוח",
          "State",
        ],
        detectedColumns
      );

      const nameField = findField(
        row,
        [
          "name",
          "Name",
          "שם",
          "Customer",
          "לקוח",
          "Recipient",
          "מקבל",
          "Contact",
          "איש קשר",
        ],
        detectedColumns
      );

      const phoneField = findField(
        row,
        [
          "phone",
          "Phone",
          "טלפון",
          "Mobile",
          "נייד",
          "Cell",
          "Contact Number",
          "מספר טלפון",
        ],
        detectedColumns
      );

      const addressField = findField(
        row,
        [
          "address",
          "Address",
          "כתובת",
          "Delivery Address",
          "כתובת למשלוח",
          "Location",
          "מיקום",
        ],
        detectedColumns
      );

      const assignedToField = findField(
        row,
        [
          "assignedTo",
          "Assigned To",
          "שיוך",
          "Courier",
          "שליח",
          "Driver",
          "נהג",
          "Delivery Person",
          "מוביל",
        ],
        detectedColumns
      );

      // Generate a unique ID using tracking number and index
      const trackingNumber = row[trackingField] || `unknown-${index}`;
      const id = `${trackingNumber}-${index}`;

      // Get current date as fallback for missing dates
      const currentDate = new Date().toISOString();

      // Create the delivery object with all required fields
      return {
        id,
        trackingNumber: trackingNumber,
        scanDate: row[scanDateField] || currentDate,
        statusDate: row[statusDateField] || currentDate,
        status: normalizeStatus(row[statusField] || "pending"),
        name: row[nameField] || "Unknown",
        phone: row[phoneField] || "",
        address: row[addressField] || "",
        assignedTo: row[assignedToField] || "",
      };
    });

    console.log(
      `Successfully mapped ${deliveries.length} deliveries with detected columns`
    );
    return { deliveries, detectedColumns };
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return { deliveries: [], detectedColumns: {} };
  }
};

// Helper function to find a matching field in the row with more flexibility
const findField = (
  row: any,
  possibleNames: string[],
  columnMappings?: Record<string, string>
): string => {
  // If we have column mappings, use them first (highest priority)
  if (columnMappings) {
    // First check if any of the field types we're looking for are in the mappings
    // This is the most reliable method - our intelligent column detection
    for (const name of possibleNames) {
      const fieldType = name.toLowerCase();
      // Check if we have a direct mapping for this field type
      if (
        columnMappings[fieldType] &&
        row.hasOwnProperty(columnMappings[fieldType])
      ) {
        return columnMappings[fieldType];
      }
    }

    // Then check if any of the possible names are mapped to a column
    for (const name of possibleNames) {
      if (columnMappings[name] && row.hasOwnProperty(columnMappings[name])) {
        return columnMappings[name];
      }
    }

    // Special case for field types that might be mapped differently
    // For example, if we're looking for 'trackingNumber' but it's mapped as 'tracking'
    const fieldTypeMap: Record<string, string[]> = {
      trackingNumber: ["tracking", "track", "shipment", "order", "מספר"],
      name: ["customer", "client", "recipient", "לקוח", "מקבל"],
      phone: ["mobile", "cell", "contact", "טלפון", "נייד"],
      address: ["location", "destination", "shipping", "כתובת", "מיקום"],
      status: ["state", "condition", "מצב", "סטטוס"],
      assignedTo: ["courier", "driver", "delivery", "שליח", "נהג"],
    };

    // Check for related field types
    for (const name of possibleNames) {
      const fieldType = name.toLowerCase();
      const relatedTypes = fieldTypeMap[fieldType];

      if (relatedTypes) {
        for (const relatedType of relatedTypes) {
          if (
            columnMappings[relatedType] &&
            row.hasOwnProperty(columnMappings[relatedType])
          ) {
            return columnMappings[relatedType];
          }
        }
      }
    }
  }

  // If no mapping found, try direct matches in the row

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

  // If we still haven't found a match, try a more aggressive approach
  // Look for any key that might contain parts of what we're looking for
  const fieldKeywords: Record<string, string[]> = {
    trackingNumber: [
      "track",
      "order",
      "shipment",
      "id",
      "number",
      "מספר",
      "משלוח",
      "הזמנה",
    ],
    name: ["name", "customer", "client", "person", "שם", "לקוח"],
    phone: ["phone", "mobile", "cell", "contact", "טלפון", "נייד", "פלאפון"],
    address: ["address", "location", "street", "city", "כתובת", "רחוב", "עיר"],
    status: ["status", "state", "condition", "סטטוס", "מצב"],
    assignedTo: ["assign", "courier", "driver", "delivery", "שליח", "נהג"],
  };

  for (const name of possibleNames) {
    const keywords = fieldKeywords[name.toLowerCase()];
    if (keywords) {
      for (const keyword of keywords) {
        const keyMatch = rowKeys.find((key) =>
          key.toLowerCase().includes(keyword.toLowerCase())
        );
        if (keyMatch) {
          return keyMatch;
        }
      }
    }
  }

  return "";
};

// Function to analyze columns and detect their types based on content patterns
const analyzeColumns = (data: any[]): Record<string, string> => {
  if (!data || data.length === 0) return {};

  const columnMappings: Record<string, string> = {};
  const sampleSize = Math.min(data.length, 30); // Increased sample size for better analysis
  const sampleData = data.slice(0, sampleSize);
  const headers = Object.keys(data[0]);

  // Initialize counters for each column with expanded statistics
  const columnStats: Record<
    string,
    {
      numericCount: number;
      phoneCount: number;
      longTextCount: number;
      dateCount: number;
      trackingCount: number;
      statusCount: number;
      nameCount: number;
      wordCount: number;
      avgLength: number;
      emptyCount: number;
      uniqueValues: Set<string>;
      addressCount: number;
      emailCount: number;
      urlCount: number;
      hebrewCount: number;
      englishCount: number;
      mixedCount: number;
    }
  > = {};

  headers.forEach((header) => {
    columnStats[header] = {
      numericCount: 0,
      phoneCount: 0,
      longTextCount: 0,
      dateCount: 0,
      trackingCount: 0,
      statusCount: 0,
      nameCount: 0,
      wordCount: 0,
      avgLength: 0,
      emptyCount: 0,
      uniqueValues: new Set<string>(),
      addressCount: 0,
      emailCount: 0,
      urlCount: 0,
      hebrewCount: 0,
      englishCount: 0,
      mixedCount: 0,
    };
  });

  // Analyze each column's content
  sampleData.forEach((row) => {
    headers.forEach((header) => {
      const value = row[header];
      if (!value) {
        columnStats[header].emptyCount++;
        return;
      }

      const strValue = String(value).trim();
      columnStats[header].uniqueValues.add(strValue);

      // Calculate average length and word count for this column
      columnStats[header].avgLength += strValue.length;
      columnStats[header].wordCount += strValue.split(/\s+/).length;

      // Check for Hebrew characters
      if (/[\u0590-\u05FF]/.test(strValue)) {
        if (/^[\u0590-\u05FF\s.,'-]+$/.test(strValue)) {
          columnStats[header].hebrewCount++;
        } else {
          columnStats[header].mixedCount++;
        }
      } else if (/^[a-zA-Z\s.,'-]+$/.test(strValue)) {
        columnStats[header].englishCount++;
      }

      // Check if it's a phone number with enhanced detection for Israeli formats
      const phoneRegex =
        /^\+?\d{8,15}$|^\d{2,4}[- ]?\d{3}[- ]?\d{4}$|^0\d{1,2}[- ]?\d{7,8}$|^05\d[- ]?\d{7}$|^\+?972[- ]?\d{8,9}$/;
      if (phoneRegex.test(strValue.replace(/[\s-()]/g, ""))) {
        columnStats[header].phoneCount++;
      }

      // Check if it's a numeric value
      if (/^\d+$/.test(strValue)) {
        columnStats[header].numericCount++;
      }

      // Check if it's a long text (likely an address)
      if (strValue.length > 15 && strValue.split(/\s+/).length > 3) {
        columnStats[header].longTextCount++;
      }

      // Enhanced address detection
      const addressKeywords = [
        "street",
        "st",
        "road",
        "rd",
        "avenue",
        "ave",
        "lane",
        "ln",
        "drive",
        "dr",
        "boulevard",
        "blvd",
        "highway",
        "hwy",
        "apartment",
        "apt",
        "floor",
        "רחוב",
        "שדרות",
        "שד",
        "דירה",
        "קומה",
        "בית",
        "כביש",
        "מעלה",
        "מעלות",
        "שכונת",
      ];

      const hasAddressKeyword = addressKeywords.some((keyword) =>
        strValue.toLowerCase().includes(keyword)
      );

      const hasNumberWithText = /\d+\s+[a-zA-Z\u0590-\u05FF]/.test(strValue);

      if ((hasAddressKeyword || hasNumberWithText) && strValue.length > 10) {
        columnStats[header].addressCount++;
      }

      // Check if it's a date with enhanced detection
      const dateRegex =
        /\d{1,4}[-\/.]\d{1,2}[-\/.]\d{1,4}|\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}/;
      const dateTimeRegex = /\d{1,4}[-\/.]\d{1,2}[-\/.]\d{1,4}\s+\d{1,2}:\d{2}/;

      if (
        dateRegex.test(strValue) ||
        dateTimeRegex.test(strValue) ||
        !isNaN(Date.parse(strValue))
      ) {
        columnStats[header].dateCount++;
      }

      // Enhanced tracking number detection
      const trackingRegex = /^[A-Z0-9]{8,15}$/i;
      const israeliTrackingRegex =
        /^(GWD|TMU|IL|RR|LY|CX|EE|LP|ZA)[0-9]{6,13}$/i;
      const generalTrackingRegex = /^[A-Z]{2,3}[0-9]{6,12}$/i;

      if (
        trackingRegex.test(strValue.replace(/\s/g, "")) ||
        israeliTrackingRegex.test(strValue.replace(/\s/g, "")) ||
        generalTrackingRegex.test(strValue.replace(/\s/g, ""))
      ) {
        columnStats[header].trackingCount++;
      }

      // Enhanced status field detection
      const statusKeywords = [
        "pending",
        "delivered",
        "in progress",
        "failed",
        "returned",
        "ממתין",
        "נמסר",
        "בדרך",
        "נכשל",
        "הוחזר",
        "מוכן",
        "בטיפול",
        "הושלם",
        "חדש",
        "ready",
        "complete",
        "done",
        "processed",
        "shipped",
        "sent",
        "active",
        "נשלח",
        "פעיל",
        "הסתיים",
        "סופק",
        "בוצע",
      ];
      if (
        statusKeywords.some((keyword) =>
          strValue.toLowerCase().includes(keyword)
        )
      ) {
        columnStats[header].statusCount++;
      }

      // Check for email addresses
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (emailRegex.test(strValue)) {
        columnStats[header].emailCount++;
      }

      // Check for URLs
      const urlRegex =
        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (urlRegex.test(strValue)) {
        columnStats[header].urlCount++;
      }

      // Enhanced name detection
      // Names typically have 2+ words, no numbers, and reasonable length
      const nameRegex = /^[\p{L}\s'.,-]+$/u; // Unicode-aware regex for names
      const commonNamePrefixes = [
        "mr",
        "mrs",
        "ms",
        "dr",
        "prof",
        "מר",
        "גב",
        "ד״ר",
        "פרופ",
      ];
      const hasNamePrefix = commonNamePrefixes.some((prefix) =>
        strValue.toLowerCase().startsWith(prefix)
      );

      if (
        nameRegex.test(strValue) &&
        (strValue.split(/\s+/).length >= 2 || hasNamePrefix) &&
        strValue.length > 3 &&
        strValue.length < 50 &&
        !/\d/.test(strValue)
      ) {
        columnStats[header].nameCount++;
      }
    });
  });

  // Calculate averages and analyze uniqueness
  headers.forEach((header) => {
    const stats = columnStats[header];
    if (sampleSize > 0) {
      stats.avgLength = stats.avgLength / sampleSize;
      stats.wordCount = stats.wordCount / sampleSize;
    }

    // Log detailed stats for debugging
    console.log(`Column "${header}" stats:`, {
      uniqueValues: stats.uniqueValues.size,
      avgLength: stats.avgLength.toFixed(1),
      wordCount: stats.wordCount.toFixed(1),
      phoneCount: stats.phoneCount,
      addressCount: stats.addressCount,
      trackingCount: stats.trackingCount,
      nameCount: stats.nameCount,
      statusCount: stats.statusCount,
      dateCount: stats.dateCount,
      hebrewCount: stats.hebrewCount,
      englishCount: stats.englishCount,
      mixedCount: stats.mixedCount,
    });
  });

  // Determine the most likely type for each column with improved logic
  headers.forEach((header) => {
    const stats = columnStats[header];
    const total = sampleSize - stats.emptyCount; // Adjust for empty values
    if (total === 0) return; // Skip completely empty columns

    // Use adaptive thresholds based on data quality
    const highConfidenceThreshold = total * 0.6;
    const mediumConfidenceThreshold = total * 0.3;
    const lowConfidenceThreshold = total * 0.2;

    // Check header name first for strong indicators
    const headerLower = header.toLowerCase();

    // Strong header name matches take precedence
    if (
      headerLower.includes("phone") ||
      headerLower.includes("טלפון") ||
      headerLower.includes("נייד")
    ) {
      columnMappings["phone"] = header;
      return;
    }

    if (
      headerLower.includes("track") ||
      headerLower.includes("מעקב") ||
      headerLower.includes("משלוח") ||
      headerLower.includes("מספר הזמנה")
    ) {
      columnMappings["trackingNumber"] = header;
      return;
    }

    if (
      headerLower.includes("status") ||
      headerLower.includes("סטטוס") ||
      headerLower.includes("מצב")
    ) {
      columnMappings["status"] = header;
      return;
    }

    if (
      headerLower.includes("name") ||
      headerLower.includes("שם") ||
      headerLower.includes("customer") ||
      headerLower.includes("לקוח")
    ) {
      columnMappings["name"] = header;
      return;
    }

    if (
      headerLower.includes("address") ||
      headerLower.includes("כתובת") ||
      headerLower.includes("location") ||
      headerLower.includes("מיקום")
    ) {
      columnMappings["address"] = header;
      return;
    }

    if (
      headerLower.includes("courier") ||
      headerLower.includes("שליח") ||
      headerLower.includes("assigned") ||
      headerLower.includes("driver") ||
      headerLower.includes("נהג")
    ) {
      columnMappings["assignedTo"] = header;
      return;
    }

    // Now check content patterns with confidence thresholds
    if (stats.phoneCount > mediumConfidenceThreshold) {
      columnMappings["phone"] = header;
    } else if (stats.trackingCount > mediumConfidenceThreshold) {
      columnMappings["trackingNumber"] = header;
    } else if (stats.statusCount > mediumConfidenceThreshold) {
      columnMappings["status"] = header;
    } else if (stats.nameCount > mediumConfidenceThreshold) {
      columnMappings["name"] = header;
    } else if (
      stats.addressCount > lowConfidenceThreshold ||
      (stats.longTextCount > mediumConfidenceThreshold && stats.avgLength > 20)
    ) {
      columnMappings["address"] = header;
    } else if (stats.dateCount > mediumConfidenceThreshold) {
      // If we have multiple date columns, try to distinguish between scan date and status date
      if (!columnMappings["scanDate"]) {
        columnMappings["scanDate"] = header;
      } else if (!columnMappings["statusDate"]) {
        columnMappings["statusDate"] = header;
      }
    }
  });

  // Second pass: fill in missing required fields with best guesses
  const requiredFields = [
    "trackingNumber",
    "name",
    "phone",
    "address",
    "status",
  ];
  const missingFields = requiredFields.filter(
    (field) => !columnMappings[field]
  );

  if (missingFields.length > 0) {
    console.log("Missing required fields:", missingFields);

    // For each missing field, find the best candidate
    missingFields.forEach((field) => {
      let bestHeader = "";
      let bestScore = 0;

      headers.forEach((header) => {
        // Skip headers already mapped
        if (Object.values(columnMappings).includes(header)) return;

        const stats = columnStats[header];
        let score = 0;

        // Calculate score based on field type
        switch (field) {
          case "trackingNumber":
            score = stats.trackingCount * 3 + stats.numericCount / 2;
            break;
          case "name":
            score =
              stats.nameCount * 3 +
              stats.hebrewCount / 2 +
              stats.englishCount / 2;
            break;
          case "phone":
            score = stats.phoneCount * 3 + stats.numericCount / 2;
            break;
          case "address":
            score =
              stats.addressCount * 3 +
              stats.longTextCount +
              stats.mixedCount / 2;
            break;
          case "status":
            score =
              stats.statusCount * 3 + (stats.uniqueValues.size < 10 ? 5 : 0);
            break;
        }

        if (score > bestScore) {
          bestScore = score;
          bestHeader = header;
        }
      });

      // Only assign if we found a reasonable candidate
      if (bestHeader && bestScore > 0) {
        console.log(
          `Best guess for ${field}: ${bestHeader} (score: ${bestScore})`
        );
        columnMappings[field] = bestHeader;
      }
    });
  }

  console.log("Final detected column mappings:", columnMappings);
  return columnMappings;
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
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}") + 1;
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
