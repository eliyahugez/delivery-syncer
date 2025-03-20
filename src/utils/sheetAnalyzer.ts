
import { COLUMN_SIGNATURES, ColumnSignature } from "@/types/delivery";

/**
 * Enhanced column analyzer with machine learning capabilities
 * Analyzes CSV/Sheets data to automatically detect column types
 */
export interface AnalysisResult {
  columnMappings: Record<string, string>;
  confidence: Record<string, number>;
  unmappedColumns: string[];
  detectedFormat: string;
}

export interface ColumnData {
  name: string;
  samples: any[];
  uniqueValues: Set<string>;
  patterns: Record<string, number>;
}

// Storage key for saved column mappings history
const MAPPING_HISTORY_KEY = 'delivery_column_mapping_history';

/**
 * Analyze column data and determine the most likely column mapping
 */
export function analyzeColumns(
  headers: string[], 
  rowSamples: any[][], 
  previousMappings?: Record<string, string>
): AnalysisResult {
  console.log("Analyzing columns with enhanced algorithm...");
  console.log("Headers:", headers);
  console.log("Sample data rows:", rowSamples.length);
  
  // Extract column data for analysis
  const columnData: Record<string, ColumnData> = {};
  
  // Initialize column data structures
  headers.forEach((header, index) => {
    columnData[header] = {
      name: header,
      samples: rowSamples.map(row => row[index]).filter(Boolean),
      uniqueValues: new Set(),
      patterns: {}
    };
    
    // Collect samples and analyze patterns
    rowSamples.forEach(row => {
      const value = row[index];
      if (value) {
        columnData[header].uniqueValues.add(String(value));
        
        // Detect patterns in data
        detectPatterns(columnData[header], value);
      }
    });
  });
  
  // Load mapping history from localStorage
  const mappingHistory = loadMappingHistory();
  
  // Perform first-pass analysis
  const firstPassMapping = performFirstPassAnalysis(columnData);
  
  // Apply previous mappings and history to improve results
  const enhancedMapping = enhanceMappingWithHistory(
    firstPassMapping,
    previousMappings,
    mappingHistory,
    headers
  );
  
  // Validate mappings and calculate confidence
  const {
    validatedMappings,
    confidence,
    unmappedColumns
  } = validateAndCalculateConfidence(enhancedMapping, columnData);
  
  // Determine the most likely format based on mappings
  const detectedFormat = determineDataFormat(validatedMappings, columnData);
  
  // Save the new mapping to history
  saveMappingToHistory(validatedMappings);
  
  return {
    columnMappings: validatedMappings,
    confidence,
    unmappedColumns,
    detectedFormat
  };
}

/**
 * Detect patterns in column data values
 */
