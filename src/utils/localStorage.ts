
export const storageKeys = {
  AUTH_USER: 'delivery-syncer-auth-user',
  DELIVERIES_CACHE: 'delivery-syncer-deliveries-cache',
  LAST_SYNC: 'delivery-syncer-last-sync',
  DELIVERY_HISTORY: 'delivery-syncer-delivery-history',
  DETECTED_COLUMNS: 'delivery-syncer-detected-columns',
  USER_PREFERENCES: 'delivery-syncer-user-preferences',
  OFFLINE_CHANGES: 'delivery-syncer-offline-changes',
  COURIER_STATS: 'delivery-syncer-courier-stats'
};

export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

export const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing from localStorage (${key}):`, error);
  }
};

export const clearAllStorage = (): void => {
  try {
    Object.values(storageKeys).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

// Get the size of all localStorage items (in bytes)
export const getStorageSize = (): number => {
  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }
    return totalSize;
  } catch (error) {
    console.error('Error calculating localStorage size:', error);
    return 0;
  }
};

// Clear old data to ensure we don't exceed localStorage limits
export const pruneOldData = (maxAge: number = 30 * 24 * 60 * 60 * 1000): void => {
  try {
    const now = Date.now();
    const history = getFromStorage<Record<string, any[]>>(storageKeys.DELIVERY_HISTORY, {});
    
    // Prune delivery history older than maxAge (default 30 days)
    Object.keys(history).forEach(deliveryId => {
      const filteredHistory = history[deliveryId].filter(entry => {
        const entryDate = new Date(entry.timestamp || entry.statusDate || 0).getTime();
        return now - entryDate < maxAge;
      });
      
      if (filteredHistory.length === 0) {
        delete history[deliveryId];
      } else {
        history[deliveryId] = filteredHistory;
      }
    });
    
    saveToStorage(storageKeys.DELIVERY_HISTORY, history);
  } catch (error) {
    console.error('Error pruning old data:', error);
  }
};
