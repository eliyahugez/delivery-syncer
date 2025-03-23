
import React from "react";
import SheetsUrlSetter from "@/components/settings/SheetsUrlSetter";

interface SetupInstructionsProps {
  handleSync: () => void;
}

const SetupInstructions: React.FC<SetupInstructionsProps> = ({ handleSync }) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">לוח בקרת משלוחים</h1>
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6">
        <p className="font-medium">כדי להתחיל להשתמש במערכת, אנא הגדר קישור לטבלת Google Sheets:</p>
      </div>
      
      <SheetsUrlSetter onSync={handleSync} />
      
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
        <p className="font-medium">הוראות:</p>
        <ol className="list-decimal list-inside mt-2 space-y-1">
          <li>ודא כי טבלת Google Sheets שלך מוגדרת כציבורית או משותפת עם הרשאות צפייה לכל מי שיש לו את הלינק</li>
          <li>וודא שיש בטבלה לפחות עמודות עבור: מספר מעקב, שם לקוח, טלפון, כתובת וסטטוס</li>
          <li>העתק את הלינק לטבלה והדבק אותו בשדה למעלה</li>
        </ol>
      </div>
    </div>
  );
};

export default SetupInstructions;
