
import React from 'react';
import { Button } from '@/components/ui/button';
import { Delivery } from '@/types/delivery';
import DeliveryStatusBadge from '../DeliveryStatusBadge';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';

interface StatusActionsProps {
  delivery: Delivery;
  statusOptions: DeliveryStatusOption[];
  onUpdateStatus: (newStatus: string) => void;
}

const StatusActions = ({ delivery, statusOptions, onUpdateStatus }: StatusActionsProps) => {
  return (
    <div className="flex flex-col">
      <DeliveryStatusBadge status={delivery.status} />
      <div className="mt-2">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={delivery.status === option.value ? "default" : "outline"}
            className="h-7 px-2 text-xs mr-1 mb-1"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateStatus(option.value);
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default StatusActions;
