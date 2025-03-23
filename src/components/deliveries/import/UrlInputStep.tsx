
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface UrlInputStepProps {
  sheetsUrl: string;
  sheetId: string | null;
  onSheetsUrlChange: (url: string) => void;
}

const UrlInputStep: React.FC<UrlInputStepProps> = ({ 
  sheetsUrl, 
  sheetId, 
  onSheetsUrlChange 
}) => {
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
          onChange={(e) => onSheetsUrlChange(e.target.value)}
          className="ltr"
          dir="ltr"
        />
        {sheetId && (
          <p className="text-sm text-green-600">מזהה גיליון: {sheetId}</p>
        )}
      </div>
    </div>
  );
};

export default UrlInputStep;
