
import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Delivery } from '@/types/delivery';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';
import DeliveryTableRow from './DeliveryTableRow';
import { useDeliveryTableHelpers } from '@/hooks/useDeliveryTableHelpers';

interface DeliveryTableContainerProps {
  deliveries: Delivery[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
  onCompleteDelivery: (id: string, deliveryInfo: any) => void;
  isLoading: boolean;
  statusOptions: DeliveryStatusOption[];
  sheetsUrl?: string;
}

const DeliveryTableContainer = ({
  deliveries,
  onUpdateStatus,
  onCompleteDelivery,
  isLoading,
  statusOptions,
}: DeliveryTableContainerProps) => {
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  const { customerGroups, filteredGroups, handleWhatsApp, handleNavigation } = 
    useDeliveryTableHelpers(deliveries, filter);

  const toggleCustomer = (name: string) => {
    setExpandedCustomer(expandedCustomer === name ? null : name);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!deliveries.length) {
    return (
      <div className="text-center my-12">
        <p className="text-lg text-gray-500">אין משלוחים להצגה</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto rounded-md border">
      <Table className="min-w-full">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-muted/50">
            <TableHead className="w-20">פעולות</TableHead>
            <TableHead>פרטי לקוח</TableHead>
            <TableHead className="w-[200px]">סטטוס</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(filteredGroups).map(([customerName, customerDeliveries]) => (
            <DeliveryTableRow
              key={customerName}
              customerName={customerName}
              customerDeliveries={customerDeliveries}
              isCustomerExpanded={expandedCustomer === customerName}
              toggleCustomer={toggleCustomer}
              handleWhatsApp={handleWhatsApp}
              handleNavigation={handleNavigation}
              onUpdateStatus={onUpdateStatus}
              onCompleteDelivery={onCompleteDelivery}
              statusOptions={statusOptions}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeliveryTableContainer;
