import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useUser } from "@/context/AuthContext";
import { isValidSheetUrl, cleanSheetUrl } from '@/utils/sheetUrlUtils';

interface SheetsUrlSetterProps {
  onSync: () => void;
}

const SheetsUrlSetter: React.FC<SheetsUrlSetterProps> = ({ onSync }) => {
  const { toast } = useToast();
  const { user, updateUserProfile } = useUser();
  const [urlInput, setUrlInput] = useState(user?.sheetsUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.sheetsUrl) {
      setUrlInput(user.sheetsUrl);
    }
  }, [user?.sheetsUrl]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
    setError(null);
  };
  
  // Update the toast variant - change from "success" (invalid) to "default"
  const handleSaveClick = async () => {
    setIsSaving(true);
    
    try {
      if (!isValidSheetUrl(urlInput)) {
        setError("הקישור אינו תקין, אנא הזן קישור תקין");
        setIsSaving(false);
        return;
      }
      
      // Clean the URL to just the ID
      const cleanedUrl = cleanSheetUrl(urlInput);
      
      if (!user) {
        toast({
          title: "שגיאה",
          description: "אתה חייב להיות מחובר כדי לשמור הגדרות",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      
      await updateUserProfile({ sheetsUrl: cleanedUrl });
      
      toast({
        title: "הקישור נשמר בהצלחה",
        description: "ניתן עכשיו לסנכרן נתונים מהטבלה",
        variant: "default",  // Changed from "success" to "default"
      });
      
      onSync();
    } catch (e) {
      console.error("Error saving sheets URL:", e);
      
      toast({
        title: "שגיאה בשמירת הקישור",
        description: e instanceof Error ? e.message : "אירעה שגיאה לא ידועה",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold">קישור לטבלת Google Sheets</h2>
      <Input 
        type="url"
        placeholder="הדבק קישור לטבלה"
        value={urlInput}
        onChange={handleInputChange}
        className="w-full"
      />
      {error && <p className="text-red-500">{error}</p>}
      <Button onClick={handleSaveClick} disabled={isSaving}>
        {isSaving ? "שומר..." : "שמור קישור"}
      </Button>
    </div>
  );
};

export default SheetsUrlSetter;
