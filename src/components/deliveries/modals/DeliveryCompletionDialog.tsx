
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Package } from 'lucide-react';

interface DeliveryCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (recipientName: string) => void;
  deliveryInfo: {
    trackingNumber: string;
    address: string;
    customerName: string;
  };
}

const DeliveryCompletionDialog = ({
  isOpen,
  onClose,
  onComplete,
  deliveryInfo
}: DeliveryCompletionDialogProps) => {
  const [recipientName, setRecipientName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(recipientName || 'לא צוין');
    setRecipientName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Check className="mr-2 h-5 w-5 text-green-500" />
            אישור מסירת משלוח
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2 text-gray-500" />
              <span>{deliveryInfo.trackingNumber}</span>
            </div>
            <div className="mt-1">
              <span className="font-semibold">כתובת: </span>
              <span>{deliveryInfo.address}</span>
            </div>
            <div className="mt-1">
              <span className="font-semibold">לקוח: </span>
              <span>{deliveryInfo.customerName}</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="recipientName">שם מקבל המשלוח:</Label>
              <Input
                id="recipientName"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="הכנס את שם מקבל המשלוח"
                className="w-full"
                autoComplete="off"
              />
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                ביטול
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                אשר מסירה
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryCompletionDialog;
