
import React from 'react';
import { Phone, MessageSquare, Navigation, Check, X, Clock, Package, User } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';

interface MobileActionButtonsProps {
  phone?: string;
  address?: string;
  deliveryId: string;
  currentStatus: string;
  customerName: string;
  trackingNumber: string;
  onCall: (phone: string) => void;
  onWhatsApp: (phone: string) => void;
  onNavigate: (address: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onComplete: (id: string, deliveryInfo: any) => void;
  statusOptions: DeliveryStatusOption[];
}

const MobileActionButtons = ({
  phone,
  address,
  deliveryId,
  currentStatus,
  customerName,
  trackingNumber,
  onCall,
  onWhatsApp,
  onNavigate,
  onUpdateStatus,
  onComplete,
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
  
  const handleComplete = () => {
    onComplete(deliveryId, {
      trackingNumber,
      address: address || '',
      customerName
    });
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-1 flex justify-around z-50">
      {phone && (
        <>
          <Button 
            onClick={() => onCall(phone)}
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center px-1 py-1"
          >
            <Phone className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] mt-0.5">חייג</span>
          </Button>
          
          <Button 
            onClick={() => onWhatsApp(phone)}
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center px-1 py-1"
          >
            <MessageSquare className="h-4 w-4 text-green-600" />
            <span className="text-[10px] mt-0.5">הודעה</span>
          </Button>
        </>
      )}
      
      {address && (
        <Button 
          onClick={() => onNavigate(address)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center px-1 py-1"
        >
          <Navigation className="h-4 w-4 text-blue-600" />
          <span className="text-[10px] mt-0.5">נווט</span>
        </Button>
      )}
      
      {deliveredOption && currentStatus !== deliveredOption.value && (
        <Button 
          onClick={handleComplete}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center px-1 py-1"
        >
          <User className="h-4 w-4 text-green-600" />
          <span className="text-[10px] mt-0.5">אישור</span>
        </Button>
      )}
      
      {deliveredOption && currentStatus !== deliveredOption.value && (
        <Button 
          onClick={() => onUpdateStatus(deliveryId, deliveredOption.value)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center px-1 py-1"
        >
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-[10px] mt-0.5">נמסר</span>
        </Button>
      )}
      
      {failedOption && currentStatus !== failedOption.value && (
        <Button 
          onClick={() => onUpdateStatus(deliveryId, failedOption.value)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center px-1 py-1"
        >
          <X className="h-4 w-4 text-red-600" />
          <span className="text-[10px] mt-0.5">לא נמסר</span>
        </Button>
      )}
      
      {pendingOption && currentStatus !== pendingOption.value && (
        <Button 
          onClick={() => onUpdateStatus(deliveryId, pendingOption.value)}
          variant="ghost" 
          size="sm" 
          className="flex flex-col items-center px-1 py-1"
        >
          <Clock className="h-4 w-4 text-orange-600" />
          <span className="text-[10px] mt-0.5">בדרך</span>
        </Button>
      )}
    </div>
  );
};

export default MobileActionButtons;
