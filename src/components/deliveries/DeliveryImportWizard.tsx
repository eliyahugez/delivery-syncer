
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface DeliveryImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  sheetsUrl: string;
  onSubmit: (mappings: Record<string, number>) => void;
}

const DeliveryImportWizard: React.FC<DeliveryImportWizardProps> = ({
  isOpen,
  onClose,
  sheetsUrl,
  onSubmit
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [mappings, setMappings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  
  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const handleSubmit = () => {
    try {
      setLoading(true);
      
      // Create default mappings if none are provided
      const defaultMappings = {
        trackingNumber: 0,
        name: 1,
        phone: 2,
        address: 3,
        status: 4,
        assignedTo: 5
      };
      
      // Combine user mappings with defaults
      const finalMappings = { ...defaultMappings, ...mappings };
      
      onSubmit(finalMappings);
      toast({
        title: "ייבוא הושלם",
        description: "מיפוי העמודות נשמר והנתונים מיובאים"
      });
      
      onClose();
    } catch (error) {
      console.error("Error submitting mappings:", error);
      toast({
        title: "שגיאה בייבוא",
        description: "אירעה שגיאה בתהליך הייבוא",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    const columnIndex = parseInt(value);
    if (!isNaN(columnIndex)) {
      setMappings(prev => ({
        ...prev,
        [field]: columnIndex
      }));
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>אשף ייבוא משלוחים</DialogTitle>
        </DialogHeader>
        
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">שלב 1: מקור הנתונים</h3>
              <p className="text-sm text-gray-500">המערכת תייבא נתונים מהטבלה הבאה:</p>
            </div>
            
            <div className="p-3 bg-gray-100 rounded-md">
              <p className="text-sm font-mono break-all">{sheetsUrl}</p>
            </div>
            
            <p className="text-sm text-gray-500">ודא שהקישור לטבלה נכון וכי הוא נגיש למערכת.</p>
          </div>
        )}
        
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">שלב 2: מיפוי עמודות</h3>
              <p className="text-sm text-gray-500">הגדר איזה עמודה בטבלה מכילה כל סוג מידע</p>
            </div>
            
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor="trackingNumber" className="self-center">מספר מעקב</Label>
                <Input 
                  id="trackingNumber" 
                  type="number" 
                  min="0"
                  placeholder="0" 
                  value={mappings.trackingNumber ?? ""}
                  onChange={(e) => handleInputChange('trackingNumber', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor="name" className="self-center">שם</Label>
                <Input 
                  id="name" 
                  type="number" 
                  min="0" 
                  placeholder="1"
                  value={mappings.name ?? ""}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor="phone" className="self-center">טלפון</Label>
                <Input 
                  id="phone" 
                  type="number" 
                  min="0" 
                  placeholder="2"
                  value={mappings.phone ?? ""}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Label htmlFor="address" className="self-center">כתובת</Label>
                <Input 
                  id="address" 
                  type="number" 
                  min="0" 
                  placeholder="3"
                  value={mappings.address ?? ""}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">שלב 3: אישור ייבוא</h3>
              <p className="text-sm text-gray-500">המערכת תייבא את הנתונים לפי המיפוי שהגדרת</p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-sm">לחץ על "סיום" כדי להתחיל בייבוא הנתונים.</p>
              <p className="text-sm mt-2">הייבוא עשוי להימשך מספר שניות.</p>
            </div>
          </div>
        )}
        
        <DialogFooter className="flex justify-between">
          {step > 1 && (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              חזרה
            </Button>
          )}
          
          <Button onClick={handleNext} disabled={loading}>
            {loading ? "מעבד..." : step === 3 ? "סיום" : "הבא"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryImportWizard;
