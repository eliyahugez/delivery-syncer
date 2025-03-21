
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
      "tracking_number", "trackingNumber", "מספר", "number", "מזהה", "id", "TM", "GWD",
      "ID", "מספר הזמנה", "order number", "orderNumber", "order"
    ],
    "name": [
      "name", "שם", "שם לקוח", "לקוח", "customer", "customer name", "customerName", 
      "שם מלא", "full name", "fullName", "contact", "איש קשר", "recipient", "מקבל"
    ],
    "phone": [
      "phone", "טלפון", "מספר טלפון", "phone number", "phoneNumber", "טל", "נייד", 
      "mobile", "phone", "cel", "cell", "מס' טלפון", "tel", "cellphone"
    ],
    "address": [
      "address", "כתובת", "כתובת מלאה", "full address", "fullAddress", "מען", 
      "מיקום", "location", "כתובת למשלוח", "delivery address", "deliveryAddress",
      "רחוב", "בית", "דירה", "street", "כתובת לקוח", "כתובות", "addresses"
    ],
    "city": [
      "city", "עיר", "ישוב", "city", "town", "settlement", "location", "מיקום",
      "יישוב"
    ],
    "status": [
      "status", "סטטוס", "מצב", "state", "condition", "delivery status", 
      "deliveryStatus", "סטטוס משלוח", "סטטוס משלוח", "מצב משלוח"
    ],
    "statusDate": [
      "status date", "statusDate", "תאריך סטטוס", "תאריך עדכון", "update date", 
      "updateDate", "תאריך שינוי סטטוס", "status change date", "statusChangeDate",
      "date of status", "תאריך מצב"
    ],
    "scanDate": [
      "scan date", "scanDate", "תאריך סריקה", "תאריך קליטה", "entry date", 
      "entryDate", "תאריך קבלה", "receive date", "receiveDate", "תאריך",
      "date", "creation date", "תאריך יצירה", "createDate"
    ],
    "assignedTo": [
      "assigned to", "assignedTo", "שיוך", "שויך ל", "שליח", "courier", "מחלק", 
      "distributor", "נהג", "driver", "שם שליח", "courier name", "courierName",
      "assigned", "מבצע", "מבצע משלוח"
    ],
    "externalId": [
      "external id", "externalId", "מזהה חיצוני", "external identifier", 
      "externalIdentifier", "מזהה מערכת", "system id", "systemId", "מזהה לקוח",
      "customer id", "customerId", "מזהה הזמנה", "order id"
    ]
  };
  
  // Advanced column detection - check content of cells as well as headers
  // First, try exact header matching
  let headerMatchesFound = 0;
  columns.forEach((column, index) => {
    if (!column || column.trim() === '') return;
    
    const lowerColumn = column.toLowerCase().trim();
    
    // Try to find a match in our field matchers
    for (const field of trackedFields) {
      const matchers = fieldMatchers[field];
      
      // Check for exact or partial matches
      const exactMatch = matchers.some(matcher => 
        lowerColumn === matcher.toLowerCase());
        
      const partialMatch = matchers.some(matcher => 
        lowerColumn.includes(matcher.toLowerCase()));
      
      if (exactMatch || partialMatch) {
        columnMap[field] = index;
        console.log(`Matched column "${column}" at index ${index} to field "${field}" (${exactMatch ? 'exact' : 'partial'} match)`);
        headerMatchesFound++;
        break;
      }
    }
  });
  
  console.log(`Found ${headerMatchesFound} column matches through header analysis`);
  
  // If we didn't find enough matches, try position-based mapping
  if (headerMatchesFound <= 2 && columns.length >= 3) {
    console.log("Not enough matches found through headers, trying position-based mapping");
    
    // Position-based mapping for common spreadsheet formats
    const positionMapping: Record<number, string> = {
      0: "trackingNumber", // First column is typically tracking number
      1: "status",         // Second column often contains status
      2: "name",           // Third column often contains name
      3: "address",        // Fourth column often contains address
      4: "phone"           // Fifth column often contains phone
    };
    
    // Apply position-based mapping for fields that weren't mapped
    Object.entries(positionMapping).forEach(([posStr, field]) => {
      const position = parseInt(posStr);
      if (position < columns.length && !columnMap[field]) {
        columnMap[field] = position;
        console.log(`Position-mapped column at index ${position} to field "${field}"`);
      }
    });
  }
  
  // ENHANCED: Special case for date in name column
  // If a column has date-like values and is currently mapped as name, 
  // search for actual name column
  if ('name' in columnMap) {
    const nameColumnIndex = columnMap.name;
    const nameColumnHeader = columns[nameColumnIndex];
    
    // Check if name column header contains date indicators
    if (nameColumnHeader && 
        (nameColumnHeader.toLowerCase().includes('date') || 
         nameColumnHeader.toLowerCase().includes('תאריך'))) {
      
      console.log("Name column appears to contain date values. Looking for better name column...");
      
      // Look for more suitable name column
      for (let i = 0; i < columns.length; i++) {
        if (i !== nameColumnIndex && 
            !Object.values(columnMap).includes(i) &&
            columns[i] && 
            (columns[i].toLowerCase().includes('name') || 
             columns[i].toLowerCase().includes('שם') ||
             columns[i].toLowerCase().includes('לקוח'))) {
          
          // Found better name column
          columnMap.name = i;
          console.log(`Found better name column "${columns[i]}" at index ${i}`);
          break;
        }
      }
    }
  }
  
  // ENHANCED: Special case for status in phone column
  // If a column is mapped as phone but contains status-like values
  if ('phone' in columnMap) {
    const phoneColumnIndex = columnMap.phone;
    const phoneColumnHeader = columns[phoneColumnIndex];
    
    // Check if phone column header contains status indicators
    if (phoneColumnHeader && 
        (phoneColumnHeader.toLowerCase().includes('status') || 
         phoneColumnHeader.toLowerCase().includes('סטטוס') ||
         phoneColumnHeader.toLowerCase().includes('מצב'))) {
      
      console.log("Phone column appears to contain status values. Looking for better phone column...");
      
      // Look for more suitable phone column
      for (let i = 0; i < columns.length; i++) {
        if (i !== phoneColumnIndex && 
            !Object.values(columnMap).includes(i) &&
            columns[i] && 
            (columns[i].toLowerCase().includes('phone') || 
             columns[i].toLowerCase().includes('טלפון') ||
             columns[i].toLowerCase().includes('נייד'))) {
          
          // Found better phone column
          columnMap.phone = i;
          
          // Use the original phone column as status if we don't have a status mapping
          if (!('status' in columnMap)) {
            columnMap.status = phoneColumnIndex;
            console.log(`Remapped: phone → ${i}, and original phone column → status`);
          } else {
            console.log(`Found better phone column "${columns[i]}" at index ${i}`);
          }
          break;
        }
      }
    }
  }
  
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

// Check if a value looks like a date from Google Sheets
export function isSheetDateValue(value: string): boolean {
  return typeof value === 'string' && 
         value.startsWith('Date(') && 
         value.endsWith(')');
}

// Format a Google Sheets date value to a readable format
export function formatSheetDate(dateValue: string): string {
  if (!isSheetDateValue(dateValue)) return dateValue;
  
  try {
    const dateString = dateValue.substring(5, dateValue.length - 1);
    const [year, month, day] = dateString.split(',').map(Number);
    return `${day}/${month + 1}/${year}`;
  } catch (e) {
    console.error("Error parsing date value:", dateValue, e);
    return dateValue;
  }
}