function detectPatterns(columnData: ColumnData, value: any): void {
  const strValue = String(value);
  
  // Check for phone number patterns
  if (/^0\d{8,9}$/.test(strValue.replace(/[\s-]/g, ''))) {
    incrementPattern(columnData, 'phone');
  }
  
  // Check for Israeli tracking number patterns
  if (/^[A-Z]{2}\d{9}IL$/i.test(strValue) || /^IL\d{10,12}$/.test(strValue)) {
    incrementPattern(columnData, 'tracking');
  }
  
  // Check for address patterns
  if (/\d+\s+[\u0590-\u05FF\w\s.,'-]+/.test(strValue) && strValue.length > 10) {
    incrementPattern(columnData, 'address');
  }
  
  // Check for name patterns (Hebrew or English)
  if (/^[\u0590-\u05FF\s',.-]{3,30}$/.test(strValue) || /^[A-Za-z\s',.-]{3,30}$/.test(strValue)) {
    incrementPattern(columnData, 'name');
  }
  
  // Check for status keywords
  const statusKeywords = ['ממתין', 'נמסר', 'בדרך', 'pending', 'delivered', 'in progress'];
  if (statusKeywords.some(keyword => strValue.includes(keyword))) {
    incrementPattern(columnData, 'status');
  }
  
  // Check for date patterns
  if (/\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(strValue) || !isNaN(Date.parse(strValue))) {
    incrementPattern(columnData, 'date');
  }
}

/**
 * Increment pattern count for a column
 */
function incrementPattern(columnData: ColumnData, pattern: string): void {
  columnData.patterns[pattern] = (columnData.patterns[pattern] || 0) + 1;
}

/**
 * Perform first-pass analysis based on column data
 */
function performFirstPassAnalysis(columnData: Record<string, ColumnData>): Record<string, string> {
  const result: Record<string, string> = {};
  const requiredColumns = ['trackingNumber', 'name', 'address', 'phone', 'status'];
  const columnScores: Record<string, Record<string, number>> = {};
  
  // Calculate scores for each column against each required type
  Object.entries(columnData).forEach(([header, data]) => {
    columnScores[header] = {};
    
    // Check header name matches
    requiredColumns.forEach(requiredCol => {
      columnScores[header][requiredCol] = calculateColumnScore(data, requiredCol);
    });
  });
  
  // Assign columns based on highest scores
  requiredColumns.forEach(requiredCol => {
    let bestHeader = '';
    let bestScore = 0;
    
    Object.entries(columnScores).forEach(([header, scores]) => {
      // Skip headers already assigned
      if (Object.values(result).includes(header)) return;
      
      if (scores[requiredCol] > bestScore) {
        bestScore = scores[requiredCol];
        bestHeader = header;
      }
    });
    
    if (bestHeader && bestScore > 10) {
      result[requiredCol] = bestHeader;
    }
  });
  
  return result;
}

/**
 * Calculate score for a column against a required field type
 */
function calculateColumnScore(data: ColumnData, fieldType: string): number {
  let score = 0;
  const headerLower = data.name.toLowerCase();
  
  // Score based on column name
  const headerMatches: Record<string, string[]> = {
    trackingNumber: ['tracking', 'מעקב', 'משלוח', 'מספר', 'shipment', 'order', 'id'],
    name: ['name', 'שם', 'לקוח', 'customer'],
    address: ['address', 'כתובת', 'location', 'מיקום'],
    phone: ['phone', 'טלפון', 'נייד', 'mobile'],
    status: ['status', 'סטטוס', 'מצב', 'state']
  };
  
  if (headerMatches[fieldType]) {
    headerMatches[fieldType].forEach(match => {
      if (headerLower.includes(match)) {
        score += 50;
      }
    });
  }
  
  // Score based on patterns detected in data
  const patternMatches: Record<string, string[]> = {
    trackingNumber: ['tracking'],
    name: ['name'],
    address: ['address'],
    phone: ['phone'],
    status: ['status']
  };
  
  if (patternMatches[fieldType]) {
    patternMatches[fieldType].forEach(pattern => {
      score += (data.patterns[pattern] || 0) * 2;
    });
  }
  
  // Score based on unique values count (e.g., status should have few unique values)
  if (fieldType === 'status' && data.uniqueValues.size < 10) {
    score += 20;
  }
  
  // Score based on average value length
  if (fieldType === 'address' && calculateAvgLength(data) > 15) {
    score += 20;
  }
  
  if (fieldType === 'name' && calculateAvgLength(data) > 3 && calculateAvgLength(data) < 30) {
    score += 15;
  }
  
  return score;
}

/**
 * Calculate average length of values in column data
 */
function calculateAvgLength(data: ColumnData): number {
  if (data.samples.length === 0) return 0;
  
  const totalLength = data.samples.reduce((sum, value) => 
    sum + String(value).length, 0);
    
  return totalLength / data.samples.length;
}

/**
 * Enhance mapping with previously saved mappings
 */
function enhanceMappingWithHistory(
  currentMapping: Record<string, string>,
  previousMappings?: Record<string, string>,
  mappingHistory?: Record<string, string>[],
  headers?: string[]
): Record<string, string> {
  const result = { ...currentMapping };
  
  // Apply previous mapping if we have one and if headers match
  if (previousMappings && headers) {
    const previousHeaders = Object.values(previousMappings);
    const headerOverlap = previousHeaders.filter(h => headers.includes(h)).length;
    
    // If we have significant overlap, apply previous mappings
    if (headerOverlap > previousHeaders.length * 0.5) {
      Object.entries(previousMappings).forEach(([key, header]) => {
        if (headers.includes(header) && !Object.values(result).includes(header)) {
          result[key] = header;
        }
      });
    }
  }
  
  // Apply history-based mapping if available
  if (mappingHistory && mappingHistory.length > 0 && headers) {
    // Find unmapped keys
    const unmappedKeys = ['trackingNumber', 'name', 'address', 'phone', 'status']
      .filter(key => !result[key]);
      
    // Try to fill in gaps from history
    unmappedKeys.forEach(key => {
      const historicalHeaders = mappingHistory
        .map(mapping => mapping[key])
        .filter(Boolean);
        
      // Find the most common historical header that exists in current headers
      const headerCounts: Record<string, number> = {};
      historicalHeaders.forEach(header => {
        if (headers.includes(header)) {
          headerCounts[header] = (headerCounts[header] || 0) + 1;
        }
      });
      
      // Get header with highest count
      const bestHeader = Object.entries(headerCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .map(([header]) => header)[0];
        
      if (bestHeader && !Object.values(result).includes(bestHeader)) {
        result[key] = bestHeader;
      }
    });
  }
  
  return result;
}

/**
 * Validate mappings and calculate confidence scores
 */
function validateAndCalculateConfidence(
  mappings: Record<string, string>,
  columnData: Record<string, ColumnData>
): {
  validatedMappings: Record<string, string>;
  confidence: Record<string, number>;
  unmappedColumns: string[];
} {
  const validatedMappings: Record<string, string> = {};
  const confidence: Record<string, number> = {};
  const requiredFields = ['trackingNumber', 'name', 'address', 'phone', 'status'];
  
  // Validate each mapping
  Object.entries(mappings).forEach(([key, header]) => {
    if (columnData[header]) {
      validatedMappings[key] = header;
      
      // Calculate confidence based on pattern matches and header name
      const data = columnData[header];
      const patternMatchCount = data.patterns[key.toLowerCase()] || 0;
      const sampleCount = data.samples.length;
      
      // Calculate confidence percentage
      confidence[key] = Math.min(100, 
        ((patternMatchCount / Math.max(1, sampleCount)) * 100) + 
        (headerMatchScore(header, key) * 25));
    }
  });
  
  // Identify unmapped required columns
  const unmappedColumns = requiredFields.filter(field => !validatedMappings[field]);
  
  return {
    validatedMappings,
    confidence,
    unmappedColumns
  };
}

/**
 * Calculate a score for how well a header name matches a field type
 */
function headerMatchScore(header: string, fieldType: string): number {
  const headerLower = header.toLowerCase();
  const fieldMatches: Record<string, string[]> = {
    trackingNumber: ['tracking', 'מעקב', 'משלוח', 'מספר', 'shipment', 'order', 'id'],
    name: ['name', 'שם', 'לקוח', 'customer'],
    address: ['address', 'כתובת', 'location', 'מיקום'],
    phone: ['phone', 'טלפון', 'נייד', 'mobile'],
    status: ['status', 'סטטוס', 'מצב', 'state']
  };
  
  if (!fieldMatches[fieldType]) return 0;
  
  // Check if any match strings are in the header
  const matchScore = fieldMatches[fieldType].some(match => 
    headerLower.includes(match)) ? 1 : 0;
    
  return matchScore;
}

/**
 * Determine the likely format of the imported data
 */
function determineDataFormat(
  mappings: Record<string, string>,
  columnData: Record<string, ColumnData>
): string {
  const requiredFields = ['trackingNumber', 'name', 'address'];
  const hasMostRequiredFields = requiredFields.every(field => mappings[field]);
  
  if (!hasMostRequiredFields) {
    return 'unknown';
  }
  
  // Check for specific format signatures
  const headerSet = new Set(Object.values(mappings));
  
  // Check for Israel Post format
  if (
    headerSet.size >= 4 &&
    mappings.trackingNumber && 
    columnData[mappings.trackingNumber].samples.some(
      val => /^[A-Z]{2}\d{9}IL$/i.test(String(val)) || /^IL\d{10,12}$/.test(String(val))
    )
  ) {
    return 'israel_post';
  }
  
  // Check for other courier formats
  // ...
  
  // Default to generic delivery format
  return 'generic_delivery';
}

/**
 * Load mapping history from localStorage
 */
function loadMappingHistory(): Record<string, string>[] {
  try {
    const historyJson = localStorage.getItem(MAPPING_HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
  } catch (error) {
    console.error('Error loading mapping history:', error);
  }
  
  return [];
}

/**
 * Save mapping to history in localStorage
 */
function saveMappingToHistory(mapping: Record<string, string>): void {
  try {
    // Only save if we have at least 3 mapped fields
    if (Object.keys(mapping).length < 3) return;
    
    const history = loadMappingHistory();
    
    // Add new mapping to history (limit to last 5)
    history.unshift(mapping);
    if (history.length > 5) {
      history.pop();
    }
    
    localStorage.setItem(MAPPING_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving mapping history:', error);
  }
}

/**
 * Normalize and clean data based on detected column types
 */
export function normalizeSheetData(
  data: any[][],
  headers: string[],
  mappings: Record<string, string>
): any[] {
  return data.map(row => {
    const normalizedRow: Record<string, any> = {};
    
    // Map each column based on detected mappings
    Object.entries(mappings).forEach(([field, header]) => {
      const columnIndex = headers.indexOf(header);
      if (columnIndex !== -1) {
        const value = row[columnIndex];
        
        // Normalize based on field type
        normalizedRow[field] = normalizeFieldValue(field, value);
      }
    });
    
    return normalizedRow;
  });
}

/**
 * Normalize a field value based on its type
 */
function normalizeFieldValue(fieldType: string, value: any): any {
  if (value === undefined || value === null) return '';
  
  const strValue = String(value).trim();
  
  switch (fieldType) {
    case 'trackingNumber':
      // Normalize tracking number format
      return strValue.replace(/\s/g, '').toUpperCase();
      
    case 'phone':
      // Normalize phone number format
      return normalizePhoneNumber(strValue);
      
    case 'address':
      // Normalize address format
      return normalizeAddress(strValue);
      
    case 'status':
      // Normalize status values
      return normalizeStatus(strValue);
      
    default:
      return strValue;
  }
}

/**
 * Normalize phone number to standard format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Handle Israeli phone numbers
  if (digitsOnly.length === 10 && digitsOnly.startsWith('05')) {
    // Format as 05X-XXX-XXXX
    return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  }
  
  if (digitsOnly.length === 9 && digitsOnly.startsWith('5')) {
    // Add leading 0 to Israeli mobile numbers
    return `0${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 5)}-${digitsOnly.slice(5)}`;
  }
  
  // If starts with +972, convert to Israeli format
  if (digitsOnly.startsWith('972') && digitsOnly.length >= 11) {
    const withoutCountryCode = digitsOnly.slice(3);
    const withLeadingZero = '0' + withoutCountryCode;
    
    if (withLeadingZero.length === 10) {
      return `${withLeadingZero.slice(0, 3)}-${withLeadingZero.slice(3, 6)}-${withLeadingZero.slice(6)}`;
    }
  }
  
  // For other numbers, just group digits
  if (digitsOnly.length >= 10) {
    return digitsOnly.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  return phone; // Return original if no normalization was possible
}

/**
 * Normalize address format
 */
function normalizeAddress(address: string): string {
  // Remove extra spaces
  let normalized = address.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter of each word for readable display
  normalized = normalized.replace(/\b\w/g, l => l.toUpperCase());
  
  return normalized;
}

/**
 * Normalize status values to standard set
 */
function normalizeStatus(status: string): string {
  const statusLower = status.toLowerCase();
  
  // Map common status terms to standardized values
  if (
    statusLower.includes('delivered') ||
    statusLower.includes('נמסר') ||
    statusLower.includes('completed') ||
    statusLower.includes('הושלם')
  ) {
    return 'delivered';
  }
  
  if (
    statusLower.includes('pending') ||
    statusLower.includes('ממתין') ||
    statusLower.includes('waiting') ||
    statusLower.includes('new') ||
    statusLower.includes('חדש')
  ) {
    return 'pending';
  }
  
  if (
    statusLower.includes('progress') ||
    statusLower.includes('בדרך') ||
    statusLower.includes('out for delivery') ||
    statusLower.includes('בדרך למסירה') ||
    statusLower.includes('בתהליך')
  ) {
    return 'in_progress';
  }
  
  if (
    statusLower.includes('failed') ||
    statusLower.includes('נכשל') ||
    statusLower.includes('customer not answer') ||
    statusLower.includes('לקוח לא ענה') ||
    statusLower.includes('problem') ||
    statusLower.includes('בעיה')
  ) {
    return 'failed';
  }
  
  if (
    statusLower.includes('return') ||
    statusLower.includes('חבילה חזרה') ||
    statusLower.includes('החזרה') ||
    statusLower.includes('הוחזר')
  ) {
    return 'returned';
  }
  
  return status; // Return original if no match
}

/**
 * Group deliveries by customer name
 */
export function groupDeliveriesByCustomer(deliveries: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  deliveries.forEach(delivery => {
    const customerName = delivery.name || 'Unknown';
    
    if (!groups[customerName]) {
      groups[customerName] = [];
    }
    
    groups[customerName].push(delivery);
  });
  
  return groups;
}

/**
 * Generate ID for deliveries if missing
 */
export function generateDeliveryIds(deliveries: any[]): any[] {
  return deliveries.map((delivery, index) => {
    if (!delivery.id) {
      const trackingNumber = delivery.trackingNumber || `unknown-${index}`;
      delivery.id = `${trackingNumber}-${index}`;
    }
    return delivery;
  });
}
