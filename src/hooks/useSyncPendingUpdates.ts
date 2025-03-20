
import { useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { cleanSheetUrl } from '@/utils/sheetUrlUtils';

export function useSyncPendingUpdates(
  isOnline: boolean,
  getOfflineChanges: () => any[],
  clearOfflineChanges: (ids: string[]) => void,
  markChangeFailed: (id: string) => void
) {
  const { toast } = useToast();
  
  // Sync pending offline updates
  const syncPendingUpdates = useCallback(async (sheetsUrl: string): Promise<{
    success: number;
    failed: number;
  }> => {
    if (!isOnline || !sheetsUrl) {
      toast({
        title: "אין חיבור",
        description: "לא ניתן לסנכרן במצב לא מקוון",
        variant: "destructive",
      });
      return { success: 0, failed: 0 };
    }
    
    const offlineChanges = getOfflineChanges();
    if (!offlineChanges.length) {
      return { success: 0, failed: 0 };
    }
    
    let successCount = 0;
    let failCount = 0;
    const successfulIds: string[] = [];
    
    // Clean the sheets URL
    const cleanedUrl = cleanSheetUrl(sheetsUrl);
    
    // Process each update sequentially to avoid race conditions
    for (const update of offlineChanges) {
      try {
        const response = await supabase.functions.invoke("sync-sheets", {
          body: {
            action: "updateStatus",
            deliveryId: update.id,
            newStatus: update.status,
            updateType: update.updateType,
            sheetsUrl: cleanedUrl
          }
        });
        
        if (response.error) {
          throw new Error(response.error.message);
        }
        
        successCount++;
        successfulIds.push(update.id);
      } catch (e) {
        console.error("Error syncing update:", e);
        markChangeFailed(update.id);
        failCount++;
      }
    }
    
    // Clear synced updates
    if (successCount > 0) {
      clearOfflineChanges(successfulIds);
    }
    
    // Show appropriate toast
    if (successCount === offlineChanges.length) {
      toast({
        title: "סנכרון הושלם",
        description: `${successCount} עדכונים סונכרנו בהצלחה`,
      });
    } else if (successCount > 0) {
      toast({
        title: "סנכרון חלקי",
        description: `${successCount} עדכונים סונכרנו, ${failCount} נכשלו`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "שגיאת סנכרון",
        description: "לא ניתן היה לסנכרן את השינויים",
        variant: "destructive",
      });
    }
    
    return { success: successCount, failed: failCount };
  }, [isOnline, toast, getOfflineChanges, clearOfflineChanges, markChangeFailed]);

  return { syncPendingUpdates };
}
