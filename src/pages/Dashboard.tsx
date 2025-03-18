import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import Header from '@/components/layout/Header';
import DeliveryTable from '@/components/deliveries/DeliveryTable';
import { useAuth } from '@/context/AuthContext';
import { useDeliveries } from '@/hooks/useDeliveries';
import { WifiOff, RefreshCw, AlertTriangle, FileText, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/components/ui/use-toast';

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
    isTestData
  } = useDeliveries();
  
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
              {!isOnline && (
                <>
                  <span className="mx-1">•</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      if (navigator.onLine) {
                        fetchDeliveries();
                        toast({
                          title: 'סנכרון ידני',
                          description: 'מסנכרן נתונים עם Google Sheets...',
                        });
                      } else {
                        toast({
                          title: 'אין חיבור לאינטרנט',
                          description: 'לא ניתן לסנכרן כרגע. נסה שוב כשתהיה מחובר לאינטרנט.',
                          variant: 'destructive',
                        });
                      }
                    }}
                  >
                    סנכרן ידנית
                  </Button>
                </>  
              )}
            </div>
          </div>
          
          {user?.sheetsUrl && (
            <Alert variant="default" className="mb-4">
              <FileText className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>מקור נתונים: {user.sheetsUrl.substring(0, 30)}...</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchDeliveries}
                  className="h-7 text-xs"
                >
                  רענן נתונים
                </Button>
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
                    <li>ודא שיש לגיליון את העמודות הנדרשות: Tracking, Status, Name, Phone Number, Address</li>
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
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
