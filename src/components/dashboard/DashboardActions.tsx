
import React from "react";
import { Button } from "@/components/ui/button";
import DeliveryArchiveManager from "@/components/settings/DeliveryArchiveManager";
import { Upload, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

interface DashboardActionsProps {
  handleArchive: (courierName: string, deliveryDate: string) => void;
  setShowImportModal: (show: boolean) => void;
  handleSync: () => void;
  isSyncing: boolean;
  showClearConfirm: boolean;
  setShowClearConfirm: (show: boolean) => void;
  handleClearDeliveries: () => void;
}

const DashboardActions: React.FC<DashboardActionsProps> = ({
  handleArchive,
  setShowImportModal,
  handleSync,
  isSyncing,
  showClearConfirm,
  setShowClearConfirm,
  handleClearDeliveries,
}) => {
  return (
    <div className="mb-4 flex justify-between items-center">
      <DeliveryArchiveManager onArchive={handleArchive} />
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-green-600 border-green-200 hover:bg-green-50"
          onClick={() => setShowImportModal(true)}
        >
          <Upload className="h-4 w-4 mr-1" />
          ייבוא משלוחים
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          סנכרון
        </Button>
        
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              ניקוי נתונים
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ניקוי משלוחים</DialogTitle>
              <DialogDescription>
                האם אתה בטוח שברצונך למחוק את כל המשלוחים והעדכונים הממתינים? פעולה זו לא ניתנת לביטול.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowClearConfirm(false)}>ביטול</Button>
              <Button variant="destructive" onClick={handleClearDeliveries}>מחק משלוחים</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DashboardActions;
