
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare } from 'lucide-react';

interface PhoneNumberActionsProps {
  phoneNumber: string;
  handleWhatsApp: (phone: string) => void;
}

const PhoneNumberActions = ({ phoneNumber, handleWhatsApp }: PhoneNumberActionsProps) => {
  return (
    <div className="flex items-center mt-1 space-x-2 rtl:space-x-reverse">
      <div className="flex items-center gap-1">
        <Phone className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm text-gray-600" dir="ltr">
          {phoneNumber}
        </span>
      </div>
      <div className="flex space-x-1 rtl:space-x-reverse">
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            handleWhatsApp(phoneNumber);
          }}
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-xs"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          וואטסאפ
        </Button>
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            window.open(`tel:${phoneNumber}`, '_blank');
          }}
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-xs"
        >
          <Phone className="h-3 w-3 mr-1" />
          חייג
        </Button>
      </div>
    </div>
  );
};

export default PhoneNumberActions;
