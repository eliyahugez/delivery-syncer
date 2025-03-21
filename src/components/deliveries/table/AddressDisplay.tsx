
import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

interface AddressDisplayProps {
  address: string;
  handleNavigation: (address: string) => void;
}

const AddressDisplay = ({ address, handleNavigation }: AddressDisplayProps) => {
  return (
    <div className="mt-1 text-sm flex items-center gap-1">
      <MapPin className="h-3 w-3 text-muted-foreground" />
      {address || 'אין כתובת'}
      {address && (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleNavigation(address);
          }}
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs mr-2"
        >
          <Navigation className="h-3 w-3 mr-1" />
          נווט
        </Button>
      )}
    </div>
  );
};

export default AddressDisplay;
