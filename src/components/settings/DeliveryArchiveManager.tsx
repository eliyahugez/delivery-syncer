
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Archive, ChevronDown, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DeliveryArchiveManagerProps {
  onArchive?: (courierName: string, deliveryDate: string) => void;
}

const DeliveryArchiveManager: React.FC<DeliveryArchiveManagerProps> = ({ onArchive }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [courierName, setCourierName] = useState('');
  const [archiveDate, setArchiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const handleArchive = () => {
    if (!courierName) {
      toast({
        title: "שם שליח חסר",
        description: "אנא הזן שם שליח כדי לארכב משלוחים",
        variant: "destructive"
      });
      return;
    }
    
    if (onArchive) {
      onArchive(courierName, archiveDate);
    }
    
    toast({
      title: "ארכוב משלוחים בתהליך",
      description: `המשלוחים מתארכבים עבור ${courierName} לתאריך ${archiveDate}`
    });
    
    setIsDialogOpen(false);
  };
  
  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center">
              <Archive className="h-4 w-4 mr-2" />
              <span>ניהול ארכיון משלוחים</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "transform rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => setIsDialogOpen(true)}
          >
            <Archive className="h-4 w-4 mr-2" />
            ארכב משלוחים ישנים
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            הורד נתוני ארכיון
          </Button>
        </CollapsibleContent>
      </Collapsible>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ארכוב משלוחים ישנים</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="courierName" className="text-right col-span-1">
                שם שליח
              </Label>
              <Input
                id="courierName"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="archiveDate" className="text-right col-span-1">
                תאריך
              </Label>
              <Input
                id="archiveDate"
                type="date"
                value={archiveDate}
                onChange={(e) => setArchiveDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="archiveStatus" className="text-right col-span-1">
                סטטוס
              </Label>
              <Select defaultValue="delivered">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="בחר סטטוס לארכוב" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivered">נמסר</SelectItem>
                  <SelectItem value="failed">לא נמסר</SelectItem>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleArchive}>
              ארכב משלוחים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveryArchiveManager;
