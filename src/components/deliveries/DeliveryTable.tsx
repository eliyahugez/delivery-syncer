
import React from 'react';
import { Delivery } from '@/types/delivery';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';
import DeliveryTableContainer from './table/DeliveryTableContainer';

interface DeliveryTableProps {
  deliveries: Delivery[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
  isLoading: boolean;
  sheetsUrl?: string;
  statusOptions: DeliveryStatusOption[];
}

const DeliveryTable = (props: DeliveryTableProps) => {
  return <DeliveryTableContainer {...props} />;
};

export default DeliveryTable;
