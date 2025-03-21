
// Function to analyze columns in a Google Sheets table and map them to our expected fields
export function analyzeColumns(columns: string[]) {
  console.log("Analyzing columns:", columns);
  
  const columnMap: Record<string, number> = {};
  const trackedFields = [
    "trackingNumber", 
    "name", 
    "phone", 
    "address", 
    "city", 
    "status", 
    "statusDate", 
    "scanDate", 
    "assignedTo", 
    "externalId"
  ];
  
  // Direct mapping based on common field names in Hebrew and English
  const fieldMatchers: Record<string, string[]> = {
    "trackingNumber": [
      "tracking", "מעקב", "track", "מספר מעקב", "מספר מעקב", "tracking number", 
      "tracking_number", "trackingNumber", "מספר", "number", "מזהה", "id", "TM", "GWD"
    ],
    "name": [
      "name", "שם", "שם לקוח", "לקוח", "customer", "customer name", "customerName", 
      "שם מלא", "full name", "fullName"
    ],
    "phone": [
      "phone", "טלפון", "מספר טלפון", "phone number", "phoneNumber", "טל", "נייד", 
      "mobile", "phone", "cel", "cell"
    ],
    "address": [
      "address", "כתובת", "כתובת מלאה", "full address", "fullAddress", "מען", 
      "מיקום", "location", "כתובת למשלוח", "delivery address", "deliveryAddress",
      "רחוב", "בית", "דירה"
    ],
    "city": [
      "city", "עיר", "ישוב", "city", "town", "settlement", "location", "מיקום"
    ],
    "status": [
      "status", "סטטוס", "מצב", "state", "condition", "delivery status", 
      "deliveryStatus", "סטטוס משלוח", "status"
    ],
    "statusDate": [
      "status date", "statusDate", "תאריך סטטוס", "תאריך עדכון", "update date", 
      "updateDate", "תאריך שינוי סטטוס", "status change date", "statusChangeDate"
    ],
    "scanDate": [
      "scan date", "scanDate", "תאריך סריקה", "תאריך קליטה", "entry date", 
      "entryDate", "תאריך קבלה", "receive date", "receiveDate", "תאריך"
    ],
    "assignedTo": [
      "assigned to", "assignedTo", "שיוך", "שויך ל", "שליח", "courier", "מחלק", 
      "distributor", "נהג", "driver", "שם שליח", "courier name", "courierName"
    ],
    "externalId": [
      "external id", "externalId", "מזהה חיצוני", "external identifier", 
      "externalIdentifier", "מזהה מערכת", "system id", "systemId", "מזהה לקוח",
      "customer id", "customerId"
    ]
  };
  
  // Position-based mapping for common spreadsheet formats
  const positionMapping: Record<number, string> = {
    0: "trackingNumber", // First column is typically tracking number
    1: "status",         // Second column often contains status
    2: "name",           // Third column often contains name
    3: "address",        // Fourth column often contains address
    4: "phone"           // Fifth column often contains phone
  };
  
  // First try exact matching based on column headers
  columns.forEach((column, index) => {
    const lowerColumn = column.toLowerCase().trim();
    
    // Try to find a match in our field matchers
    for (const field of trackedFields) {
      const matchers = fieldMatchers[field];
      
      if (matchers.some(matcher => 
        lowerColumn === matcher.toLowerCase() || 
        lowerColumn.includes(matcher.toLowerCase())
      )) {
        columnMap[field] = index;
        console.log(`Matched column "${column}" at index ${index} to field "${field}"`);
        break;
      }
    }
  });
  
  // For any fields that weren't mapped, try position-based mapping
  Object.entries(positionMapping).forEach(([posStr, field]) => {
    const position = parseInt(posStr);
    if (position < columns.length && !columnMap[field]) {
      columnMap[field] = position;
      console.log(`Position-mapped column at index ${position} to field "${field}"`);
    }
  });
  
  // If we still don't have a tracking number column, try to find something that looks like a tracking number
  if (!columnMap["trackingNumber"] && columns.length > 0) {
    // Default to the first column as tracking number if nothing else matched
    columnMap["trackingNumber"] = 0;
    console.log(`Defaulted first column to tracking number field`);
  }
  
  // Log the final mapping
  console.log("Final column mapping:", columnMap);
  return columnMap;
}

// Get a value from a row based on a field name and column mapping
export function getValueByField(values: any[], field: string, columnMap: Record<string, number>): string {
  const columnIndex = columnMap[field];
  
  if (columnIndex === undefined || columnIndex >= values.length) {
    return "";
  }
  
  const value = values[columnIndex];
  return value !== null && value !== undefined ? String(value) : "";
}
