
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Delivery } from '@/types/delivery';
import { Package, MapPin } from 'lucide-react';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';
import StatusActions from './StatusActions';
import AddressDisplay from './AddressDisplay';

interface ExpandedDeliveryRowProps {
  delivery: Delivery;
  handleNavigation: (address: string) => void;
  statusOptions: DeliveryStatusOption[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
}

const ExpandedDeliveryRow = ({
  delivery,
  handleNavigation,
  statusOptions,
  onUpdateStatus
}: ExpandedDeliveryRowProps) => {
  return (
    <TableRow 
      key={delivery.id} 
      className="hover:bg-muted/10 bg-gray-50"
    >
      <TableCell className="p-2"></TableCell>
      <TableCell className="p-3 pl-8">
        <div className="flex flex-col">
          <div className="font-medium text-sm flex items-center gap-1">
            <Package className="h-3 w-3 text-muted-foreground" />
            מספר מעקב: {delivery.trackingNumber}
          </div>
          <AddressDisplay 
            address={delivery.address} 
            handleNavigation={handleNavigation} 
          />
        </div>
      </TableCell>
      <TableCell className="p-3">
        <StatusActions 
          delivery={delivery} 
          statusOptions={statusOptions}
          onUpdateStatus={(status) => onUpdateStatus(delivery.id, status)}
        />
      </TableCell>
    </TableRow>
  );
};

export default ExpandedDeliveryRow;
