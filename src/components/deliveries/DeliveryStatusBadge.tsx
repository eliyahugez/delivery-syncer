
import React from 'react';
import { cn } from '@/lib/utils';

type StatusType = 'delivered' | 'in_progress' | 'pending' | 'failed' | 'returned' | string;

interface DeliveryStatusBadgeProps {
  status: StatusType;
  className?: string;
}

const DeliveryStatusBadge: React.FC<DeliveryStatusBadgeProps> = ({ 
  status, 
  className 
}) => {
  const getStatusConfig = (status: StatusType) => {
    const normalized = status.toLowerCase();
    
    if (normalized.includes('נמסר') || normalized.includes('delivered')) {
      return {
        label: 'נמסר',
        className: 'bg-success/20 text-success border-success/30'
      };
    }
    
    if (normalized.includes('בדרך') || normalized.includes('בתהליך') || normalized.includes('in progress')) {
      return {
        label: 'בדרך',
        className: 'bg-info/20 text-info border-info/30'
      };
    }
    
    if (normalized.includes('ממתין') || normalized.includes('pending')) {
      return {
        label: 'ממתין',
        className: 'bg-warning/20 text-warning border-warning/30'
      };
    }
    
    if (normalized.includes('נכשל') || normalized.includes('failed')) {
      return {
        label: 'נכשל',
        className: 'bg-destructive/20 text-destructive border-destructive/30'
      };
    }
    
    if (normalized.includes('הוחזר') || normalized.includes('returned')) {
      return {
        label: 'הוחזר',
        className: 'bg-muted text-muted-foreground border-muted-foreground/30'
      };
    }
    
    return {
      label: status,
      className: 'bg-secondary text-secondary-foreground border-secondary-foreground/30'
    };
  };
  
  const config = getStatusConfig(status);
  
  return (
    <div className={cn(
      'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </div>
  );
};

export default DeliveryStatusBadge;
