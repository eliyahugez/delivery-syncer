
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { DownloadCloud, Settings, RefreshCw } from 'lucide-react';
import DeliveryImportWizard from './DeliveryImportWizard';
import { isValidSheetUrl } from '@/utils/sheetUrlUtils';

interface DeliveryImportProps {
  onImportComplete?: (importedData: any[], mappings: Record<string, string>) => void;
  onImport?: (forceRefresh?: boolean) => Promise<void>;
  onColumnMappingSubmit?: (mappings: Record<string, number>) => void;
  isLoading?: boolean;
  onClose?: () => void;
}

const DeliveryImport: React.FC<DeliveryImportProps> = ({
  onImportComplete,
  onImport,
  onColumnMappingSubmit,
  isLoading = false,
  onClose
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleImport = async () => {
    try {
      if (onImport) {
        await onImport(true);
      }
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
    
    if (onColumnMappingSubmit) {
      onColumnMappingSubmit(mappings);
    }
    
    // Also call onImportComplete with empty array and string mappings when needed
    if (onImportComplete) {
      const stringMappings: Record<string, string> = {};
      Object.entries(mappings).forEach(([key, value]) => {
        stringMappings[key] = value.toString();
      });
      onImportComplete([], stringMappings);
    }
  };
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
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
      
      {onClose && (
        <Button 
          onClick={handleClose}
          variant="outline" 
          size="sm"
          className="mt-2 sm:mt-0"
        >
          סגור
        </Button>
      )}
    </div>
  );
};

export default DeliveryImport;
