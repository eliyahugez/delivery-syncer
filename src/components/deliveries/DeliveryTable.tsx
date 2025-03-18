
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Delivery } from '@/types/delivery';
import { Phone, CalendarClock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeliveryStatusBadge from './DeliveryStatusBadge';
import { motion, AnimatePresence } from 'framer-motion';

interface DeliveryTableProps {
  deliveries: Delivery[];
  onUpdateStatus: (id: string, newStatus: string) => Promise<void>;
  isLoading: boolean;
}

const DeliveryTable: React.FC<DeliveryTableProps> = ({
  deliveries,
  onUpdateStatus,
  isLoading,
}) => {
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      await onUpdateStatus(id, newStatus);
      toast({
        title: 'סטטוס עודכן',
        description: 'סטטוס המשלוח עודכן בהצלחה',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'שגיאה בעדכון',
        description: 'לא ניתן לעדכן את הסטטוס כרגע',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePhoneCall = (phone: string) => {
    if (!phone) {
      toast({
        title: 'מספר טלפון חסר',
        description: 'לא נמצא מספר טלפון למשלוח זה',
        variant: 'destructive',
      });
      return;
    }
    
    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+972${formattedPhone.startsWith('0') ? formattedPhone.substring(1) : formattedPhone}`;
    }
    
    window.open(`tel:${formattedPhone}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('he-IL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'ממתין' },
    { value: 'in_progress', label: 'בדרך' },
    { value: 'delivered', label: 'נמסר' },
    { value: 'failed', label: 'נכשל' },
    { value: 'returned', label: 'הוחזר' },
  ];

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
                  <span className="text-xs text-muted-foreground">#{delivery.trackingNumber}</span>
                </div>
                
                <h3 className="font-medium truncate">{delivery.name}</h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CalendarClock size={14} />
                    <span>{formatDate(delivery.statusDate)}</span>
                  </div>
                  
                  <div className="hidden sm:block text-muted-foreground">•</div>
                  
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span className="truncate">{delivery.address}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end md:self-center w-full md:w-auto">
                <Select
                  onValueChange={(value) => handleStatusChange(delivery.id, value)}
                  defaultValue={delivery.status}
                  disabled={updatingId === delivery.id}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
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
                >
                  <Phone size={18} />
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
