
import React, { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp, Navigation, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openNavigation } from '@/utils/navigation';

interface MobileDeliveryAddressProps {
  address: string;
  streetNumber?: string;
  city?: string;
  deliveryCount: number;
  trackingNumbers?: string[];
}

const MobileDeliveryAddress = ({
  address,
  streetNumber,
  city,
  deliveryCount,
  trackingNumbers = []
}: MobileDeliveryAddressProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const handleNavigation = async () => {
    await openNavigation(address);
  };
  
  // מחלץ את מספר הרחוב ושם הרחוב מהכתובת אם לא סופקו
  const getStreetInfo = () => {
    if (streetNumber && city) return { street: address, number: streetNumber, cityName: city };
    
    // ניסיון לחלץ מספר רחוב מהכתובת
    const numberMatch = address.match(/(\d+)/);
    const number = numberMatch ? numberMatch[0] : '';
    
    // ניסיון לחלץ את העיר מהכתובת
    const cityMatch = address.match(/(Karnei Shomron|Karney Shomron|Karnie Shomron|Karni Shomron|Maale Shomron|Ginot Shomron|קרני שומרון|מעלה שומרון|גינות שומרון)/i);
    const cityName = cityMatch ? cityMatch[0] : '';
    
    // הסרת העיר ומספר הרחוב לקבלת שם הרחוב
    let street = address.replace(cityName, '').replace(number, '').trim();
    street = street.replace(/[-,]/g, '').trim();
    
    return { street, number, cityName };
  };
  
  const { street, number, cityName } = getStreetInfo();
  
  return (
    <div className="border rounded-lg p-2 mb-2 bg-white">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1">
          <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <div className="overflow-hidden">
            <div className="font-bold text-sm truncate">
              {cityName && <span className="text-gray-700">{cityName} - </span>}
              {street && <span>{street}</span>}
              {number && <span> {number}</span>}
            </div>
            <div className="text-xs text-gray-600 flex items-center">
              <Package className="h-3 w-3 inline mr-1 flex-shrink-0" />
              <span className="truncate">{deliveryCount} משלוחים</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 min-w-7 py-0 px-1 bg-blue-50 text-blue-600 border-blue-100"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigation();
            }}
          >
            <Navigation className="h-3 w-3 mr-0.5" />
            <span className="text-xs">נווט</span>
          </Button>
          <div className="text-gray-500">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>
      
      {expanded && trackingNumbers.length > 0 && (
        <div className="mt-2 border-t pt-1">
          <div className="text-xs font-medium mb-1">מספרי מעקב:</div>
          <div className="grid grid-cols-1 gap-1">
            {trackingNumbers.map((tracking, idx) => (
              <div key={idx} className="text-xs font-mono bg-gray-50 p-1 rounded truncate">
                {tracking}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileDeliveryAddress;
