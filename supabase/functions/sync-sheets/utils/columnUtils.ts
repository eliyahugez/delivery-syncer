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
    
    // Check for tracking number column - looking for מספר מעקב or similar
    if (lowerCol === "מספר מעקב" || lowerCol === "tm" || lowerCol === "מס' מעקב") {
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

  // Now add more flexible matching for columns we couldn't identify precisely
  if (columnMap.trackingNumber === -1) {
    // Try to find tracking number column - typically starts with TM or contains numbers
    for (let i = 0; i < columns.length; i++) {
      const colSample = getColumnSample(i);
      if (colSample && (colSample.includes('TM') || colSample.includes('GWD'))) {
        columnMap.trackingNumber = i;
        console.log(`Inferred tracking number column at index ${i} based on TM/GWD pattern`);
        break;
      }
    }
  }

  // If we still couldn't identify key columns, use heuristics based on typical sheet structures
  if (columnMap.name === -1) {
    // Customer name is often in columns 1-3
    for (let i = 0; i < Math.min(3, columns.length); i++) {
      if (!Object.values(columnMap).includes(i)) {
        columnMap.name = i;
        console.log(`Assigning name column by position: ${columns[i]} at index ${i}`);
        break;
      }
    }
  }

  if (columnMap.address === -1) {
    // Address is often a longer text field
    for (let i = 0; i < columns.length; i++) {
      if (!Object.values(columnMap).includes(i)) {
        const colSample = getColumnSample(i);
        if (colSample && colSample.length > 15 && colSample.includes(' ')) {
          columnMap.address = i;
          console.log(`Inferred address column at index ${i} based on text length`);
          break;
        }
      }
    }
  }

  // Special handling for date columns
  if (columnMap.scanDate === -1) {
    for (let i = 0; i < columns.length; i++) {
      if (!Object.values(columnMap).includes(i) && columns[i] && columns[i].includes('תאריך')) {
        columnMap.scanDate = i;
        console.log(`Found date column for scan date: ${columns[i]} at index ${i}`);
        break;
      }
    }
  }

  // Last resort fallbacks - make assumptions based on column positions if nothing found
  if (columnMap.trackingNumber === -1 && columns.length > 0) {
    columnMap.trackingNumber = 0; // First column often contains tracking numbers
    console.log(`Using first column as tracking number fallback: ${columns[0]}`);
  }

  // Final validation - make sure we have at least the essential columns
  const essentialColumns = ['trackingNumber', 'name'];
  const missingEssentials = essentialColumns.filter(col => columnMap[col] === -1);
  
  if (missingEssentials.length > 0) {
    console.warn(`Could not identify these essential columns: ${missingEssentials.join(', ')}`);
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
