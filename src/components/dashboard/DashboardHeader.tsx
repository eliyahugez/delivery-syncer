
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  CloudSun, 
  RefreshCw, 
  Filter, 
  Grid, 
  List, 
  Upload,
  Users,
  MapPin
} from 'lucide-react';

interface DashboardHeaderProps {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingUpdates: number;
  isSyncing: boolean;
  handleSync: () => void;
  syncPendingUpdates: () => void;
  setShowImportModal: (show: boolean) => void;
  viewMode: "table" | "groups";
  setViewMode: (mode: "table" | "groups") => void;
  toggleNearbyDeliveries: () => void;
  nearbyDeliveriesEnabled: boolean;
  formatDate: (date: Date | null) => string;
}

const DashboardHeader = ({
  isOnline,
  lastSyncTime,
  pendingUpdates,
  isSyncing,
  handleSync,
  syncPendingUpdates,
  setShowImportModal,
  viewMode,
  setViewMode,
  toggleNearbyDeliveries,
  nearbyDeliveriesEnabled,
  formatDate
}: DashboardHeaderProps) => {
  return (
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
            <CloudSun className="h-4 w-4" />
            עדכן סטטוסים
          </Button>
        </div>
      </div>
      
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
  );
};

export default DashboardHeader;
