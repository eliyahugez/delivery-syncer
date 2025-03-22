
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PhoneNumberActionsProps {
  phoneNumber: string;
  handleWhatsApp: (phone: string) => void;
}

const PhoneNumberActions = ({ phoneNumber, handleWhatsApp }: PhoneNumberActionsProps) => {
  const isMobile = useIsMobile();
  
  // Check if phone number is valid - must not be empty and have digits
  const isValidPhone = phoneNumber && /\d/.test(phoneNumber);
  
  if (!isValidPhone) {
    return (
      <div className="flex items-center mt-1">
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3 text-gray-400" />
          <span className="text-sm text-gray-400 italic">מספר טלפון לא זמין</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mr-2 h-7 px-2 text-xs"
          onClick={() => window.open('https://api.whatsapp.com/send', '_blank')}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          פתח וואטסאפ
        </Button>
      </div>
    );
  }
  
  // Remove any non-digit characters except for the leading +
  const formattedPhone = phoneNumber.startsWith('+') 
    ? '+' + phoneNumber.substring(1).replace(/\D/g, '')
    : phoneNumber.replace(/\D/g, '');
  
  // פונקציה לפתיחת שיחת טלפון
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:${formattedPhone}`, '_blank');
  };
  
  // פונקציה לפתיחת וואטסאפ
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleWhatsApp(formattedPhone);
  };
  
  return (
    <div className="flex items-center mt-1 space-x-2 rtl:space-x-reverse">
      <div className="flex items-center gap-1">
        <Phone className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm text-gray-600" dir="ltr">
          {phoneNumber}
        </span>
      </div>
      <div className="flex space-x-1 rtl:space-x-reverse">
        {isMobile ? (
          // במובייל - כפתורים גדולים יותר וברורים יותר
          <div className="flex space-x-1 rtl:space-x-reverse">
            <Button 
              onClick={handleWhatsAppClick}
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleCall}
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-xs bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
            >
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          // בדסקטופ - כפתורים עם טקסט
          <>
            <Button 
              onClick={handleWhatsAppClick}
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              וואטסאפ
            </Button>
            <Button 
              onClick={handleCall}
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs bg-blue-50 hover:bg-blue-100"
            >
              <Phone className="h-3 w-3 mr-1" />
              חייג
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PhoneNumberActions;
