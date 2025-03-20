
import React, { useState } from "react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { CloudSun, RefreshCw } from "lucide-react";
import DeliveryTable from "@/components/deliveries/DeliveryTable";

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
    deliveryStatusOptions
  } = useDeliveries();

  const [isSyncing, setIsSyncing] = useState(false);

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

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">לוח בקרת משלוחים</h1>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="text-sm text-muted-foreground">
            <p>
              {isOnline ? (
                <span className="text-green-500 font-medium">מחובר לאינטרנט</span>
              ) : (
                <span className="text-red-500 font-medium">לא מחובר לאינטרנט - מצב לא מקוון</span>
              )}
            </p>
            <p>עדכון אחרון: {formatDate(lastSyncTime)}</p>
            {pendingUpdates > 0 && (
              <div className="text-amber-600 mt-1">
                {pendingUpdates} עדכונים ממתינים לסנכרון
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mr-2 ml-2"
                  onClick={() => syncPendingUpdates()}
                  disabled={!isOnline}
                >
                  סנכרן עכשיו
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              className="flex items-center gap-2"
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
            >
              <CloudSun className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "מסנכרן..." : "סנכרן משלוחים"}
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => syncPendingUpdates()}
              disabled={pendingUpdates === 0 || !isOnline}
            >
              <RefreshCw className="h-4 w-4" />
              עדכן סטטוסים
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            <p className="font-medium">שגיאה בטעינת המשלוחים:</p>
            <p>{error}</p>
          </div>
        )}
      </header>

      <main>
        <DeliveryTable
          deliveries={deliveries}
          onUpdateStatus={handleUpdateStatus}
          isLoading={isLoading}
          sheetsUrl={user?.sheetsUrl}
          statusOptions={deliveryStatusOptions}
        />
      </main>
    </div>
  );
};

export default Dashboard;
