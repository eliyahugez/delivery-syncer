
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
  
  // Use multiple CORS proxies for fallback
  const corsProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(directUrl)}`,
    `https://cors-anywhere.herokuapp.com/${directUrl}`
  ];
  
  // Return the first proxy in the list (we'll try them in sequence if needed)
  return corsProxies[0];
};

// Generate test data for development/offline use
const generateTestData = (): Delivery[] => {
  return [
    {
      id: '1',
      trackingNumber: 'GWD003912139',
      scanDate: new Date().toISOString(),
      statusDate: new Date().toISOString(),
      status: 'delivered',
      name: 'Caroline Spector',
      phone: '972528301402',
      address: 'D. N. Lev Hashomron-Maale Shomron 48'
    },
    {
      id: '2',
      trackingNumber: 'GWD003903250',
      scanDate: new Date().toISOString(),
      statusDate: new Date().toISOString(),
      status: 'delivered',
      name: 'Aryeh Feigin',
      phone: '972544820544',
      address: 'Maale Shomron-18 Arnon Street'
    },
    {
      id: '3',
      trackingNumber: 'TMU003444926',
      scanDate: new Date().toISOString(),
      statusDate: new Date().toISOString(),
      status: 'pending',
      name: 'אירנה רביץ',
      phone: '545772273',
      address: 'Karnei Shomron-יעלים 5 מעלה שומרון'
    }
  ];
};

// Function to fetch deliveries from Google Sheets
export const fetchDeliveriesFromSheets = async (sheetsUrl: string): Promise<{ deliveries: Delivery[], isTestData: boolean }> => {
  try {
    console.log('Fetching from Google Sheets URL:', sheetsUrl);
    
    const spreadsheetId = getSpreadsheetIdFromUrl(sheetsUrl);
    if (!spreadsheetId) {
      console.error('Invalid Google Sheets URL:', sheetsUrl);
      throw new Error('Invalid Google Sheets URL');
    }

    // Try with CORS proxy
    let csvText: string | null = null;
    let proxyIndex = 0;
    const corsProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`)}`,
      `https://cors-anywhere.herokuapp.com/https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
    ];
    
    while (proxyIndex < corsProxies.length && !csvText) {
      const corsUrl = corsProxies[proxyIndex];
      try {
        console.log(`Attempting to fetch from proxy ${proxyIndex + 1}:`, corsUrl);
        
        const response = await fetch(corsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'text/csv',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        csvText = await response.text();
        console.log('Successfully fetched CSV data');
        
        // Quick validation to ensure it's actually CSV data
        if (!csvText.includes(',') || csvText.includes('<!DOCTYPE html>')) {
          console.log('Received HTML instead of CSV, trying next proxy');
          csvText = null;
          proxyIndex++;
        }
      } catch (err) {
        console.error(`Proxy ${proxyIndex + 1} attempt failed:`, err);
        proxyIndex++;
      }
    }
    
    if (csvText) {
      const parsedDeliveries = parseCSVToDeliveries(csvText);
      return { deliveries: parsedDeliveries, isTestData: false };
    }
    
    // If all proxies fail, fallback to test data
    console.warn('All proxies failed, falling back to test data');
    return { deliveries: generateTestData(), isTestData: true };
    
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    
    // Return test data as fallback
    console.warn('Returning test data due to fetch error');
    return { deliveries: generateTestData(), isTestData: true };
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
      // Handle various column names for flexibility
      const trackingField = findField(row, ['Tracking', 'trackingNumber', 'מספר מעקב', 'tracking']);
      const scanDateField = findField(row, ['Date Scanned', 'scanDate', 'תאריך סריקה', 'scan date']);
      const statusDateField = findField(row, ['Status date', 'statusDate', 'תאריך סטטוס', 'status date']);
      const statusField = findField(row, ['Status', 'status', 'סטטוס']);
      const nameField = findField(row, ['Name', 'name', 'שם']);
      const phoneField = findField(row, ['Phone Number', 'phone', 'טלפון', 'Phone']);
      const addressField = findField(row, ['Address', 'address', 'כתובת']);
      
      const trackingNumber = row[trackingField] || `delivery-${index}`;
      const scanDate = row[scanDateField] || new Date().toISOString();
      const statusDate = row[statusDateField] || new Date().toISOString();
      let status = row[statusField] || 'pending';
      const name = row[nameField] || '';
      const phone = row[phoneField] || '';
      const address = row[addressField] || '';
      
      // Map Hebrew/English status text to our standard statuses
      status = normalizeStatus(status);
      
      return {
        id: index.toString(),
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

// Helper function to find a matching field in the row
const findField = (row: any, possibleNames: string[]): string => {
  for (const name of possibleNames) {
    if (row.hasOwnProperty(name)) {
      return name;
    }
  }
  
  // Try case-insensitive match as fallback
  const rowKeys = Object.keys(row);
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const match = rowKeys.find(key => key.toLowerCase() === lowerName);
    if (match) {
      return match;
    }
  }
  
  return '';
};

// Helper function to normalize status values
const normalizeStatus = (status: string): string => {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('delivered') || statusLower.includes('נמסר')) {
    return 'delivered';
  }
  if (statusLower.includes('pending') || statusLower.includes('ממתין')) {
    return 'pending';
  }
  if (statusLower.includes('in_progress') || statusLower.includes('בדרך') || statusLower.includes('out for delivery') || statusLower.includes('בדרך למסירה')) {
    return 'in_progress';
  }
  if (statusLower.includes('failed') || statusLower.includes('נכשל') || statusLower.includes('customer not answer') || statusLower.includes('לקוח לא ענה')) {
    return 'failed';
  }
  if (statusLower.includes('return') || statusLower.includes('חבילה חזרה')) {
    return 'returned';
  }
  
  return 'pending';
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
