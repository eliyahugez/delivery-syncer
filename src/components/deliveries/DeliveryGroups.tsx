
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Package, Phone, MessageSquare, Navigation, Trash2, RefreshCw } from 'lucide-react';
import DeliveryStatusBadge from './DeliveryStatusBadge';
import { Delivery } from '@/types/delivery';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';
import { useIsMobile } from '@/hooks/use-mobile';
import PhoneNumberActions from './table/PhoneNumberActions';
import AddressDisplay from './table/AddressDisplay';
import { makePhoneCall, openWhatsApp, navigateToAddress } from '@/utils/navigation';
import { usePhoneFormatter } from '@/hooks/data/usePhoneFormatter';

interface DeliveryGroupsProps {
  groups: Record<string, Delivery[]>;
  statusOptions: DeliveryStatusOption[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
  onCompleteDelivery: (id: string, deliveryInfo: any) => void;
  isLoading: boolean;
}

const DeliveryGroups = ({
  groups,
  statusOptions,
  onUpdateStatus,
  onCompleteDelivery,
  isLoading
}: DeliveryGroupsProps) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { isValidPhoneForActions } = usePhoneFormatter();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (Object.keys(groups).length === 0) {
    return (
      <div className="text-center my-12">
        <p className="text-lg text-gray-500">אין משלוחים להצגה</p>
      </div>
    );
  }

  const toggleGroup = (groupName: string) => {
    setExpandedGroup(expandedGroup === groupName ? null : groupName);
  };

  const handleStatusUpdate = (id: string, status: string, isGroupUpdate: boolean = false) => {
    onUpdateStatus(id, status, isGroupUpdate ? "batch" : "single");
  };

  const handleComplete = (id: string, deliveryInfo: any) => {
    onCompleteDelivery(id, deliveryInfo);
  };

  const getGroupDisplayName = (groupName: string) => {
    // Don't display street numbers as group names
    if (/^\d+\s+[a-zA-Z\u0590-\u05FF]/.test(groupName)) {
      return `לקוח ב${groupName}`;
    }
    
    // If groupName is like "Street name-house number" (e.g. "Karni Shomron-Karni Shomron")
    if (groupName.includes('-')) {
      const parts = groupName.split('-');
      if (parts.length === 2) {
        // If second part is not empty and not a city name, use it
        if (parts[1] && !parts[1].includes("Shomron") && !parts[1].includes("שומרון")) {
          return parts[1].trim();
        }
      }
    }
    
    return groupName;
  };

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, deliveries]) => {
        const primaryDelivery = deliveries[0];
        const hasValidPhone = isValidPhoneForActions(primaryDelivery.phone);
        const displayName = getGroupDisplayName(groupName);
        
        return (
          <Card key={groupName} className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 p-3 cursor-pointer" onClick={() => toggleGroup(groupName)}>
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="text-lg font-semibold flex items-center gap-2">
                    {displayName}
                    <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded">
                      {deliveries.length} משלוחים
                    </span>
                  </div>
                  
                  <PhoneNumberActions
                    phoneNumber={primaryDelivery.phone}
                    showButtons={false}
                  />
                  
                  <AddressDisplay 
                    address={primaryDelivery.address} 
                    handleNavigation={(address) => navigateToAddress(address)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {hasValidPhone && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="bg-green-50 hover:bg-green-100 text-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          openWhatsApp(primaryDelivery.phone);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          makePhoneCall(primaryDelivery.phone);
                        }}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="bg-gray-50 hover:bg-gray-100 text-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToAddress(primaryDelivery.address);
                    }}
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleComplete(primaryDelivery.id, {
                        trackingNumber: primaryDelivery.trackingNumber,
                        address: primaryDelivery.address,
                        customerName: primaryDelivery.name
                      });
                    }}
                  >
                    מסירה
                  </Button>
                  <ChevronRight className={`h-6 w-6 transition-transform ${expandedGroup === groupName ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </CardHeader>
            
            {expandedGroup === groupName && (
              <CardContent className="py-3 px-4">
                <div className="space-y-4">
                  {deliveries.map((delivery) => (
                    <div key={delivery.id} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{delivery.trackingNumber}</span>
                          </div>
                          <PhoneNumberActions 
                            phoneNumber={delivery.phone} 
                            showButtons={true}
                          />
                        </div>
                        <div className="flex flex-col items-end">
                          <DeliveryStatusBadge status={delivery.status} />
                          <div className="mt-2 flex flex-wrap justify-end gap-1">
                            {statusOptions.map((option) => (
                              <Button
                                key={option.value}
                                size="sm"
                                variant={delivery.status === option.value ? "default" : "outline"}
                                className="h-7 px-2 py-0 text-xs"
                                onClick={() => handleStatusUpdate(delivery.id, option.value)}
                              >
                                {option.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default DeliveryGroups;
