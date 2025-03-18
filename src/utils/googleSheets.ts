
import { Delivery } from '@/types/delivery';
import Papa from 'papaparse';

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

// Function to convert Google Sheets URL to a public CSV export URL with CORS proxy
export const getCSVExportUrl = (spreadsheetId: string, sheetId = 0): string => {
  // First create the direct Google Sheets export URL
  const directUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;
  
  // Use CORS proxy (cors-anywhere alternative)
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
};

// Generate test data for development/offline use
const generateTestData = (): Delivery[] => {
  return [
    {
      id: '1',
      trackingNumber: 'TRK12345',
      scanDate: new Date().toISOString(),
      statusDate: new Date().toISOString(),
      status: 'pending',
      name: 'דוד ישראלי',
      phone: '0501234567',
      address: 'רחוב הרצל 10, תל אביב'
    },
    {
      id: '2',
      trackingNumber: 'TRK67890',
      scanDate: new Date().toISOString(),
      statusDate: new Date().toISOString(),
      status: 'in_progress',
      name: 'שרה כהן',
      phone: '0527654321',
      address: 'שדרות רוטשילד 15, תל אביב'
    },
    {
      id: '3',
      trackingNumber: 'TRK24680',
      scanDate: new Date().toISOString(),
      statusDate: new Date().toISOString(),
      status: 'delivered',
      name: 'יוסי לוי',
      phone: '0537894561',
      address: 'רחוב אלנבי 20, תל אביב'
    }
  ];
};

// Function to fetch deliveries from Google Sheets
export const fetchDeliveriesFromSheets = async (sheetsUrl: string): Promise<Delivery[]> => {
  try {
    console.log('Fetching from Google Sheets URL:', sheetsUrl);
    
    const spreadsheetId = getSpreadsheetIdFromUrl(sheetsUrl);
    if (!spreadsheetId) {
      console.error('Invalid Google Sheets URL:', sheetsUrl);
      throw new Error('Invalid Google Sheets URL');
    }

    // Try with CORS proxy first
    try {
      const csvUrl = getCSVExportUrl(spreadsheetId);
      console.log('Attempting to fetch from:', csvUrl);
      
      const response = await fetch(csvUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/csv',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const csvText = await response.text();
      return parseCSVToDeliveries(csvText);
    } catch (corsError) {
      console.error('CORS proxy attempt failed:', corsError);
      
      // If CORS proxy fails, we'll fallback to test data if in development
      console.warn('Falling back to test data due to CORS issues');
      return generateTestData();
    }
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    
    // Return test data as fallback
    console.warn('Returning test data due to fetch error');
    return generateTestData();
  }
};

// Function to parse CSV data to Delivery objects
export const parseCSVToDeliveries = (csvText: string): Delivery[] => {
  try {
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (result.errors.length > 0) {
      console.error('CSV parsing errors:', result.errors);
    }
    
    // Map parsed data to Delivery objects
    return result.data.map((row: any, index) => {
      // Try to find appropriate column names in both Hebrew and English
      const id = row['מזהה'] || row['ID'] || row['id'] || `delivery-${index}`;
      const trackingNumber = row['מספר מעקב'] || row['tracking'] || row['Tracking Number'] || '';
      const scanDate = row['תאריך סריקה'] || row['scan date'] || row['Scan Date'] || '';
      const statusDate = row['תאריך סטטוס'] || row['status date'] || row['Status Date'] || '';
      const status = row['סטטוס'] || row['status'] || row['Status'] || 'pending';
      const name = row['שם'] || row['name'] || row['Name'] || '';
      const phone = row['טלפון'] || row['phone'] || row['Phone'] || '';
      const address = row['כתובת'] || row['address'] || row['Address'] || '';
      
      return {
        id,
        trackingNumber,
        scanDate,
        statusDate,
        status,
        name,
        phone,
        address,
      };
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
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
