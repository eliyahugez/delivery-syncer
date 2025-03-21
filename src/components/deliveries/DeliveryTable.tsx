
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Delivery } from '@/types/delivery';
import DeliveryStatusBadge from './DeliveryStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Phone, MessageSquare, Navigation, Package, MapPin, User } from 'lucide-react';
import { DeliveryStatusOption } from '@/hooks/useDeliveries';

interface DeliveryTableProps {
  deliveries: Delivery[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => void;
  isLoading: boolean;
  sheetsUrl?: string;
  statusOptions: DeliveryStatusOption[];
}

const DeliveryTable = ({
  deliveries,
  onUpdateStatus,
  isLoading,
  statusOptions,
}: DeliveryTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // Group the deliveries by customer name or address
  const customerGroups = useMemo(() => {
    const groups: Record<string, Delivery[]> = {};
    
    deliveries.forEach(delivery => {
      // Skip invalid deliveries
      if (!delivery.trackingNumber) return;
      
      let groupKey = '';
      
      // Check if the name is in date format or marked as a date
      const isDatePattern = delivery.name &&
                          (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(delivery.name) || 
                           delivery.name.startsWith('[DATE]') ||
                           delivery.name.startsWith('תאריך:'));
                            
      // Check if tracking number is AUTO-XX format
      const isAutoTracking = /^AUTO-\d+$/.test(delivery.trackingNumber);
      
      // Check if name is empty or just the tracking number
      const isEmptyOrTrackingName = !delivery.name || 
                                     delivery.name === delivery.trackingNumber ||
                                     delivery.name === 'לא ידוע';
      
      // Determine if we should group by address
      if (isDatePattern || isAutoTracking || isEmptyOrTrackingName) {
        if (delivery.address) {
          // Extract main location from address for better grouping
          const addressParts = delivery.address.split(/[-,]/);
          const mainLocation = addressParts[0]?.trim();
          
          if (mainLocation && mainLocation.length > 2) {
            // Use location as the grouping key
            groupKey = mainLocation;
          } else {
            // Fallback to full address
            groupKey = delivery.address;
          }
        } else {
          groupKey = `לקוח ${delivery.trackingNumber}`;
        }
      } else {
        // Use the customer name as the grouping key
        groupKey = delivery.name;
      }
      
      // If we still don't have a good group key, use tracking number as last resort
      if (!groupKey || groupKey.length < 2) {
        groupKey = `לקוח ${delivery.trackingNumber}`;
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(delivery);
    });
    
    return groups;
  }, [deliveries]);

  // Filtered deliveries
  const filteredGroups = useMemo(() => {
    if (!filter) return customerGroups;
    
    const filtered: Record<string, Delivery[]> = {};
    
    Object.entries(customerGroups).forEach(([name, customerDeliveries]) => {
      // Check if customer name matches filter
      if (name.toLowerCase().includes(filter.toLowerCase())) {
        filtered[name] = customerDeliveries;
        return;
      }
      
      // Check if any of this customer's deliveries match filter
      const matchingDeliveries = customerDeliveries.filter(delivery => 
        delivery.trackingNumber.toLowerCase().includes(filter.toLowerCase()) ||
        (delivery.address && delivery.address.toLowerCase().includes(filter.toLowerCase())) ||
        (delivery.phone && delivery.phone.toLowerCase().includes(filter.toLowerCase()))
      );
      
      if (matchingDeliveries.length > 0) {
        filtered[name] = matchingDeliveries;
      }
    });
    
    return filtered;
  }, [customerGroups, filter]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleCustomer = (name: string) => {
    setExpandedCustomer(expandedCustomer === name ? null : name);
  };

  const handleWhatsApp = (phone: string) => {
    // Format the phone number (remove +, spaces, etc.)
    const formattedPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent('היי זה שליח');
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const handleNavigation = (address: string) => {
    // Open in navigation app
    const encodedAddress = encodeURIComponent(address);
    
    // Check if on mobile device
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // On mobile, try to use Waze
      window.open(`https://waze.com/ul?q=${encodedAddress}`, '_blank');
    } else {
      // On desktop, open in Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loader animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!deliveries.length) {
    return (
      <div className="text-center my-12">
        <p className="text-lg text-gray-500">אין משלוחים להצגה</p>
      </div>
    );
  }

  console.log("Customer groups:", Object.entries(filteredGroups).map(([name, deliveries]) => ({
    name,
    count: deliveries.length,
    sample: deliveries[0]
  })));

  return (
    <div className="w-full overflow-auto rounded-md border">
      <Table className="min-w-full">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-muted/50">
            <TableHead className="w-20">פעולות</TableHead>
            <TableHead>פרטי לקוח</TableHead>
            <TableHead className="w-[200px]">סטטוס</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(filteredGroups).map(([customerName, customerDeliveries]) => {
            const hasMultipleDeliveries = customerDeliveries.length > 1;
            const isCustomerExpanded = expandedCustomer === customerName;
            const delivery = customerDeliveries[0]; // First delivery for this customer
            
            // Get a clean display name (removing AUTO- prefix if present)
            const displayName = customerName.startsWith("לקוח AUTO-") 
              ? customerName.replace("לקוח AUTO-", "משלוח אוטומטי ") 
              : customerName;
              
            // Extract a clean phone number (if not containing status information)
            const phoneNumber = delivery.phone && 
                               !delivery.phone.toLowerCase().includes('delivered') && 
                               !delivery.phone.toLowerCase().includes('נמסר') &&
                               !delivery.phone.toLowerCase().includes('status') 
                                ? delivery.phone : '';
            
            return (
              <React.Fragment key={customerName}>
                <TableRow 
                  className={`hover:bg-muted/20 cursor-pointer ${hasMultipleDeliveries ? 'font-semibold' : ''}`}
                  onClick={() => toggleCustomer(customerName)}
                >
                  <TableCell className="p-2">
                    <div className="flex space-x-1 rtl:space-x-reverse">
                      {hasMultipleDeliveries && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isCustomerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex flex-col">
                      <div className="font-bold text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" /> 
                        {displayName}
                      </div>
                      {phoneNumber && (
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
                      )}
                      <div className="mt-1 text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {delivery.address || 'אין כתובת'}
                        {delivery.address && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigation(delivery.address);
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
                      <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        מספר מעקב: {delivery.trackingNumber}
                      </div>
                      {hasMultipleDeliveries && (
                        <div className="mt-1 bg-blue-50 p-1 rounded-sm text-xs text-blue-700">
                          {customerDeliveries.length} משלוחים
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex flex-col">
                      <DeliveryStatusBadge status={delivery.status} />
                      <div className="mt-2">
                        {statusOptions.map((option) => (
                          <Button
                            key={option.value}
                            size="sm"
                            variant={delivery.status === option.value ? "default" : "outline"}
                            className="h-7 px-2 text-xs mr-1 mb-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(
                                delivery.id, 
                                option.value,
                                hasMultipleDeliveries ? "batch" : "single"
                              );
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Show other deliveries for this customer when expanded */}
                {isCustomerExpanded && hasMultipleDeliveries && customerDeliveries.slice(1).map(delivery => (
                  <TableRow 
                    key={delivery.id} 
                    className="hover:bg-muted/10 bg-gray-50"
                  >
                    <TableCell className="p-2"></TableCell>
                    <TableCell className="p-3 pl-8">
                      <div className="flex flex-col">
                        <div className="font-medium text-sm flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          מספר מעקב: {delivery.trackingNumber}
                        </div>
                        <div className="text-xs mt-1 text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {delivery.address || 'אין כתובת'}
                          {delivery.address && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigation(delivery.address);
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
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex flex-col">
                        <DeliveryStatusBadge status={delivery.status} />
                        <div className="mt-2">
                          {statusOptions.map((option) => (
                            <Button
                              key={option.value}
                              size="sm"
                              variant={delivery.status === option.value ? "default" : "outline"}
                              className="h-7 px-2 text-xs mr-1 mb-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(delivery.id, option.value);
                              }}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeliveryTable;
