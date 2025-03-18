
import { Delivery } from '@/types/delivery';

// Function to parse Google Sheets URL and get spreadsheet ID
export const getSpreadsheetIdFromUrl = (url: string): string => {
  try {
    const regex = /\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : '';
  } catch (error) {
    console.error('Error parsing spreadsheet ID:', error);
    throw new Error('Invalid Google Sheets URL');
  }
};

// Function to convert Google Sheets URL to a public CSV export URL
export const getCSVExportUrl = (spreadsheetId: string, sheetId = 0): string => {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;
};

// Function to fetch deliveries from Google Sheets
export const fetchDeliveriesFromSheets = async (sheetsUrl: string): Promise<Delivery[]> => {
  try {
    const spreadsheetId = getSpreadsheetIdFromUrl(sheetsUrl);
    if (!spreadsheetId) {
      throw new Error('Invalid Google Sheets URL');
    }

    const csvUrl = getCSVExportUrl(spreadsheetId);
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch data from Google Sheets');
    }
    
    const csvText = await response.text();
    return parseCSVToDeliveries(csvText);
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
};

// Function to parse CSV data to Delivery objects
export const parseCSVToDeliveries = (csvText: string): Delivery[] => {
  const lines = csvText.split('\n');
  if (lines.length <= 1) {
    return [];
  }
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Map header indices
  const headerMap = {
    id: headers.findIndex(h => h.includes('מזהה') || h.includes('ID') || h.includes('id')),
    trackingNumber: headers.findIndex(h => h.includes('מספר מעקב') || h.includes('tracking')),
    scanDate: headers.findIndex(h => h.includes('תאריך סריקה') || h.includes('scan date')),
    statusDate: headers.findIndex(h => h.includes('תאריך סטטוס') || h.includes('status date')),
    status: headers.findIndex(h => h.includes('סטטוס') || h.includes('status')),
    name: headers.findIndex(h => h.includes('שם') || h.includes('name')),
    phone: headers.findIndex(h => h.includes('טלפון') || h.includes('phone')),
    address: headers.findIndex(h => h.includes('כתובת') || h.includes('address')),
  };
  
  // Parse data rows
  return lines.slice(1)
    .filter(line => line.trim().length > 0)
    .map((line, index) => {
      const values = parseCSVLine(line);
      
      // Create a unique ID if none exists
      const id = headerMap.id >= 0 && values[headerMap.id] 
        ? values[headerMap.id] 
        : `delivery-${index}`;
      
      return {
        id,
        trackingNumber: headerMap.trackingNumber >= 0 ? values[headerMap.trackingNumber] : '',
        scanDate: headerMap.scanDate >= 0 ? values[headerMap.scanDate] : '',
        statusDate: headerMap.statusDate >= 0 ? values[headerMap.statusDate] : '',
        status: headerMap.status >= 0 ? values[headerMap.status] : 'pending',
        name: headerMap.name >= 0 ? values[headerMap.name] : '',
        phone: headerMap.phone >= 0 ? values[headerMap.phone] : '',
        address: headerMap.address >= 0 ? values[headerMap.address] : '',
      };
    });
};

// Helper function to parse CSV line while handling quoted fields
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
};

// Function to update a delivery status in Google Sheets (this is a mock function)
// In a real implementation, you would use Google Sheets API or Apps Script
export const updateDeliveryStatus = async (
  sheetsUrl: string, 
  deliveryId: string, 
  newStatus: string
): Promise<void> => {
  // This is a mock function that simulates updating Google Sheets
  // In a real implementation, you would use Google Sheets API or a backend service
  console.log(`Updating delivery ${deliveryId} to status ${newStatus} in sheet ${sheetsUrl}`);
  
  // In a real application, you would:
  // 1. Use Google Sheets API with authentication
  // 2. Find the row for the delivery
  // 3. Update the status column
  // 4. Handle any errors
  
  // For this demo, we'll just wait a moment to simulate the API call
  return new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
};
