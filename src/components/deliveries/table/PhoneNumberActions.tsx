
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare } from 'lucide-react';
import { makePhoneCall, openWhatsApp } from '@/utils/navigation';
import { usePhoneFormatter } from '@/hooks/data/usePhoneFormatter';

interface PhoneNumberActionsProps {
  phoneNumber: string;
  handleWhatsApp?: (phone: string) => void;
  showButtons?: boolean;
}

const PhoneNumberActions = ({ 
  phoneNumber, 
  handleWhatsApp,
  showButtons = true 
}: PhoneNumberActionsProps) => {
  const { isValidPhoneForActions } = usePhoneFormatter();
  const hasValidPhone = isValidPhoneForActions(phoneNumber);
  
  // Use direct call functions if no handlers provided
  const onWhatsApp = handleWhatsApp || openWhatsApp;
  
  // If no phone number, don't render anything
  if (!phoneNumber) return null;
  
  return (
    <div className="mt-1 flex items-center gap-1">
      <div className="flex items-center text-xs text-gray-500">
        <Phone className="h-3 w-3 text-muted-foreground mr-1" />
        {phoneNumber}
      </div>
      
      {showButtons && hasValidPhone && (
        <div className="flex gap-1 ml-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 bg-green-50 hover:bg-green-100 text-green-600"
            onClick={(e) => {
              e.stopPropagation();
              onWhatsApp(phoneNumber);
            }}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 bg-blue-50 hover:bg-blue-100 text-blue-600"
            onClick={(e) => {
              e.stopPropagation();
              makePhoneCall(phoneNumber);
            }}
          >
            <Phone className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhoneNumberActions;
