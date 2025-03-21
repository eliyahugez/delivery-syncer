
import React, { useState } from "react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useAuth } from "@/context/AuthContext";
import DeliveryTable from "@/components/deliveries/DeliveryTable";
import DeliveryGroups from "@/components/deliveries/DeliveryGroups";
import DeliveryImport from "@/components/deliveries/DeliveryImport";
import SheetsUrlSetter from "@/components/settings/SheetsUrlSetter";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ErrorDisplay from "@/components/dashboard/ErrorDisplay";
import { useLocationTracking } from "@/hooks/useLocationTracking";

const Dashboard = () => {
  const { user } = useAuth();
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
    deliveryGroups
  } = useDeliveries();

  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "groups">("groups"); // Default to groups view
  const [showImportModal, setShowImportModal] = useState(false);
  
  const { 
    userLocation, 
    nearbyDeliveriesEnabled, 
    toggleNearbyDeliveries 
  } = useLocationTracking();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchDeliveries();
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
  
  const handleImportComplete = (importedData: any[], mappings: Record<string, string>) => {
    console.log("Import completed:", importedData.length, "items");
    console.log("Column mappings:", mappings);
    
    // Refresh data after import
    fetchDeliveries();
    setShowImportModal(false);
  };

  // Show the SheetsUrlSetter if no sheets URL is provided
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
    <div className="container mx-auto px-4 py-6">
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

      <main>
        {viewMode === "table" ? (
          <DeliveryTable
            deliveries={deliveries}
            onUpdateStatus={handleUpdateStatus}
            isLoading={isLoading}
            sheetsUrl={user?.sheetsUrl}
            statusOptions={deliveryStatusOptions}
          />
        ) : (
          <DeliveryGroups
            groups={deliveryGroups}
            statusOptions={deliveryStatusOptions}
            onUpdateStatus={handleUpdateStatus}
            isLoading={isLoading}
          />
        )}
      </main>
      
      {/* Import Modal */}
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
