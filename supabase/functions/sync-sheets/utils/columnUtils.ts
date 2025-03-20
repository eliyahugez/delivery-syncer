
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
  };

  // Look for column headers that match our expected fields
  columns.forEach((col, index) => {
    // Skip empty columns
    if (!col) return;
    
    const lowerCol = String(col).toLowerCase();
    console.log(`Analyzing column: ${col} (${lowerCol}) at index ${index}`);

    // Tracking Number
    if (
      lowerCol.includes("מספר מעקב") ||
      lowerCol.includes("tracking") ||
      lowerCol.includes("מספר משלוח") ||
      lowerCol.includes("מספר הזמנה") ||
      lowerCol.includes("order number") ||
      lowerCol.includes("order id") ||
      lowerCol.includes("track") ||
      lowerCol.includes("מעקב") ||
      lowerCol === "number"
    ) {
      columnMap.trackingNumber = index;
      console.log(`Found tracking number column at index ${index}: ${col}`);
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
      lowerCol === "name"
    ) {
      columnMap.name = index;
      console.log(`Found customer name column at index ${index}: ${col}`);
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
      columnMap.phone = index;
      console.log(`Found phone column at index ${index}: ${col}`);
    } 
    // Address
    else if (
      lowerCol.includes("כתובת") ||
      lowerCol.includes("address") ||
      lowerCol.includes("location") ||
      lowerCol.includes("delivery address") ||
      lowerCol.includes("street") ||
      lowerCol === "address"
    ) {
      columnMap.address = index;
      console.log(`Found address column at index ${index}: ${col}`);
    }
    // City
    else if (
      lowerCol.includes("עיר") ||
      lowerCol.includes("city") ||
      lowerCol.includes("town") ||
      lowerCol === "city"
    ) {
      columnMap.city = index;
      console.log(`Found city column at index ${index}: ${col}`);
    }
    // Status
    else if (
      lowerCol.includes("סטטוס") ||
      lowerCol.includes("status") ||
      lowerCol.includes("מצב") ||
      lowerCol === "status"
    ) {
      columnMap.status = index;
      console.log(`Found status column at index ${index}: ${col}`);
    } 
    // Status Date
    else if (
      lowerCol.includes("תאריך סטטוס") ||
      lowerCol.includes("status date") ||
      lowerCol.includes("עדכון סטטוס") ||
      lowerCol.includes("תאריך עדכון")
    ) {
      columnMap.statusDate = index;
      console.log(`Found status date column at index ${index}: ${col}`);
    } 
    // Scan Date / Created Date
    else if (
      lowerCol.includes("תאריך סריקה") ||
      lowerCol.includes("scan date") ||
      lowerCol.includes("נוצר") ||
      lowerCol.includes("תאריך יצירה") ||
      lowerCol.includes("date") ||
      lowerCol.includes("תאריך") ||
      lowerCol === "date scanned" ||
      lowerCol === "date"
    ) {
      columnMap.scanDate = index;
      console.log(`Found scan date column at index ${index}: ${col}`);
    } 
    // Assigned To / Courier
    else if (
      lowerCol.includes("שליח") ||
      lowerCol.includes("מחלק") ||
      lowerCol.includes("assigned") ||
      lowerCol.includes("courier") ||
      lowerCol.includes("driver") ||
      lowerCol.includes("delivery person")
    ) {
      columnMap.assignedTo = index;
      console.log(`Found assigned to column at index ${index}: ${col}`);
    }
  });

  // Log all available columns for debugging
  console.log("All columns in sheet:", columns);

  // If we couldn't find status date, use scan date as a fallback
  if (columnMap.statusDate === -1 && columnMap.scanDate !== -1) {
    columnMap.statusDate = columnMap.scanDate;
  }

  // If we couldn't find scan date, use status date as a fallback
  if (columnMap.scanDate === -1 && columnMap.statusDate !== -1) {
    columnMap.scanDate = columnMap.statusDate;
  }
  
  // Make a second pass to find any columns we couldn't identify that might be useful
  // This is helpful when column names don't exactly match our patterns
  
  // If we still couldn't find name and there's an unmapped column, look for likely customer name columns
  if (columnMap.name === -1) {
    for (let i = 0; i < columns.length; i++) {
      if (Object.values(columnMap).includes(i)) continue; // Skip already mapped columns
      
      const colValue = String(columns[i] || '').toLowerCase();
      // Look for columns that might contain customer names
      if (colValue.includes('customer') || colValue.includes('client') || 
          colValue.includes('לקוח') || colValue.includes('שם')) {
        columnMap.name = i;
        console.log(`Inferred customer name column at index ${i}: ${columns[i]}`);
        break;
      }
    }
  }
  
  // If we still couldn't find tracking number, try to find it in the first few columns
  if (columnMap.trackingNumber === -1) {
    for (let i = 0; i < Math.min(3, columns.length); i++) {
      if (Object.values(columnMap).includes(i)) continue; // Skip already mapped columns
      columnMap.trackingNumber = i;
      console.log(`Inferred tracking number column at index ${i}: ${columns[i]}`);
      break;
    }
  }

  // If we still couldn't find phone and there's an unmapped column with "phone" or similar in name
  if (columnMap.phone === -1) {
    for (let i = 0; i < columns.length; i++) {
      if (Object.values(columnMap).includes(i)) continue; // Skip already mapped columns
      // Look for numeric patterns typical of phone numbers
      const colValue = String(columns[i] || '').toLowerCase();
      if (colValue.includes('phone') || colValue.includes('mobile') || 
          colValue.includes('טלפון') || colValue.includes('נייד')) {
        columnMap.phone = i;
        console.log(`Inferred phone column at index ${i}: ${columns[i]}`);
        break;
      }
    }
  }

  // If we still couldn't find address
  if (columnMap.address === -1) {
    for (let i = 0; i < columns.length; i++) {
      if (Object.values(columnMap).includes(i)) continue; // Skip already mapped columns
      const colValue = String(columns[i] || '').toLowerCase();
      if (colValue.includes('address') || colValue.includes('location') || 
          colValue.includes('כתובת') || colValue.includes('מיקום')) {
        columnMap.address = i;
        console.log(`Inferred address column at index ${i}: ${columns[i]}`);
        break;
      }
    }
  }

  console.log("Final column mapping:", columnMap);
  return columnMap;
}
