
export interface Delivery {
  id: string;
  trackingNumber: string;
  scanDate: string;
  statusDate: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'failed' | 'returned' | string;
  name: string;
  phone: string;
  address: string;
  assignedTo?: string; // New field to support multiple delivery personnel
}
