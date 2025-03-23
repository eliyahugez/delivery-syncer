
import React, { useState, useEffect } from "react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useAuth } from "@/context/AuthContext";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useToast } from "@/components/ui/use-toast";
import { Delivery } from "@/types/delivery";

// Components
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ErrorDisplay from "@/components/dashboard/ErrorDisplay";
import DeliveryCompletionDialog from "@/components/deliveries/modals/DeliveryCompletionDialog";
import DeliveryImport from "@/components/deliveries/DeliveryImport";
import DashboardContent from "@/components/dashboard/DashboardContent";
import DataInconsistencyWarning from "@/components/dashboard/DataInconsistencyWarning";
import DashboardActions from "@/components/dashboard/DashboardActions";
import SetupInstructions from "@/components/dashboard/SetupInstructions";

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

  // Create groups record for delivery groups component
  const groupsRecord: Record<string, Delivery[]> = {};
  if (deliveryGroups.deliveryGroups) {
    deliveryGroups.deliveryGroups.forEach(group => {
      groupsRecord[group.customerName] = group.deliveries;
    });
  }

  // Show setup instructions if no sheets URL is configured
  if (!user?.sheetsUrl) {
    return <SetupInstructions handleSync={handleSync} />;
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
      <DataInconsistencyWarning 
        pendingUpdates={pendingUpdates} 
        isLoading={isLoading}
        syncPendingUpdates={syncPendingUpdates}
        clearDeliveries={clearDeliveries}
        isVisible={pendingUpdates > 0 && deliveries.length === 0 && !isLoading}
      />
      
      <DashboardActions 
        handleArchive={handleArchive}
        setShowImportModal={setShowImportModal}
        handleSync={handleSync}
        isSyncing={isSyncing}
        showClearConfirm={showClearConfirm}
        setShowClearConfirm={setShowClearConfirm}
        handleClearDeliveries={handleClearDeliveries}
      />

      <main className="pb-16">
        <DashboardContent
          viewMode={viewMode}
          deliveries={deliveries}
          onUpdateStatus={handleUpdateStatus}
          onCompleteDelivery={handleDeliveryCompletion}
          isLoading={isLoading}
          sheetsUrl={user?.sheetsUrl}
          statusOptions={deliveryStatusOptions}
          groupsRecord={groupsRecord}
        />
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
