
import React from 'react';
import ImportPreviewTable from './ImportPreviewTable';

interface PreviewStepProps {
  previewData: any[];
}

const PreviewStep: React.FC<PreviewStepProps> = ({ previewData }) => {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">שלב 2: תצוגה מקדימה של הנתונים</h3>
        <p className="text-sm text-gray-500">המערכת מצאה את הנתונים הבאים בגיליון. האם לייבא אותם?</p>
      </div>
      
      <ImportPreviewTable previewData={previewData} />
      
      <p className="text-sm text-gray-500">
        {previewData.length > 5 
          ? `מוצגים 5 מתוך ${previewData.length} רשומות. לחץ "ייבא" כדי לייבא את כל הנתונים.` 
          : ''}
      </p>
    </div>
  );
};

export default PreviewStep;
