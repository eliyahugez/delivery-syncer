
import React from 'react';
import { Phone, MessageSquare, Navigation, Check, X, Clock, Package } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';

interface MobileActionButtonsProps {
  phone?: string;
  address?: string;
  deliveryId: string;
  currentStatus: string;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  onNavigate: (address: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  statusOptions: DeliveryStatusOption[];
}

const MobileActionButtons = ({
  phone,
  address,
  deliveryId,
  currentStatus,
  onCall,
  onWhatsApp,
  onNavigate,
  onUpdateStatus,
  statusOptions
}: MobileActionButtonsProps) => {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  // מציאת אופציות הסטטוס הפופולריות ביותר
  const deliveredOption = statusOptions.find(option => 
    option.value.toLowerCase().includes('delivered') || 
    option.value.includes('נמסר')
  );
  
  const pendingOption = statusOptions.find(option => 
    option.value.toLowerCase().includes('pending') || 
    option.value.includes('בהמתנה') ||
    option.value.includes('בדרך')
  );
  
  const failedOption = statusOptions.find(option => 
    option.value.toLowerCase().includes('failed') || 
    option.value.includes('נכשל') ||
    option.value.includes('לא נמסר')
  );
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-2 flex justify-around z-50">
      {phone && (
        <>
          <Button 
            onClick={() => onCall(phone)}
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center"
          >
            <Phone className="h-5 w-5 text-blue-600" />
            <span className="text-xs mt-1">חייג</span>
          </Button>
          
          <Button 
            onClick={() => onWhatsApp(phone)}
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center"
          >
            <MessageSquare className="h-5 w-5 text-green-600" />
            <span className="text-xs mt-1">וואטסאפ</span>
          </Button>
        </>
      )}
      
      {address && (
        <Button 
          onClick={() => onNavigate(address)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center"
        >
          <Navigation className="h-5 w-5 text-blue-600" />
          <span className="text-xs mt-1">נווט</span>
        </Button>
      )}
      
      {deliveredOption && currentStatus !== deliveredOption.value && (
        <Button 
          onClick={() => onUpdateStatus(deliveryId, deliveredOption.value)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center"
        >
          <Check className="h-5 w-5 text-green-600" />
          <span className="text-xs mt-1">נמסר</span>
        </Button>
      )}
      
      {failedOption && currentStatus !== failedOption.value && (
        <Button 
          onClick={() => onUpdateStatus(deliveryId, failedOption.value)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center"
        >
          <X className="h-5 w-5 text-red-600" />
          <span className="text-xs mt-1">לא נמסר</span>
        </Button>
      )}
      
      {pendingOption && currentStatus !== pendingOption.value && (
        <Button 
          onClick={() => onUpdateStatus(deliveryId, pendingOption.value)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center"
        >
          <Clock className="h-5 w-5 text-orange-600" />
          <span className="text-xs mt-1">בדרך</span>
        </Button>
      )}
    </div>
  );
};

export default MobileActionButtons;
