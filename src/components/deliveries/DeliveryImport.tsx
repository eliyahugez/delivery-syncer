
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { DownloadCloud, Settings } from 'lucide-react';
import DeliveryImportWizard from './DeliveryImportWizard';
import { useAuth } from '@/context/AuthContext';

interface DeliveryImportProps {
  onImportComplete?: (importedData: any[]) => void;
  onClose?: () => void;
}

const DeliveryImport: React.FC<DeliveryImportProps> = ({
  onImportComplete = () => {},
  onClose = () => {}
}) => {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleOpenWizard = () => {
    setIsWizardOpen(true);
  };
  
  const handleImportComplete = (importedData: any[]) => {
    onImportComplete(importedData);
    setIsWizardOpen(false);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-xl font-bold mb-4 text-center">ייבוא משלוחים</h2>
      
      <div className="space-y-4">
        <p className="text-gray-600 text-center">
          ייבא משלוחים מטבלת Google Sheets לתוך המערכת
        </p>
        
        <div className="flex flex-col space-y-2">
          <Button 
            onClick={handleOpenWizard}
            variant="default"
            className="w-full"
          >
            <DownloadCloud className="mr-2 h-4 w-4" />
            <span>התחל בייבוא</span>
          </Button>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            סגור
          </Button>
        </div>
      </div>
      
      {isWizardOpen && (
        <DeliveryImportWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
};

export default DeliveryImport;
