
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
  
  const handleNavigation = () => {
    openNavigation(address);
  };
  
  // מחלץ את מספר הרחוב ושם הרחוב מהכתובת אם לא סופקו
  const getStreetInfo = () => {
    if (streetNumber && city) return { street: address, number: streetNumber, cityName: city };
    
    // ניסיון לחלץ מספר רחוב מהכתובת
    const numberMatch = address.match(/(\d+)/);
    const number = numberMatch ? numberMatch[0] : '';
    
    // ניסיון לחלץ את העיר מהכתובת
    const cityMatch = address.match(/(Karnei Shomron|Maale Shomron|Ginot Shomron)/i);
    const cityName = cityMatch ? cityMatch[0] : '';
    
    // הסרת העיר ומספר הרחוב לקבלת שם הרחוב
    let street = address.replace(cityName, '').replace(number, '').trim();
    street = street.replace(/[-,]/g, '').trim();
    
    return { street, number, cityName };
  };
  
  const { street, number, cityName } = getStreetInfo();
  
  return (
    <div className="border rounded-lg p-3 mb-3 bg-white">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-500" />
          <div>
            <div className="font-bold">
              {cityName && <span className="text-gray-700">{cityName} - </span>}
              {street && <span>{street}</span>}
              {number && <span> {number}</span>}
            </div>
            <div className="text-sm text-gray-600">
              <Package className="h-3 w-3 inline mr-1" />
              {deliveryCount} משלוחים
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 min-w-8 py-0 px-2 bg-blue-50 text-blue-600 border-blue-100"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigation();
            }}
          >
            <Navigation className="h-4 w-4 mr-1" />
            <span className="hide-on-small-mobile">נווט</span>
          </Button>
          <div className="text-gray-500">
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </div>
      </div>
      
      {expanded && trackingNumbers.length > 0 && (
        <div className="mt-3 border-t pt-2">
          <div className="text-sm font-medium mb-1">מספרי מעקב:</div>
          <div className="grid grid-cols-1 gap-1">
            {trackingNumbers.map((tracking, idx) => (
              <div key={idx} className="text-xs font-mono bg-gray-50 p-1 rounded">
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
