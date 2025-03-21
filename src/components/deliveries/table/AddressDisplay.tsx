
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { openNavigation } from '@/utils/navigation';

interface AddressDisplayProps {
  address: string;
  handleNavigation?: (address: string) => void;
}

const AddressDisplay = ({ address, handleNavigation }: AddressDisplayProps) => {
  const isMobile = useIsMobile();
  const [isNavigating, setIsNavigating] = useState(false);
  
  if (!address) return (
    <div className="mt-1 text-sm flex items-center gap-1 text-gray-500">
      <MapPin className="h-3 w-3 text-muted-foreground" />
      אין כתובת
    </div>
  );
  
  const handleNavigateClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNavigating(true);
    
    if (handleNavigation) {
      handleNavigation(address);
    } else {
      await openNavigation(address);
    }
    
    setTimeout(() => setIsNavigating(false), 1000);
  };
  
  return (
    <div className="mt-1 text-sm flex items-center gap-1">
      <MapPin className="h-3 w-3 text-muted-foreground" />
      <span className="truncate max-w-[180px] md:max-w-[250px] lg:max-w-full">
        {address}
      </span>
      {isMobile ? (
        <Button
          onClick={handleNavigateClick}
          variant="outline"
          size="sm"
          disabled={isNavigating}
          className="h-7 w-7 p-0 ml-1 min-w-0 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={handleNavigateClick}
          variant="outline"
          size="sm"
          disabled={isNavigating}
          className="h-6 px-2 text-xs ml-1"
        >
          <Navigation className="h-3 w-3 mr-1" />
          נווט
        </Button>
      )}
    </div>
  );
};

export default AddressDisplay;
