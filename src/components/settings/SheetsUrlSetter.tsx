
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/context/AuthContext";
import { isValidSheetUrl, cleanSheetUrl } from '@/utils/sheetUrlUtils';
import { RefreshCw } from 'lucide-react';

interface SheetsUrlSetterProps {
  onSync: () => void;
}

const SheetsUrlSetter: React.FC<SheetsUrlSetterProps> = ({ onSync }) => {
  const { toast } = useToast();
  const { user, updateUserProfile } = useAuth();
  const [urlInput, setUrlInput] = useState(user?.sheetsUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.sheetsUrl) {
      setUrlInput(user.sheetsUrl);
    }
  }, [user?.sheetsUrl]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlInput(value);
    setError(null);
    setFeedbackMessage(null);
    
    // Provide instant feedback on URL format
    if (value && !value.includes('docs.google.com/spreadsheets')) {
      setFeedbackMessage("הקישור צריך להיות לגיליון Google Sheets");
    } else if (value && isValidSheetUrl(value)) {
      const cleanedUrl = cleanSheetUrl(value);
      setFeedbackMessage(`מזהה גיליון תקין: ${cleanedUrl}`);
    } else if (value) {
      setFeedbackMessage("הקישור לא תואם את הפורמט הנדרש של Google Sheets");
    }
  };
  
  const handleSaveClick = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      if (!urlInput.trim()) {
        setError("נא להזין קישור לטבלה");
        setIsSaving(false);
        return;
      }
      
      if (!isValidSheetUrl(urlInput)) {
        setError("הקישור אינו תקין. נדרש קישור לגיליון Google Sheets");
        setIsSaving(false);
        return;
      }
      
      // Clean the URL to just the ID
      const cleanedUrl = cleanSheetUrl(urlInput);
      
      if (!cleanedUrl) {
        setError("לא ניתן לחלץ מזהה תקין מהקישור");
        setIsSaving(false);
        return;
      }
      
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
        variant: "default",
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

  const handleForceSync = () => {
    setIsSyncing(true);
    try {
      onSync();
      toast({
        title: "מסנכרן נתונים מחדש",
        description: "גורם לסנכרון מלא של כל הנתונים מהטבלה",
        variant: "default",
      });
    } catch (e) {
      toast({
        title: "שגיאה בסנכרון",
        description: e instanceof Error ? e.message : "אירעה שגיאה בסנכרון הנתונים",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <h2 className="text-lg font-semibold">קישור לטבלת Google Sheets</h2>
      <div className="space-y-2">
        <Input 
          type="url"
          placeholder="הדבק קישור לטבלה"
          value={urlInput}
          onChange={handleInputChange}
          className={`w-full ${error ? 'border-red-500' : feedbackMessage && !error ? 'border-green-500' : ''}`}
        />
        {feedbackMessage && !error && (
          <p className="text-green-600 text-sm">{feedbackMessage}</p>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="text-xs text-gray-500 mt-1">
          הקישור צריך להיות בפורמט: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSaveClick} disabled={isSaving}>
          {isSaving ? "שומר..." : "שמור קישור"}
        </Button>
        
        {urlInput && isValidSheetUrl(urlInput) && (
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleForceSync}
            className="flex items-center gap-1"
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            סנכרן עם כוח (Force Refresh)
          </Button>
        )}
      </div>
      
      {user?.sheetsUrl && (
        <div className="mt-4 p-3 bg-slate-50 rounded-md border border-slate-200">
          <h3 className="text-md font-medium">טיפים לסנכרון</h3>
          <ul className="list-disc mr-5 mt-2 text-sm text-slate-700">
            <li>וודא שיש הרשאות ציבוריות לצפייה בגיליון</li>
            <li>אם אין נתונים שמופיעים, נסה ללחוץ על "סנכרן עם כוח"</li>
            <li>וודא שיש עמודה עם מספרי מעקב בפורמט GWD או TM</li>
            <li>וודא שיש כתובות תקינות בעמודה 5</li>
            <li>וודא שיש שמות לקוחות בעמודה 6</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SheetsUrlSetter;
