
// Utility functions for column mapping

/**
 * Analyzes sheet columns and maps them to expected field names
 * This is a critical part of the functionality as it determines how data is interpreted
 */
export function analyzeColumns(columns: string[]): Record<string, number> {
  console.log("Analyzing columns:", columns);
  const columnMap: Record<string, number> = {};
  
  // First pass: exact keyword matching
  columns.forEach((col, index) => {
    const colLower = col.toLowerCase();
    
    // Tracking number detection - very important
    if (colLower.includes('track') || colLower.includes('מעקב') || colLower.includes('מספר הזמנה') || 
        colLower.includes('tm') || colLower.includes('gwd') || colLower.includes('סריאלי')) {
      columnMap.trackingNumber = index;
      console.log(`Found tracking number column at index ${index}: "${col}"`);
    }
    
    // Name detection
    else if ((colLower.includes('name') || colLower.includes('שם')) && 
             !colLower.includes('last') && !colLower.includes('user') && 
             !colLower.includes('משפחה')) {
      columnMap.name = index;
      console.log(`Found name column at index ${index}: "${col}"`);
    }
    
    // Address detection
    else if (colLower.includes('address') || colLower.includes('כתובת')) {
      columnMap.address = index;
      console.log(`Found address column at index ${index}: "${col}"`);
    }
    
    // City detection  
    else if (colLower.includes('city') || colLower.includes('עיר') || 
             colLower.includes('יישוב') || colLower.includes('ישוב')) {
      columnMap.city = index;
      console.log(`Found city column at index ${index}: "${col}"`);
    }
    
    // Phone detection
    else if (colLower.includes('phone') || colLower.includes('טלפון') || 
             colLower.includes('מספר טלפון') || colLower.includes('נייד')) {
      columnMap.phone = index;
      console.log(`Found phone column at index ${index}: "${col}"`);
    }
    
    // Status detection
    else if (colLower.includes('status') || colLower.includes('סטטוס') || 
             colLower.includes('מצב')) {
      columnMap.status = index;
      console.log(`Found status column at index ${index}: "${col}"`);
    }
    
    // Courier/assignee detection
    else if (colLower.includes('courier') || colLower.includes('שליח') || 
             colLower.includes('driver') || colLower.includes('נהג') || 
             colLower.includes('assigned')) {
      columnMap.assignedTo = index;
      console.log(`Found assigned_to column at index ${index}: "${col}"`);
    }
    
    // Date detection
    else if (colLower.includes('date') || colLower.includes('תאריך')) {
      // If already have a scan date, this might be status date
      if (columnMap.scanDate !== undefined) {
        columnMap.statusDate = index;
        console.log(`Found status date column at index ${index}: "${col}"`);
      } else {
        columnMap.scanDate = index;
        console.log(`Found scan date column at index ${index}: "${col}"`);
      }
    }
    
    // External ID detection
    else if (colLower.includes('external') || colLower.includes('id') || 
             colLower.includes('reference') || colLower.includes('חיצוני') || 
             colLower.includes('אסמכתא')) {
      columnMap.externalId = index;
      console.log(`Found external ID column at index ${index}: "${col}"`);
    }
  });
  
  // If critical columns aren't found, try position-based detection for common layouts
  if (columnMap.trackingNumber === undefined) {
    // In many sheets, tracking numbers are in the first few columns
    for (let i = 0; i < Math.min(3, columns.length); i++) {
      if (!Object.values(columnMap).includes(i)) {
        columnMap.trackingNumber = i;
        console.log(`Assigning tracking number to column ${i} by position`);
        break;
      }
    }
  }
  
  if (columnMap.name === undefined) {
    // Customer names are often in columns 3-6
    for (let i = 2; i < Math.min(6, columns.length); i++) {
      if (!Object.values(columnMap).includes(i)) {
        columnMap.name = i;
        console.log(`Assigning name to column ${i} by position`);
        break;
      }
    }
  }
  
  if (columnMap.address === undefined) {
    // Addresses are often in the middle columns
    for (let i = 3; i < Math.min(7, columns.length); i++) {
      if (!Object.values(columnMap).includes(i)) {
        columnMap.address = i;
        console.log(`Assigning address to column ${i} by position`);
        break;
      }
    }
  }
  
  if (columnMap.phone === undefined) {
    // Try to find phone by scanning for numbers that look like phone numbers
    for (let i = 0; i < columns.length; i++) {
      if (!Object.values(columnMap).includes(i)) {
        // Phone columns often have "phone" or "tel" in their headers
        const colLower = columns[i].toLowerCase();
        if (colLower.includes('phone') || colLower.includes('tel') || 
            colLower.includes('טלפון') || colLower.includes('נייד')) {
          columnMap.phone = i;
          console.log(`Found potential phone column by name at index ${i}: "${columns[i]}"`);
          break;
        }
      }
    }
    
    // If still not found, try columns 4-8 which often contain phone numbers
    if (columnMap.phone === undefined) {
      for (let i = 4; i < Math.min(8, columns.length); i++) {
        if (!Object.values(columnMap).includes(i)) {
          columnMap.phone = i;
          console.log(`Assigning phone to column ${i} by position`);
          break;
        }
      }
    }
  }
  
  // Print the final mapping for debugging
  console.log("Final column mapping:", columnMap);
  
  return columnMap;
}

/**
 * Gets a value from a row based on a field name and column mapping
 */
export function getValueByField(
  values: any[],
  fieldName: string,
  columnMap: Record<string, number>
): string {
  if (columnMap[fieldName] === undefined || values.length <= columnMap[fieldName]) {
    return '';
  }
  
  const value = values[columnMap[fieldName]];
  return value !== null && value !== undefined ? String(value).trim() : '';
}

/**
 * Helper function to find the index of a column by keyword, with fuzzy matching
 */
export function findColumnIndex(columns: string[], keywords: string[]): number {
  for (let i = 0; i < columns.length; i++) {
    const colLower = columns[i].toLowerCase();
    for (const keyword of keywords) {
      if (colLower.includes(keyword.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}
