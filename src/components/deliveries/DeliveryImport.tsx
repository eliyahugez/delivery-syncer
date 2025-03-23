
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { DownloadCloud, Settings, RefreshCw } from 'lucide-react';
import DeliveryImportWizard from './DeliveryImportWizard';
import { isValidSheetUrl } from '@/utils/sheetUrlUtils';

interface DeliveryImportProps {
  onImport: (forceRefresh?: boolean) => Promise<void>;
  onColumnMappingSubmit: (mappings: Record<string, number>) => void;
  isLoading: boolean;
}

const DeliveryImport: React.FC<DeliveryImportProps> = ({
  onImport,
  onColumnMappingSubmit,
  isLoading
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleImport = async () => {
    try {
      await onImport(true);
    } catch (error) {
      console.error("Error importing deliveries:", error);
      toast({
        title: "שגיאת ייבוא",
        description: error instanceof Error ? error.message : "שגיאה בייבוא הנתונים",
        variant: "destructive"
      });
    }
  };
  
  const handleOpenWizard = () => {
    if (!user?.sheetsUrl || !isValidSheetUrl(user.sheetsUrl)) {
      toast({
        title: "נדרש קישור לטבלה",
        description: "אנא הגדר קישור תקין לטבלת Google Sheets בהגדרות המשתמש",
        variant: "destructive"
      });
      return;
    }
    
    setIsWizardOpen(true);
  };
  
  const handleSubmitMapping = (mappings: Record<string, number>) => {
    console.log("Import completed:", Object.keys(mappings).length, "items");
    onColumnMappingSubmit(mappings);
  };
  
  return (
    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:space-x-reverse">
      <Button 
        onClick={handleImport}
        disabled={isLoading || !user?.sheetsUrl}
        variant="default"
        size="sm"
        className="flex items-center justify-center w-full sm:w-auto"
      >
        {isLoading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <DownloadCloud className="mr-2 h-4 w-4" />
        )}
        <span>ייבא נתונים</span>
      </Button>
      
      <Button
        onClick={handleOpenWizard}
        disabled={isLoading || !user?.sheetsUrl}
        variant="outline"
        size="sm"
        className="flex items-center justify-center w-full sm:w-auto"
      >
        <Settings className="mr-2 h-4 w-4" />
        <span>הגדרות ייבוא</span>
      </Button>
      
      {isWizardOpen && user?.sheetsUrl && (
        <DeliveryImportWizard 
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          sheetsUrl={user.sheetsUrl}
          onSubmit={handleSubmitMapping}
        />
      )}
    </div>
  );
};

export default DeliveryImport;
