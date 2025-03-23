
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DataInconsistencyWarningProps {
  pendingUpdates: number;
  isLoading: boolean;
  syncPendingUpdates: () => void;
  clearDeliveries: () => void;
  isVisible: boolean;
}

const DataInconsistencyWarning: React.FC<DataInconsistencyWarningProps> = ({
  pendingUpdates,
  isLoading,
  syncPendingUpdates,
  clearDeliveries,
  isVisible,
}) => {
  if (!isVisible) return null;

  return (
    <Alert className="bg-yellow-50 border border-yellow-200 text-yellow-700 mb-4">
      <AlertDescription>
        <div className="flex flex-col space-y-2">
          <p className="font-medium">נמצאו {pendingUpdates} עדכונים ממתינים אך אין משלוחים להצגה.</p>
          <p>עדכן את הנתונים או נקה את העדכונים הממתינים כדי לפתור את הבעיה.</p>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncPendingUpdates()}
              className="text-yellow-700 border-yellow-400 hover:bg-yellow-100"
            >
              סנכרן עדכונים
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => clearDeliveries()}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              נקה עדכונים ממתינים
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default DataInconsistencyWarning;
