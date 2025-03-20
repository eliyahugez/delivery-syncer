
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

  // Log the exact columns found in the sheet for debugging
  console.log("Analyzing columns in sheet:", columns);

  // First look for exact matches based on the specific sheet structure shared by the user
  columns.forEach((col, index) => {
    // Skip empty columns
    if (!col) return;
    
    const lowerCol = String(col).toLowerCase().trim();
    
    // Primary column detection - high priority exact matches
    if (index === 1 && (lowerCol.includes("gwd") || lowerCol === "" || lowerCol.includes("tracking"))) {
      // Column 1 is typically the tracking number in many sheets
      columnMap.trackingNumber = index;
      console.log(`Found tracking number by position in column 1: ${index}`);
    }
    
    if (index === 5 && (lowerCol.includes("address") || lowerCol === "" || lowerCol.includes("כתובת"))) {
      // Column 5 is typically the address in many sheets
      columnMap.address = index;
      console.log(`Found address by position in column 5: ${index}`);
    }
    
    if (index === 6 && (lowerCol.includes("name") || lowerCol === "" || lowerCol.includes("שם"))) {
      // Column 6 is typically the name in many sheets
      columnMap.name = index;
      console.log(`Found name by position in column 6: ${index}`);
    }
    
    if (index === 7 && (lowerCol.includes("phone") || lowerCol === "" || lowerCol.includes("טלפון"))) {
      // Column 7 is typically the phone in many sheets
      columnMap.phone = index;
      console.log(`Found phone by position in column 7: ${index}`);
    }
    
    if (index === 4 && (lowerCol.includes("status") || lowerCol === "" || lowerCol.includes("סטטוס"))) {
      // Column 4 is typically the status in many sheets
      columnMap.status = index;
      console.log(`Found status by position in column 4: ${index}`);
    }
    
    // Check for tracking number column - looking for מספר מעקב or similar
    if (lowerCol === "מספר מעקב" || lowerCol === "tm" || lowerCol === "מס' מעקב" || lowerCol.includes("gwd")) {
      columnMap.trackingNumber = index;
      console.log(`Found tracking number column: "${col}" at index ${index}`);
    }
    
    // Look for customer name - specifically checking for שם or similar
    if (lowerCol === "שם" || lowerCol === "שם לקוח" || lowerCol === "פרטי לקוח") {
      columnMap.name = index;
      console.log(`Found customer name column: "${col}" at index ${index}`);
    }
    
    // Phone column - טלפון or similar
    if (lowerCol === "טלפון" || lowerCol === "מספר טלפון" || lowerCol === "נייד") {
      columnMap.phone = index;
      console.log(`Found phone column: "${col}" at index ${index}`);
    }
    
    // Address column - כתובת or similar
    if (lowerCol === "כתובת" || lowerCol === "כתובת מלאה" || lowerCol === "כתובת למשלוח") {
      columnMap.address = index;
      console.log(`Found address column: "${col}" at index ${index}`);
    }
    
    // City column - עיר or similar
    if (lowerCol === "עיר" || lowerCol === "ישוב" || lowerCol === "יישוב") {
      columnMap.city = index;
      console.log(`Found city column: "${col}" at index ${index}`);
    }
    
    // Status column - סטטוס or מצב משלוח
    if (lowerCol === "סטטוס" || lowerCol === "מצב" || lowerCol === "מצב משלוח") {
      columnMap.status = index;
      console.log(`Found status column: "${col}" at index ${index}`);
    }
    
    // Date columns - various date fields
    if (lowerCol.includes("תאריך") && (lowerCol.includes("סטטוס") || lowerCol.includes("עדכון"))) {
      columnMap.statusDate = index;
      console.log(`Found status date column: "${col}" at index ${index}`);
    }
    if (lowerCol.includes("תאריך") && (lowerCol.includes("סריקה") || lowerCol.includes("יצירה"))) {
      columnMap.scanDate = index;
      console.log(`Found scan date column: "${col}" at index ${index}`);
    }
    
    // Assigned to column - שליח or similar
    if (lowerCol.includes("שליח") || lowerCol.includes("נהג") || lowerCol.includes("מחלק")) {
      columnMap.assignedTo = index;
      console.log(`Found assigned to column: "${col}" at index ${index}`);
    }
    
    // External ID column - if exists
    if (lowerCol.includes("מזהה חיצוני") || lowerCol.includes("מס' הזמנה") || lowerCol === "מזהה") {
      columnMap.externalId = index;
      console.log(`Found external ID column: "${col}" at index ${index}`);
    }
  });

  // Check for empty mapping and try harder to detect columns by position
  if (columnMap.trackingNumber === -1) {
    // For this specific sheet, column 1 seems to be tracking number
    if (columns.length > 1) {
      columnMap.trackingNumber = 1;
      console.log("Setting tracking number to column 1 by default");
    }
  }
  
  if (columnMap.name === -1) {
    // For this specific sheet, column 6 seems to be customer name
    if (columns.length > 6) {
      columnMap.name = 6;
      console.log("Setting name to column 6 by default");
    }
  }
  
  if (columnMap.address === -1) {
    // For this specific sheet, column 5 seems to be address
    if (columns.length > 5) {
      columnMap.address = 5;
      console.log("Setting address to column 5 by default");
    }
  }
  
  if (columnMap.status === -1) {
    // For this specific sheet, column 4 seems to be status
    if (columns.length > 4) {
      columnMap.status = 4;
      console.log("Setting status to column 4 by default");
    }
  }
  
  if (columnMap.phone === -1) {
    // For this specific sheet, column 7 seems to be phone
    if (columns.length > 7) {
      columnMap.phone = 7;
      console.log("Setting phone to column 7 by default");
    }
  }

  // Log the final mapping for debugging
  console.log("Final column mapping:", columnMap);
  
  return columnMap;

  // Helper function to get a sample value from a column for analysis
  function getColumnSample(columnIndex: number): string {
    // This is a placeholder - in a real implementation, we would examine 
    // actual data rows to get sample values
    return ""; // We'll implement this properly in deliveryProcessor.ts
  }
}
