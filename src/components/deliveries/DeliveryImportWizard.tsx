
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { extractSheetId } from '@/utils/sheetUrlUtils';

interface DeliveryImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedData: any[]) => void;
}

const DeliveryImportWizard: React.FC<DeliveryImportWizardProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const { toast } = useToast();
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Extract sheet ID when URL changes
  useEffect(() => {
    if (sheetsUrl) {
      const id = extractSheetId(sheetsUrl);
      setSheetId(id);
    } else {
      setSheetId(null);
    }
  }, [sheetsUrl]);
  
  const fetchPreview = async () => {
    if (!sheetId) {
      setError("לא ניתן לחלץ מזהה גיליון תקין מהקישור");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the Supabase function to get preview data
      const response = await supabase.functions.invoke("sync-sheets", {
        body: { 
          sheetsUrl: sheetId,
          preview: true
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "שגיאה בטעינת נתונים מהגיליון");
      }
      
      // Check if we have valid preview data
      if (!response.data || !response.data.previewData || !Array.isArray(response.data.previewData)) {
        throw new Error("לא התקבלו נתונים תקינים מהגיליון");
      }
      
      setPreviewData(response.data.previewData);
      setStep(2); // Move to the preview step
    } catch (err) {
      console.error("Error fetching preview:", err);
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setIsLoading(false);
    }
  };
  
  const importDeliveries = async () => {
    if (!sheetId) {
      setError("מזהה גיליון חסר");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the Supabase function to import data
      const response = await supabase.functions.invoke("sync-sheets", {
        body: { 
          sheetsUrl: sheetId,
          forceRefresh: true
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "שגיאה בייבוא נתונים מהגיליון");
      }
      
      // Check if we have valid delivery data
      if (!response.data || !response.data.deliveries || !Array.isArray(response.data.deliveries)) {
        throw new Error("לא התקבלו נתוני משלוחים תקינים");
      }
      
      toast({
        title: "ייבוא הושלם בהצלחה",
        description: `יובאו ${response.data.deliveries.length} משלוחים`,
      });
      
      onImportComplete(response.data.deliveries);
      onClose();
    } catch (err) {
      console.error("Error importing deliveries:", err);
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNext = () => {
    if (step === 1) {
      fetchPreview();
    } else if (step === 2) {
      importDeliveries();
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">שלב 1: הכנס קישור לטבלת Google Sheets</h3>
              <p className="text-sm text-gray-500">הכנס את הקישור לטבלה שממנה תרצה לייבא משלוחים</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sheetsUrl">קישור לגיליון</Label>
              <Input 
                id="sheetsUrl"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="ltr"
                dir="ltr"
              />
              {sheetId && (
                <p className="text-sm text-green-600">מזהה גיליון: {sheetId}</p>
              )}
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">שלב 2: תצוגה מקדימה של הנתונים</h3>
              <p className="text-sm text-gray-500">המערכת מצאה את הנתונים הבאים בגיליון. האם לייבא אותם?</p>
            </div>
            
            <ScrollArea className="h-[300px] rounded-md border">
              {previewData.length > 0 ? (
                <Table>
                  <TableHeader>
                    {previewData[0] && Object.keys(previewData[0]).map((key, i) => (
                      <TableHead key={i}>{key}</TableHead>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(0, 5).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {Object.values(row).map((cell: any, cellIndex) => (
                          <TableCell key={cellIndex}>{String(cell)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  אין נתונים להצגה
                </div>
              )}
            </ScrollArea>
            
            <p className="text-sm text-gray-500">
              {previewData.length > 5 
                ? `מוצגים 5 מתוך ${previewData.length} רשומות. לחץ "ייבא" כדי לייבא את כל הנתונים.` 
                : ''}
            </p>
          </div>
        );
      
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
