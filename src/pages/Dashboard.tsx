import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import Header from '@/components/layout/Header';
import DeliveryTable from '@/components/deliveries/DeliveryTable';
import { useAuth } from '@/context/AuthContext';
import { useDeliveries } from '@/hooks/useDeliveries';
import { WifiOff, RefreshCw, AlertTriangle, FileText, FileWarning, Users, Database, CloudSun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/components/ui/use-toast';
import { Delivery } from '@/types/delivery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Dashboard: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { 
    deliveries, 
    isLoading, 
    error, 
    fetchDeliveries, 
    updateStatus,
    isOnline,
    lastSyncTime,
    isTestData,
    pendingUpdates,
    syncDatabase,
    syncPendingUpdates
  } = useDeliveries();

  const [activeTab, setActiveTab] = useState<string>("all");
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const formatLastSync = () => {
    if (!lastSyncTime) return 'לא סונכרן';
    
    try {
      return formatDistanceToNow(lastSyncTime, { 
        addSuffix: true,
        locale: he 
      });
    } catch (e) {
      return 'לא ידוע';
    }
  };

  // Group deliveries by assignedTo
  const getDeliveryGroups = () => {
    const groups: Record<string, Delivery[]> = {
      all: [...deliveries]
    };
    
    // Create groups by assignedTo
    deliveries.forEach(delivery => {
      const courier = delivery.assignedTo || 'לא שויך';
      if (!groups[courier]) {
        groups[courier] = [];
      }
      groups[courier].push(delivery);
    });
    
    return groups;
  };

  const deliveryGroups = getDeliveryGroups();
  const couriers = Object.keys(deliveryGroups).filter(key => key !== 'all');

  const handleSyncDatabase = async () => {
    if (!isOnline) {
      toast({
        title: 'אין חיבור לאינטרנט',
        description: 'לא ניתן לסנכרן עם הדאטאבייס כרגע. נסה שוב כשתהיה מחובר לאינטרנט.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'סנכרון נתונים',
      description: 'מסנכרן נתונים עם הדאטאבייס...',
    });
    
    try {
      await syncDatabase();
    } catch (error) {
      console.error('Error syncing with database:', error);
      toast({
        title: 'שגיאה בסנכרון',
        description: 'אירעה שגיאה בעת סנכרון הנתונים',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <Header onRefresh={fetchDeliveries} />
      
      <div className="container px-4 pb-8 mx-auto">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h1 className="text-2xl font-bold">לוח משלוחים</h1>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse mr-1"></span>
                  מחובר
                </>
              ) : (
                <>
                  <WifiOff size={14} className="mr-1" />
                  לא מחובר
                </>
              )}
              <span className="mx-1">•</span>
              <span className="flex items-center">
                <RefreshCw size={12} className="mr-1" />
                עודכן {formatLastSync()}
              </span>
              {pendingUpdates > 0 && (
                <>
                  <span className="mx-1">•</span>
                  <span className="flex items-center text-amber-500">
                    <CloudSun size={12} className="mr-1" />
                    {pendingUpdates} עדכונים ממתינים
                  </span>
                </>
              )}
              <span className="mx-1">•</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs flex items-center gap-1"
                onClick={() => {
                  if (navigator.onLine) {
                    if (pendingUpdates > 0) {
                      syncPendingUpdates();
                      toast({
                        title: 'סנכרון עדכונים',
                        description: `מסנכרן ${pendingUpdates} עדכונים ממתינים...`,
                      });
                    } else {
                      fetchDeliveries();
                      toast({
                        title: 'סנכרון ידני',
                        description: 'מסנכרן נתונים עם Google Sheets...',
                      });
                    }
                  } else {
                    toast({
                      title: 'אין חיבור לאינטרנט',
                      description: 'לא ניתן לסנכרן כרגע. נסה שוב כשתהיה מחובר לאינטרנט.',
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <RefreshCw size={12} />
                סנכרן
              </Button>
            </div>
          </div>
          
          {user?.sheetsUrl && (
            <Alert variant="default" className="mb-4">
              <FileText className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>מקור נתונים: {user.sheetsUrl.substring(0, 30)}...</span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchDeliveries}
                    className="h-7 text-xs"
                  >
                    רענן מ-Sheets
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSyncDatabase}
                    className="h-7 text-xs flex items-center gap-1"
                  >
                    <Database size={12} />
                    סנכרן לדאטאבייס
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {isTestData && (
            <Alert variant="warning" className="mb-4">
              <FileWarning className="h-4 w-4" />
              <AlertDescription>
                מוצגים נתוני דוגמה עקב מגבלות אבטחה. יש לוודא שגיליון ה-Google Sheets משותף לצפייה ציבורית.
              </AlertDescription>
            </Alert>
          )}
          
          {error ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-destructive">שגיאה בטעינת הנתונים</CardTitle>
                <CardDescription>לא ניתן לטעון את נתוני המשלוחים מהשרת</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{error}</p>
                <div className="bg-muted/50 p-4 rounded-md border text-sm mb-4">
                  <h4 className="font-medium mb-2">עצות לפתרון:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>ודא שהקישור לגיליון Google Sheets תקין</li>
                    <li>ודא שהגיליון משותף להצגה ציבורית (לכל מי שיש את הקישור)</li>
                    <li>ודא שיש לגיליון את העמודות הנדרשות: Tracking, Status, Name, Phone, Address, Assigned To</li>
                    <li>נסה להשתמש בקישור לתצוגת הגיליון במקום קישור לעריכה</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={fetchDeliveries}>נסה שוב</Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-4">
              {isOnline && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      toast({
                        title: 'סנכרון נתונים',
                        description: 'מסנכרן נתונים עם Google Sheets...',
                      });
                      fetchDeliveries();
                    }}
                    className="mb-2"
                  >
                    סנכרן נתונים עכשיו
                  </Button>
                </div>
              )}
              
              {deliveries.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileWarning className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">לא נמצאו משלוחים</h3>
                  <p className="text-muted-foreground mb-4">
                    לא נמצאו נתוני משלוחים בגיליון Google Sheets או בדאטאבייס.
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    ודא שהגיליון מכיל את העמודות הנדרשות ושהוא משותף לצפייה ציבורית.
                  </p>
                  <Button onClick={fetchDeliveries}>נסה שוב</Button>
                </Card>
              ) : (
                <>
                  {couriers.length > 1 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={16} />
                        <h2 className="text-lg font-medium">משלוחים לפי שליחים</h2>
                      </div>
                      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="w-full justify-start overflow-x-auto">
                          <TabsTrigger value="all">הכל ({deliveries.length})</TabsTrigger>
                          {couriers.map(courier => (
                            <TabsTrigger key={courier} value={courier}>
                              {courier} ({deliveryGroups[courier].length})
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        
                        <TabsContent value="all">
                          <DeliveryTable 
                            deliveries={deliveryGroups.all} 
                            onUpdateStatus={async (id, newStatus) => {
                              try {
                                await updateStatus(id, newStatus);
                              } catch (error) {
                                console.error("Error updating status:", error);
                                throw error;
                              }
                            }}
                            isLoading={isLoading}
                            sheetsUrl={user?.sheetsUrl}
                          />
                        </TabsContent>
                        
                        {couriers.map(courier => (
                          <TabsContent key={courier} value={courier}>
                            <DeliveryTable 
                              deliveries={deliveryGroups[courier]} 
                              onUpdateStatus={async (id, newStatus) => {
                                try {
                                  await updateStatus(id, newStatus);
                                } catch (error) {
                                  console.error("Error updating status:", error);
                                  throw error;
                                }
                              }}
                              isLoading={isLoading}
                              sheetsUrl={user?.sheetsUrl}
                            />
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>
                  )}
                  
                  {couriers.length <= 1 && (
                    <DeliveryTable 
                      deliveries={deliveries} 
                      onUpdateStatus={async (id, newStatus) => {
                        try {
                          await updateStatus(id, newStatus);
                        } catch (error) {
                          console.error("Error updating status:", error);
                          throw error;
                        }
                      }}
                      isLoading={isLoading}
                      sheetsUrl={user?.sheetsUrl}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
