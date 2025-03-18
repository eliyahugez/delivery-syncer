
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

const Header: React.FC<{ onRefresh?: () => Promise<void> }> = ({ onRefresh }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast({
        title: "נתונים עודכנו",
        description: "הנתונים סונכרנו בהצלחה עם Google Sheets",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "שגיאה בסנכרון",
        description: "לא ניתן לסנכרן נתונים כרגע, נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast({
      title: "התנתקת בהצלחה",
      description: "להתראות!",
    });
  };

  return (
    <header className="glass sticky top-0 z-10 py-4 px-6 mb-6 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="text-xl font-medium">
          סנכרון משלוחים
        </h1>
        {user && (
          <div className="ml-4 text-sm text-muted-foreground px-2 py-1 rounded-full bg-primary/10">
            {user.name}
          </div>
        )}
      </div>
      
      {user && (
        <div className="flex gap-2">
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1"
            >
              <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
              <span>סנכרן</span>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-1"
          >
            <LogOut size={16} />
            <span>התנתק</span>
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
