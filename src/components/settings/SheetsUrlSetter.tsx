
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { cleanSheetUrl } from "@/utils/sheetUrlUtils";

export const SheetsUrlSetter = () => {
  const { user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [sheetsUrl, setSheetsUrl] = useState(user?.sheetsUrl || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.sheetsUrl) {
      setSheetsUrl(user.sheetsUrl);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetsUrl.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין קישור לטבלה",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Clean the URL to extract the spreadsheet ID
      const cleanedUrl = cleanSheetUrl(sheetsUrl);
      
      // Update the user profile with the new URL
      await updateUserProfile({ sheetsUrl: cleanedUrl });
      
      toast({
        title: "הצלחה!",
        description: "קישור לטבלה נשמר בהצלחה",
      });
      
      // Force reload the page to refresh the data
      window.location.reload();
    } catch (error) {
      console.error("Error saving sheets URL:", error);
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
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">הגדרת קישור לטבלת Google Sheets</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sheets-url" className="block text-sm font-medium text-gray-700 mb-1">
            הכנס קישור לטבלת Google Sheets
          </label>
          <Input
            id="sheets-url"
            type="text"
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full"
            dir="ltr"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "שומר..." : "שמור קישור"}
        </Button>
      </form>
    </div>
  );
};

export default SheetsUrlSetter;
