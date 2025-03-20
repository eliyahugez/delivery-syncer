
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { 
  ChevronDown, 
  ChevronRight, 
  Phone, 
  MapPin, 
  Package, 
  Clock,
  User
} from 'lucide-react';
import { DeliveryGroup } from '@/hooks/useDeliveryGroups';
import { Delivery } from '@/types/delivery';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface DeliveryGroupsProps {
  groups: DeliveryGroup[];
  statusOptions: { value: string; label: string }[];
  onUpdateStatus: (id: string, status: string, updateType: string) => void;
  isLoading?: boolean;
}

const DeliveryGroups: React.FC<DeliveryGroupsProps> = ({
  groups,
  statusOptions,
  onUpdateStatus,
  isLoading = false,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (customerName: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [customerName]: !prev[customerName]
    }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "לא ידוע";
    
    try {
      const date = new Date(dateString);
      return format(date, "d בMMMM yyyy, HH:mm", { locale: he });
    } catch (error) {
      return dateString;
    }
  };

  // Handle batch status update
  const handleBatchUpdate = (group: DeliveryGroup, newStatus: string) => {
    // Use the first delivery ID as a reference for the batch update
    if (group.deliveries.length > 0) {
      onUpdateStatus(group.deliveries[0].id, newStatus, "batch");
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {isLoading ? (
        <div className="text-center py-8">
          טוען משלוחים...
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-8">
          לא נמצאו משלוחים
        </div>
      ) : (
        groups.map((group) => (
          <Collapsible
            key={group.customerName}
            open={openGroups[group.customerName]}
            onOpenChange={() => toggleGroup(group.customerName)}
            className="border rounded-lg shadow-sm"
          >
            <CollapsibleTrigger asChild>
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  {openGroups[group.customerName] ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium text-lg">{group.customerName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Package className="h-3 w-3" />
                      <span>{group.totalDeliveries} משלוחים</span>
                      {group.phones[0] && (
                        <>
                          <span>•</span>
                          <Phone className="h-3 w-3" />
                          <span dir="ltr">{group.phones[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <DeliveryStatusBadge status={group.latestStatus} />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="p-4 border-t bg-slate-50">
                {/* Group details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <User className="h-4 w-4" /> פרטי לקוח
                    </h4>
                    <div className="text-sm space-y-1">
                      <div><strong>שם: </strong>{group.customerName}</div>
                      <div><strong>טלפון: </strong>
                        {group.phones.map((phone, idx) => (
                          <a 
                            key={idx}
                            href={`tel:${phone}`}
                            className="text-blue-600 hover:underline"
                            dir="ltr"
                          >
                            {phone}{idx < group.phones.length - 1 ? ', ' : ''}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> כתובות למשלוח
                    </h4>
                    <div className="text-sm space-y-1">
                      {group.addresses.map((address, idx) => (
                        <div key={idx}>
                          <div className="flex items-center">
                            <span className="truncate">{address}</span>
                            <a 
                              href={`https://waze.com/ul?q=${encodeURIComponent(address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline mr-2"
                            >
                              <MapPin className="h-3 w-3 inline" /> ניווט
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Delivery items */}
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <Package className="h-4 w-4" /> פרטי משלוחים
                  </h4>
                  
                  <div className="bg-white rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="text-right p-2 font-medium">מספר מעקב</th>
                          <th className="text-right p-2 font-medium hide-on-mobile">תאריך עדכון</th>
                          <th className="text-right p-2 font-medium">סטטוס</th>
                          <th className="text-right p-2 font-medium">פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.deliveries.map((delivery, idx) => (
                          <tr key={delivery.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="p-2 font-mono">{delivery.trackingNumber}</td>
                            <td className="p-2 hide-on-mobile">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(delivery.statusDate)}</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <DeliveryStatusBadge status={delivery.status} />
                            </td>
                            <td className="p-2">
                              <select
                                className="p-1 text-xs border rounded"
                                value={delivery.status}
                                onChange={(e) => onUpdateStatus(delivery.id, e.target.value, "single")}
                              >
                                {statusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Group actions */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{group.totalDeliveries}</span> משלוחים
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      className="text-sm border rounded py-1 px-2"
                      onChange={(e) => handleBatchUpdate(group, e.target.value)}
                      value=""
                    >
                      <option value="" disabled>עדכון קבוצתי...</option>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    
                    {group.phones[0] && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${group.phones[0]}`}>
                          <Phone className="h-4 w-4 mr-1" />
                          חייג
                        </a>
                      </Button>
                    )}
                    
                    {group.addresses[0] && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://waze.com/ul?q=${encodeURIComponent(group.addresses[0])}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          נווט
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))
      )}
      
      {/* Add responsive styling */}
      <style jsx>{`
        @media (max-width: 640px) {
          .hide-on-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default DeliveryGroups;
