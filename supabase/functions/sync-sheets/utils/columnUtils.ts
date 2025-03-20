
// Helper function to get a value using the column mapping
export function getValueByField(values: any[], field: string, columnMap: Record<string, number>): string {
  const index = columnMap[field];
  if (index !== undefined && index >= 0 && index < values.length) {
    return String(values[index] || '');
  }
  return '';
}

// Enhanced column analyzer for better detection
export function analyzeColumns(columns: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {
    trackingNumber: -1,
    name: -1,
    phone: -1,
    address: -1,
    city: -1,
    status: -1,
    statusDate: -1,
    scanDate: -1,
    assignedTo: -1,
    externalId: -1,
  };

  // First look for exact matches in Hebrew
  columns.forEach((col, index) => {
    // Skip empty columns
    if (!col) return;
    
    const lowerCol = String(col).toLowerCase().trim();
    
    if (lowerCol === "מספר מעקב" || lowerCol === "מספר משלוח") columnMap.trackingNumber = index;
    if (lowerCol === "שם" || lowerCol === "שם הלקוח" || lowerCol === "לקוח") columnMap.name = index;
    if (lowerCol === "טלפון" || lowerCol === "מספר טלפון" || lowerCol === "נייד") columnMap.phone = index;
    if (lowerCol === "כתובת" || lowerCol === "כתובת מלאה") columnMap.address = index;
    if (lowerCol === "עיר") columnMap.city = index;
    if (lowerCol === "סטטוס" || lowerCol === "מצב") columnMap.status = index;
    if (lowerCol === "תאריך עדכון" || lowerCol === "תאריך סטטוס") columnMap.statusDate = index;
    if (lowerCol === "תאריך סריקה" || lowerCol === "תאריך יצירה") columnMap.scanDate = index;
    if (lowerCol === "שליח" || lowerCol === "נהג" || lowerCol === "מחלק") columnMap.assignedTo = index;
    if (lowerCol === "מזהה חיצוני" || lowerCol === "מזהה" || lowerCol === "מס' הזמנה") columnMap.externalId = index;
  });

  // Now try more flexible matching if we couldn't find exact matches
  columns.forEach((col, index) => {
    if (!col) return;
    
    const lowerCol = String(col).toLowerCase();
    
    // Skip already mapped columns
    if (Object.values(columnMap).includes(index)) return;

    // Tracking Number (Checking for more variations)
    if (
      lowerCol.includes("מספר מעקב") ||
      lowerCol.includes("tracking") ||
      lowerCol.includes("מספר משלוח") ||
      lowerCol.includes("מספר הזמנה") ||
      lowerCol.includes("order number") ||
      lowerCol.includes("order id") ||
      lowerCol.includes("track") ||
      lowerCol.includes("מעקב") ||
      lowerCol === "number" ||
      lowerCol.includes("מס'") ||
      lowerCol.includes("barcode") ||
      lowerCol.includes("ברקוד") ||
      lowerCol.includes("tm") ||
      lowerCol.includes("gwd")
    ) {
      if (columnMap.trackingNumber === -1) columnMap.trackingNumber = index;
    } 
    // Customer Name
    else if (
      lowerCol.includes("שם") ||
      lowerCol.includes("לקוח") ||
      lowerCol.includes("name") ||
      lowerCol.includes("customer") ||
      lowerCol === "שם לקוח" ||
      lowerCol === "לקוח" ||
      lowerCol === "client" ||
      lowerCol === "name" ||
      lowerCol.includes("מקבל") ||
      lowerCol.includes("recipient")
    ) {
      if (columnMap.name === -1) columnMap.name = index;
    } 
    // Phone Number
    else if (
      lowerCol.includes("טלפון") ||
      lowerCol.includes("נייד") ||
      lowerCol.includes("phone") ||
      lowerCol.includes("mobile") ||
      lowerCol.includes("מס' טלפון") ||
      lowerCol.includes("phone number") ||
      lowerCol.includes("cell") ||
      lowerCol === "tel" ||
      lowerCol === "phone"
    ) {
      if (columnMap.phone === -1) columnMap.phone = index;
    } 
    // Address
    else if (
      lowerCol.includes("כתובת") ||
      lowerCol.includes("address") ||
      lowerCol.includes("location") ||
      lowerCol.includes("delivery address") ||
      lowerCol.includes("street") ||
      lowerCol === "address" ||
      lowerCol.includes("רחוב") ||
      lowerCol.includes("מיקום")
    ) {
      if (columnMap.address === -1) columnMap.address = index;
    }
    // City
    else if (
      lowerCol.includes("עיר") ||
      lowerCol.includes("city") ||
      lowerCol.includes("town") ||
      lowerCol === "city" ||
      lowerCol.includes("יישוב")
    ) {
      if (columnMap.city === -1) columnMap.city = index;
    }
    // Status
    else if (
      lowerCol.includes("סטטוס") ||
      lowerCol.includes("status") ||
      lowerCol.includes("מצב") ||
      lowerCol === "status" ||
      lowerCol.includes("state")
    ) {
      if (columnMap.status === -1) columnMap.status = index;
    } 
    // Status Date
    else if (
      lowerCol.includes("תאריך סטטוס") ||
      lowerCol.includes("status date") ||
      lowerCol.includes("עדכון סטטוס") ||
      lowerCol.includes("תאריך עדכון") ||
      lowerCol.includes("updated")
    ) {
      if (columnMap.statusDate === -1) columnMap.statusDate = index;
    } 
    // Scan Date / Created Date
    else if (
      lowerCol.includes("תאריך סריקה") ||
      lowerCol.includes("scan date") ||
      lowerCol.includes("נוצר") ||
      lowerCol.includes("תאריך יצירה") ||
      lowerCol.includes("created") ||
      lowerCol === "date scanned" ||
      lowerCol === "date"
    ) {
      if (columnMap.scanDate === -1) columnMap.scanDate = index;
    } 
    // Assigned To / Courier
    else if (
      lowerCol.includes("שליח") ||
      lowerCol.includes("מחלק") ||
      lowerCol.includes("assigned") ||
      lowerCol.includes("courier") ||
      lowerCol.includes("driver") ||
      lowerCol.includes("delivery person") ||
      lowerCol.includes("נהג")
    ) {
      if (columnMap.assignedTo === -1) columnMap.assignedTo = index;
    }
  });

  // Print all columns for debugging
  console.log("All available columns:", columns);
  
  // Make a third pass to check for any column that might contain customer data
  // This is especially helpful for identifying the correct name column
  if (columnMap.name === -1) {
    columns.forEach((col, index) => {
      // Skip already mapped columns
      if (Object.values(columnMap).includes(index)) return;
      
      // Look for columns that might contain names but aren't tracking numbers
      // In many delivery data formats, a column with person names is often 
      // in the first few columns and doesn't match other patterns
      if (index < 5 && col && col.length > 0) {
        columnMap.name = index;
        console.log(`Assigning name column by position: ${col} at index ${index}`);
        return;
      }
    });
  }

  // If we still couldn't find an address column, but we have a city column,
  // we can check if there's an unmapped column containing "street" or "רחוב"
  if (columnMap.address === -1 && columnMap.city !== -1) {
    columns.forEach((col, index) => {
      // Skip already mapped columns
      if (Object.values(columnMap).includes(index)) return;
      
      const lowerCol = String(col).toLowerCase();
      if (lowerCol.includes("רחוב") || lowerCol.includes("street") || lowerCol.includes("כתובת")) {
        columnMap.address = index;
        console.log(`Found street address column: ${col} at index ${index}`);
        return;
      }
    });
  }

  // If we still don't have date fields, use any column with "date" or "תאריך"
  if (columnMap.scanDate === -1 && columnMap.statusDate === -1) {
    columns.forEach((col, index) => {
      // Skip already mapped columns
      if (Object.values(columnMap).includes(index)) continue;
      
      const lowerCol = String(col).toLowerCase();
      if (lowerCol.includes("date") || lowerCol.includes("תאריך")) {
        columnMap.scanDate = index;
        columnMap.statusDate = index; // Use the same column for both dates as fallback
        console.log(`Assigned date column by keyword match: ${col} at index ${index}`);
        return;
      }
    });
  }

  // Last resort for tracking number: use the first column if nothing better found
  if (columnMap.trackingNumber === -1) {
    // Look for a column that contains TM or GWD to identify tracking numbers
    let trackingColumnFound = false;
    columns.forEach((col, index) => {
      // Skip if this column is already mapped to something else
      if (Object.values(columnMap).includes(index)) return;
      
      // Check each row for TM or GWD patterns that are common for tracking numbers
      if (col && (col.includes('TM') || col.includes('GWD'))) {
        columnMap.trackingNumber = index;
        trackingColumnFound = true;
        console.log(`Found likely tracking number column: ${col} at index ${index}`);
        return;
      }
    });
    
    // If still not found, use the first column as fallback
    if (!trackingColumnFound) {
      columnMap.trackingNumber = 0;
      console.log(`Using first column as tracking number fallback: ${columns[0]}`);
    }
  }

  // Log the final mapping for debugging
  console.log("Final column mapping:", columnMap);
  
  return columnMap;
}
