
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { extractSheetId } from '@/utils/sheetUrlUtils';

export function useDeliveryImport(initialSheetsUrl?: string) {
  const { toast } = useToast();
  const [sheetsUrl, setSheetsUrl] = useState(initialSheetsUrl || "");
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
  
  // If initialSheetsUrl is provided, auto-advance to preview step
  useEffect(() => {
    if (initialSheetsUrl && step === 1) {
      fetchPreview();
    }
  }, [initialSheetsUrl]);
  
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
      
      return {
        deliveries: response.data.deliveries,
        columnMappings: response.data.columnMappings
      };
    } catch (err) {
      console.error("Error importing deliveries:", err);
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
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
  };
}
