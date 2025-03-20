
import React, { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Delivery } from "@/types/delivery";
import { Phone, CalendarClock, MapPin, Package, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeliveryStatusBadge from "./DeliveryStatusBadge";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface DeliveryTableProps {
  deliveries: Delivery[];
  onUpdateStatus: (id: string, newStatus: string, updateType?: string) => Promise<void>;
  isLoading: boolean;
  sheetsUrl?: string;
  statusOptions?: Array<{ value: string; label: string }>;
}

const DeliveryTable: React.FC<DeliveryTableProps> = ({
  deliveries,
  onUpdateStatus,
  isLoading,
  sheetsUrl,
  statusOptions = [
    { value: "pending", label: "ממתין" },
    { value: "in_progress", label: "בדרך" },
    { value: "delivered", label: "נמסר" },
    { value: "failed", label: "נכשל" },
    { value: "returned", label: "הוחזר" },
  ]
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [localStatusOptions, setLocalStatusOptions] = useState(statusOptions);

  // Fetch status options from Google Sheet when available
  useEffect(() => {
    const fetchStatusOptions = async () => {
      if (!sheetsUrl) return;
      
      try {
        const response = await supabase.functions.invoke('sync-sheets', {
          body: {
            action: 'getStatusOptions',
            sheetsUrl
          }
        });
        
        if (response.data?.statusOptions && response.data.statusOptions.length > 0) {
          setLocalStatusOptions(response.data.statusOptions);
        }
      } catch (error) {
        console.error('Error fetching status options:', error);
      }
    };
    
    fetchStatusOptions();
  }, [sheetsUrl]);

  // Handle status change for a single delivery or a group of deliveries
  const handleStatusChange = async (
    id: string,
    newStatus: string,
    updateType: string = "single"
  ) => {
    // Set the delivery as updating
    setUpdatingId(id);

    try {
      // Update the status using the onUpdateStatus callback
      await onUpdateStatus(id, newStatus, updateType);

      toast({
        title: "סטטוס עודכן",
        description: updateType === "batch" 
          ? "סטטוס כל המשלוחים של לקוח זה עודכן בהצלחה"
          : "סטטוס המשלוח עודכן בהצלחה",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "שגיאה בעדכון",
        description: "לא ניתן לעדכן את הסטטוס כרגע",
        variant: "destructive",
      });
    } finally {
      // Clear updating state
      setUpdatingId(null);
    }
  };

  const handlePhoneCall = (phone: string) => {
    if (!phone) {
      toast({
        title: "מספר טלפון חסר",
        description: "לא נמצא מספר טלפון למשלוח זה",
        variant: "destructive",
      });
      return;
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("+")) {
      // If the number starts with 972, assume it's already in international format
      if (formattedPhone.startsWith("972")) {
        formattedPhone = `+${formattedPhone}`;
      } else {
        // Otherwise assume it's Israeli and convert to international format
        formattedPhone = `+972${
          formattedPhone.startsWith("0")
            ? formattedPhone.substring(1)
            : formattedPhone
        }`;
      }
    }

    window.open(`tel:${formattedPhone}`);
  };

  // Add WhatsApp message handler
  const handleWhatsAppMessage = (phone: string) => {
    if (!phone) {
      toast({
        title: "מספר טלפון חסר",
        description: "לא נמצא מספר טלפון למשלוח זה",
        variant: "destructive",
      });
      return;
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("+")) {
      // If the number starts with 972, assume it's already in international format
      if (formattedPhone.startsWith("972")) {
        formattedPhone = formattedPhone;
      } else {
        // Otherwise assume it's Israeli and convert to international format
        formattedPhone = `972${
          formattedPhone.startsWith("0")
            ? formattedPhone.substring(1)
            : formattedPhone
        }`;
      }
    }

    // Create WhatsApp link with predefined message
    const message = "היי זה שליח";
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("he-IL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="glass p-8 rounded-xl flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground">טוען משלוחים...</p>
      </div>
    );
  }

  if (!deliveries.length) {
    return (
      <div className="glass p-8 rounded-xl text-center">
        <h3 className="text-xl font-medium mb-2">אין משלוחים</h3>
        <p className="text-muted-foreground">לא נמצאו משלוחים לתצוגה</p>
      </div>
    );
  }

  // Group deliveries by customer name
  const groupedDeliveries = deliveries.reduce((acc, delivery) => {
    // Use customer name as the grouping key, fallback to 'לא משויך' if name is empty
    const group = delivery.name ? delivery.name.trim() : "לא משויך";
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(delivery);
    return acc;
  }, {} as Record<string, Delivery[]>);

  // If we have grouped deliveries, display them in sections
  if (Object.keys(groupedDeliveries).length > 1) {
    return (
      <div className="space-y-6">
        {Object.entries(groupedDeliveries).map(([group, groupDeliveries]) => (
          <div key={group} className="space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} />
              <h3 className="text-lg font-medium">{group}</h3>
              <Badge variant="outline" className="ml-2">
                {groupDeliveries.length} משלוחים
              </Badge>
            </div>

            <AnimatePresence>
              <motion.div
                key={group}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="glass p-4 rounded-xl"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Use the status of the first delivery in the group */}
                      <DeliveryStatusBadge status={groupDeliveries[0].status} />
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Package size={12} className="mr-1" />
                        <span className="font-medium">
                          {groupDeliveries.length} משלוחים
                        </span>
                      </div>
                    </div>

                    <h3 className="font-medium truncate">
                      {group || "לקוח ללא שם"}
                    </h3>

                    {/* Display all tracking numbers */}
                    <div className="flex flex-wrap gap-1 mt-1 mb-2">
                      {groupDeliveries.map((delivery, idx) => (
                        <Badge
                          key={delivery.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {delivery.trackingNumber}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarClock size={14} />
                        <span>{formatDate(groupDeliveries[0].statusDate)}</span>
                      </div>

                      <div className="hidden sm:block text-muted-foreground">
                        •
                      </div>

                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span className="truncate">
                          {groupDeliveries[0].address || "כתובת לא זמינה"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto">
                    <Select
                      onValueChange={(value) =>
                        handleStatusChange(
                          groupDeliveries[0].id,
                          value,
                          "batch"
                        )
                      }
                      defaultValue={groupDeliveries[0].status}
                      disabled={groupDeliveries.some(
                        (d) => updatingId === d.id
                      )}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        {localStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePhoneCall(groupDeliveries[0].phone)}
                      className="flex-shrink-0"
                      disabled={!groupDeliveries[0].phone}
                    >
                      <Phone size={18} />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleWhatsAppMessage(groupDeliveries[0].phone)}
                      className="flex-shrink-0 bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                      disabled={!groupDeliveries[0].phone}
                    >
                      <MessageCircle size={18} />
                    </Button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  }

  // Fallback to the standard display if there's no grouping
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {deliveries.map((delivery, index) => (
          <motion.div
            key={delivery.id || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="glass p-4 rounded-xl"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <DeliveryStatusBadge status={delivery.status} />
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Package size={12} className="mr-1" />
                    <span>{delivery.trackingNumber}</span>
                  </div>
                </div>

                <h3 className="font-medium truncate">
                  {delivery.name || "לקוח ללא שם"}
                </h3>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarClock size={14} />
                    <span>{formatDate(delivery.statusDate)}</span>
                  </div>

                  <div className="hidden sm:block text-muted-foreground">•</div>

                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span className="truncate">
                      {delivery.address || "כתובת לא זמינה"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto">
                <Select
                  onValueChange={(value) =>
                    handleStatusChange(delivery.id, value)
                  }
                  defaultValue={delivery.status}
                  disabled={updatingId === delivery.id}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    {localStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePhoneCall(delivery.phone)}
                  className="flex-shrink-0"
                  disabled={!delivery.phone}
                >
                  <Phone size={18} />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleWhatsAppMessage(delivery.phone)}
                  className="flex-shrink-0 bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                  disabled={!delivery.phone}
                >
                  <MessageCircle size={18} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryTable;
