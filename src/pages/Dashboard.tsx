
import React, { useState, useEffect } from "react";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  CloudSun, 
  RefreshCw, 
  Filter, 
  Grid, 
  List, 
  Upload,
  Users,
  MapPin
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeliveryTable from "@/components/deliveries/DeliveryTable";
import DeliveryGroups from "@/components/deliveries/DeliveryGroups";
import DeliveryImport from "@/components/deliveries/DeliveryImport";

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
  const [viewMode, setViewMode] = useState<"table" | "groups">("table"); // Changed default to table
  const [showImportModal, setShowImportModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyDeliveriesEnabled, setNearbyDeliveriesEnabled] = useState(false);

  // Get user's location if they allow it
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          console.log("Got user location:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

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

  // Toggle nearby deliveries mode
  const toggleNearbyDeliveries = () => {
    if (!userLocation) {
      // Ask for location permission if we don't have it
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setNearbyDeliveriesEnabled(true);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("לא ניתן לקבל את המיקום שלך. בדוק את הרשאות המיקום בדפדפן.");
        }
      );
    } else {
      setNearbyDeliveriesEnabled(!nearbyDeliveriesEnabled);
    }
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
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              ייבוא משלוחים
            </Button>
            
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
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === "groups" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("groups")}
            >
              <Users className="h-4 w-4 mr-2" />
              לפי לקוחות
            </Button>
            <Button 
              variant={viewMode === "table" ? "default" : "outline"} 
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4 mr-2" />
              טבלת משלוחים
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={nearbyDeliveriesEnabled ? "default" : "outline"}
              size="sm"
              onClick={toggleNearbyDeliveries}
              className={nearbyDeliveriesEnabled ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              <MapPin className="h-4 w-4 mr-2" />
              משלוחים קרובים אליי
            </Button>
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              סינון
            </Button>
          </div>
        </div>
      </header>

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
