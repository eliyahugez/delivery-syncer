
import React from 'react';
import SheetsUrlSetter from '@/components/settings/SheetsUrlSetter';

interface ErrorDisplayProps {
  error: string | null;
  handleSync: () => void;
}

const ErrorDisplay = ({ error, handleSync }: ErrorDisplayProps) => {
  if (!error) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
      <p className="font-medium">שגיאה בטעינת המשלוחים:</p>
      <p>{error}</p>
      
      {error.includes("לא הוגדר קישור לטבלה") && (
        <div className="mt-4">
          <SheetsUrlSetter onSync={handleSync} />
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;
