
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDeliveryImport } from '@/hooks/useDeliveryImport';
import UrlInputStep from './import/UrlInputStep';
import PreviewStep from './import/PreviewStep';

interface DeliveryImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (importedData: any[]) => void;
  sheetsUrl?: string;
  onSubmit?: (mappings: Record<string, number>) => void;
}

const DeliveryImportWizard: React.FC<DeliveryImportWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  sheetsUrl: initialSheetsUrl,
  onSubmit
}) => {
  const {
    sheetsUrl,
    setSheetsUrl,
    sheetId,
    step,
    setStep,
    isLoading,
    previewData,
    error,
    fetchPreview,
    importDeliveries
  } = useDeliveryImport(initialSheetsUrl);
  
  const handleNext = async () => {
    if (step === 1) {
      fetchPreview();
    } else if (step === 2) {
      const result = await importDeliveries();
      if (result) {
        if (onSubmit && result.columnMappings) {
          onSubmit(result.columnMappings);
        }
        
        if (onImportComplete && result.deliveries) {
          onImportComplete(result.deliveries);
        }
        
        onClose();
      }
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <UrlInputStep 
            sheetsUrl={sheetsUrl} 
            sheetId={sheetId} 
            onSheetsUrlChange={setSheetsUrl} 
          />
        );
      
      case 2:
        return <PreviewStep previewData={previewData} />;
      
      default:
        return null;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>אשף ייבוא משלוחים</DialogTitle>
        </DialogHeader>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            <p>{error}</p>
          </div>
        )}
        
        {renderStep()}
        
        <DialogFooter className="flex justify-between">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isLoading}>
              חזרה
            </Button>
          )}
          
          <Button onClick={handleNext} disabled={isLoading || (step === 1 && !sheetId)}>
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                <span>מעבד...</span>
              </>
            ) : (
              step === 2 ? "ייבא משלוחים" : "המשך"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryImportWizard;
