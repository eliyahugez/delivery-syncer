
export interface Delivery {
  id: string;
  trackingNumber: string;
  scanDate: string;
  statusDate: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'failed' | 'returned' | string;
  name: string;
  phone: string;
  address: string;
  assignedTo: string; // שדה שמציין את השליח המטפל במשלוח
  
  // Fields for analytics and tracking
  deliveryNotes?: string;
  customerEmail?: string;
  estimatedDeliveryTime?: string;
  deliveryAttempts?: number;
  weight?: string;
  packageType?: string;
  priority?: 'low' | 'medium' | 'high';
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
  history?: {
    timestamp: string;
    status: string;
    note?: string;
    courier?: string;
  }[];
}

// Delivery status options with Hebrew translations
export const DELIVERY_STATUS_OPTIONS = {
  pending: "ממתין",
  in_progress: "בדרך", 
  delivered: "נמסר",
  failed: "נכשל",
  returned: "הוחזר"
};

// Define column detection signatures to help the AI identify column types
export interface ColumnSignature {
  name: string;
  patterns: RegExp[];
  keywords: string[];
  valueType: 'text' | 'number' | 'date' | 'mixed';
  minLength?: number;
  maxLength?: number;
  uniqueValues?: string[];
  examples?: string[];
}

// Column detection patterns
export const COLUMN_SIGNATURES: Record<string, ColumnSignature> = {
  trackingNumber: {
    name: 'מספר מעקב',
    patterns: [/^[A-Z0-9]{8,15}$/i, /^(GWD|TMU|IL|RR|LY|CX|EE|LP|ZA)[0-9]{6,13}$/i],
    keywords: ['tracking', 'מעקב', 'משלוח', 'מספר משלוח', 'מספר הזמנה', 'order'],
    valueType: 'mixed',
    minLength: 6,
    maxLength: 20,
    examples: ['IL123456789', 'ABCD12345678', 'RR123456789IL']
  },
  name: {
    name: 'שם',
    patterns: [/^[\p{L}\s'.,-]+$/u],
    keywords: ['name', 'שם', 'customer', 'לקוח', 'recipient', 'מקבל'],
    valueType: 'text',
    minLength: 3,
    maxLength: 50,
    examples: ['ישראל ישראלי', 'John Doe']
  },
  phone: {
    name: 'טלפון',
    patterns: [
      /^\+?\d{8,15}$/, 
      /^\d{2,4}[- ]?\d{3}[- ]?\d{4}$/, 
      /^0\d{1,2}[- ]?\d{7,8}$/, 
      /^05\d[- ]?\d{7}$/, 
      /^\+?972[- ]?\d{8,9}$/
    ],
    keywords: ['phone', 'טלפון', 'נייד', 'mobile', 'cell', 'tel'],
    valueType: 'number',
    examples: ['0501234567', '972501234567', '+972-50-1234567']
  },
  address: {
    name: 'כתובת',
    patterns: [/\d+\s+[a-zA-Z\u0590-\u05FF]/],
    keywords: [
      'address', 'כתובת', 'street', 'רחוב', 'city', 'עיר', 
      'location', 'מיקום', 'דירה', 'בית', 'שכונה'
    ],
    valueType: 'text',
    minLength: 10,
    examples: ['רחוב הרצל 10, תל אביב', 'שדרות רוטשילד 15 דירה 3']
  },
  status: {
    name: 'סטטוס',
    patterns: [],
    keywords: [
      'status', 'סטטוס', 'מצב', 'state', 'condition', 
      'delivered', 'נמסר', 'pending', 'ממתין', 'in progress', 'בדרך'
    ],
    valueType: 'text',
    uniqueValues: ['pending', 'in_progress', 'delivered', 'failed', 'returned'],
    examples: ['נמסר', 'ממתין', 'בדרך', 'הוחזר']
  },
  assignedTo: {
    name: 'שיוך לשליח',
    patterns: [],
    keywords: [
      'courier', 'שליח', 'driver', 'נהג', 'assigned', 
      'delivery person', 'מחלק', 'מוביל'
    ],
    valueType: 'text',
    examples: ['שליח 1', 'נהג אזור מרכז', 'משה']
  },
  scanDate: {
    name: 'תאריך סריקה',
    patterns: [
      /\d{1,4}[-\/.]\d{1,2}[-\/.]\d{1,4}/, 
      /\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}/
    ],
    keywords: [
      'scan date', 'תאריך סריקה', 'date scanned', 'תאריך', 
      'created date', 'תאריך יצירה'
    ],
    valueType: 'date',
    examples: ['2023-10-15', '15/10/2023', '10.15.2023']
  },
  weight: {
    name: 'משקל',
    patterns: [/^\d+(\.\d+)?\s*(kg|g|KG|גרם|ק"ג)?$/],
    keywords: ['weight', 'משקל', 'kg', 'ק"ג', 'גרם'],
    valueType: 'mixed',
    examples: ['1.5 kg', '500 גרם', '2 ק"ג']
  },
  customerEmail: {
    name: 'אימייל',
    patterns: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/],
    keywords: ['email', 'אימייל', 'mail', 'דוא"ל'],
    valueType: 'text',
    examples: ['user@example.com', 'israel@gmail.com']
  }
};
