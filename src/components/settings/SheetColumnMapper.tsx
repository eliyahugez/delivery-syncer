
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { TableProperties, MapPin } from 'lucide-react';
import DeliveryImportWizard from '@/components/deliveries/DeliveryImportWizard';
import { useAuth } from '@/context/AuthContext';

interface SheetColumnMapperProps {
  onMappingComplete?: (mappings: Record<string, number>) => void;
}

const SheetColumnMapper: React.FC<SheetColumnMapperProps> = ({ onMappingComplete }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const handleOpenWizard = () => {
    if (!user?.sheetsUrl) {
      toast({
        title: "לא הוגדר קישור לטבלה",
        description: "אנא הגדר קישור לטבלת Google Sheets בהגדרות המשתמש",
        variant: "destructive"
      });
      return;
    }
    
    setIsWizardOpen(true);
  };
  
  const handleMappingSubmit = (mappings: Record<string, number>) => {
    if (onMappingComplete) {
      onMappingComplete(mappings);
    }
    
    toast({
      title: "מיפוי עמודות בוצע בהצלחה",
      description: "המערכת תשתמש במיפוי זה בסנכרון הבא של המשלוחים"
    });
    
    setIsWizardOpen(false);
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        className="w-full" 
        onClick={handleOpenWizard}
      >
        <TableProperties className="mr-2 h-4 w-4" />
        <span>הגדר מיפוי עמודות</span>
      </Button>
      
      {isWizardOpen && user?.sheetsUrl && (
        <DeliveryImportWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          sheetsUrl={user.sheetsUrl}
          onSubmit={handleMappingSubmit}
        />
      )}
    </>
  );
};

export default SheetColumnMapper;
