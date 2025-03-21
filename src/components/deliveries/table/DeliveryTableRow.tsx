
import React from 'react';
import { Button } from '@/components/ui/button';
import { Delivery } from '@/types/delivery';
import DeliveryStatusBadge from '../DeliveryStatusBadge';
import { TableCell, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Phone, MessageSquare, Navigation, Package, MapPin, User } from 'lucide-react';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';

interface DeliveryTableRowProps {
  customerName: string;
  customerDeliveries: Delivery[];
  isCustomerExpanded: boolean;
  toggleCustomer: (name: string) => void;
  handleWhatsApp: (phone: string) => void;
  handleNavigation: (address: string) => void;
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
  statusOptions: DeliveryStatusOption[];
}

const DeliveryTableRow = ({
  customerName,
  customerDeliveries,
  isCustomerExpanded,
  toggleCustomer,
  handleWhatsApp,
  handleNavigation,
  onUpdateStatus,
  statusOptions
}: DeliveryTableRowProps) => {
  const hasMultipleDeliveries = customerDeliveries.length > 1;
  const delivery = customerDeliveries[0]; // First delivery for this customer
  
  // Get a clean display name (removing AUTO- prefix if present)
  const displayName = customerName.startsWith("לקוח AUTO-") 
    ? customerName.replace("לקוח AUTO-", "משלוח אוטומטי ") 
    : customerName;
    
  // Extract a clean phone number (if not containing status information)
  const phoneNumber = delivery.phone && 
                      !delivery.phone.toLowerCase().includes('delivered') && 
                      !delivery.phone.toLowerCase().includes('נמסר') &&
                      !delivery.phone.toLowerCase().includes('status') 
                      ? delivery.phone : '';

  return (
    <React.Fragment>
      <TableRow 
        className={`hover:bg-muted/20 cursor-pointer ${hasMultipleDeliveries ? 'font-semibold' : ''}`}
        onClick={() => toggleCustomer(customerName)}
      >
        <TableCell className="p-2">
          <div className="flex space-x-1 rtl:space-x-reverse">
            {hasMultipleDeliveries && (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isCustomerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </TableCell>
        <TableCell className="p-3">
          <div className="flex flex-col">
            <div className="font-bold text-base flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> 
              {displayName}
            </div>
            
            {phoneNumber && <PhoneNumberActions 
              phoneNumber={phoneNumber} 
              handleWhatsApp={handleWhatsApp} 
            />}
            
            <AddressDisplay 
              address={delivery.address} 
              handleNavigation={handleNavigation} 
            />
            
            <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              מספר מעקב: {delivery.trackingNumber}
            </div>
            
            {hasMultipleDeliveries && (
              <div className="mt-1 bg-blue-50 p-1 rounded-sm text-xs text-blue-700">
                {customerDeliveries.length} משלוחים
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="p-3">
          <StatusActions 
            delivery={delivery} 
            statusOptions={statusOptions}
            onUpdateStatus={(status) => onUpdateStatus(
              delivery.id, 
              status,
              hasMultipleDeliveries ? "batch" : "single"
            )}
          />
        </TableCell>
      </TableRow>

      {isCustomerExpanded && hasMultipleDeliveries && 
        customerDeliveries.slice(1).map(delivery => (
          <ExpandedDeliveryRow 
            key={delivery.id}
            delivery={delivery}
            handleNavigation={handleNavigation}
            statusOptions={statusOptions}
            onUpdateStatus={onUpdateStatus}
          />
        ))
      }
    </React.Fragment>
  );
};

export default DeliveryTableRow;
