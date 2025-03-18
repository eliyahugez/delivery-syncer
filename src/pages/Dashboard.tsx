
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import Header from '@/components/layout/Header';
import DeliveryTable from '@/components/deliveries/DeliveryTable';
import { useAuth } from '@/context/AuthContext';
import { useDeliveries } from '@/hooks/useDeliveries';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { 
    deliveries, 
    isLoading, 
    error, 
    fetchDeliveries, 
    updateStatus,
    isOnline,
    lastSyncTime
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
            </div>
          </div>
          
          {error ? (
            <div className="glass p-6 rounded-xl text-center">
              <h3 className="text-lg font-medium text-destructive mb-2">שגיאה בטעינת הנתונים</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDeliveries}>נסה שוב</Button>
            </div>
          ) : (
            <DeliveryTable 
              deliveries={deliveries} 
              onUpdateStatus={updateStatus}
              isLoading={isLoading}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
