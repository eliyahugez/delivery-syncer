
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Link, Loader2 } from "lucide-react";
import { isValidSheetUrl, cleanSheetUrl, getDisplaySheetUrl } from "@/utils/sheetUrlUtils";

export const SheetsUrlSetter = () => {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [sheetsUrl, setSheetsUrl] = useState(user?.sheetsUrl || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (user?.sheetsUrl) {
      setSheetsUrl(user.sheetsUrl);
    }
  }, [user]);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setError("נא להזין קישור לטבלה");
      return false;
    }

    if (!isValidSheetUrl(url)) {
      setError("קישור לא תקין. נא להזין קישור תקין ל-Google Sheets");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateUrl(sheetsUrl)) {
      return;
    }

    setIsLoading(true);
    try {
      // Clean the URL to extract the spreadsheet ID
      const cleanedUrl = cleanSheetUrl(sheetsUrl);
      
      if (!cleanedUrl) {
        throw new Error("לא הצלחנו לזהות מזהה תקין בקישור");
      }
      
      // Update the user profile with the new URL
      await updateUserProfile({ sheetsUrl: cleanedUrl });
      
      setShowSuccess(true);
      
      toast({
        title: "הצלחה!",
        description: "קישור לטבלה נשמר בהצלחה",
      });
      
      // Wait a moment before reloading to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Error saving sheets URL:", error);
      
      setError(
        error instanceof Error 
          ? error.message 
          : "אירעה שגיאה בשמירת הקישור. נא לנסות שוב."
      );
      
      toast({
        title: "שגיאה בשמירת הקישור",
        description: error instanceof Error ? error.message : "אירעה שגיאה לא ידועה",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-lg text-right font-semibold">הגדרת קישור לטבלת Google Sheets</CardTitle>
        <CardDescription className="text-right">הזן קישור לטבלת Google Sheets לסנכרון נתוני המשלוחים</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="sheets-url" className="block text-sm font-medium text-gray-700 text-right">
              קישור לטבלת Google Sheets
            </label>
            
            <div className="flex items-center gap-2">
              <Input
                id="sheets-url"
                type="text"
                value={sheetsUrl}
                onChange={(e) => {
                  setSheetsUrl(e.target.value);
                  setError(null);
                  setShowSuccess(false);
                }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full"
                dir="ltr"
                disabled={isLoading || showSuccess}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(sheetsUrl);
                    toast({
                      title: "הועתק ללוח",
                      duration: 2000,
                    });
                  } catch (e) {
                    console.error("Failed to copy:", e);
                  }
                }}
                disabled={!sheetsUrl || isLoading || showSuccess}
              >
                <Link className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-right">
              ודא שהטבלה משותפת לציבור עם הרשאות קריאה לפחות
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive" className="text-right">
              <AlertCircle className="h-4 w-4 ml-2" />
              <AlertTitle className="text-right">שגיאה</AlertTitle>
              <AlertDescription className="text-right">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {showSuccess && (
            <Alert variant="success" className="bg-green-50 border-green-200 text-green-800 text-right">
              <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />
              <AlertTitle className="text-right">נשמר בהצלחה</AlertTitle>
              <AlertDescription className="text-right">
                הקישור לטבלה נשמר בהצלחה. הדף יתרענן בקרוב.
              </AlertDescription>
            </Alert>
          )}
          
          {user?.sheetsUrl && !error && !showSuccess && (
            <Alert className="bg-blue-50 border-blue-200 text-blue-800 text-right">
              <AlertDescription className="text-right">
                קישור נוכחי: <span className="font-mono">{getDisplaySheetUrl(user.sheetsUrl)}</span>
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || showSuccess || !sheetsUrl}
          >
            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isLoading ? "שומר..." : "שמור קישור"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SheetsUrlSetter;
