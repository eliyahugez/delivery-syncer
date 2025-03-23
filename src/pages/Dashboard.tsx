
import React, { useState, useEffect } from "react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useAuth } from "@/context/AuthContext";
import DeliveryTable from "@/components/deliveries/DeliveryTable";
import DeliveryGroups from "@/components/deliveries/DeliveryGroups";
import DeliveryImport from "@/components/deliveries/DeliveryImport";
import SheetsUrlSetter from "@/components/settings/SheetsUrlSetter";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ErrorDisplay from "@/components/dashboard/ErrorDisplay";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import DeliveryCompletionDialog from "@/components/deliveries/modals/DeliveryCompletionDialog";
import DeliveryArchiveManager from "@/components/settings/DeliveryArchiveManager";
import { useToast } from "@/components/ui/use-toast";
import { Delivery } from "@/types/delivery";
import { Button } from "@/components/ui/button";
import { RefreshCw, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    deliveries,
    isLoading,
    error,
    isOnline,
    lastSyncTime,
    fetchDeliveries,
    updateStatus,
    pendingUpdates,
    syncPendingUpdates,
    deliveryStatusOptions,
    deliveryGroups,
    clearDeliveries
  } = useDeliveries();

  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "groups">("groups");
  const [showImportModal, setShowImportModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<{
    id: string;
    trackingNumber: string;
    address: string;
    customerName: string;
  } | null>(null);
  
  const { 
    userLocation, 
    nearbyDeliveriesEnabled, 
    toggleNearbyDeliveries 
  } = useLocationTracking();

  // Check for inconsistencies: pending updates but no deliveries
  useEffect(() => {
    if (pendingUpdates > 0 && deliveries.length === 0 && !isLoading) {
      console.log(`Data inconsistency detected: ${pendingUpdates} pending updates but 0 deliveries`);
    }
  }, [pendingUpdates, deliveries.length, isLoading]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchDeliveries(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "לא סונכרן";
    
    return new Intl.DateTimeFormat("he-IL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleUpdateStatus = async (id: string, newStatus: string, updateType?: string) => {
    await updateStatus(id, newStatus, updateType);
  };
  
  const handleDeliveryCompletion = (id: string, deliveryInfo: any) => {
    setSelectedDelivery({
      id,
      trackingNumber: deliveryInfo.trackingNumber,
      address: deliveryInfo.address,
      customerName: deliveryInfo.customerName
    });
    setCompletionDialogOpen(true);
  };
  
  const handleCompleteDelivery = async (recipientName: string) => {
    if (!selectedDelivery) return;
    
    const deliveredOption = deliveryStatusOptions.find(option => 
      option.value.toLowerCase().includes('delivered') || 
      option.value.includes('נמסר')
    );
    
    if (deliveredOption) {
      await updateStatus(
        selectedDelivery.id, 
        deliveredOption.value, 
        `נמסר ל${recipientName}`
      );
      
      toast({
        title: "משלוח הושלם",
        description: `המשלוח נמסר ל${recipientName}`,
        variant: "default"
      });
    }
    
    setCompletionDialogOpen(false);
    setSelectedDelivery(null);
  };
  
  const handleImportComplete = (importedData: any[]) => {
    console.log("Import completed:", importedData.length, "items");
    
    fetchDeliveries();
    setShowImportModal(false);
  };
  
  const handleArchive = (courierName: string, deliveryDate: string) => {
    toast({
      title: "פונקציית ארכיון",
      description: `פונקציה זו תיושם בגרסה הבאה. נבחר: ${courierName}, תאריך: ${deliveryDate}`,
    });
  };
  
  const handleClearDeliveries = () => {
    try {
      clearDeliveries();
      toast({
        title: "נתונים נמחקו",
        description: "כל המשלוחים והעדכונים הממתינים נמחקו מהמערכת המקומית",
        variant: "default"
      });
      setShowClearConfirm(false);
    } catch (error) {
      toast({
        title: "שגיאה במחיקת נתונים",
        description: "אירעה שגיאה במחיקת המשלוחים",
        variant: "destructive"
      });
    }
  };

  const groupsRecord: Record<string, Delivery[]> = {};
  deliveryGroups.forEach(group => {
    groupsRecord[group.customerName] = group.deliveries;
  });

  if (!user?.sheetsUrl) {
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
  }

  return (
    <div className="container mx-auto px-1 py-2 md:px-4 md:py-6">
      <DashboardHeader 
        isOnline={isOnline}
        lastSyncTime={lastSyncTime}
        pendingUpdates={pendingUpdates}
        isSyncing={isSyncing}
        handleSync={handleSync}
        syncPendingUpdates={syncPendingUpdates}
        setShowImportModal={setShowImportModal}
        viewMode={viewMode}
        setViewMode={setViewMode}
        toggleNearbyDeliveries={toggleNearbyDeliveries}
        nearbyDeliveriesEnabled={nearbyDeliveriesEnabled}
        formatDate={formatDate}
      />

      <ErrorDisplay error={error} handleSync={handleSync} />
      
      {/* Data Inconsistency Warning */}
      {pendingUpdates > 0 && deliveries.length === 0 && !isLoading && (
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
      )}
      
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

      <main className="pb-16">
        {viewMode === "table" ? (
          <DeliveryTable
            deliveries={deliveries}
            onUpdateStatus={handleUpdateStatus}
            onCompleteDelivery={handleDeliveryCompletion}
            isLoading={isLoading}
            sheetsUrl={user?.sheetsUrl}
            statusOptions={deliveryStatusOptions}
          />
        ) : (
          <DeliveryGroups
            groups={groupsRecord}
            statusOptions={deliveryStatusOptions}
            onUpdateStatus={handleUpdateStatus}
            onCompleteDelivery={handleDeliveryCompletion}
            isLoading={isLoading}
          />
        )}
      </main>
      
      {selectedDelivery && (
        <DeliveryCompletionDialog
          isOpen={completionDialogOpen}
          onClose={() => setCompletionDialogOpen(false)}
          onComplete={handleCompleteDelivery}
          deliveryInfo={{
            trackingNumber: selectedDelivery.trackingNumber,
            address: selectedDelivery.address,
            customerName: selectedDelivery.customerName
          }}
        />
      )}
      
      {showImportModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
          <DeliveryImport
            onImportComplete={handleImportComplete}
            onClose={() => setShowImportModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
